const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the real loader controller with deterministic DOM state and clocks.
// This is a state-machine test, not a browser layout test.
function loader() {
  function node() {
    const classes = new Set();
    return {
      attributes: {}, dataset: {}, hidden: false, textContent: '',
      classList: {add: (...values) => values.forEach(v => classes.add(v)), remove: (...values) => values.forEach(v => classes.delete(v)), contains: v => classes.has(v)},
      setAttribute(key, value) {this.attributes[key] = value;},
      addEventListener() {}
    };
  }
  const boot = node(), frame = node(), body = node();
  const status = node(), retry = node(), kaido = node(), nova = node();
  boot.querySelector = selector => ({'.kn-loader-status':status,'.kn-loader-retry':retry,'[data-loader-artist="kaido"]':kaido,'[data-loader-artist="nova"]':nova})[selector];
  const timers = new Map(), raf = [], messages = [];
  let timerId = 0;
  frame.contentWindow = {postMessage: data => messages.push(JSON.parse(JSON.stringify(data)))};
  const context = vm.createContext({boot, frame, currentPage:'kaido', loadSequence:1, mgStarted:true,
    musicTransition:{className:'active to-nova'}, document:{body},
    setTimeout: callback => {timers.set(++timerId, callback);return timerId;},
    clearTimeout: id => timers.delete(id), requestAnimationFrame: callback => raf.push(callback),
    scheduleMusicGuide() {}, hashToState() {}, mgHtmlCache:new Map(), loadPage() {}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../motion/shell.js'), 'utf8'), context);
  return {context, boot, frame, body, status, retry, timers, raf, messages};
}

test('DOM readiness exposes the page without waiting for remote image loads', () => {
  const h = loader();
  h.context.knShowBoot('kaido');
  assert.equal(h.frame.attributes['aria-busy'], 'true');
  h.context.knCompleteBoot('kaido', 1);
  assert.ok(h.boot.classList.contains('hide'));
  assert.ok(h.frame.classList.contains('kn-live'));
  assert.equal(h.frame.attributes['aria-busy'], 'false');
  h.raf.forEach(callback => callback());
  assert.deepEqual(h.messages, [{type:'KN_PAGE_ENTER', navigation:1}]);
});

test('A ready message for an older load of the same artist cannot dismiss the new loader', () => {
  const h = loader();
  h.context.loadSequence = 2;
  h.context.knShowBoot('kaido');
  h.context.knCompleteBoot('kaido', 1);
  assert.equal(h.boot.classList.contains('hide'), false);
  assert.equal(h.frame.attributes['aria-busy'], 'true');
  h.context.knCompleteBoot('kaido', 2);
  assert.ok(h.boot.classList.contains('hide'));
});

test('A ready message for another artist leaves the current load pending', () => {
  const h = loader();
  h.context.knShowBoot('kaido');
  h.context.knCompleteBoot('nova', 1);
  assert.equal(h.boot.classList.contains('hide'), false);
  assert.equal(h.raf.length, 0);
});

test('Duplicate readiness does not restart the entrance animation', () => {
  const h = loader();
  h.context.knShowBoot('kaido');
  h.context.knCompleteBoot('kaido', 1);
  h.context.knCompleteBoot('kaido', 1);
  h.raf.forEach(callback => callback());
  assert.equal(h.messages.length, 1);
});

test('A queued entrance from the previous route cannot start the next page', () => {
  const h = loader();
  h.context.knShowBoot('kaido');
  h.context.knCompleteBoot('kaido', 1);
  h.context.loadSequence = 2;
  h.context.currentPage = 'nova';
  h.raf.forEach(callback => callback());
  assert.equal(h.messages.length, 0);
});

test('A superseded slow-load timer cannot overwrite the next artist status', () => {
  const h = loader();
  h.context.knShowBoot('kaido');
  const previous = [...h.timers.values()][0];
  h.context.loadSequence = 2;
  h.context.currentPage = 'nova';
  h.context.knShowBoot('nova');
  const current = h.status.textContent;
  previous();
  assert.equal(h.status.textContent, current);
  assert.equal(h.boot.dataset.artist, 'nova');
});

test('A load failure preserves the loading surface and exposes a retry action', () => {
  const h = loader();
  h.context.knShowBoot('kaido');
  h.context.knFailBoot(new Error('Unable to decode artist page'));
  assert.ok(h.boot.classList.contains('failed'));
  assert.equal(h.boot.classList.contains('hide'), false);
  assert.equal(h.retry.hidden, false);
  assert.match(h.status.textContent, /Unable to decode artist page/);
  assert.equal(h.timers.size, 0);
});
