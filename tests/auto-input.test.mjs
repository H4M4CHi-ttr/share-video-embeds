import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUTO_PREVIEW_KEY, PRIVACY_KEY, PRIVACY_VERSION } from '../docs/settings.mjs';

class Element extends EventTarget {
  constructor(tag = '') { super(); this.tag = tag; this.value = ''; this.checked = false; this.hidden = false; this.children = []; this.dataset = {}; this.classList = { toggle() {} }; }
  setAttribute(name, value) { this[name] = value; }
  removeAttribute(name) { delete this[name]; }
  append(child) { child.parent = this; this.children.push(child); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  replaceChildren(...children) { this.children = children; }
  querySelector(tag) { return this.children.find(child => child.tag === tag) ?? null; }
  focus(options) { this.focusOptions = options; }
  scrollIntoView(options) {
    this.scrollCalls ??= [];
    this.scrollCalls.push(options);
  }
  select() {}
  fire(type) { this.dispatchEvent(new Event(type)); }
}
const origin = 'http://127.0.0.1:5188/share-video-embeds/';
const publicOrigin = 'https://h4m4chi-ttr.github.io/share-video-embeds/';
let serial = 0;
async function mount(t, { href = origin, share, playerApi = true, previewTest = true, autoPreview = false, accepted = true } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const created = [];
  const window = new EventTarget();
  const saved = [], clipboardWrites = [], shareCalls = [];
  const scripts = new Element('head');
  const location = new URL(href);
  const metadata = t.mock.method(globalThis, 'fetch', () => assert.fail('Unexpected metadata request'));
  window.history = { state: { keep: true }, replaceState(state, _title, url) { assert.deepEqual(state, this.state); location.href = url; } };
  const removed = [];
  const preferences = new Map([[AUTO_PREVIEW_KEY, autoPreview ? 'true' : null], [PRIVACY_KEY, accepted ? PRIVACY_VERSION : null]]);
  window.localStorage = {
    getItem(key) { return preferences.get(key) ?? null; },
    setItem(key, value) { preferences.set(key, value); saved.push([key, value]); },
    removeItem(key) { preferences.delete(key); removed.push(key); },
  };
  if (playerApi) window.YT = { Player: class {
    constructor(frame, options) { this.frame = frame; this.options = options; created.push(this); }
    destroy() { this.destroyed = true; }
    playVideo() { assert.fail('A script attempted to play the video'); }
  }};
  globalThis.window = window;
  globalThis.document = { getElementById: get, createElement: tag => new Element(tag), querySelectorAll: () => [], documentElement: { dataset: { previewTest: previewTest ? 'true' : '' } }, head: scripts };
  globalThis.location = location;
  const navigator = { language: 'ja', clipboard: { readText() { assert.fail('Clipboard was read without user action'); }, async writeText(value) { clipboardWrites.push(value); } } };
  if (share !== null) navigator.share = share ?? (async data => { shareCalls.push(data); });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: navigator });
  await import('../docs/app.mjs?auto-test=' + ++serial);
  t.after(() => { window.dispatchEvent(new Event('pagehide')); t.mock.timers.reset(); });
  return { get, created, saved, removed, clipboardWrites, shareCalls, scripts, window, metadata, hash(value) { location.hash = value; window.dispatchEvent(new Event('hashchange')); }, input(value) { get('video-url').value = value; get('video-url').fire('input'); }, async tick(ms) { t.mock.timers.tick(ms); await Promise.resolve(); } };
}
test('initially valid input only converts, and a click opens a non-autoplay frame', async t => {
  const ui = await mount(t);
  ui.input('https://youtu.be/b7xXmTfcGMQ?si=abc&t=30');
  assert.equal(ui.get('converted-url').value, 'https://www.youtube.com/live/b7xXmTfcGMQ?si=abc&t=30');
  assert.equal(ui.get('output-panel').hidden, false);
  await ui.tick(1000);
  assert.equal(ui.get('player-host').querySelector('iframe'), null);
  assert.equal(ui.scripts.children.length, 0);
  assert.deepEqual(ui.saved, []);
  ui.get('load-player').fire('click');
  await ui.tick(0);
  const frame = ui.get('player-host').querySelector('iframe');
  assert.equal(new URL(frame.src).origin, 'https://www.youtube-nocookie.com');
  assert.equal(new URL(frame.src).pathname, '/embed/b7xXmTfcGMQ');
  assert.equal(new URL(frame.src).searchParams.get('autoplay'), '0');
  assert.equal(ui.created.length, 1);
});
test('rapid edits load only the latest video', async t => {
  const ui = await mount(t, { autoPreview: true });
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
  const ui = await mount(t, { autoPreview: true });
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
  const ui = await mount(t, { autoPreview: true });
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
  assert.equal(ui.get('converted-url').value, 'https://www.youtube.com/live/b7xXmTfcGMQ');
  ui.get('language').value = 'en';
  ui.get('language').fire('change');
  assert.equal(ui.get('video-url').value, 'https://www.youtube.com/watch?v=b7xXmTfcGMQ');
  ui.get('example').fire('click');
  assert.equal(ui.get('video-url').value, 'https://www.youtube.com/watch?v=-OkrC6h2H5k');
  assert.equal(ui.get('converted-url').value, 'https://www.youtube.com/live/-OkrC6h2H5k');
  assert.equal(ui.created.length, 0);
});
test('tracking preference changes update the auto-converted output', async t => {
  const ui = await mount(t);
  ui.input('https://youtu.be/b7xXmTfcGMQ?si=abc&t=20');
  await ui.tick(350);
  ui.get('strip-tracking').checked = true;
  ui.get('strip-tracking').fire('change');
  assert.equal(ui.get('converted-url').value, 'https://www.youtube.com/live/b7xXmTfcGMQ?t=20');
  await ui.tick(350);
  assert.equal(ui.created.length, 0);
});

