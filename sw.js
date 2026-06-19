/* TrollMap service worker — modular/lazy-data build */
const CACHE_NAME = 'trollmap-v14-chart-affine-3point-fix-2026-06-19';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './js/lazy-data.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(CORE_ASSETS.map(url => new Request(url, { cache: 'reload' }))).catch(err => {
        console.warn('[TrollMap SW] install cache warning:', err);
      })
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isNavigationRequest(request){
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache live APIs; river/lake data must stay live.
  if(url.hostname.includes('workers.dev') || url.hostname.includes('waterservices.usgs.gov') || url.hostname.includes('api.hydro-derived.duke-energy.app')){
    event.respondWith(fetch(req));
    return;
  }

  // App shell: network-first, fallback to cached index.
  if(isNavigationRequest(req)){
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Local assets/data: cache-first, then network and save.
  // Optional GIS JSON files are NOT pre-cached; they are cached the first time
  // the user taps Bank/Pier, Kayak, or Attractors.
  if(url.origin === self.location.origin){
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // External libraries/tiles: network with cache fallback.
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
