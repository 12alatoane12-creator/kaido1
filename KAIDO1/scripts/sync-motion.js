const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const asset = name => fs.readFileSync(path.join(root, 'motion', name), 'utf8');
const literal = value => JSON.stringify(value).replace(/</g, '\\u003c');

function patchPage(html, page) {
  html = html.replaceAll('  if(!window.knCanAnimate())return;\n  if(!window.knCanAnimate())return;\n', '  if(!window.knCanAnimate())return;\n');
  if (html.includes('KN_LEGACY_MOTION_PATCHED v1')) return html;
  // Existing content and embedded imagery remain the source of each page.
  if (page === 'kaido') {
    html = html.replace(/\/\* ================= SCROLL REVEAL ================= \*\/[\s\S]*?(?=\/\* ================= CUSTOM MAGIC CURSOR)/,
      '/* Scroll reveal is coordinated by the shared motion layer. */\n\n');
    html = html.replace(/\/\/ Magnetic micro-interactions for premium controls\.[\s\S]*?(?=\/\/ Resize background)/,
      '// Pointer motion is coordinated by the shared motion layer.\n\n');
    html = html.replace('window.addEventListener("mousemove", e=>{\n  mx',
      'window.addEventListener("mousemove", e=>{\n  if(!window.knCanAnimate() || !matchMedia("(hover:hover) and (pointer:fine)").matches)return;\n  mx');
    html = html.replace('ringRAF=0;if(document.hidden)return;', 'ringRAF=0;if(document.hidden || !window.knCanAnimate())return;');
    html = html.replace('function spawnDust(x,y){\n', 'function spawnDust(x,y){\n  if(!window.knCanAnimate())return;\n');
    html = html.replace('function burst(x,y,n){\n', 'function burst(x,y,n){\n  if(!window.knCanAnimate())return;\n');
    html = html.replace('function tickBg(t){\n  if(document.hidden)return;', 'function tickBg(t){\n  if(document.hidden || !window.knCanAnimate())return;');
  } else {
    html = html.replace(/const novaIO=new IntersectionObserver[\s\S]*?document.querySelectorAll\('\.nova-reveal'\).forEach\(el=>novaIO.observe\(el\)\);/,
      '// Scroll reveal is coordinated by the shared motion layer.');
    html = html.replace(/if\(novaMachine&&matchMedia\('\(hover:hover\) and \(pointer:fine\)'\).matches\)\{[^\n]+\}/,
      '// Logo tilt is coordinated by the shared motion layer.');
    html = html.replace('if(novaLogoStage.animate)', 'if(window.knCanAnimate()&&novaLogoStage.animate)');
    html = html.replace('if(document.hidden||!novaWaveVisible)return;', 'if(document.hidden||!novaWaveVisible||!window.knCanAnimate())return;');
  }
  html = html.replaceAll("behavior:'smooth'", "behavior:window.knCanAnimate()?'smooth':'auto'");
  return html.replace('</head>', '<!-- KN_LEGACY_MOTION_PATCHED v1 -->\n</head>');
}

const pageStyle = asset('page.css');
const pageScript = asset('page.js');
const shellStyle = asset('shell.css');
const shellScript = asset('shell.js');
const loader = `<div id="boot" role="status" aria-live="polite" data-artist="kaido">
  <div class="kn-loader-content">
    <div class="kn-loader-brand" aria-hidden="true"><span data-loader-artist="kaido" class="kn-current">KAIDO</span><i></i><span data-loader-artist="nova" class="kn-other">NOVA</span></div>
    <div class="kn-loader-wave" aria-hidden="true">
      ${[14,22,32,40,32,22,14].map((height, i) => `<i style="--kn-bar-height:${height}px;--kn-bar-delay:${i * -.1}s"></i>`).join('')}
    </div>
    <p class="kn-loader-status">جاري تجهيز التجربة…</p>
    <button class="kn-loader-retry" type="button" hidden>إعادة المحاولة</button>
  </div>
</div>`;
const pageBlock = `/* KN_PAGE_MOTION_START */
const KN_PAGE_STYLE = ${literal(pageStyle)};
const KN_PAGE_SCRIPT = ${literal(pageScript)};
/* KN_PAGE_MOTION_END */`;
const shellBlock = `/* KN_SHELL_MOTION_START */\n${shellScript}\n/* KN_SHELL_MOTION_END */`;
const injection = `function mgInjectBridge(html,page){
  html=html.replace(/<html([^>]*)>/i,'<html$1 data-motion-artist="'+page+'" data-motion-navigation="__KN_NAV_ID__">');
  const policy='<script id="kn-motion-policy">window.knCanAnimate=()=>!matchMedia("(prefers-reduced-motion: reduce)").matches;<\\/script>';
  html=html.replace(/<\\/head>/i,'<style id="kn-page-motion">'+KN_PAGE_STYLE+'</style>'+policy+'</head>');
  return html.replace(/<\\/body>/i,'<script id="kn-page-motion-script">'+KN_PAGE_SCRIPT+'<\\/script>'+MG_BRIDGE_SCRIPT.replace('__KIDO_PAGE__',JSON.stringify(page))+'</body>');
}`;

