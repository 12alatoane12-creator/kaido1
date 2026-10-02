const knBootStatus=document.getElementById('knBootStatus'),knBootRetry=document.getElementById('knBootRetry');
const knLoader=KNLoader.create({
  show(page){boot.dataset.artist=page;boot.dataset.phase=currentPage?'transition':'initial';boot.classList.remove('hide','failed');knBootRetry.hidden=true;knBootStatus.textContent=currentPage?'جاري الانتقال إلى '+page.toUpperCase()+'…':'جاري تجهيز التجربة…';frame.classList.remove('kn-live');frame.setAttribute('aria-busy','true');document.body.classList.add('kn-loading');if(typeof hideMusicGuide==='function')hideMusicGuide(true);},
  hide(){frame.classList.add('kn-live');frame.setAttribute('aria-busy','false');boot.classList.add('hide');document.body.classList.remove('kn-loading');musicTransition.className='';},
  slow(){knBootStatus.textContent='التجهيز يستغرق وقتًا أطول…';},
  fail(){boot.classList.add('failed');knBootStatus.textContent='تعذّر فتح التجربة. أعد المحاولة.';knBootRetry.hidden=false;frame.setAttribute('aria-busy','false');document.body.classList.remove('kn-loading');},
  enter(page,navigation){try{frame.contentWindow.postMessage({type:'KN_PAGE_ENTER',page,navigation},'*');frame.contentWindow.postMessage({type:'KIDO_ASSIST_CONTEXT_PING'},'*');}catch(_){}if(typeof scheduleMusicGuide==='function')scheduleMusicGuide(8500);}
});
knBootRetry.addEventListener('click',()=>{const page=currentPage||hashToState().page||'kaido';mgHtmlCache.delete(page);loadPage(page,'','replace');});
document.addEventListener('visibilitychange',()=>document.body.classList.toggle('kn-document-hidden',document.hidden));
addEventListener('message',event=>{
  if(event.source!==frame.contentWindow)return;const data=event.data||{};
  if(data.type==='KN_PAGE_READY'){knLoader.ready(data.page,Number(data.navigation));return;}
  if(data.type==='KN_MOTION_POLICY'&&Number(data.navigation)===loadSequence){document.body.classList.toggle('kn-motion-off',!data.enabled);if(typeof mgMotion!=='undefined'&&mgMotion.ready){cancelAnimationFrame(mgMotion.raf);mgMotion.raf=0;mgMotion.last=0;if(!data.enabled)mgMotionFrame(performance.now());else mgMotionWake();}}
});
