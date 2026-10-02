(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KNMotion=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function quality({width=1280,dpr=1,cores=8,saveData=false,reduced=false}={}){
    const light=width<760||cores<=4||saveData;
    return {dpr:Math.min(dpr,light?1.25:1.6),points:light?160:320,rings:light?6:9,fps:reduced?0:light?24:30};
  }
  function project({x,y,z},distance){const scale=distance/Math.max(distance*.25,distance-z);return{x:x*scale,y:y*scale,scale};}
  function createFrameLoop({request,cancel,draw,interval=32,canRun=()=>true}){
    let frame=null,last=-Infinity;
    function tick(time){frame=null;if(!canRun()){last=-Infinity;return;}if(time-last>=interval-.5){last=time;draw(time);}if(canRun()&&frame===null)frame=request(tick);}
    return {start(){if(frame===null&&canRun())frame=request(tick);},stop(){if(frame!==null)cancel(frame);frame=null;last=-Infinity;}};
  }
  function createQueue(limit=3){
    const waiting=[];let running=0,closed=false;
    function pump(){while(!closed&&running<limit&&waiting.length){const job=waiting.shift();running++;Promise.resolve().then(job.run).then(job.resolve,job.reject).finally(()=>{running--;pump();});}}
    return {add(run){return new Promise((resolve,reject)=>{if(closed){reject(Error('Queue closed'));return;}waiting.push({run,resolve,reject});pump();});},close(){closed=true;waiting.splice(0).forEach(job=>job.reject(Error('Queue closed')));}};
  }
  return {clamp,quality,project,createFrameLoop,createQueue};
});