for (const relative of ['index.html', 'public/index.html']) {
  const filename = path.join(root, relative);
  let html = fs.readFileSync(filename, 'utf8');
  html = html.replace(/(kaido|nova): '([A-Za-z0-9+/=]+)'/g, (full, page, data) => {
    const original = zlib.gunzipSync(Buffer.from(data, 'base64')).toString('utf8');
    const patched = patchPage(original, page);
    if (patched === original) return full;
    return `${page}: '${zlib.gzipSync(patched, {level: 9}).toString('base64')}'`;
  });
  if (!html.includes('id="kn-shell-motion"')) html = html.replace('</head>', `<style id="kn-shell-motion">${shellStyle}</style>\n</head>`);
  else html = html.replace(/<style id="kn-shell-motion">[\s\S]*?<\/style>/, `<style id="kn-shell-motion">${shellStyle}</style>`);
  if (!html.includes('class="kn-loader-content"')) html = html.replace('<div id="boot"><span>جاري فتح التجربة…</span></div>', loader);
  if (!html.includes('KN_PAGE_MOTION_START')) {
    html = html.replace(/function mgInjectBridge\(html,page\)\{[^\n]+\}/, () => pageBlock + '\n\n' + injection);
  } else {
    html = html.replace(/\/\* KN_PAGE_MOTION_START \*\/[\s\S]*?\/\* KN_PAGE_MOTION_END \*\//, () => pageBlock);
  }
  html = html.replace(/function mgInjectBridge\(html,page\)\{[\s\S]*?\n\}/, () => injection);
  if (!html.includes('KN_SHELL_MOTION_START')) html = html.replace('function b64ToBytes(b64) {', () => shellBlock + '\n\nfunction b64ToBytes(b64) {');
  else html = html.replace(/\/\* KN_SHELL_MOTION_START \*\/[\s\S]*?\/\* KN_SHELL_MOTION_END \*\//, () => shellBlock);
  html = html.replace("boot.classList.remove('hide');", 'knShowBoot(page);');
  html = html.replace("      boot.classList.add('hide');", '      knCompleteBoot(page,sequence);');
  html = html.replace('      knCompleteBoot(page);', '      knCompleteBoot(page,sequence);');
  html = html.replace('const html = await mgCachedHtml(page);', "const html = (await mgCachedHtml(page)).replaceAll('__KN_NAV_ID__',String(sequence));");
  // Do not replace the same calls inside the embedded helper block.
  html = html.replace('    if (switching) await new Promise(resolve => setTimeout(resolve, 360));\n', '');
  html = html.replace("    boot.textContent=String(err.message||err);", '    knFailBoot(err);');
  html = html.replace('  const d = e.data || {};\n  if(d.type===\'KIDO_VIEW_MOVED\')',
    "  const d = e.data || {};\n  if(d.type==='KN_PAGE_READY'){knCompleteBoot(d.page);return;}\n  if(d.type==='KIDO_VIEW_MOVED')");
  html = html.replace('fetch("/api/content",{cache:"no-store"})', 'fetch("/api/content",{cache:"no-store",signal:AbortSignal.timeout(6000)})');
  html = html.replace('knCompleteBoot(d.page);', 'knCompleteBoot(d.page,d.navigation);');
  if (!html.includes('id="kn-motion-policy"')) throw Error('Motion injection was not installed in ' + relative);
  fs.writeFileSync(filename, html);
}
console.log('KAIDO and NOVA motion layers synchronized.');
