(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else {root.KNJourney=api;api.mount();}})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function progress(scroll,height,viewport){const range=height-viewport;return range>0&&Number.isFinite(scroll)?Math.max(0,Math.min(1,scroll/range)):0;}
  function activeIndex(tops,line){let active=tops.length?0:-1;tops.forEach((top,index)=>{if(Number.isFinite(top)&&top<=line)active=index;});return active;}
  function scrollFragment(event,doc,animated){
    if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button>0)return false;
    const link=event.target.closest?.('a[href^="#"]');if(!link||link.hasAttribute('data-single-route')||link.getAttribute('target')==='_blank')return false;
    const href=link.getAttribute('href');if(!href||href.length<2)return false;
    let id;try{id=decodeURIComponent(href.slice(1));}catch(_){return false;}
    const target=doc.getElementById(id);if(!target)return false;
    event.preventDefault();target.scrollIntoView({behavior:animated?'smooth':'auto',block:'start'});return true;
  }
  function mount(){
    const root=document.documentElement,artist=root.dataset.motionArtist;
    const chapters=artist==='nova'?[['nova-hero','البداية','START'],['nova-story','القصة','STORY'],['nova-skills','المهارات','CRAFT'],['nova-tracks','التراكات','TRACKS'],['nova-visuals','الفيديو','VISUAL'],['nova-audio-engineering','الهندسة','AUDIO'],['triple444','TRIPLE 444','CREW'],['nova-social','تواصل','CONNECT']]:[['hero','البداية','START'],['about','عني','STORY'],['studio','الاستوديو','STUDIO'],['songs','الأغاني','MUSIC'],['dass','الدسات','DISS'],['ads','الإعلانات','WORK'],['contact','تواصل','CONNECT']];
    const entries=chapters.map(([id,label,english])=>({id,label,english,element:document.getElementById(id)})).filter(entry=>entry.element);
    if(!entries.length)return;
    const meter=document.createElement('div');meter.className='kn-reading-progress';meter.setAttribute('aria-hidden','true');document.body.append(meter);
    const nav=document.createElement('nav');nav.className='kn-journey';nav.setAttribute('aria-label','تنقل بين أقسام '+artist.toUpperCase());
    entries.forEach((entry,index)=>{const a=document.createElement('a');a.href='#'+entry.id;a.setAttribute('aria-label',entry.label);a.innerHTML='<span class="kn-journey-label"></span><i aria-hidden="true"></i><b aria-hidden="true">'+String(index+1).padStart(2,'0')+'</b>';a.querySelector('span').textContent=entry.label;nav.append(a);entry.link=a;
      if(index>0){const boundary=document.createElement('div');boundary.className='kn-chapter';boundary.setAttribute('aria-hidden','true');boundary.innerHTML='<b>'+String(index).padStart(2,'0')+'</b><span>'+entry.english+'</span><i></i>';const surface=entry.element.matches('section')?(entry.element.querySelector(':scope > .wrap,:scope > .nova-shell')||entry.element):entry.element;surface.prepend(boundary);}
    });document.body.append(nav);
    let frame=0,previous=-1;
    // Fragment URLs otherwise resolve against the outer base of a blob/srcdoc page.
    document.addEventListener('click',event=>scrollFragment(event,document,window.knCanAnimate()));
    const headerLinks=[...document.querySelectorAll('.links a,.nova-nav a')].filter(a=>!a.hasAttribute('data-single-route')&&a.getAttribute('href')?.startsWith('#'));
    function paint(){
      frame=0;if(document.hidden)return;
      const amount=progress(scrollY,Math.max(root.scrollHeight,document.body.scrollHeight),innerHeight);meter.style.setProperty('--kn-progress',amount.toFixed(5));
      const tops=entries.map(entry=>entry.element.getBoundingClientRect().top);let index=activeIndex(tops,Math.min(innerHeight*.32,210));if(amount>=.999&&amount>0)index=entries.length-1;
      if(index!==previous){entries.forEach((entry,i)=>{if(i===index)entry.link.setAttribute('aria-current','location');else entry.link.removeAttribute('aria-current');});headerLinks.forEach(a=>{const active=a.getAttribute('href')==='#'+entries[index].id;a.classList.toggle('kn-current',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});previous=index;}
    }
    const queue=()=>{if(!frame&&!document.hidden)frame=requestAnimationFrame(paint);};
    addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue,{passive:true});document.addEventListener('visibilitychange',queue);
    const observer='ResizeObserver' in window?new ResizeObserver(queue):null;observer?.observe(document.body);paint();
    addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);observer?.disconnect();},{once:true});
  }
  return {progress,activeIndex,scrollFragment,mount};
});