test('share launch converts without contacting YouTube, reading the clipboard or storing the input', async t => {
  const shared = origin + '?keep=%2b&text=' + encodeURIComponent('動画のタイトル\nhttps://youtu.be/b7xXmTfcGMQ?si=abc&t=20') + '#section';
  const ui = await mount(t, { href: shared, playerApi: false });
  const expected = 'https://www.youtube.com/live/b7xXmTfcGMQ?si=abc&t=20';
  assert.equal(ui.get('converted-url').value, expected);
  assert.equal(globalThis.location.href, origin + '?keep=%2b#section');
  assert.deepEqual(ui.saved, []);
  assert.deepEqual(ui.clipboardWrites, []);
  assert.deepEqual(ui.shareCalls, []);
  await ui.tick(1000);
  assert.equal(ui.get('player-host').querySelector('iframe'), null);
  assert.equal(ui.scripts.children.length, 0);
  ui.get('copy').fire('click');
  ui.get('share').fire('click');
  assert.deepEqual(ui.clipboardWrites, [expected]);
  assert.deepEqual(ui.shareCalls, [{ url: expected }]);
  await ui.tick(0);

  ui.get('strip-tracking').checked = true;
  ui.get('strip-tracking').fire('change');
  await ui.tick(1000);
  assert.equal(ui.get('converted-url').value, 'https://www.youtube.com/live/b7xXmTfcGMQ?t=20');
  assert.equal(ui.get('player-host').querySelector('iframe'), null);
  assert.equal(ui.scripts.children.length, 0);
  assert.deepEqual(ui.saved, [['youtube-live-link-pages.strip-tracking', 'true']]);

  ui.get('load-player').fire('click');
  assert.equal(new URL(ui.get('player-host').querySelector('iframe').src).pathname, '/embed/b7xXmTfcGMQ');
  assert.equal(ui.scripts.children.length, 1);
});

test('a new share supersedes the preview queued for a previous input', async t => {
  const ui = await mount(t, { autoPreview: true });
  ui.input('https://youtu.be/b7xXmTfcGMQ');
  const video = 'https://youtu.be/-OkrC6h2H5k';
  ui.hash('#url=' + encodeURIComponent(video));
  await ui.tick(350);
  assert.equal(ui.created.length, 1);
  assert.equal(new URL(ui.created[0].frame.src).pathname, '/embed/-OkrC6h2H5k');
  assert.equal(globalThis.location.href, origin);

  ui.hash('#text=' + encodeURIComponent('動画 https://youtu.be/b7xXmTfcGMQ\n' + video));
  assert.equal(ui.get('output-panel').hidden, true);
  assert.equal(ui.get('player-host').querySelector('iframe'), null);
  assert.equal(ui.get('input-error').hidden, false);
  assert.match(ui.get('input-error').textContent, /複数/);
  assert.equal(globalThis.location.href, origin);
});

test('saved opt-in also applies to Android GET and iOS fragment input', async t => {
  const video = 'https://youtu.be/b7xXmTfcGMQ';
  const ui = await mount(t, { href: origin + '?url=' + encodeURIComponent(video), autoPreview: true });
  assert.equal(ui.get('auto-preview').checked, true);
  assert.equal(ui.get('converted-url').value, 'https://www.youtube.com/live/b7xXmTfcGMQ');
  await ui.tick(350);
  assert.equal(new URL(ui.created[0].frame.src).pathname, '/embed/b7xXmTfcGMQ');
  ui.hash('#text=' + encodeURIComponent('別の動画\nhttps://youtu.be/-OkrC6h2H5k'));
  await ui.tick(350);
  assert.equal(ui.created[0].destroyed, true);
  assert.equal(new URL(ui.created[1].frame.src).pathname, '/embed/-OkrC6h2H5k');
  assert.equal(ui.get('player-host').children.length, 1);
  assert.deepEqual(ui.saved, []);
});

