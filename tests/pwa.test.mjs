import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { SHELL_FILES } from '../scripts/site-files.mjs';
import { iosShortcutLink } from '../docs/settings.mjs';

const root = new URL('https://h4m4chi-ttr.github.io/youtube-to-x-player/');
const source = new URL('../docs/', import.meta.url);
const manifestUrl = new URL('manifest.webmanifest', root);
const cachePrefix = 'youtube-to-x-player-shell:' + root.pathname + ':';

test('manifest starts in the project and shares into the existing page', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', source), 'utf8'));
  for (const key of ['start_url','scope']) assert.equal(new URL(manifest[key], manifestUrl).href, root.href);
  assert.equal(new URL(manifest.id, root.origin).href, root.href);
  assert.equal(manifest.display, 'standalone');
  assert.doesNotMatch(manifest.name + ' ' + manifest.short_name, /youtube|\bYT\b/i);
  assert.equal(new URL(manifest.share_target.action, manifestUrl).href, root.href);
  assert.equal(manifest.share_target.method, 'GET');
  assert.deepEqual(manifest.share_target.params, { title: 'title', text: 'text', url: 'url' });

  const html = await readFile(new URL('index.html', source), 'utf8');
  assert.match(html, /<link rel="manifest" href="\.\/manifest\.webmanifest">/);
  const apple = html.match(/<link rel="apple-touch-icon" href="\.\/([^"]+)">/)?.[1];
  assert.ok(apple);
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['192x192', '512x512']);
  for (const [file, size] of [...manifest.icons.map(icon => [icon.src.slice(2), Number(icon.sizes.split('x')[0])]), [apple, 180]]) {
    const bytes = await readFile(new URL(file, source));
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
    assert.ok(SHELL_FILES.includes(file));
  }
  assert.ok(SHELL_FILES.includes('manifest.webmanifest'));
  assert.ok(SHELL_FILES.includes('privacy.html'));
  for (const name of SHELL_FILES) await readFile(new URL(name, source));
});

test('iOS install link stays absent until an actual HTTPS iCloud shortcut link is configured', () => {
  assert.equal(iosShortcutLink(''), null);
  assert.equal(iosShortcutLink('https://www.icloud.com/shortcuts/some-id'), 'https://www.icloud.com/shortcuts/some-id');
  for (const url of ['http://www.icloud.com/shortcuts/x', 'https://www.icloud.com.example/shortcuts/x', 'https://example@www.icloud.com/shortcuts/x', 'https://www.icloud.com/shortcuts/', 'javascript:alert(1)']) {
    assert.equal(iosShortcutLink(url), null);
  }
});

async function worker() {
  const handlers = new Map();
  const buckets = new Map();
  const opened = new Set();
  const deletions = [];
  const network = [];
  let claimed = false;
  let skipped = false;
  const code = await readFile(new URL('sw.js', source), 'utf8');
  runInNewContext(code, {
    CACHE_VERSION: 'test', SHELL_FILES, URL, Request,
    self: {
      registration: { scope: root.href },
      clients: { claim: async () => { claimed = true; } },
      skipWaiting: async () => { skipped = true; },
      addEventListener(type, callback) { handlers.set(type, callback); },
    },
    caches: {
      async open(name) {
        opened.add(name);
        if (!buckets.has(name)) buckets.set(name, new Map());
        const bucket = buckets.get(name);
        return {
          async addAll(requests) {
            for (const request of requests) bucket.set(request.url, new Response(new URL(request.url).pathname));
          },
          async match(key) { return bucket.get(typeof key === 'string' ? key : key.url)?.clone(); },
        };
      },
      async keys() { return [...buckets.keys()]; },
      async delete(name) { deletions.push(name); return buckets.delete(name); },
    },
    async fetch(request) { network.push(request); throw new Error('offline'); },
  });
  function lifecycle(type) {
    let result;
    handlers.get(type)({ waitUntil(promise) { result = promise; } });
    return result;
  }
  function fetch(url, mode = 'navigate', method = 'GET') {
    let result;
    handlers.get('fetch')({ request: { url, mode, method }, respondWith(promise) { result = promise; } });
    return result;
  }
  return { lifecycle, fetch, buckets, opened, deletions, network, claimed: () => claimed, skipped: () => skipped };
}

test('cached app loads offline at the project URL with share fields and uses only fixed keys', async () => {
  const sw = await worker();
  await sw.lifecycle('install');
  const query = '?title=Something&url=' + encodeURIComponent('https://youtu.be/b7xXmTfcGMQ?si=sensitive');
  for (const page of ['', 'index.html']) {
    const response = await sw.fetch(new URL(page + query, root).href);
    assert.equal(await response.text(), root.pathname + 'index.html');
  }
  const js = await sw.fetch(new URL('shared-input.mjs', root).href, 'cors');
  assert.equal(await js.text(), root.pathname + 'shared-input.mjs');
  assert.deepEqual(sw.network, []);
  const keys = [...sw.buckets.get(cachePrefix + 'test').keys()];
  assert.deepEqual(keys.sort(), SHELL_FILES.map(file => new URL(file, root).href).sort());
});

test('the worker leaves external destinations, siblings and unknown routes alone', async () => {
  const sw = await worker();
  for (const url of [
    'https://www.youtube-nocookie.com/embed/b7xXmTfcGMQ',
    'https://www.youtube.com/iframe_api',
    'https://www.youtube.com/oembed?url=https%3A%2F%2Fyoutu.be%2Fb7xXmTfcGMQ',
    'https://www.youtube.com/youtubei/v1/player',
    'https://rr1---sn-test.googlevideo.com/videoplayback?mime=audio%2Fwebm',
    'https://rr1---sn-test.googlevideo.com/videoplayback?mime=video%2Fmp4',
    'https://x.com/',
    'https://h4m4chi-ttr.github.io/another-project/',
    root.href.slice(0, -1) + '-other/',
    new URL('share', root).href,
    new URL('app.mjs?text=secret', root).href,
  ]) assert.equal(sw.fetch(url), undefined, url);
  assert.equal(sw.fetch(root.href, 'navigate', 'POST'), undefined);
  assert.deepEqual([...sw.opened], []);
});

test('activation cleans only older caches for the same app scope and leaves current sessions alone', async () => {
  const sw = await worker();
  const old = cachePrefix + 'old';
  const sibling = 'youtube-to-x-player-shell:/sibling/:old';
  sw.buckets.set(old, new Map());
  sw.buckets.set(sibling, new Map());
  sw.buckets.set('other-app-cache', new Map());
  await sw.lifecycle('install');
  assert.equal(sw.skipped(), false);
  assert.equal(sw.claimed(), false);
  assert.equal(sw.buckets.has(old), true);
  await sw.lifecycle('activate');
  assert.deepEqual(sw.deletions, [old]);
  assert.deepEqual([...sw.buckets.keys()].sort(), [sibling, 'other-app-cache', cachePrefix + 'test'].sort());
  assert.equal(sw.claimed(), true);
});

test('a missing shell fetches the clean index instead of sending the share URL', async () => {
  const sw = await worker();
  await assert.rejects(sw.fetch(root.href + '?text=private-share'), /offline/);
  assert.deepEqual(sw.network, [new URL('index.html', root).href]);
});
