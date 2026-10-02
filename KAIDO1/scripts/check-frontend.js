const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
let total=0;const report=[];
for(const name of ['index.html','public/index.html']){
 const shell=fs.readFileSync(path.join(root,name),'utf8');
 let scripts=0;for(const match of shell.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){new vm.Script(match[1],{filename:name+':script'+scripts});scripts++;}
 const packedMatch=shell.match(/const PACKED\s*=\s*(\{[\s\S]*?\});/),packed=vm.runInNewContext('('+packedMatch[1]+')');
 const bridgeStart=shell.indexOf('const MG_BRIDGE_SCRIPT = '),bridgeEnd=shell.indexOf('\nfunction mgInjectBridge',bridgeStart);
 const injectStart=bridgeEnd+1,injectEnd=shell.indexOf('\n',injectStart);
 const bridge=vm.runInNewContext(shell.slice(bridgeStart,bridgeEnd)+'\n'+shell.slice(injectStart,injectEnd)+';mgInjectBridge;',{URL,location:{href:'https://kaido-1.vercel.app/'}});
 const pages={};
 for(const artist of ['kaido','nova']){
  const html=bridge(zlib.gunzipSync(Buffer.from(packed[artist],'base64')).toString(),artist).replace(/__KN_NAV_ID__/g,'42');let count=0;
  for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){new vm.Script(match[1],{filename:name+':'+artist+':script'+count});count++;}
  assert.equal((html.match(/class="kn-scene-canvas"/g)||[]).length,1);assert.equal(/__KN_MEDIA:/.test(html),false);assert.ok(html.includes('data-motion-navigation="42"'));assert.ok(html.includes('<base href="https://kaido-1.vercel.app/">'));
  pages[artist]={bytes:Buffer.byteLength(html),scripts:count};scripts+=count;
 }
 const fetchStart=shell.indexOf('async function mgCachedHtml('),fetchEnd=shell.indexOf('\nasync function unpackHtml',fetchStart),fetchSource=shell.slice(fetchStart,fetchEnd);
 const data={kaido:{songs:['changedSong'],dass:['changedDass'],ads:['changedAd']},nova:{tracks:['changedTrack'],visuals:['changedVisual'],audio:['changedAudio']}};
 for(const artist of ['kaido','nova']){
  const context={mgHtmlCache:new Map(),PACKED:packed,location:{protocol:'https:'},AbortSignal,fetch:async()=>({ok:true,json:async()=>data}),unpackHtml:async value=>zlib.gunzipSync(Buffer.from(value,'base64')).toString(),mgInjectBridge:html=>html};vm.createContext(context);vm.runInContext(fetchSource+';globalThis.result=mgCachedHtml("'+artist+'");',context);
  // The check below runs after the real content transformer completes.
  report.push(context.result.then(html=>{for(const list of Object.values(data[artist]))assert.ok(html.includes('='+JSON.stringify(list)+';'),'API catalogue replacement missing '+artist);return {name,artist,api_replacement:true};}));
 }
 total+=scripts;console.log(JSON.stringify({name,bytes:Buffer.byteLength(shell),scripts,pages}));
}
Promise.all(report).then(result=>console.log(JSON.stringify({parsed_scripts:total,api_checks:result}))).catch(error=>{console.error(error);process.exitCode=1;});
