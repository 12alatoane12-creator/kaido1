(()=>{
  function tabs(key){
    const items=[...document.querySelectorAll(`[data-${key}-tab]`)],panels=[...document.querySelectorAll(`[data-${key}-panel]`)];if(!items.length)return;
    const tablist=items[0].parentElement;tablist.setAttribute('role','tablist');
    function sync(){items.forEach((item,index)=>{const active=item.classList.contains('active');item.id||=(key+'-tab-'+index);item.setAttribute('role','tab');item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;const name=item.dataset[key+'Tab'],panel=panels.find(panel=>panel.dataset[key+'Panel']===name);if(panel){panel.id||=(key+'-panel-'+index);item.setAttribute('aria-controls',panel.id);panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',item.id);panel.hidden=!active;}});}
    items.forEach((item,index)=>{item.addEventListener('click',sync);item.addEventListener('keydown',event=>{let next;switch(event.key){case 'ArrowLeft':next=(index+1)%items.length;break;case 'ArrowRight':next=(index-1+items.length)%items.length;break;case 'Home':next=0;break;case 'End':next=items.length-1;break;default:return;}event.preventDefault();items[next].click();items[next].focus({preventScroll:true});});});sync();
  }
  tabs('studio');tabs('experience');
  const dialogs=[...document.querySelectorAll('#experienceMenu,#novaLibraryModal,#videoModal')].map(overlay=>{
    const surface=overlay.querySelector('.experience-shell,.nova-library-window,.modal-inner')||overlay;
    surface.setAttribute('role','dialog');surface.setAttribute('aria-modal','true');surface.setAttribute('aria-label',overlay.id==='videoModal'?'مشغل الفيديو':overlay.id==='experienceMenu'?'استكشف الموقع':'مكتبة الأعمال');surface.tabIndex=-1;
    let open=false,previous=null;
    function focusables(){return[...surface.querySelectorAll('a[href],button,input,select,textarea,iframe,[tabindex]:not([tabindex="-1"]):not([data-kn-focus-guard])')].filter(element=>!element.disabled&&!element.closest('[hidden]')&&element.getClientRects().length);}
    // Tab events in a nested player do not bubble. Native focus boundaries wrap them.
    for(const side of ['start','end']){const guard=document.createElement('span');guard.className='kn-focus-guard';guard.dataset.knFocusGuard=side;guard.tabIndex=0;guard.setAttribute('aria-hidden','true');guard.addEventListener('focus',()=>{if(!open)return;const items=focusables(),target=side==='end'?items[0]:items.at(-1);(target||surface).focus({preventScroll:true});});if(side==='start')surface.prepend(guard);else surface.append(guard);}
    function update(){const next=overlay.classList.contains('open');overlay.inert=!next;overlay.setAttribute('aria-hidden',String(!next));if(next===open)return;open=next;if(open){previous=document.activeElement;const first=surface.querySelector('input')||surface.querySelector('.experience-close,.nova-library-close,.modal-close')||focusables()[0]||surface;requestAnimationFrame(()=>{if(open)first.focus({preventScroll:true});});}else if(previous?.isConnected)previous.focus({preventScroll:true});}
    new MutationObserver(update).observe(overlay,{attributes:true,attributeFilter:['class']});update();
    return {overlay,surface,focusables,isOpen:()=>open};
  });
  function activeDialog(){return dialogs.find(dialog=>dialog.overlay.id==='videoModal'&&dialog.isOpen())||dialogs.find(dialog=>dialog.isOpen());}
  document.addEventListener('focusin',event=>{const dialog=activeDialog();if(dialog&&!dialog.surface.contains(event.target))(dialog.focusables()[0]||dialog.surface).focus({preventScroll:true});});
  document.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const dialog=activeDialog();if(!dialog)return;const items=dialog.focusables();if(!items.length){event.preventDefault();dialog.surface.focus();return;}const first=items[0],last=items.at(-1),active=document.activeElement;if(event.shiftKey&&(active===first||!dialog.surface.contains(active))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(active===last||!dialog.surface.contains(active))){event.preventDefault();first.focus();}});
})();
