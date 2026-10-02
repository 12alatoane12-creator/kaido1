(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KNLoader=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function create({show,hide,slow,fail,enter,setTimer=setTimeout,clearTimer=clearTimeout,request=requestAnimationFrame}){
    let active=null,timer=null;
    const matches=(page,id)=>active&&active.page===page&&active.id===Number(id);
    function clear(){if(timer!==null)clearTimer(timer);timer=null;}
    return {
      begin(page,id){clear();active={page,id:Number(id),state:'loading'};const current=active;show(page,id);timer=setTimer(()=>{timer=null;if(active===current&&active.state==='loading')slow(page,id);},1800);},
      ready(page,id){if(!matches(page,id)||active.state!=='loading')return false;const current=active;active.state='ready';clear();hide(page,id);request(()=>request(()=>{if(active===current&&current.state==='ready')enter(page,id);}));return true;},
      fail(page,id,error){if(!matches(page,id)||active.state!=='loading')return false;active.state='failed';clear();fail(error,page,id);return true;}
    };
  }
  return {create};
});
