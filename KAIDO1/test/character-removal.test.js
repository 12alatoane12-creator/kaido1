const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const removed=/musicGuide|mgChat|mgInput|mgLauncher|mgMessages|mgPose|mgMotion|MG_KNOWLEDGE|MG_BRIDGE_SCRIPT|KIDO_ASSIST|KIDO_POINTER|KIDO_PAGE_CONTEXT|KIDO_VIEW_MOVED|KIDO_HIGHLIGHT|speechSynthesis|SpeechRecognition|interactive-guide-scroll-bridge|kido-assistant-context-bridge/;
test('delivered shells and decoded artist pages remove the character, chat, voice and tracking runtime',()=>{
 for(const entry of ['index.html','public/index.html']){
  const shell=fs.readFileSync(path.join(root,entry),'utf8');
  assert.equal(removed.test(shell),false,entry+' retains character/chat runtime');
  assert.equal(/<textarea\b/i.test(shell),false,entry+' retains the chat composer');
  assert.ok(shell.includes('id="adminDialog"'),'administration must remain available');
  const packed=vm.runInNewContext('('+shell.match(/const PACKED\s*=\s*(\{[\s\S]*?\});/)[1]+')');
  for(const artist of ['kaido','nova']){
   const html=zlib.gunzipSync(Buffer.from(packed[artist],'base64')).toString();
   assert.equal(removed.test(html),false,entry+' '+artist+' retains assistant messages');
   assert.ok(html.includes('kn-scene-canvas'),'existing 3D scene must remain');
   assert.ok(html.includes('ADMIN_OPEN'),'artist administration entry must remain');
   assert.ok(html.includes('KIDO_SINGLE_ROUTE'),'artist navigation must remain');
  }
 }
});
test('the package removes every character pose from the media manifest and source assets',()=>{
 const manifest=require('../source/media.json');
 for(const key of ['c6ffdf292c6e','5aec3e1abd69','a95b4de4dac5','1820fb44004f','1bff7161f3a8','30b53442b32d']){
  assert.equal(key in manifest,false,'character pose remains in media manifest');
  assert.equal(fs.existsSync(path.join(root,'source/media/'+key+'.webp')),false,'character pose remains in package');
 }
 assert.equal(Object.keys(manifest).length,9,'all nine site artworks must remain');
});
