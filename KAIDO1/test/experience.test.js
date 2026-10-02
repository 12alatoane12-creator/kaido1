const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),vm=require('node:vm');
const root=path.join(__dirname,'..');
test('the deployment output includes the existing YouTube player used by video cards',()=>{
 const player=path.join(root,'public/youtube-player.html');assert.ok(fs.existsSync(player),'player is missing from the published output');assert.deepEqual(fs.readFileSync(player),fs.readFileSync(path.join(root,'youtube-player.html')));
});
function entries(){return ['index.html','public/index.html'].map(name=>({name,html:fs.readFileSync(path.join(root,name),'utf8')}))}
function extractFunction(html,name){const start=html.indexOf('async function '+name+'(');assert.ok(start>=0);const end=html.indexOf('\nasync function unpackHtml',start);return html.slice(start,end).trim()}
test('opening an empty NOVA archive clears a previous count and shows its empty state',()=>{
 const html=fs.readFileSync(path.join(root,'source/pages/nova.html'),'utf8'),start=html.indexOf('function novaApplyLibrarySearch(){'),end=html.indexOf('\nfunction novaOpenLibrary',start);
 const count={textContent:'15 عمل'},empty={hidden:true},context={novaLibraryState:{cards:[],total:0},novaLibrarySearch:{value:''},novaLibraryGrid:{appendChild(){assert.fail('empty archive has no card')}},novaLibraryCount:count,novaLibraryEmpty:empty,novaSearchScore:()=>assert.fail('no card to score')};
 vm.runInNewContext(html.slice(start,end)+';novaApplyLibrarySearch();',context);assert.equal(count.textContent,'0 عمل');assert.equal(empty.hidden,false);
});
test('the built self-contained entries meet the transfer budget and retain all catalogue entries',()=>{
 const seed=require('../lib/seed.json');for(const {name,html} of entries()){
  assert.ok(Buffer.byteLength(html)<2700000,name+' exceeds 2.7 MB');
  const packed=html.match(/const PACKED\s*=\s*(\{[\s\S]*?\});/)[1];let count=0;
  for(const artist of ['kaido','nova']){const b64=packed.match(new RegExp(artist+"\\s*:\\s*['\"]([^'\"]+)['\"]"))[1];const page=zlib.gunzipSync(Buffer.from(b64,'base64')).toString();assert.equal(/__KN_MEDIA:/.test(page),false);for(const list of Object.values(seed[artist]))for(const id of list){count++;assert.ok(page.includes(id),'missing '+artist+' '+id)}}assert.equal(count,39);
 }
});
test('a stalled hosted content request falls back to embedded catalogue data in both entry points',async()=>{
 for(const {name,html} of entries()){
  let configuredTimeout;const source=extractFunction(html,'cachedPageHtml');
  const context={knHtmlCache:new Map(),PACKED:{kaido:'seed'},location:{protocol:'https:'},unpackHtml:async()=>'<body>embedded catalogue</body>',preparePageHtml:s=>s,AbortSignal:{timeout:ms=>{configuredTimeout=ms;return AbortSignal.timeout(5)}},fetch:(_url,options)=>new Promise((_resolve,reject)=>{options?.signal?.addEventListener('abort',()=>reject(Error('timeout')),{once:true})})};
  vm.createContext(context);vm.runInContext(source+'; globalThis.result=cachedPageHtml("kaido");',context);
  const result=await Promise.race([context.result,new Promise(r=>setTimeout(()=>r('STALLED'),100))]);assert.equal(result,'<body>embedded catalogue</body>',name+' never returns embedded content');assert.ok(configuredTimeout>0&&configuredTimeout<=6000);
 }
});
