const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Only the unavailable browser DOM boundary is simulated; execute the emitted policy module itself.
function fixture(){
 const observers=[],frames=[],attrs=new Map(),handlers=new Map();let opened=false;
 const previous={isConnected:true,focus(){}};
 const close={disabled:false,isConnected:true,getClientRects:()=>[{}],closest:()=>null,focus(){document.activeElement=close}};
 const guards=[];
 const surface={setAttribute(){},querySelector:selector=>selector==='input'?null:close,querySelectorAll:()=>[close],contains:element=>element===close,focus(){},prepend:element=>guards.push(element),append:element=>guards.push(element)};
 const overlay={id:'videoModal',querySelector:()=>surface,classList:{contains:()=>opened},setAttribute:(name,value)=>attrs.set(name,value)};
 const document={activeElement:previous,querySelectorAll:selector=>selector.startsWith('[data-')?[]:[overlay],addEventListener:(type,fn)=>handlers.set(type,fn),createElement:()=>({dataset:{},setAttribute(){},addEventListener(type,fn){this[type]=fn}})};
 const context={document,requestAnimationFrame:fn=>frames.push(fn),MutationObserver:class{constructor(fn){observers.push(fn)}observe(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../motion/accessibility.js'),'utf8'),context);
 return {overlay,attrs,document,close,guards,open(value){opened=value;observers.forEach(fn=>fn());while(frames.length)frames.shift()();},focusOutside(){const outside={};document.activeElement=outside;handlers.get('focusin')?.({target:outside});}};
}
test('closed video dialogs are inert and excluded from assistive navigation',()=>{const f=fixture();assert.equal(f.overlay.inert,true);assert.equal(f.attrs.get('aria-hidden'),'true');});
test('opening a dialog enables its controls and closing excludes them again',()=>{const f=fixture();f.open(true);assert.equal(f.overlay.inert,false);assert.equal(f.attrs.get('aria-hidden'),'false');f.open(false);assert.equal(f.overlay.inert,true);assert.equal(f.attrs.get('aria-hidden'),'true');});
test('focus leaving a nested player returns to the open dialog',()=>{const f=fixture();f.open(true);f.focusOutside();assert.equal(f.document.activeElement,f.close);});
test('a focus boundary after the player wraps navigation before it reaches the shell',()=>{const f=fixture();f.open(true);assert.equal(f.guards.length,2);f.document.activeElement={};f.guards[1].focus();assert.equal(f.document.activeElement,f.close);});
