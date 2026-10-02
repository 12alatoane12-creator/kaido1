const test=require('node:test'),assert=require('node:assert/strict');
const {progress,activeIndex,scrollFragment}=require('../motion/journey');
test('scroll progress stays truthful on short, long and overscrolled documents',()=>{
 assert.equal(progress(0,700,900),0);assert.equal(progress(200,700,900),0);assert.equal(progress(500,3000,1000),.25);assert.equal(progress(2500,3000,1000),1);assert.equal(progress(-100,3000,1000),0);assert.equal(progress(NaN,3000,1000),0);
});
test('section selection follows the reading line, including the first and final sections',()=>{
 assert.equal(activeIndex([],160),-1);assert.equal(activeIndex([250,800,1200],160),0);assert.equal(activeIndex([-400,80,700],160),1);assert.equal(activeIndex([-700,-400,-20],160),2);
});
test('duplicate section boundaries choose the later section and invalid boundaries are ignored',()=>{
 assert.equal(activeIndex([-50,100,100,700],160),2);assert.equal(activeIndex([NaN,90,Infinity],160),1);
});
test('local section links use the raw fragment and scroll the child despite the outer base URL',()=>{
 let prevented=false,options;const anchor={href:'https://kaido-1.vercel.app/#nova-tracks',getAttribute:()=> '#nova-tracks',hasAttribute:()=>false};
 const event={target:{closest:()=>anchor},preventDefault(){prevented=true;}};
 const doc={getElementById:id=>{assert.equal(id,'nova-tracks');return {scrollIntoView:value=>options=value};}};
 assert.equal(scrollFragment(event,doc,true),true);assert.equal(prevented,true);assert.deepEqual(options,{behavior:'smooth',block:'start'});
});
test('reduced motion scrolls immediately and modified/cross-artist clicks retain their own behavior',()=>{
 let calls=0,options;const anchor={getAttribute:()=> '#about',hasAttribute:()=>false},doc={getElementById:()=>({scrollIntoView:value=>{calls++;options=value;}})};
 const event={target:{closest:()=>anchor},preventDefault(){}};assert.equal(scrollFragment(event,doc,false),true);assert.equal(options.behavior,'auto');
 for(const property of ['ctrlKey','metaKey','shiftKey','altKey','defaultPrevented'])assert.equal(scrollFragment({...event,[property]:true},doc,true),false);
 anchor.hasAttribute=()=>true;assert.equal(scrollFragment(event,doc,true),false);assert.equal(calls,1);
});