test('setting opt-in applies to the next conversion and revocation cancels queued previews', async t => {
  const ui = await mount(t);
  ui.input('https://youtu.be/b7xXmTfcGMQ');
  ui.get('auto-preview').checked = true;
  ui.get('auto-preview').fire('change');
  await ui.tick(350);
  assert.deepEqual(ui.saved, [[AUTO_PREVIEW_KEY, 'true']]);
  assert.equal(ui.created.length, 0);
  ui.input('https://youtu.be/-OkrC6h2H5k');
  ui.get('auto-preview').checked = false;
  ui.get('auto-preview').fire('change');
  await ui.tick(350);
  assert.deepEqual(ui.removed, [AUTO_PREVIEW_KEY]);
  assert.equal(ui.created.length, 0);
});

test('a manual click cancels the timer and repeated clicks keep one iframe', async t => {
  const ui = await mount(t, { autoPreview: true });
  ui.input('https://youtu.be/b7xXmTfcGMQ');
  await ui.tick(200);
  ui.get('load-player').fire('click');
  ui.get('load-player').fire('click');
  await ui.tick(500);
  assert.equal(ui.created.length, 1);
  assert.equal(ui.get('player-host').children.length, 1);
  ui.get('auto-preview').checked = false;
  ui.get('auto-preview').fire('change');
  assert.equal(ui.created[0].destroyed, true);
  assert.equal(ui.get('player-host').children.length, 0);
});

test('pagehide cancels a pending API script and late readiness cannot mount a player', async t => {
  const ui = await mount(t, { playerApi: false });
  ui.input('https://youtu.be/b7xXmTfcGMQ');
  ui.get('load-player').fire('click');
  const staleReady = ui.window.onYouTubeIframeAPIReady;
  assert.equal(ui.scripts.children.length, 1);
  assert.equal(ui.get('player-host').children.length, 1);

  ui.window.dispatchEvent(new Event('pagehide'));
  assert.equal(ui.get('player-host').children.length, 0);
  assert.equal(ui.scripts.children.length, 0);
  assert.equal(ui.window.onYouTubeIframeAPIReady, undefined);
  staleReady();
  await ui.tick(20000);
  assert.equal(ui.created.length, 0);
  assert.equal(ui.get('preview-panel').hidden, true);
});

test('closing a pending preview then opening a different video only attaches the new one', async t => {
  const ui = await mount(t, { playerApi: false });
  ui.input('https://youtu.be/b7xXmTfcGMQ');
  ui.get('load-player').fire('click');
  const ready = ui.window.onYouTubeIframeAPIReady;
  ui.get('unload-player').fire('click');
  ui.input('https://youtu.be/-OkrC6h2H5k');
  ui.get('load-player').fire('click');
  assert.equal(ui.scripts.children.length, 1);
  const attached = [];
  ui.window.YT = { Player: class { constructor(frame) { attached.push(frame.src); } } };
  ready();
  ui.window.onYouTubeIframeAPIReady();
  await ui.tick(0);
  assert.equal(attached.length, 1);
  assert.equal(new URL(attached[0]).pathname, '/embed/-OkrC6h2H5k');
});

for (const [name, profile] of [
  ['the public build', { previewTest: false }],
  ['a non-loopback host with the local test marker', { href: publicOrigin, previewTest: true }],
]) {
  test(name + ' converts and creates X links without preview requests', async t => {
    const ui = await mount(t, { ...profile, autoPreview: true, accepted: false });
    ui.input('https://youtu.be/b7xXmTfcGMQ?t=20');
    ui.get('load-player').fire('click');
    await ui.tick(500);
    assert.equal(ui.get('preview-options').hidden, true);
    assert.equal(ui.get('load-player').hidden, true);
    assert.equal(ui.get('converter-workspace').hidden, false);
    assert.equal(ui.get('player-host').children.length, 0);
    assert.equal(ui.scripts.children.length, 0);
    const draft = new URL(ui.get('share-x').href);
    assert.equal(draft.searchParams.get('url'), 'https://www.youtube.com/live/b7xXmTfcGMQ?t=20');
    assert.equal(draft.searchParams.has('text'), false);
    assert.equal(ui.metadata.mock.callCount(), 0);
  });
}

