const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.join(__dirname,'..');
const forbidden=/whatsapp|wa\.me|api\.whatsapp|واتساب|9647817607623|waMainBtn|waAdsBtn|waFloat|wa-float|wa-pulse|waLink/gi;
test('both delivered entry points and their unpacked pages have no removed contact service or number',()=>{
 for(const entry of ['index.html','public/index.html']){
  const html=fs.readFileSync(path.join(root,entry),'utf8');
  assert.equal(html.match(forbidden),null,entry+' shell retains the removed service');
  const packed=html.match(/const PACKED\s*=\s*(\{[\s\S]*?\});/)[1];
  for(const artist of ['kaido','nova']){
   const b64=packed.match(new RegExp(artist+"\\s*:\\s*['\"]([^'\"]+)['\"]"))[1];
   const page=zlib.gunzipSync(Buffer.from(b64,'base64')).toString();
   assert.equal(page.match(forbidden),null,entry+' '+artist+' retains a removed contact trace');
   assert.ok(page.includes('instagram.com/'),artist+' lost its existing contact platform');
  }
 }
});
