(()=>{
  const controllers=[];
  for(const stage of document.querySelectorAll('.kn-signal-stage')){
    const canvas=stage.querySelector('canvas'),ctx=canvas?.getContext('2d');if(!ctx)continue;
    const isNova=stage.dataset.sceneArtist==='nova',controls=[...stage.parentElement.querySelectorAll('[data-scene-mode]')],readout=stage.querySelector('.kn-form-readout'),logo=stage.querySelector('#novaLogoStage');
    const names={knot:'01 / KNOT',orbit:'02 / ORBIT',wave:'03 / WAVE'};
    const particles=Array.from({length:320},(_,i)=>{const y=1-i/319*2,r=Math.sqrt(1-y*y),a=i*2.3999632297;return {x:Math.cos(a)*r,y,z:Math.sin(a)*r};});
    let width=1,height=1,config,loop,mesh,morph,projected,facets=[],haze,floorGlow,visible=true,entered=false,mode='knot',gold=!!logo?.classList.contains('is-gold'),bounds=null,resizeFrame=0,lastTime=null,clock=0;
    const pointer={x:0,y:0},target={x:0,y:0},spin=new Float64Array(6),rotated=new Float64Array(3);
    function rotate(x,y,z){const ry=y*spin[1]-z*spin[0],rz=y*spin[0]+z*spin[1],rx=x*spin[3]+rz*spin[2];rotated[0]=rx*spin[5]-ry*spin[4];rotated[1]=rx*spin[4]+ry*spin[5];rotated[2]=-x*spin[2]+rz*spin[3];}
    function paint(){
      ctx.clearRect(0,0,width,height);if(haze){ctx.fillStyle=haze;ctx.fillRect(0,0,width,height);}
      const radius=Math.min(width*.4,height*.39),cx=width*.5,cy=height*.47,distance=4.7;
      const a=-.68+pointer.y*.3,b=clock*.18+pointer.x*.36,c=-.24+Math.sin(clock*.24)*.05;
      spin[0]=Math.sin(a);spin[1]=Math.cos(a);spin[2]=Math.sin(b);spin[3]=Math.cos(b);spin[4]=Math.sin(c);spin[5]=Math.cos(c);
      const color=isNova&&!gold?'152,206,249':'235,200,147',secondary=isNova&&!gold?'114,144,235':'157,120,220';
      ctx.save();ctx.translate(cx,cy);ctx.lineCap='round';
      ctx.fillStyle=floorGlow;ctx.beginPath();ctx.ellipse(0,radius*.95,radius*.84,radius*.075,0,0,Math.PI*2);ctx.fill();
      const values=morph.values;
      // Projection buffers and facet topology survive every frame; no layout work here.
      for(let i=0;i<mesh.count;i++){
        const offset=i*3;rotate(values[offset],values[offset+1],values[offset+2]);const scale=distance/(distance-rotated[2]);
        projected[offset]=rotated[0]*scale*radius;projected[offset+1]=rotated[1]*scale*radius;projected[offset+2]=rotated[2];
      }
      for(const facet of facets)facet.depth=(projected[facet.a+2]+projected[facet.b+2]+projected[facet.c+2]+projected[facet.d+2])*.25;
      facets.sort((a,b)=>a.depth-b.depth);
      for(const facet of facets){
        ctx.beginPath();ctx.moveTo(projected[facet.a],projected[facet.a+1]);ctx.lineTo(projected[facet.b],projected[facet.b+1]);ctx.lineTo(projected[facet.c],projected[facet.c+1]);ctx.lineTo(projected[facet.d],projected[facet.d+1]);ctx.closePath();
        ctx.fillStyle=`rgba(${facet.depth>0?color:secondary},${.016+(facet.depth+1)*.025})`;ctx.fill();
      }
      for(let pass=0;pass<2;pass++)for(let ring=0;ring<mesh.rings;ring++){
        const highlight=ring%5===0;ctx.beginPath();let connected=false;
        for(let segment=0;segment<=mesh.segments;segment++){
          const offset=(ring*(mesh.segments+1)+segment)*3,front=projected[offset+2]>=0;
          if(Number(front)===pass){if(connected)ctx.lineTo(projected[offset],projected[offset+1]);else ctx.moveTo(projected[offset],projected[offset+1]);connected=true;}else connected=false;
        }
        ctx.strokeStyle=`rgba(${highlight?color:secondary},${pass?(highlight?.72:.43):(highlight?.2:.14)})`;ctx.lineWidth=pass?(highlight?1.15:.65):.5;ctx.stroke();
      }
      ctx.beginPath();
      for(let segment=0;segment<mesh.segments;segment+=config.points<200?8:9)for(let ring=0;ring<mesh.rings;ring++){
        const offset=(ring*(mesh.segments+1)+segment)*3;if(ring===0)ctx.moveTo(projected[offset],projected[offset+1]);else ctx.lineTo(projected[offset],projected[offset+1]);
      }
      ctx.strokeStyle=`rgba(${color},.12)`;ctx.lineWidth=.5;ctx.stroke();
      for(let i=0;i<config.points;i++){
        const raw=particles[Math.floor(i*320/config.points)];rotate(raw.x*1.18,raw.y*1.06,raw.z*1.18);const scale=distance/(distance-rotated[2]),alpha=KNMotion.clamp((rotated[2]+1.5)*.15,.04,.4),x=rotated[0]*scale*radius,y=rotated[1]*scale*radius;
        ctx.fillStyle=`rgba(${color},${alpha})`;ctx.beginPath();ctx.arc(x,y,(i%23===0?1.6:.65)*scale,0,Math.PI*2);ctx.fill();
        if(i%53===0&&rotated[2]>.1){ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.strokeStyle=`rgba(${color},.45)`;ctx.stroke();}
      }
      ctx.restore();
    }
    function tick(time){
      const dt=lastTime===null?0:KNMotion.clamp((time-lastTime)/1000,0,.08);lastTime=time;clock+=dt;
      const damping=1-Math.exp(-8*dt);pointer.x+=(target.x-pointer.x)*damping;pointer.y+=(target.y-pointer.y)*damping;morph.advance(dt);paint();
    }
    function canRun(){return entered&&visible&&!document.hidden&&window.knCanAnimate();}
    function stop(){loop?.stop();lastTime=null;}
    function resize(){
      resizeFrame=0;const rect=stage.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);bounds=null;
      config=KNMotion.quality({width:innerWidth,dpr:devicePixelRatio||1,cores:navigator.hardwareConcurrency||8,saveData:navigator.connection?.saveData,reduced:!window.knCanAnimate()});
      canvas.width=Math.round(width*config.dpr);canvas.height=Math.round(height*config.dpr);ctx.setTransform(config.dpr,0,0,config.dpr,0,0);
      const rings=config.rings*2,segments=config.points<200?48:72;
      if(!mesh||mesh.rings!==rings||mesh.segments!==segments){mesh=KNForms.createMesh(rings,segments);morph=KNForms.createMorph(mesh.forms,mode);projected=new Float32Array(mesh.count*3);facets=[];
        for(let ring=0;ring<mesh.rings-1;ring+=3)for(let segment=0;segment<mesh.segments;segment+=2){const a=(ring*(mesh.segments+1)+segment)*3,b=a+6,d=((ring+1)*(mesh.segments+1)+segment)*3;facets.push({a,b,c:d+6,d,depth:0});}
      }
      if(!window.knCanAnimate())morph.select(mode,{instant:true});
      haze=ctx.createRadialGradient(width*.5,height*.48,0,width*.5,height*.48,width*.56);haze.addColorStop(0,isNova?'rgba(73,122,176,.12)':'rgba(141,94,168,.13)');haze.addColorStop(1,'rgba(0,0,0,0)');
      const floorY=height*.47+Math.min(width*.4,height*.39)*.95;floorGlow=ctx.createRadialGradient(width*.5,floorY,0,width*.5,floorY,width*.34);floorGlow.addColorStop(0,isNova?'rgba(127,193,255,.16)':'rgba(181,130,222,.15)');floorGlow.addColorStop(1,'rgba(0,0,0,0)');
      stop();loop=KNMotion.createFrameLoop({request:requestAnimationFrame,cancel:cancelAnimationFrame,draw:tick,interval:1000/(config.fps||30),canRun});paint();loop.start();
    }
    const queueResize=()=>{if(!resizeFrame)resizeFrame=requestAnimationFrame(resize);};
    const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)loop?.start();else stop();},{rootMargin:'80px'}):null;observer?.observe(stage);
    const sizeObserver='ResizeObserver' in window?new ResizeObserver(queueResize):null;if(sizeObserver)sizeObserver.observe(stage);else addEventListener('resize',queueResize,{passive:true});
    if(matchMedia('(hover:hover) and (pointer:fine)').matches){stage.addEventListener('pointermove',event=>{if(!window.knCanAnimate()||event.pointerType==='touch')return;bounds||=stage.getBoundingClientRect();target.x=KNMotion.clamp((event.clientX-bounds.left)/Math.max(1,bounds.width)-.5,-.5,.5);target.y=KNMotion.clamp((event.clientY-bounds.top)/Math.max(1,bounds.height)-.5,-.5,.5);},{passive:true});stage.addEventListener('pointerleave',()=>{target.x=target.y=0;bounds=null;});}
    addEventListener('scroll',()=>{bounds=null;},{passive:true});
    controls.forEach(button=>button.addEventListener('click',()=>{
      if(!names[button.dataset.sceneMode])return;mode=button.dataset.sceneMode;morph.select(mode,{instant:!window.knCanAnimate()});controls.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));if(readout)readout.textContent=names[mode];paint();loop?.start();
    }));
    const finishObserver=logo?new MutationObserver(()=>{const next=logo.classList.contains('is-gold');if(gold===next)return;gold=next;if(!canRun())paint();}):null;
    finishObserver?.observe(logo,{attributes:true,attributeFilter:['class']});
    addEventListener('KN_MOTION_CHANGE',()=>{pointer.x=pointer.y=target.x=target.y=0;stop();queueResize();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else loop?.start();});
    addEventListener('pagehide',()=>{stop();if(resizeFrame)cancelAnimationFrame(resizeFrame);observer?.disconnect();sizeObserver?.disconnect();finishObserver?.disconnect();},{once:true});
    controllers.push({enter(){entered=true;loop?.start();}});resize();
  }
  window.knEnterScenes=()=>controllers.forEach(controller=>controller.enter());
})();
