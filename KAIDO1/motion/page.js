(()=>{
  const root=document.documentElement,canAnimate=()=>window.knCanAnimate(),fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
  const processed=new WeakSet(),revealed=new WeakSet(),images=new WeakSet(),styles=new Map();
  let styleFrame=0,epoch=0,entered=false,scrollFrame=0;
  function write(element,name,value){let props=styles.get(element);if(!props){props={};styles.set(element,props);}props[name]=value;if(!styleFrame)styleFrame=requestAnimationFrame(()=>{styleFrame=0;for(const [element,props] of styles)for(const [name,value] of Object.entries(props))element.style.setProperty(name,value);styles.clear();});}
  const revealObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.classList.remove('kn-reveal-pending');entry.target.classList.add('kn-reveal-visible','in');revealObserver.unobserve(entry.target);}),{threshold:.06,rootMargin:'0px 0px -24px 0px'}):null;
  function reveal(element,index){if(revealed.has(element)||element.closest('#hero,.nova-hero'))return;revealed.add(element);element.style.setProperty('--kn-delay',Math.min(index%4*70,210)+'ms');element.classList.remove('in');element.classList.add('kn-reveal-pending');if(canAnimate()&&revealObserver)revealObserver.observe(element);else element.classList.replace('kn-reveal-pending','kn-reveal-visible');}
  const surfaces='.card,.nova-media-card,.photo-frame,.kn-signal-stage,.nova-cap,.nova-story-card,.nova-quote-card,.crew-card,.nova-library-launch,.portal-card,.service-card';
  const controls='.btn,.nova-btn,.nova-back,.nova-mini-link,.explore-btn,.burger,.studio-tab,.experience-tab,.social-pill,.nova-launch-btn,.kn-motion-toggle,[data-scene-mode]';
  function enhance(element){
    if(processed.has(element))return;processed.add(element);
    const surface=element.matches(surfaces),control=element.matches(controls);
    if(surface){element.dataset.knSurface='';const light=document.createElement('span');light.className='kn-surface-light';light.setAttribute('aria-hidden','true');element.append(light);}
    if(control)element.dataset.knControl='';
    if(!fine)return;let bounds=null,boundEpoch=-1;
    function reset(){bounds=null;write(element,'--kn-rx','0deg');write(element,'--kn-ry','0deg');write(element,'--kn-mx-offset','0px');write(element,'--kn-my-offset','0px');}
    element.addEventListener('pointermove',event=>{if(!canAnimate()||event.pointerType==='touch')return;if(!bounds||boundEpoch!==epoch){bounds=element.getBoundingClientRect();boundEpoch=epoch;}const x=KNMotion.clamp((event.clientX-bounds.left)/Math.max(1,bounds.width),0,1),y=KNMotion.clamp((event.clientY-bounds.top)/Math.max(1,bounds.height),0,1);
      if(surface){const limit=element.matches('.kn-signal-stage')?2.3:4;write(element,'--kn-rx',(-(y-.5)*limit*2).toFixed(2)+'deg');write(element,'--kn-ry',((x-.5)*limit*2).toFixed(2)+'deg');write(element,'--kn-mx',Math.round(x*100)+'%');write(element,'--kn-my',Math.round(y*100)+'%');}
      if(control){write(element,'--kn-mx-offset',((x-.5)*5).toFixed(2)+'px');write(element,'--kn-my-offset',((y-.5)*5).toFixed(2)+'px');}
    },{passive:true});['pointerleave','pointercancel','blur'].forEach(type=>element.addEventListener(type,reset));
  }
  function mediaAccess(element){
    if(!element)return;
    if(element.matches('.thumb[data-id],.nova-media-card')){
      element.tabIndex=0;element.setAttribute('role','button');element.setAttribute('aria-haspopup','dialog');const card=element.closest('.card,.nova-media-card'),title=card?.querySelector('h3')?.textContent||'تشغيل الفيديو';element.setAttribute('aria-label','تشغيل: '+title);
      if(!element.dataset.knKeyboard){element.dataset.knKeyboard='';element.addEventListener('keydown',event=>{if(event.target===element&&(event.key==='Enter'||event.key===' ')){event.preventDefault();element.click();}});}
    }
  }
  function mediaFooter(card){const body=card.querySelector('.card-body,.nova-media-body');if(!body||body.querySelector('.kn-card-bottom'))return;const footer=document.createElement('span');footer.className='kn-card-bottom';footer.setAttribute('aria-hidden','true');footer.innerHTML='<span>PLAY / LISTEN</span><b>↗</b>';body.append(footer);}
  function imageLifecycle(img){
    if(images.has(img))return;images.add(img);img.decoding='async';img.classList.add('kn-image-pending');
    let finished=false;
    const ready=()=>{if(finished)return;finished=true;img.classList.remove('kn-image-pending','kn-image-error');img.classList.add('kn-image-ready');};
    const decode=()=>{if(img.decode)img.decode().catch(()=>{}).then(ready);else ready();};
    const error=()=>{if(finished)return;finished=true;img.classList.remove('kn-image-pending');img.classList.add('kn-image-error');const parent=img.parentElement;if(parent?.matches('.thumb,.nova-media-thumb')&&!parent.querySelector('.kn-image-fallback')){const fallback=document.createElement('span');fallback.className='kn-image-fallback';fallback.textContent='المعاينة غير متاحة';parent.prepend(fallback);}};
    img.addEventListener('load',decode,{once:true});img.addEventListener('error',error,{once:true});if(img.complete){if(img.naturalWidth)decode();else error();}
  }
  function query(scope,selector){const result=[...scope.querySelectorAll(selector)];if(scope.matches?.(selector))result.unshift(scope);return result;}
  function scan(scope){query(scope,surfaces+','+controls).forEach(enhance);query(scope,'.reveal,.nova-reveal').forEach(reveal);query(scope,'.thumb[data-id],.nova-media-card').forEach(mediaAccess);query(scope,'.card,.nova-media-card').forEach(mediaFooter);query(scope,'.thumb img,.nova-media-thumb img,.photo-frame img,.crew-card img').forEach(imageLifecycle);}
  scan(document);
  const mutationObserver=new MutationObserver(records=>{const scopes=new Set();for(const record of records){for(const node of record.addedNodes){if(node.nodeType===1&&!node.matches('.kn-surface-light,.kn-card-bottom,.kn-ripple,.kn-image-fallback'))scopes.add(node);}const parent=record.target.nodeType===1?record.target:record.target.parentElement;const card=parent?.closest('.card,.nova-media-card');if(card)mediaAccess(card.matches('.nova-media-card')?card:card.querySelector('.thumb'));}scopes.forEach(scan);});
  mutationObserver.observe(document.body,{childList:true,subtree:true});
  const heroItems=[...document.querySelectorAll('#hero .hero-kicker,#hero h1,#hero .hero-signature,#hero .hero-tag,#hero .hero-meta,#hero .hero-cta,#hero .kn-hero-index,.nova-hero .nova-overline,.nova-hero h1,.nova-hero-copy>p,.nova-hero .nova-hero-meta,.nova-hero .nova-hero-actions')];
  heroItems.forEach((element,index)=>{element.classList.add('kn-hero-item');element.style.setProperty('--kn-delay',Math.min(index*65,350)+'ms');});
  document.querySelectorAll('.kn-hero-visual').forEach(element=>{element.classList.add('kn-hero-item');element.style.setProperty('--kn-delay','120ms');});
  document.querySelectorAll('.nova-hero-copy,.nova-machine').forEach(element=>element.classList.add('in'));
  const parallax=new Map();
  function parallaxPaint(){
    scrollFrame=0;if(!entered||!canAnimate()||innerWidth<=760||document.hidden)return;
    for(const [element,previous] of parallax){const rect=element.getBoundingClientRect();const normalTop=rect.top-previous;const amount=KNMotion.clamp((innerHeight*.38-normalTop)*.045,-24,24);parallax.set(element,amount);write(element,'--kn-parallax',amount.toFixed(2)+'px');}
    document.querySelector('.nova-nav')?.classList.toggle('kn-scrolled',scrollY>24);
  }
  document.querySelectorAll('.kn-hero-visual').forEach(element=>parallax.set(element,0));
  function queueScroll(){epoch++;if(!scrollFrame)scrollFrame=requestAnimationFrame(parallaxPaint);}
  addEventListener('scroll',queueScroll,{passive:true});addEventListener('resize',queueScroll,{passive:true});
  document.addEventListener('click',event=>{const button=event.target.closest('[data-kn-control]');if(!button||!canAnimate())return;const rect=button.getBoundingClientRect(),ripple=document.createElement('span');ripple.className='kn-ripple';ripple.setAttribute('aria-hidden','true');ripple.style.left=(event.detail?event.clientX-rect.left:rect.width/2)+'px';ripple.style.top=(event.detail?event.clientY-rect.top:rect.height/2)+'px';button.append(ripple);setTimeout(()=>ripple.remove(),750);});
  const motionButtons=[...document.querySelectorAll('.kn-motion-toggle')],pref=matchMedia('(prefers-reduced-motion: reduce)');
  function syncMotion(){const enabled=canAnimate();motionButtons.forEach(button=>{button.setAttribute('aria-pressed',String(enabled));button.disabled=pref.matches;button.querySelector('.kn-motion-label').textContent=pref.matches?'الحركة مخفّفة':enabled?'الحركة مفعّلة':'الحركة متوقفة';button.title=pref.matches?'مفعّل من إعدادات تقليل الحركة في جهازك':'تفعيل أو إيقاف حركة الموقع';});if(!enabled){document.querySelectorAll('.kn-reveal-pending').forEach(element=>{element.classList.remove('kn-reveal-pending');element.classList.add('kn-reveal-visible','in');});document.querySelectorAll('[data-kn-surface],[data-kn-control]').forEach(element=>{['--kn-rx','--kn-ry'].forEach(name=>write(element,name,'0deg'));['--kn-mx-offset','--kn-my-offset'].forEach(name=>write(element,name,'0px'));});for(const [element] of parallax){parallax.set(element,0);write(element,'--kn-parallax','0px');}}else queueScroll();}
  motionButtons.forEach(button=>button.addEventListener('click',()=>window.knToggleMotion()));addEventListener('KN_MOTION_CHANGE',syncMotion);syncMotion();
  const sectionObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('kn-section-paused',!entry.isIntersecting)),{rootMargin:'120px'}):null;document.querySelectorAll('section[id],.nova-hero').forEach(element=>sectionObserver?.observe(element));
  function visibility(){root.classList.toggle('kn-document-hidden',document.hidden);if(!document.hidden)queueScroll();}document.addEventListener('visibilitychange',visibility);visibility();
  function enter(){if(entered)return;entered=true;root.classList.add('kn-page-entered');window.knEnterScenes?.();queueScroll();}
  const navigation=Number(root.dataset.motionNavigation);
  addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='KN_PAGE_ENTER'&&Number(event.data.navigation)===navigation)enter();});
  if(parent===window)enter();else {parent.postMessage({type:'KN_PAGE_READY',page:root.dataset.motionArtist,navigation},'*');setTimeout(enter,1100);}
  addEventListener('pagehide',()=>{mutationObserver.disconnect();revealObserver?.disconnect();sectionObserver?.disconnect();if(styleFrame)cancelAnimationFrame(styleFrame);if(scrollFrame)cancelAnimationFrame(scrollFrame);},{once:true});
})();
