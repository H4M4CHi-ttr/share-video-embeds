import { test } from 'node:test';
import assert from 'node:assert/strict';

class Element extends EventTarget {
  constructor(tag = '') { super(); this.tag = tag; this.value = ''; this.checked = false; this.hidden = false; this.children = []; this.dataset = {}; this.classList = { toggle() {} }; }
  setAttribute(name, value) { this[name] = value; }
  append(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
  querySelector(tag) { return this.children.find(child => child.tag === tag) ?? null; }
  focus() {}
  select() {}
  fire(type) { this.dispatchEvent(new Event(type)); }
}
let serial = 0;
async function mount(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const created = [];
  const window = new EventTarget();
  window.localStorage = { getItem: () => null, setItem() {} };
  window.YT = { Player: class {
    constructor(frame, options) { this.frame = frame; this.options = options; created.push(this); }
    destroy() { this.destroyed = true; }
    mute() {}
    playVideo() { this.playCalled = true; }
  }};
  globalThis.window = window;
  globalThis.document = { getElementById: get, createElement: tag => new Element(tag), querySelectorAll: () => [], documentElement: {}, head: new Element('head') };
  globalThis.location = { origin: 'https://h4m4chi-ttr.github.io' };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'ja' } });
  await import('../docs/app.mjs?auto-test=' + ++serial);
  t.after(() => { window.dispatchEvent(new Event('pagehide')); t.mock.timers.reset(); });
  return { get, created, input(value) { get('video-url').value = value; get('video-url').fire('input'); }, async tick(ms) { t.mock.timers.tick(ms); await Promise.resolve(); } };
}
test('valid input converts immediately and opens a non-autoplay frame after a short pause', async t => {
  const ui = await mount(t);
  ui.input('https://youtu.be/b7xXmTfcGMQ?si=abc&t=30');
  assert.equal(ui.get('converted-url').value, 'https://www.youtube.com/live/b7xXmTfcGMQ?si=abc&t=30');
  assert.equal(ui.get('output-panel').hidden, false);
  await ui.tick(349);
  assert.equal(ui.get('player-host').querySelector('iframe'), null);
  await ui.tick(1);
  const frame = ui.get('player-host').querySelector('iframe');
  assert.equal(new URL(frame.src).pathname, '/embed/b7xXmTfcGMQ');
  assert.equal(new URL(frame.src).searchParams.get('autoplay'), '0');
  assert.equal(ui.created[0].playCalled, undefined);
});
test('rapid edits load only the latest video', async t => {
  const ui = await mount(t);
  ui.input('https://youtu.be/b7xXmTfcGMQ');
  await ui.tick(200);
  ui.input('https://youtu.be/-OkrC6h2H5k');
  await ui.tick(200);
  assert.equal(ui.created.length, 0);
  await ui.tick(150);
  assert.equal(ui.created.length, 1);
  assert.equal(new URL(ui.created[0].frame.src).pathname, '/embed/-OkrC6h2H5k');
});
test('invalid input cancels a pending frame and shows errors only on blur', async t => {
  const ui = await mount(t);
  ui.input('https://youtu.be/b7xXmTfcGMQ');
  ui.input('https://youtu.be/');
  await ui.tick(500);
  assert.equal(ui.created.length, 0);
  assert.equal(ui.get('output-panel').hidden, true);
  assert.equal(ui.get('input-error').hidden, true);
  ui.get('video-url').fire('blur');
  assert.equal(ui.get('input-error').hidden, false);
});
test('clearing input removes the player and verification', async t => {
  const ui = await mount(t);
  ui.input('https://youtu.be/b7xXmTfcGMQ');
  await ui.tick(350);
  assert.equal(ui.created.length, 1);
  ui.input('');
  await ui.tick(500);
  assert.equal(ui.created[0].destroyed, true);
  assert.equal(ui.get('player-host').querySelector('iframe'), null);
  assert.equal(ui.get('input-error').hidden, true);
});
test('Japanese and English sample buttons use the requested exact URLs', async t => {
  const ui = await mount(t);
  ui.get('example').fire('click');
  assert.equal(ui.get('video-url').value, 'https://www.youtube.com/watch?v=b7xXmTfcGMQ');
  await ui.tick(350);
  assert.equal(new URL(ui.created[0].frame.src).pathname, '/embed/b7xXmTfcGMQ');
  ui.get('language').value = 'en';
  ui.get('language').fire('change');
  assert.equal(ui.get('video-url').value, 'https://www.youtube.com/watch?v=b7xXmTfcGMQ');
  ui.get('example').fire('click');
  assert.equal(ui.get('video-url').value, 'https://www.youtube.com/watch?v=-OkrC6h2H5k');
  await ui.tick(350);
  assert.equal(new URL(ui.created[1].frame.src).pathname, '/embed/-OkrC6h2H5k');
});
test('tracking preference changes update the auto-converted output', async t => {
  const ui = await mount(t);
  ui.input('https://youtu.be/b7xXmTfcGMQ?si=abc&t=20');
  await ui.tick(350);
  ui.get('strip-tracking').checked = true;
  ui.get('strip-tracking').fire('change');
  assert.equal(ui.get('converted-url').value, 'https://www.youtube.com/live/b7xXmTfcGMQ?t=20');
  await ui.tick(350);
  assert.equal(ui.created.length, 2);
});
