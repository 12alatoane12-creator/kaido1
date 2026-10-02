const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=path.join(__dirname,'../motion/engine.js');
const api=fs.existsSync(file)?require(file):{};
function clock(){let n=0;const pending=new Map();return {pending,request:fn=>{pending.set(++n,fn);return n},cancel:id=>pending.delete(id),tick:time=>{const jobs=[...pending.values()];pending.clear();jobs.forEach(fn=>fn(time))}}}
test('scene frames are paced and a repeated start schedules only one frame',()=>{
 assert.equal(typeof api.createFrameLoop,'function');
 const c=clock(),paint=[];const loop=api.createFrameLoop({...c,draw:t=>paint.push(t),interval:32,canRun:()=>true});
 loop.start();loop.start();assert.equal(c.pending.size,1);c.tick(0);c.tick(16);c.tick(32);assert.deepEqual(paint,[0,32]);loop.stop();assert.equal(c.pending.size,0);
});
test('offscreen frames stop and resume without a catch-up storm',()=>{
 assert.equal(typeof api.createFrameLoop,'function');
 const c=clock();let allowed=true,paints=0;const loop=api.createFrameLoop({...c,draw:()=>paints++,interval:32,canRun:()=>allowed});
 loop.start();c.tick(0);allowed=false;c.tick(40);assert.equal(c.pending.size,0);assert.equal(paints,1);allowed=true;loop.start();c.tick(80);assert.equal(paints,2);loop.stop();
});
test('a reduced-motion scene schedules no animation',()=>{
 assert.equal(typeof api.createFrameLoop,'function');
 const c=clock(),loop=api.createFrameLoop({...c,draw:()=>assert.fail('motion disabled'),interval:32,canRun:()=>false});loop.start();assert.equal(c.pending.size,0);
});
test('small or low-power devices receive fewer scene points and bounded pixel density',()=>{
 assert.equal(typeof api.quality,'function');
 const desktop=api.quality({width:1400,dpr:3,cores:8}),phone=api.quality({width:390,dpr:3,cores:8}),saved=api.quality({width:1400,dpr:3,cores:8,saveData:true});
 assert.ok(phone.points<desktop.points);assert.ok(saved.points<desktop.points);assert.ok(desktop.dpr<=1.6);assert.ok(phone.dpr<=1.25);assert.equal(api.quality({reduced:true}).fps,0);
});
test('perspective projects a hand-checked point and stays finite near the camera',()=>{
 assert.equal(typeof api.project,'function');assert.deepEqual(api.project({x:10,y:5,z:50},100),{x:20,y:10,scale:2});
 for(const z of [99,100,10000]){const p=api.project({x:10,y:5,z},100);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}
});
test('metadata work respects concurrency and keeps processing after a rejected request',async()=>{
 assert.equal(typeof api.createQueue,'function');
 const q=api.createQueue(2);let active=0,maximum=0;const out=await Promise.allSettled([0,1,2,3,4].map(i=>q.add(async()=>{active++;maximum=Math.max(maximum,active);await new Promise(r=>setImmediate(r));active--;if(i===1)throw Error('unavailable');return i})));assert.equal(maximum,2);assert.deepEqual(out.filter(x=>x.status==='fulfilled').map(x=>x.value),[0,2,3,4]);q.close();
});
test('leaving the page rejects queued metadata without starting it',async()=>{
 assert.equal(typeof api.createQueue,'function');const q=api.createQueue(1);let release;const first=q.add(()=>new Promise(r=>release=r));let called=false;const waiting=q.add(()=>{called=true});const rejected=assert.rejects(waiting,/closed/i);await new Promise(r=>setImmediate(r));q.close();release('ok');await rejected;assert.equal(await first,'ok');assert.equal(called,false);
});
