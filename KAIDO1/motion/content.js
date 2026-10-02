(()=>{
  const queue=KNMotion.createQueue(3),jobs=new WeakMap();
  function load(card){const run=jobs.get(card);if(!run)return;jobs.delete(card);observer?.unobserve(card);queue.add(run).catch(()=>{});}
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)load(entry.target);}),{rootMargin:'360px'}):null;
  window.knDeferMetadata=(card,run,archive=false)=>{jobs.set(card,run);if(archive||!observer)load(card);else observer.observe(card);};
  addEventListener('pagehide',()=>queue.close(),{once:true});
})();
