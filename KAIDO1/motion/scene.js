(()=>{
  const controllers=[];
  for(const stage of document.querySelectorAll('.kn-signal-stage')){
    const canvas=stage.querySelector('canvas'),ctx=canvas?.getContext('2d');if(!ctx)continue;
    const artist=stage.dataset.sceneArtist,isNova=artist==='nova';
    let width=1,height=1,config,loop,visible=true,entered=false,mode='orbit',pointer={x:0,y:0},target={x:0,y:0},bounds=null,resizeFrame=0,haze;
    const points=Array.from({length:320},(_,i)=>{const y=1-i/319*2,r=Math.sqrt(1-y*y),a=i*2.3999632297;return{x:Math.cos(a)*r,y,z:Math.sin(a)*r};});
    function rotate(point,a,b,c){const sa=Math.sin(a),ca=Math.cos(a),sb=Math.sin(b),cb=Math.cos(b),sc=Math.sin(c),cc=Math.cos(c),y=point.y*ca-point.z*sa,z=point.y*sa+point.z*ca,x=point.x*cb+z*sb,nz=-point.x*sb+z*cb;return{x:x*cc-y*sc,y:x*sc+y*cc,z:nz};}
    function paint(time){
      ctx.clearRect(0,0,width,height);if(haze){ctx.fillStyle=haze;ctx.fillRect(0,0,width,height);}
      const t=time*.00015,radius=Math.min(width*.34,height*.32),cx=width*.5,cy=height*.48,distance=radius*4.7;
      pointer.x+=(target.x-pointer.x)*.09;pointer.y+=(target.y-pointer.y)*.09;
      const a=-.26+pointer.y*.3,b=t*.48+pointer.x*.32,c=-.32+Math.sin(t*.3)*.08;
      const gold=stage.querySelector('.is-gold'),color=isNova&&!gold?'126,194,245':'222,191,134';
      ctx.save();ctx.translate(cx,cy);ctx.lineCap='round';
      for(let ring=0;ring<config.rings;ring++){
        const f=ring/(config.rings-1),r=radius*(.47+f*.5);ctx.beginPath();
        const segments=config.points<200?52:88;
        for(let j=0;j<=segments;j++){
          const angle=j/segments*Math.PI*2;
          const wave=Math.sin(angle*3+t*2.4+ring*.43)*radius*.075;
          const point=mode==='wave'?{x:Math.cos(angle)*r,y:Math.sin(angle*2+t+ring*.4)*radius*.18+(f-.5)*radius*.64,z:Math.sin(angle)*r*.73}:{x:Math.cos(angle)*r,y:wave+(f-.5)*radius*.52,z:Math.sin(angle)*r};
          const p=KNMotion.project(rotate(point,a,b,c),distance);if(j===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
        }
        ctx.strokeStyle=`rgba(${color},${.17+f*.25})`;ctx.lineWidth=ring%3===0?1.1:.7;ctx.stroke();
      }
      for(let i=0;i<config.points;i++){
        const raw=points[Math.floor(i*320/config.points)],p=rotate({x:raw.x*radius*1.04,y:raw.y*radius*.96,z:raw.z*radius},a,b,c),q=KNMotion.project(p,distance),alpha=KNMotion.clamp((p.z/radius+1.4)*.22,.08,.55);
        ctx.fillStyle=`rgba(${color},${alpha})`;ctx.beginPath();ctx.arc(q.x,q.y,(i%17===0?1.7:.9)*q.scale,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
    function canRun(){return entered&&visible&&!document.hidden&&window.knCanAnimate();}
    function resize(){
      resizeFrame=0;const rect=stage.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);bounds=null;
      config=KNMotion.quality({width:innerWidth,dpr:devicePixelRatio||1,cores:navigator.hardwareConcurrency||8,saveData:navigator.connection?.saveData,reduced:!window.knCanAnimate()});
      canvas.width=Math.round(width*config.dpr);canvas.height=Math.round(height*config.dpr);ctx.setTransform(config.dpr,0,0,config.dpr,0,0);
      haze=ctx.createRadialGradient(width*.5,height*.5,0,width*.5,height*.5,width*.56);haze.addColorStop(0,isNova?'rgba(58,108,170,.1)':'rgba(115,81,172,.09)');haze.addColorStop(1,'rgba(0,0,0,0)');
      loop?.stop();loop=KNMotion.createFrameLoop({request:requestAnimationFrame,cancel:cancelAnimationFrame,draw:paint,interval:1000/(config.fps||30),canRun});paint(0);loop.start();
    }
    const queueResize=()=>{if(!resizeFrame)resizeFrame=requestAnimationFrame(resize);};
    const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)loop?.start();else loop?.stop();},{rootMargin:'80px'}):null;observer?.observe(stage);
    if('ResizeObserver' in window)new ResizeObserver(queueResize).observe(stage);else addEventListener('resize',queueResize,{passive:true});
    if(matchMedia('(hover:hover) and (pointer:fine)').matches){stage.addEventListener('pointermove',event=>{if(!window.knCanAnimate()||event.pointerType==='touch')return;bounds||=stage.getBoundingClientRect();target={x:(event.clientX-bounds.left)/bounds.width-.5,y:(event.clientY-bounds.top)/bounds.height-.5};},{passive:true});stage.addEventListener('pointerleave',()=>{target={x:0,y:0};bounds=null;});}
    addEventListener('scroll',()=>{bounds=null;},{passive:true});
    stage.parentElement.querySelectorAll('[data-scene-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.sceneMode;stage.parentElement.querySelectorAll('[data-scene-mode]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));paint(0);}));
    stage.querySelector('#novaLogoStage')?.addEventListener('click',()=>paint(0));
    addEventListener('KN_MOTION_CHANGE',()=>{pointer=target={x:0,y:0};queueResize();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)loop?.stop();else loop?.start();});
    addEventListener('pagehide',()=>{loop?.stop();if(resizeFrame)cancelAnimationFrame(resizeFrame);observer?.disconnect();},{once:true});
    controllers.push({enter(){entered=true;loop?.start();}});resize();
  }
  window.knEnterScenes=()=>controllers.forEach(controller=>controller.enter());
})();
