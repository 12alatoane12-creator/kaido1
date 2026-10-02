const test=require('node:test'),assert=require('node:assert/strict');
const {createMesh,createMorph}=require('../motion/forms');
const close=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
test('all three forms have finite bounded coordinates and identical topology',()=>{
 for(const [rings,segments] of [[12,48],[18,72],[NaN,Infinity],[1000,10000]]){
  const mesh=createMesh(rings,segments);assert.ok(mesh.rings<=24&&mesh.segments<=128);assert.equal(Object.keys(mesh.forms).length,3);
  for(const values of Object.values(mesh.forms)){
   assert.equal(values.length,mesh.rings*(mesh.segments+1)*3);
   for(const value of values)assert.ok(Number.isFinite(value)&&Math.abs(value)<1.3);
  }
 }
});
test('every longitudinal ring closes without a visible seam',()=>{
 const {forms,rings,segments}=createMesh(18,72);
 for(const values of Object.values(forms))for(let ring=0;ring<rings;ring++)for(let axis=0;axis<3;axis++)close(values[(ring*(segments+1))*3+axis],values[(ring*(segments+1)+segments)*3+axis]);
});
test('morphing keeps the output buffer, interpolates inside the endpoint bounds, and settles exactly',()=>{
 const {forms}=createMesh(12,48),morph=createMorph(forms,'knot'),buffer=morph.values;
 morph.select('wave');assert.equal(morph.settled,false);morph.advance(.4);
 let changed=0;for(let i=0;i<buffer.length;i++){assert.ok(buffer[i]>=Math.min(forms.knot[i],forms.wave[i])-1e-6&&buffer[i]<=Math.max(forms.knot[i],forms.wave[i])+1e-6);if(buffer[i]!==forms.knot[i])changed++;}
 assert.ok(changed>100);assert.equal(morph.values,buffer);morph.advance(1);assert.equal(morph.settled,true);assert.deepEqual(buffer,forms.wave);
});
test('rapid retargeting starts at the displayed shape rather than a previous endpoint',()=>{
 const {forms}=createMesh(12,48),morph=createMorph(forms,'knot');morph.select('wave');morph.advance(.32);
 const shown=morph.values.slice();morph.select('orbit');assert.deepEqual(morph.values,shown);morph.advance(0);assert.deepEqual(morph.values,shown);morph.advance(.01);
 for(let i=0;i<shown.length;i++)assert.ok(Math.abs(morph.values[i]-shown[i])<.003);
 morph.advance(2);assert.deepEqual(morph.values,forms.orbit);
});
test('static selection completes immediately, even during an active transition',()=>{
 const {forms}=createMesh(12,48),morph=createMorph(forms,'knot');morph.select('orbit');morph.advance(.2);morph.select('wave',{instant:true});assert.equal(morph.settled,true);assert.deepEqual(morph.values,forms.wave);
});
test('invalid selections and invalid elapsed time never corrupt the shape',()=>{
 const {forms}=createMesh(12,48),morph=createMorph(forms,'knot'),before=morph.values.slice();assert.equal(morph.select('missing'),false);assert.deepEqual(morph.values,before);morph.select('wave');morph.advance(NaN);morph.advance(-1);assert.deepEqual(morph.values,before);morph.advance(.85);assert.deepEqual(morph.values,forms.wave);
});