test('the API-client test build asks for policy agreement before processing a share', async t => {
  const href = origin + '#url=' + encodeURIComponent('https://youtu.be/b7xXmTfcGMQ');
  const ui = await mount(t, { href, accepted: false });
  assert.equal(ui.get('privacy-consent').hidden, false);
  assert.equal(ui.get('converter-workspace').hidden, true);
  assert.equal(globalThis.location.href, href);
  ui.get('load-player').fire('click');
  assert.equal(ui.scripts.children.length, 0);

  ui.get('accept-privacy').fire('click');
  assert.equal(ui.get('converter-workspace').hidden, false);
  assert.equal(ui.get('converted-url').value, 'https://www.youtube.com/live/b7xXmTfcGMQ');
  assert.equal(globalThis.location.href, origin);
  assert.deepEqual(ui.saved, [[PRIVACY_KEY, PRIVACY_VERSION]]);
});

test('text shares put the converted link at the start of the viewport', async t => {
  const text = encodeURIComponent('Shared title\nhttps://youtu.be/b7xXmTfcGMQ?t=20');
  const ui = await mount(t, { href: publicOrigin + '?text=' + text });
  const heading = ui.get('output-label');
  assert.equal(ui.get('converted-url').value, 'https://www.youtube.com/live/b7xXmTfcGMQ?t=20');
  assert.deepEqual(heading.focusOptions, { preventScroll: true });
  assert.deepEqual(heading.scrollCalls, [{ block: 'start', behavior: 'instant' }]);

  ui.hash('#text=' + encodeURIComponent('Next video\nhttps://youtu.be/-OkrC6h2H5k'));
  assert.equal(ui.get('converted-url').value, 'https://www.youtube.com/live/-OkrC6h2H5k');
  assert.equal(heading.scrollCalls.length, 2);
});

test('URL-only shares, manual input, and invalid shared text do not move the viewport', async t => {
  const url = encodeURIComponent('https://youtu.be/b7xXmTfcGMQ');
  const ui = await mount(t, { href: publicOrigin + '#url=' + url });
  assert.equal(ui.get('output-panel').hidden, false);
  assert.equal(ui.get('output-label').scrollCalls, undefined);
  ui.input('https://youtu.be/-OkrC6h2H5k');
  assert.equal(ui.get('output-label').scrollCalls, undefined);
  ui.hash('#text=No%20video%20here');
  assert.equal(ui.get('output-panel').hidden, true);
  assert.equal(ui.get('output-label').scrollCalls, undefined);
});

test('X sharing carries the shared or edited title and converted link without metadata requests', async t => {
  const title = '曲名 & 100% ＋ 🔥';
  const video = 'https://youtu.be/b7xXmTfcGMQ?t=20&note=A%2BB#t=20';
  const ui = await mount(t, { href: publicOrigin + '#text=' + encodeURIComponent(title + '\n' + video) });
  const share = ui.get('share-x');
  const draft = new URL(share.href);
  assert.equal(draft.origin + draft.pathname, 'https://x.com/intent/tweet');
  assert.equal(draft.searchParams.get('text'), title);
  assert.equal(draft.searchParams.get('url'), 'https://www.youtube.com/live/b7xXmTfcGMQ?t=20&note=A%2BB#t=20');
  ui.get('post-title').value = 'Edited title';
  ui.get('post-title').fire('input');
  assert.equal(new URL(share.href).searchParams.get('text'), 'Edited title');
  assert.equal(ui.metadata.mock.callCount(), 0);
  assert.deepEqual(ui.saved, []);

  ui.input('https://youtu.be/-OkrC6h2H5k');
  assert.equal(new URL(share.href).searchParams.has('text'), false);
  assert.equal(new URL(share.href).searchParams.get('url'), 'https://www.youtube.com/live/-OkrC6h2H5k');
});

test('canceling the share sheet leaves feedback clear', async t => {
  const ui = await mount(t, { share: async () => { throw new DOMException('Cancelled', 'AbortError'); } });
  ui.input('https://youtu.be/b7xXmTfcGMQ');
  ui.get('share').fire('click');
  await ui.tick(0);
  assert.equal(ui.get('notice').textContent, '');
});

test('calls the browser installation prompt only from the install button', async t => {
  const ui = await mount(t);
  assert.equal(ui.get('ios-shortcut').href, undefined);
  const promptEvent = new Event('beforeinstallprompt', { cancelable: true });
  let calls = 0;
  promptEvent.prompt = async () => { calls++; };
  ui.window.dispatchEvent(promptEvent);
  assert.equal(promptEvent.defaultPrevented, true);
  assert.equal(ui.get('pwa-install').hidden, false);
  assert.equal(calls, 0);
  ui.get('pwa-install').fire('click');
  await ui.tick(0);
  assert.equal(calls, 1);
  assert.equal(ui.get('pwa-install').hidden, true);
});

test('copy stays available when the Web Share API is missing', async t => {
  const ui = await mount(t, { share: null });
  ui.input('https://youtu.be/b7xXmTfcGMQ');
  assert.equal(ui.get('share').hidden, true);
  ui.get('copy').fire('click');
  assert.deepEqual(ui.clipboardWrites, ['https://www.youtube.com/live/b7xXmTfcGMQ']);
});
