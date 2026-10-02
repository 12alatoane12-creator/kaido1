(()=>{
  const root=document.documentElement,pref=matchMedia('(prefers-reduced-motion: reduce)');
  let disabled=false;try{disabled=localStorage.getItem('kn-motion')==='off';}catch(_){}
  window.knCanAnimate=()=>!pref.matches&&!disabled;
  function notify(){const enabled=window.knCanAnimate();root.classList.toggle('kn-motion-disabled',!enabled);dispatchEvent(new CustomEvent('KN_MOTION_CHANGE',{detail:{enabled}}));if(parent!==window)parent.postMessage({type:'KN_MOTION_POLICY',enabled,navigation:root.dataset.motionNavigation},'*');}
  window.knToggleMotion=()=>{disabled=!disabled;try{localStorage.setItem('kn-motion',disabled?'off':'on');}catch(_){}notify();};
  pref.addEventListener('change',notify);notify();
})();
