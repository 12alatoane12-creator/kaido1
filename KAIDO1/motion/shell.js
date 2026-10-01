/* Runs inside the existing shell's main script, beside its routing functions. */
let knSlowTimer = null;
let knFrameReady = false;
const knLoaderStatus = boot.querySelector('.kn-loader-status');
const knLoaderRetry = boot.querySelector('.kn-loader-retry');

function knShowBoot(page) {
  clearTimeout(knSlowTimer);
  knFrameReady = false;
  boot.dataset.artist = page;
  boot.querySelector('[data-loader-artist="kaido"]').className = page === 'kaido' ? 'kn-current' : 'kn-other';
  boot.querySelector('[data-loader-artist="nova"]').className = page === 'nova' ? 'kn-current' : 'kn-other';
  boot.classList.remove('hide', 'failed');
  knLoaderRetry.hidden = true;
  knLoaderStatus.textContent = currentPage ? 'جاري الانتقال…' : 'جاري تجهيز التجربة…';
  document.body.classList.add('kn-loading');
  frame.setAttribute('aria-busy', 'true');
  frame.classList.remove('kn-live');
  const sequence = loadSequence;
  knSlowTimer = setTimeout(() => {
    if (sequence === loadSequence && !knFrameReady) knLoaderStatus.textContent = 'جاري تحميل الأعمال…';
  }, 1800);
}

function knCompleteBoot(page, navigation) {
  if (page !== currentPage || Number(navigation) !== loadSequence || knFrameReady) return;
  knFrameReady = true;
  clearTimeout(knSlowTimer);
  frame.classList.add('kn-live');
  frame.setAttribute('aria-busy', 'false');
  boot.classList.add('hide');
  document.body.classList.remove('kn-loading');
  // The page announces DOM readiness; remote thumbnails do not hold the loader.
  requestAnimationFrame(() => {
    if (Number(navigation) !== loadSequence || page !== currentPage) return;
    try { frame.contentWindow.postMessage({type: 'KN_PAGE_ENTER', navigation:loadSequence}, '*'); } catch (_) {}
  });
  if (musicTransition) musicTransition.className = '';
  if (!mgStarted) scheduleMusicGuide(8500);
}

function knFailBoot(error) {
  clearTimeout(knSlowTimer);
  boot.classList.add('failed');
  knLoaderStatus.textContent = String(error.message || error);
  knLoaderRetry.hidden = false;
  frame.setAttribute('aria-busy', 'false');
}
knLoaderRetry.addEventListener('click', () => {
  const state = hashToState();
  mgHtmlCache.delete(state.page);
  loadPage(state.page, state.anchor, 'replace');
});
