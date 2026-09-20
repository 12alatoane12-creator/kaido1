const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createBackend,videoId,mutateScript,rateScript} = require('../lib/backend');
const seed = require('../lib/seed.json');
// This in-memory REST double exercises the application. It is not a real Upstash integration test.
function harness() {
  const data = new Map(); const expiries = new Map(); let now = 0;
  const env = {SITE_ORIGIN:'https://kaido-1.vercel.app',UPSTASH_REDIS_REST_URL:'https://test.upstash.io',UPSTASH_REDIS_REST_TOKEN:'test-only',KAIDO_PASSWORD:'test-kaido-password',NOVA_PASSWORD:'test-nova-password',ADMIN_TOOL_CODE:'test-tool-code'};
  const fetchImpl = async (_, options) => {
    const [cmd,...args] = JSON.parse(options.body);
    for (const [k,t] of expiries) if (t <= now) {data.delete(k);expiries.delete(k);}
    let result;
    if (cmd === 'MGET') result = args.map(k=>data.get(k) ?? null);
    else if (cmd === 'GET') result = data.get(args[0]) ?? null;
    else if (cmd === 'SET') {
      if (args.includes('NX') && data.has(args[0])) result = null;
      else {data.set(args[0],args[1]);if (args[2]==='EX') expiries.set(args[0],now+Number(args[3]));result='OK';}
    } else if (cmd === 'DEL') result = Number(data.delete(args[0]));
    else if (cmd === 'EVAL' && args[0] === rateScript) {
      const key=args[2]; result=Number(data.get(key)||0)+1;data.set(key,String(result));if(result===1)expiries.set(key,now+Number(args[3]));
    } else if (cmd === 'EVAL' && args[0] === mutateScript) {
      const [, ,key,action,id] = args;let ids=JSON.parse(data.get(key)||'[]');result=1;
      if(action==='add' && !ids.includes(id)) {if(ids.length>=500) result=-1;else ids.unshift(id);}
      if(action==='delete')ids=ids.filter(x=>x!==id);
      if(result===1)data.set(key,JSON.stringify(ids));
    } else throw new Error('Unexpected Redis command '+cmd);
    return {ok:true,json:async()=>({result})};
  };
  let backend=createBackend({env,fetchImpl});
  const invoke=async(action,{method,body={},cookie='',csrf='',origin=env.SITE_ORIGIN,ip='127.0.0.1'}={})=>{
    const headers={origin,'content-type':'application/json','x-real-ip':ip,cookie,'x-csrf-token':csrf,'sec-fetch-site':'same-origin'};
    const res={headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v},end(v){this.body=JSON.parse(v)}};
    await backend(action,{method:method||(['session','content'].includes(action)?'GET':'POST'),body,headers},res);
    return res;
  };
  return {env,data,invoke,advance(s){now+=s},reload(){backend=createBackend({env,fetchImpl})}};
}
const cookieOf = r => r.headers['set-cookie'].split(';')[0];
async function authenticate(h,username='kaido') {
  const r=await h.invoke('login',{body:{username,password:h.env[username==='kaido'?'KAIDO_PASSWORD':'NOVA_PASSWORD']}});assert.equal(r.statusCode,200);
  const pending=cookieOf(r);
  const v=await h.invoke('verify',{cookie:pending,body:{code:h.env.ADMIN_TOOL_CODE}});assert.equal(v.statusCode,200);
  return {cookie:cookieOf(v),csrf:v.body.csrf,pending};
}
test('Public content is initialized with all 39 original videos',async()=>{
 const h=harness(),r=await h.invoke('content');assert.equal(r.statusCode,200);assert.deepEqual(r.body,seed);assert.match(r.headers['cache-control'],/no-store/);
});
test('Missing storage or admin configuration returns actionable errors',async()=>{
 const h=harness();delete h.env.UPSTASH_REDIS_REST_TOKEN;assert.equal((await h.invoke('session')).statusCode,503);
 h.env.UPSTASH_REDIS_REST_TOKEN='x';h.env.KAIDO_PASSWORD='short';assert.equal((await h.invoke('session')).statusCode,503);
});
test('Both accounts need password and tool code; pending session cannot write',async()=>{
 const h=harness();assert.equal((await h.invoke('login',{body:{username:'kaido',password:'wrong'}})).statusCode,401);
 const r=await h.invoke('login',{body:{username:'nova',password:h.env.NOVA_PASSWORD}});const cookie=cookieOf(r);
 assert.match(r.headers['set-cookie'],/HttpOnly; Secure; SameSite=Strict/);
 assert.equal((await h.invoke('session',{cookie})).body.pending,true);
 assert.equal((await h.invoke('content',{method:'POST',cookie,body:{}})).statusCode,403);
 assert.equal((await h.invoke('verify',{cookie,body:{code:'wrong'}})).statusCode,401);
 const s=await authenticate(h,'nova');assert.notEqual(s.cookie,s.pending);
 assert.equal((await h.invoke('session',{cookie:s.pending})).body.csrf,null);
 assert.equal((await h.invoke('session',s)).body.username,'nova');
});
test('Unauthenticated, cross-origin, missing CSRF, and invalid writes are rejected',async()=>{
 const h=harness();const body={owner:'kaido',category:'songs',action:'add',url:'abcdefghijk'};
 assert.equal((await h.invoke('content',{method:'POST',body})).statusCode,401);
 const s=await authenticate(h);
 assert.equal((await h.invoke('content',{method:'POST',...s,origin:'https://evil.example',body})).statusCode,403);
 assert.equal((await h.invoke('content',{method:'POST',...s,csrf:'',body})).statusCode,403);
 for(const invalid of [{...body,owner:'__proto__'},{...body,category:'passwords'},{...body,action:'wipe'},{...body,url:'https://youtube.com.evil.example/watch?v=abcdefghijk'},{...body,url:'</script>'}])
  assert.equal((await h.invoke('content',{method:'POST',...s,body:invalid})).statusCode,400);
});
test('Saved changes survive a new backend instance; duplicate inserts do not duplicate IDs',async()=>{
 const h=harness();const s=await authenticate(h),body={owner:'nova',category:'tracks',action:'add',url:'https://youtu.be/abcdefghijk'};
 const responses=await Promise.all(Array.from({length:4},()=>h.invoke('content',{method:'POST',...s,body})));
 responses.forEach(r=>assert.equal(r.statusCode,200));h.reload();
 assert.equal((await h.invoke('content')).body.nova.tracks.filter(x=>x==='abcdefghijk').length,1);
 assert.equal((await h.invoke('content',{method:'POST',...s,body:{...body,action:'delete'}})).statusCode,200);
 h.reload();assert.ok(!(await h.invoke('content')).body.nova.tracks.includes('abcdefghijk'));
});
test('Deleting every entry preserves an empty array across subsequent reads and cold starts',async()=>{
 const h=harness(),s=await authenticate(h);
 for(const id of seed.kaido.dass)assert.equal((await h.invoke('content',{method:'POST',...s,body:{owner:'kaido',category:'dass',action:'delete',url:id}})).statusCode,200);
 h.reload();assert.deepEqual((await h.invoke('content')).body.kaido.dass,[]);
});
test('Logout, expiry, and changing secrets invalidate sessions',async()=>{
 const h=harness();let s=await authenticate(h);assert.equal((await h.invoke('logout',s)).statusCode,200);assert.equal((await h.invoke('session',s)).body.csrf,null);
 s=await authenticate(h);h.advance(28801);assert.equal((await h.invoke('session',s)).body.csrf,null);
 s=await authenticate(h);h.env.ADMIN_TOOL_CODE='new-tool-code';assert.equal((await h.invoke('session',s)).body.csrf,null);
});
test('Login and verification attempts are rate limited',async()=>{
 const h=harness();let r;
 for(let i=0;i<31;i++)r=await h.invoke('login',{body:{username:'kaido',password:'bad'}});
 assert.equal(r.statusCode,429);h.advance(901);
 const l=await h.invoke('login',{body:{username:'kaido',password:h.env.KAIDO_PASSWORD}});assert.equal(l.statusCode,200);
 for(let i=0;i<9;i++)r=await h.invoke('verify',{cookie:cookieOf(l),body:{code:'bad'}});
 assert.equal(r.statusCode,429);
});
test('Only expected HTTP methods are accepted; no unexpected action dispatch',async()=>{
 const h=harness();assert.equal((await h.invoke('login',{method:'GET'})).statusCode,405);assert.equal((await h.invoke('toString')).statusCode,404);
});
test('YouTube URL validation accepts watch, short links, shorts, embed and live',()=>{
 for(const url of ['abcdefghijk','https://www.youtube.com/watch?v=abcdefghijk&t=20','https://youtu.be/abcdefghijk?t=2','https://youtube.com/shorts/abcdefghijk','https://www.youtube.com/embed/abcdefghijk','https://youtube.com/live/abcdefghijk'])assert.equal(videoId(url),'abcdefghijk');
 for(const url of ['javascript:alert(1)','https://youtube.com/playlist?list=123','https://evil.com/watch?v=abcdefghijk','https://youtube.com/watch?v=invalid'])assert.throws(()=>videoId(url));
});
