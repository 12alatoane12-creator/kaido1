const test=require('node:test'),assert=require('node:assert/strict'),fixture=require('./scene-fixture');
test('the actual renderer waits for entrance, emits finite geometry, and performs no layout reads per frame',()=>{
 const scene=fixture();assert.equal(scene.paints,1);assert.equal(scene.pending,0);scene.enter();scene.enter();assert.equal(scene.pending,1);
 const layouts=scene.layouts;for(let time=0;time<1000;time+=17)scene.step(time);assert.ok(scene.paints>20&&scene.paints<=32);assert.equal(scene.layouts,layouts);assert.ok(scene.canvas.width<=480*1.6+1);scene.leave();assert.equal(scene.pending,0);assert.equal(scene.observersClosed,true);
});
test('the actual renderer stops offscreen/hidden and stays stopped under the user motion policy',()=>{
 const scene=fixture({width:390});scene.enter();scene.step(0);scene.offscreen(true);assert.equal(scene.pending,0);scene.hidden(true);scene.hidden(false);assert.equal(scene.pending,0);
 scene.offscreen(false);assert.equal(scene.pending,1);scene.motion(false);scene.step(100);assert.equal(scene.pending,0);assert.ok(scene.canvas.width<=480*1.25+1);scene.motion(true);scene.step(200);assert.equal(scene.pending,1);scene.leave();
});
test('static scene mode controls immediately update geometry and selection without scheduling motion',()=>{
 const scene=fixture({enabled:false});const before=scene.paints;scene.controls[2].click();assert.equal(scene.readout.textContent,'03 / WAVE');assert.equal(scene.controls[2].attributes['aria-pressed'],'true');assert.equal(scene.controls[0].attributes['aria-pressed'],'false');assert.equal(scene.paints,before+1);assert.equal(scene.pending,0);scene.leave();
});
test('keyboard/class finish changes repaint the mesh palette even with motion disabled',()=>{
 const scene=fixture({enabled:false});scene.strokeColors.length=0;scene.setGold(true);assert.ok(scene.strokeColors.some(value=>value.includes('235,200,147')),'gold logo must have a gold mesh');scene.strokeColors.length=0;scene.setGold(false);assert.ok(scene.strokeColors.some(value=>value.includes('152,206,249')),'ice logo must have an ice mesh');scene.leave();
});
