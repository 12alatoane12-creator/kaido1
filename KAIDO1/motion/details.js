/* Small DOM details. Accessibility/focus stays owned by accessibility.js. */
(()=>{
  const groups=[...document.querySelectorAll('.studio-tabs,.experience-tabs,.kn-scene-switch')],markers=new Map();let frame=0;
  groups.forEach(group=>{const marker=document.createElement('span');marker.className='kn-tab-marker';marker.setAttribute('aria-hidden','true');group.append(marker);markers.set(group,marker);});
  function updateMarker(group,marker){
    const active=group.querySelector('[aria-selected=true],[aria-pressed=true],.active');
    if(!active||!group.offsetWidth){marker.hidden=true;return;}marker.hidden=false;
    marker.style.setProperty('--kn-tab-x',active.offsetLeft+'px');marker.style.setProperty('--kn-tab-y',active.offsetTop+'px');marker.style.width=active.offsetWidth+'px';marker.style.height=active.offsetHeight+'px';
  }
  function collections(){
    document.querySelectorAll('.songs-grid,.dass-grid,.ads-grid,.nova-media-grid').forEach(grid=>{
      const cards=[...grid.children].filter(card=>card.matches('.card,.nova-media-card'));
      cards.forEach((card,index)=>{let number=card.querySelector('.kn-release-index');if(!number){number=document.createElement('span');number.className='kn-release-index';number.setAttribute('aria-hidden','true');card.querySelector('.thumb,.nova-media-thumb')?.append(number);}const text=String(index+1).padStart(2,'0')+' / '+(grid.closest('#ads')?'WORK':'RELEASE');if(number.textContent!==text)number.textContent=text;});
      const section=grid.closest('section'),head=section?.querySelector('.sec-head,.nova-section-head');if(!head)return;
      let count=head.querySelector('.kn-collection-count');if(!count){count=document.createElement('span');count.className='kn-collection-count';head.append(count);}const text=String(cards.length).padStart(2,'0')+' عمل';if(count.textContent!==text)count.textContent=text;
      let empty=grid.querySelector('.kn-collection-empty');if(!cards.length&&!empty){empty=document.createElement('p');empty.className='kn-collection-empty';empty.textContent='ماكو أعمال بهذا القسم حاليًا. ارجع قريبًا.';grid.append(empty);}else if(cards.length&&empty)empty.remove();
    });
  }
  function refresh(){frame=0;markers.forEach((marker,group)=>updateMarker(group,marker));collections();}
  const queue=()=>{if(!frame)frame=requestAnimationFrame(refresh);};
  const groupObserver=new MutationObserver(queue);groups.forEach(group=>groupObserver.observe(group,{attributes:true,subtree:true,attributeFilter:['class','aria-selected','aria-pressed']}));
  const contentObserver=new MutationObserver(records=>{if(records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1)||record.target.closest?.('.card,.nova-media-card')))queue();});contentObserver.observe(document.body,{childList:true,subtree:true});
  const resizeObserver='ResizeObserver' in window?new ResizeObserver(queue):null;groups.forEach(group=>resizeObserver?.observe(group));
  addEventListener('resize',queue,{passive:true});addEventListener('KN_MOTION_CHANGE',queue);refresh();
  addEventListener('pagehide',()=>{groupObserver.disconnect();contentObserver.disconnect();resizeObserver?.disconnect();if(frame)cancelAnimationFrame(frame);},{once:true});
})();
