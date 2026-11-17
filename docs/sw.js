// The build prepends CACHE_VERSION and SHELL_FILES.
const scope = new URL(self.registration.scope);
const index = new URL('index.html', scope);
const english = new URL('en.html', scope);
const cachePrefix = 'share-video-embeds-shell:' + scope.pathname + ':';
const cacheName = cachePrefix + CACHE_VERSION;
const assets = new Set(SHELL_FILES.map(file => new URL(file, scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache =>
    cache.addAll([...assets].map(url => new Request(url, { cache: 'reload' })))
  ));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const previous = (await caches.keys()).filter(name => name.startsWith(cachePrefix) && name !== cacheName);
    await Promise.all(previous.map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function fromShell(key) {
  try {
    const cache = await caches.open(cacheName);
    const response = await cache.match(key);
    if (response) return response;
  } catch { /* A browser that cannot read its cache can still use the online app. */ }
  return fetch(key);
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== scope.origin) return;

  const isEnglishPage = url.pathname === english.pathname;
  const isEntryPage = url.pathname === scope.pathname || url.pathname === index.pathname || isEnglishPage;
  if (event.request.mode === 'navigate' && isEntryPage) {
    // Share parameters are read by the page. They never become cache keys.
    event.respondWith(fromShell(isEnglishPage ? english.href : index.href));
  } else if (assets.has(url.href)) {
    event.respondWith(fromShell(url.href));
  }
});
