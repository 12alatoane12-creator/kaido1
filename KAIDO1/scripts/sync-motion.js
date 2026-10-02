const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),embedMedia=require('./media');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const inlineScript=text=>'<script>'+text.replace(/<\/script/gi,'<\\/script')+'</script>';
const early=['engine','forms','policy','content'].map(name=>read('motion/'+name+'.js')).join('\n');
const end=['scene','journey','details','page','accessibility'].map(name=>read('motion/'+name+'.js')).join('\n');
const pageStyle=read('motion/experience.css')+'\n'+read('motion/refinement.css');
const packed={};
for(const artist of ['kaido','nova']){
  let html=embedMedia(read('source/pages/'+artist+'.html'));
  html=html.replace(/<html([^>]*)>/i,'<html$1 data-motion-artist="'+artist+'" data-motion-navigation="__KN_NAV_ID__">');
  html=html.replace(/<\/head>/i,'<style id="kn-experience-style">'+pageStyle+'</style>'+inlineScript(early)+'</head>');
  html=html.replace(/<\/body>/i,inlineScript(end)+'</body>');
  packed[artist]=zlib.gzipSync(html,{level:9}).toString('base64');
}
const loaderMarkup=`<div id="boot" role="status" aria-live="polite" data-artist="kaido"><div class="kn-loader-veil v1" aria-hidden="true"></div><div class="kn-loader-veil v2" aria-hidden="true"></div><span class="kn-loader-ghost" aria-hidden="true">KAIDO</span><div class="kn-loader"><svg class="kn-loader-form" viewBox="0 0 180 180" aria-hidden="true"><circle class="kn-loader-track" cx="90" cy="90" r="67"/><circle class="kn-loader-ring" cx="90" cy="90" r="67"/><ellipse class="kn-loader-track" cx="90" cy="90" rx="57" ry="24" transform="rotate(-30 90 90)"/><ellipse class="kn-loader-ring r2" cx="90" cy="90" rx="57" ry="24"/><path class="kn-loader-signal" d="M39 90h17l7-16 10 33 9-52 11 67 10-38 9 16 9-10h20"/><circle class="kn-loader-point" cx="90" cy="23" r="2"/></svg><div class="kn-loader-brand"><b class="kaido">KAIDO</b><i></i><b class="nova">NOVA</b></div><div class="kn-loader-label">TWO ARTISTS · ONE UNIVERSE</div><div id="knBootStatus">جاري تجهيز التجربة…</div><button id="knBootRetry" type="button" hidden>إعادة المحاولة</button></div></div>`;
for(const [template,destination] of [['source/shell-local.html','index.html'],['source/shell-hosted.html','public/index.html']]){
  let shell=embedMedia(read(template));
  shell=shell.replace('__KN_PAGE_KAIDO__',packed.kaido).replace('__KN_PAGE_NOVA__',packed.nova);
  shell=shell.replace(/<div id="boot">[\s\S]*?<\/div>/,loaderMarkup);
  shell=shell.replace(/<\/head>/i,'<style id="kn-shell-style">'+read('motion/shell.css')+'</style>'+inlineScript(read('motion/loader.js'))+'</head>');
  shell=shell.replace('__KN_SHELL_RUNTIME__',()=>read('motion/shell.js'));
  fs.writeFileSync(path.join(root,destination),shell);
  console.log(destination+': '+Buffer.byteLength(shell)+' bytes');
}
