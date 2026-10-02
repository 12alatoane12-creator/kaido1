const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),embedMedia=require('./media');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const inlineScript=text=>'<script>'+text.replace(/<\/script/gi,'<\\/script')+'</script>';
const early=['engine','policy','content'].map(name=>read('motion/'+name+'.js')).join('\n');
const end=['scene','page','accessibility'].map(name=>read('motion/'+name+'.js')).join('\n');
const pageStyle=read('motion/experience.css');
const packed={};
for(const artist of ['kaido','nova']){
  let html=embedMedia(read('source/pages/'+artist+'.html'));
  html=html.replace(/<html([^>]*)>/i,'<html$1 data-motion-artist="'+artist+'" data-motion-navigation="__KN_NAV_ID__">');
  html=html.replace(/<\/head>/i,'<style id="kn-experience-style">'+pageStyle+'</style>'+inlineScript(early)+'</head>');
  html=html.replace(/<\/body>/i,inlineScript(end)+'</body>');
  packed[artist]=zlib.gzipSync(html,{level:9}).toString('base64');
}
const loaderMarkup=`<div id="boot" role="status" aria-live="polite" data-artist="kaido"><div class="kn-loader"><svg class="kn-loader-form" viewBox="0 0 180 180" aria-hidden="true"><circle class="kn-loader-track" cx="90" cy="90" r="67"/><circle class="kn-loader-ring" cx="90" cy="90" r="67"/><ellipse class="kn-loader-track" cx="90" cy="90" rx="57" ry="24" transform="rotate(-30 90 90)"/><ellipse class="kn-loader-ring r2" cx="90" cy="90" rx="57" ry="24"/><path class="kn-loader-signal" d="M39 90h17l7-16 10 33 9-52 11 67 10-38 9 16 9-10h20"/><circle class="kn-loader-point" cx="90" cy="23" r="2"/></svg><div class="kn-loader-brand"><b class="kaido">KAIDO</b><i></i><b class="nova">NOVA</b></div><div class="kn-loader-label">TWO ARTISTS · ONE UNIVERSE</div><div id="knBootStatus">جاري تجهيز التجربة…</div><button id="knBootRetry" type="button" hidden>إعادة المحاولة</button></div></div>`;
for(const [template,destination] of [['source/shell-local.html','index.html'],['source/shell-hosted.html','public/index.html']]){
  let shell=embedMedia(read(template));
  shell=shell.replace('__KN_PAGE_KAIDO__',packed.kaido).replace('__KN_PAGE_NOVA__',packed.nova);
  shell=shell.replace(/<div id="boot">[\s\S]*?<\/div>/,loaderMarkup);
  shell=shell.replace(/<\/head>/i,'<style id="kn-shell-style">'+read('motion/shell.css')+'</style>'+inlineScript(read('motion/loader.js'))+'</head>');
  shell=shell.replace(/const musicTransition = document.getElementById\('musicTransition'\);/m,match=>match+'\n'+read('motion/shell.js'));
  // User motion preference also governs the existing assistant rig.
  shell=shell.replace(/mgReduced\.matches/g,'knGuideReduced()');
  shell=shell.replace("const mgReduced = matchMedia('(prefers-reduced-motion: reduce)');","const mgReduced = matchMedia('(prefers-reduced-motion: reduce)');\nfunction knGuideReduced(){return mgReduced.matches||document.body.classList.contains('kn-motion-off');}");
  shell=shell.replace(/(function mgMotionFrame\(now\)\{[\s\S]*?)(\n mgMotionWake\(\);\n\})/,(all,prefix)=>prefix+'\n if(!knGuideReduced())mgMotionWake();\n}');
  const fetchStart=shell.indexOf('async function mgCachedHtml('),fetchEnd=shell.indexOf('\nasync function unpackHtml',fetchStart);
  if(fetchStart<0||fetchEnd<0)throw Error('Content loader not found');
  const fetchFunction=`async function mgCachedHtml(page){
 if(!mgHtmlCache.has(page))mgHtmlCache.set(page,unpackHtml(PACKED[page]).then(async html=>{
   if(location.protocol!=='file:')try{
     const r=await fetch('/api/content',{cache:'no-store',signal:AbortSignal.timeout(6000)});
     if(r.ok){const data=await r.json();const names={kaido:{songs:'songs',dass:'dass',ads:'ads'},nova:{tracks:'NOVA_TRACKS',visuals:'NOVA_VISUALS',audio:'NOVA_AUDIO_ENGINEERING'}};
       for(const [key,name] of Object.entries(names[page]))if(Array.isArray(data[page]?.[key]))html=html.replace(new RegExp('const '+name+'\\\\s*=\\\\s*\\\\[[\\\\s\\\\S]*?\\\\];'),'const '+name+'='+JSON.stringify(data[page][key]).replace(/</g,'\\\\u003c')+';');
     }
   }catch(_){}
   return mgInjectBridge(html,page);
 }).catch(error=>{mgHtmlCache.delete(page);throw error}));
 return mgHtmlCache.get(page);
}`;
  shell=shell.slice(0,fetchStart)+fetchFunction+shell.slice(fetchEnd);
  shell=shell.replace("  const switching = beginMusicTransition(page);\n  boot.classList.remove('hide');","  const switching = false;\n  knLoader.begin(page,sequence);");
  shell=shell.replace('    const html = await mgCachedHtml(page);','    const html = (await mgCachedHtml(page)).replace(/__KN_NAV_ID__/g,String(sequence));');
  shell=shell.replace('    if (switching) await new Promise(resolve => setTimeout(resolve, 360));','');
  shell=shell.replace("      boot.classList.add('hide');","      if(sequence!==loadSequence)return;");
  shell=shell.replace('    boot.textContent=String(err.message||err);','    knLoader.fail(page,sequence,err);');
  // A blob/srcdoc page needs an explicit base for the existing YouTube player.
  shell=shell.replace("function mgInjectBridge(html,page){return html.replace(/<\\/body>/i,MG_BRIDGE_SCRIPT.replace('__KIDO_PAGE__',JSON.stringify(page))+'</body>')}","function mgInjectBridge(html,page){const base=new URL('./',location.href).href;html=html.replace(/<head([^>]*)>/i,'<head$1><base href=\"'+base+'\">');return html.replace(/<\\/body>/i,MG_BRIDGE_SCRIPT.replace('__KIDO_PAGE__',JSON.stringify(page))+'</body>')}");
  fs.writeFileSync(path.join(root,destination),shell);
  console.log(destination+': '+Buffer.byteLength(shell)+' bytes');
}
