(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const initialized = new WeakSet();
  const pending = new Map();
  const parallax = [];
  let paint = 0;
  let scrollPaint = 0;
  let entered = false;
  let layoutEpoch = 0;
  const controls = '.btn,.nova-btn,.nova-back,.nova-mini-link,.explore-btn,.studio-tab,.social-pill,.nova-launch-btn,.portal-card,.experience-tab';
  const surfaces = '.card,.nova-media-card,.nova-cap,.photo-frame,.nova-core,.hero-emblem,.crew-card,.nova-library-launch,.portal-card';

  function queueStyle(element, values) {
    pending.set(element, {...pending.get(element), ...values});
    if (paint || document.hidden) return;
    paint = requestAnimationFrame(() => {
      paint = 0;
      pending.forEach((styles, el) => {
        if (el.isConnected) Object.entries(styles).forEach(([name, value]) => el.style.setProperty(name, value));
      });
      pending.clear();
    });
  }

  const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.dataset.knReveal = 'visible';
      revealObserver.unobserve(entry.target);
    });
  }, {threshold: .06, rootMargin: '0px 0px -24px 0px'}) : null;

  function initialize(element) {
    if (initialized.has(element)) return;
    initialized.add(element);
    element.dataset.knMotion = '';
    if (element.matches('.reveal,.nova-reveal')) {
      const siblings = Array.from(element.parentElement.children).filter(el => el.matches('.reveal,.nova-reveal'));
      element.style.setProperty('--kn-delay', Math.min(siblings.indexOf(element) * 70, 210) + 'ms');
      element.dataset.knReveal = reduced.matches || !revealObserver ? 'visible' : 'pending';
      if (revealObserver && !reduced.matches) revealObserver.observe(element);
    }
    if (element.matches(surfaces)) {
      element.dataset.knSurface = '';
      const light = document.createElement('span');
      light.className = 'kn-surface-light';
      light.setAttribute('aria-hidden', 'true');
      element.append(light);
    }
    if (element.matches(controls)) element.dataset.knControl = '';
    let rect = null, boundsEpoch = -1;
    element.addEventListener('pointerenter', () => { rect = element.getBoundingClientRect(); boundsEpoch = layoutEpoch; });
    element.addEventListener('pointermove', event => {
      if (!fine.matches || reduced.matches || event.pointerType === 'touch') return;
      if (!rect || boundsEpoch !== layoutEpoch) { rect = element.getBoundingClientRect(); boundsEpoch = layoutEpoch; }
      if (!rect.width || !rect.height) return;
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      const styles = {'--kn-pointer-x': x * 100 + '%', '--kn-pointer-y': y * 100 + '%'};
      if (element.hasAttribute('data-kn-surface')) {
        element.classList.add('kn-pointer-active');
        styles['--kn-rx'] = (0.5 - y) * 7 + 'deg';
        styles['--kn-ry'] = (x - 0.5) * 9 + 'deg';
      } else if (element.hasAttribute('data-kn-control')) {
        styles['--kn-magnetic-x'] = (x - .5) * 5 + 'px';
        styles['--kn-magnetic-y'] = (y - .5) * 5 + 'px';
      }
      queueStyle(element, styles);
    }, {passive: true});
    const reset = () => {
      rect = null;
      element.classList.remove('kn-pointer-active');
      queueStyle(element, {'--kn-rx': '0deg', '--kn-ry': '0deg', '--kn-magnetic-x': '0px', '--kn-magnetic-y': '0px'});
    };
    element.addEventListener('pointerleave', reset);
    element.addEventListener('pointercancel', reset);
    element.addEventListener('blur', reset);
  }

  function accessibleMedia(scope) {
    scope.querySelectorAll('.thumb[data-id],.nova-media-card').forEach(element => {
      if (element.hasAttribute('data-kn-keyboard')) return;
      element.dataset.knKeyboard = '';
      element.tabIndex = 0;
      element.setAttribute('role', 'button');
      element.setAttribute('aria-haspopup', 'dialog');
      element.setAttribute('aria-label', 'تشغيل ' + (element.querySelector('img')?.alt || element.querySelector('h3')?.textContent || 'الفيديو'));
      element.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        element.click();
      });
    });
  }

  const selector = surfaces + ',' + controls + ',.reveal,.nova-reveal';
  function scan(scope) {
    if (scope.matches?.(selector)) initialize(scope);
    scope.querySelectorAll(selector).forEach(initialize);
    accessibleMedia(scope);
  }
  scan(document);
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1 && !node.matches('.kn-surface-light,.kn-ripple')) {
        scan(node);
        // A library may append a media card itself, with no wrapper.
        if (node.matches('.nova-media-card')) accessibleMedia(node.parentElement);
      }
    }));
  }).observe(document.body, {childList: true, subtree: true});

  const hero = document.querySelector('#hero,.nova-hero');
  const heroSelector = root.dataset.motionArtist === 'nova'
    ? '.nova-overline,.nova-hero h1,.nova-hero-copy > p,.nova-hero-meta,.nova-hero-actions,.nova-machine'
    : '.hero-emblem,.hero-kicker,.hero-word,.hero-signature,.hero-tag,.hero-meta,.hero-cta';
  document.querySelectorAll(heroSelector).forEach((element, index) => {
    element.dataset.knMotion = '';
    element.dataset.knHero = '';
    element.style.setProperty('--kn-delay', Math.min(index * 65, 350) + 'ms');
    if (element.hasAttribute('data-kn-reveal')) element.dataset.knReveal = 'visible';
  });

  function addParallax(selector, speed, limit, property = '--kn-parallax-y') {
    document.querySelectorAll(selector).forEach(element => {
      element.dataset.knMotion = '';
      parallax.push({element, speed, limit, property});
    });
  }
  addParallax('.hero-emblem', .11, 38);
  addParallax('.hero-word', .045, 18);
  addParallax('.nova-machine', .075, 30);
  addParallax('.photo-frame img', .08, 18, '--kn-photo-y');

  function updateParallax() {
    scrollPaint = 0;
    if (document.hidden) return;
    const enabled = entered && !reduced.matches && innerWidth > 760;
    parallax.forEach(item => {
      const rect = item.element.parentElement.getBoundingClientRect();
      if (!enabled) item.element.style.setProperty(item.property, '0px');
      else if (rect.bottom > -100 && rect.top < innerHeight + 100) {
        const offset = item.element.matches('img') ? (innerHeight / 2 - (rect.top + rect.height / 2)) * item.speed : -scrollY * item.speed;
        item.element.style.setProperty(item.property, Math.max(-item.limit, Math.min(item.limit, offset)).toFixed(2) + 'px');
      }
    });
    if (hero) hero.style.setProperty('--kn-halo-y', enabled ? Math.max(-65, -scrollY * .14) + 'px' : '0px');
    root.style.setProperty('--kn-bg-y', enabled ? Math.sin(scrollY / 800) * 24 + 'px' : '0px');
  }
  function queueParallax() { layoutEpoch++; if (!scrollPaint && !document.hidden) scrollPaint = requestAnimationFrame(updateParallax); }
  addEventListener('scroll', queueParallax, {passive: true});
  addEventListener('resize', queueParallax, {passive: true});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) queueParallax(); });

  document.addEventListener('click', event => {
    const element = event.target.closest?.('[data-kn-control]');
    if (!element || reduced.matches || element.disabled) return;
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'kn-ripple'; ripple.setAttribute('aria-hidden', 'true');
    ripple.style.setProperty('--kn-ripple-x', (event.detail ? event.clientX - rect.left : rect.width / 2) + 'px');
    ripple.style.setProperty('--kn-ripple-y', (event.detail ? event.clientY - rect.top : rect.height / 2) + 'px');
    ripple.style.setProperty('--kn-ripple-size', Math.hypot(rect.width, rect.height) * 2 + 'px');
    element.append(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), {once: true});
    setTimeout(() => ripple.remove(), 750);
  }, {passive: true});

  function enterPage() {
    if (entered) return;
    entered = true;
    requestAnimationFrame(() => root.classList.add('kn-page-entered'));
    queueParallax();
  }
  addEventListener('message', event => {
    if (event.source === parent && event.data?.type === 'KN_PAGE_ENTER' && String(event.data.navigation) === root.dataset.motionNavigation) enterPage();
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      document.querySelectorAll('[data-kn-reveal]').forEach(element => { element.dataset.knReveal = 'visible'; revealObserver?.unobserve(element); });
      document.querySelectorAll('[data-kn-motion]').forEach(element => {
        element.classList.remove('kn-pointer-active');
        queueStyle(element, {'--kn-rx': '0deg', '--kn-ry': '0deg', '--kn-magnetic-x': '0px', '--kn-magnetic-y': '0px'});
      });
    }
    queueParallax();
  });
  root.classList.add('kn-motion-ready');
  parent.postMessage({type: 'KN_PAGE_READY', page: root.dataset.motionArtist, navigation:root.dataset.motionNavigation}, '*');
  // Standalone previews and old cached shells still expose their content.
  setTimeout(enterPage, 1100);
})();
