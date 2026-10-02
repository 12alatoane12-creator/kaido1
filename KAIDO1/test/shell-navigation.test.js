const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const loader=require('../motion/loader'),root=path.join(__dirname,'..');
function classes(){const set=new Set();return {add:(...names)=>names.forEach(n=>set.add(n)),remove:(...names)=>names.forEach(n=>set.delete(n)),contains:n=>set.has(n),toggle(n,value){if(value)set.add(n);else set.delete(n)}}}
async function fixture(entry,hash='#kaido'){
 const html=fs.readFileSync(path.join(root,entry),'utf8'),source=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).find(s=>s.includes('const PACKED ='));
 const events=new Map(),requests=[],timers=new Map(),messages=[],blobs=new Map();let id=0;
 const frame={classList:classes(),attributes:{},setAttribute(n,v){this.attributes[n]=v},removeAttribute(n){delete this.attributes[n]},contentWindow:{postMessage:d=>messages.push(d)}};
 const boot={dataset:{},classList:classes(),querySelector:()=>({textContent:''})},status={},retry={addEventListener(type,fn){this[type]=fn}};
 const nodes={app:frame,boot,knBootStatus:status,knBootRetry:retry},body={classList:classes()};
 const history={calls:[],pushState(state,_title,value){this.calls.push({mode:'push',state,hash:value})},replaceState(state,_title,value){this.calls.push({mode:'replace',state,hash:value})}};
 class LocalURL extends URL{}
 LocalURL.createObjectURL=blob=>{const key='blob:test-'+(++id);blobs.set(key,blob);return key};LocalURL.revokeObjectURL=url=>blobs.delete(url);
 const context={document:{body,hidden:false,getElementById:n=>nodes[n],addEventListener(){}},location:{protocol:'file:',href:'file:///KAIDO1/index.html',hash},history,Blob,Response,DecompressionStream,Uint8Array,atob,URL:LocalURL,console,
  addEventListener:(type,fn)=>{if(!events.has(type))events.set(type,[]);events.get(type).push(fn)},
  setTimeout:fn=>{timers.set(++id,fn);return id},clearTimeout:key=>timers.delete(key),requestAnimationFrame:fn=>requests.push(fn),
  KNLoader:{create:options=>loader.create({...options,setTimer:fn=>{timers.set(++id,fn);return id},clearTimer:key=>timers.delete(key),request:fn=>requests.push(fn)})}};
 context.window=context;vm.createContext(context);
 vm.runInContext(source.replace('loadPage(initial.page,initial.anchor,\'replace\');','globalThis.initialLoad=loadPage(initial.page,initial.anchor,\'replace\');')+'\nglobalThis.readState=()=>({currentPage,loadSequence});globalThis.clearCache=()=>knHtmlCache.clear();',context);
 await context.initialLoad;
 const actualLoad=context.loadPage;context.loadPage=(...args)=>{const result=actualLoad(...args);context.lastLoad=result;return result};
 return {context,frame,boot,status,retry,body,history,messages,blobs,
  emit(type,event){for(const fn of events.get(type)||[])fn(event)},
  flush(){while(requests.length)requests.shift()()},
  async pageHtml(){return frame.srcdoc||blobs.get(frame.src).text()}};
}
test('both delivered shells boot, enter, route and scroll to sections without any character runtime',async()=>{
 for(const entry of ['index.html','public/index.html']){
  const f=await fixture(entry,'#nova-'+encodeURIComponent('nova-projects'));
  assert.equal(f.context.readState().currentPage,'nova');
  assert.ok((await f.pageHtml()).includes('data-motion-navigation="1"'));
  assert.equal(f.frame.attributes['aria-busy'],'true');assert.equal(f.boot.classList.contains('hide'),false);
  f.frame.onload();assert.equal(f.messages[0].type,'KN_SCROLL_TO');assert.equal(f.messages[0].anchor,'nova-projects');assert.equal(f.messages[0].navigation,1);
  f.emit('message',{source:{},data:{type:'KN_PAGE_READY',page:'nova',navigation:1}});assert.equal(f.boot.classList.contains('hide'),false);
  f.emit('message',{source:f.frame.contentWindow,data:{type:'KN_PAGE_READY',page:'nova',navigation:1}});f.flush();
  assert.equal(f.frame.attributes['aria-busy'],'false');assert.equal(f.frame.classList.contains('kn-live'),true);assert.equal(f.messages.at(-1).type,'KN_PAGE_ENTER');
  f.emit('message',{source:{},data:{type:'KIDO_SINGLE_ROUTE',page:'kaido'}});assert.equal(f.context.readState().loadSequence,1);
  f.emit('message',{source:f.frame.contentWindow,data:{type:'KIDO_SINGLE_ROUTE',page:'kaido',anchor:'works'}});await f.context.lastLoad;
  assert.equal(f.context.readState().currentPage,'kaido');assert.equal(f.history.calls.at(-1).hash,'#kaido-works');
  assert.ok((await f.pageHtml()).includes('data-motion-navigation="2"'));f.frame.onload();assert.equal(f.messages.at(-1).anchor,'works');
  f.emit('message',{source:f.frame.contentWindow,data:{type:'KN_MOTION_POLICY',navigation:1,enabled:false}});assert.equal(f.body.classList.contains('kn-motion-off'),false);
  f.emit('message',{source:f.frame.contentWindow,data:{type:'KN_MOTION_POLICY',navigation:2,enabled:false}});assert.equal(f.body.classList.contains('kn-motion-off'),true);
 }
});
test('a slower earlier artist request cannot replace the current frame or send a stale scroll',async()=>{
 for(const entry of ['index.html','public/index.html']){
  const f=await fixture(entry),oldOnload=f.frame.onload,pending=[];f.context.clearCache();
  f.context.unpackHtml=()=>new Promise(resolve=>pending.push(resolve));
  const earlier=f.context.loadPage('kaido','old'),latest=f.context.loadPage('nova','new');
  pending[1]('<html data-motion-navigation="__KN_NAV_ID__"><head></head><body>NOVA</body></html>');await latest;
  const displayed=await f.pageHtml();assert.ok(displayed.includes('NOVA'));assert.ok(displayed.includes('data-motion-navigation="3"'));
  pending[0]('<html><head></head><body>KAIDO</body></html>');await earlier;assert.equal(await f.pageHtml(),displayed);
  oldOnload();assert.equal(f.messages.length,0);f.frame.onload();assert.equal(f.messages.length,1);assert.equal(f.messages[0].anchor,'new');
 }
});
test('page navigation only accepts the current parent and respects the motion preference',()=>{
 for(const artist of ['kaido','nova']){
  const html=fs.readFileSync(path.join(root,'source/pages/'+artist+'.html'),'utf8'),source=html.match(/<script id="kn-page-navigation">([\s\S]*?)<\/script>/)[1];
  const parent={},scrolls=[],hashes=[];let handler,animate=false;
  const context={parent,document:{documentElement:{dataset:{motionNavigation:'3'}},getElementById:id=>id==='works'?{scrollIntoView:options=>scrolls.push(options)}:null},window:{knCanAnimate:()=>animate},history:{replaceState:(_state,_title,hash)=>hashes.push(hash)},addEventListener:(_type,fn)=>{handler=fn}};
  vm.runInNewContext(source,context);
  handler({source:{},data:{type:'KN_SCROLL_TO',anchor:'works',navigation:3}});
  handler({source:parent,data:{type:'KN_SCROLL_TO',anchor:'works',navigation:2}});assert.equal(scrolls.length,0);
  handler({source:parent,data:{type:'KN_SCROLL_TO',anchor:'missing',navigation:3}});assert.equal(scrolls.length,0);
  handler({source:parent,data:{type:'KN_SCROLL_TO',anchor:'works',navigation:3}});assert.equal(scrolls[0].behavior,'auto');assert.equal(hashes[0],'#works');
  animate=true;handler({source:parent,data:{type:'KN_SCROLL_TO',anchor:'works',navigation:3}});assert.equal(scrolls[1].behavior,'smooth');
 }
});
