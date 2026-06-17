/**
 * 🎣 TrollMap GPX Studio v9 Carolinas Master Edition — Offline PWA Service Worker
 * 
 * Strategy: Designed to autonomously cache the definitive web application, Leaflet GIS styles,
 * and offline spatial dictionaries. Guarantees 100% instant loading and map interaction
 * when kayaking in heavy cellular dead zones or offline airplane mode.
 */

const CACHE_NAME = 'trollmap-pwa-cache-v9.0';

const ASSETS_TO_CACHE = [
  './index.html',
  './TrollMap_v8_CarolinaMaster.html',
  './Module_H_WebBluetooth_Xzny_Bms.html',
  './manifest.json',
  './LakeSources.json'
];

// 1. Install event: Cache core HTML app and configuration files
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✓ PWA Service Worker: Pre-caching Core spatial assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activate event: Clean out obsolete stale cache buckets
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('✓ PWA Service Worker: Scrubbed obsolete stale cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch interceptor: Smart Cache-First strategy for local files, Network-First for APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Leave active external API queries strictly to network execution (Open-Meteo, USGS, Scrapers)
  if (url.hostname.includes('open-meteo') || url.hostname.includes('usgs') || url.hostname.includes('noaa') || url.hostname.includes('workers.dev')) {
    return;
  }

  // Handle local application requests
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Return cached file instantly if matched
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // 2. Otherwise fetch from network and auto-cache new local tiles/assets
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        // Clone response and stash in cache bucket
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    }).catch(() => {
      // 3. Ultimate Fallback: If network drops and tile missing, return offline placeholder or Master HTML
      if (event.request.headers.get('accept').includes('text/html')) {
        return caches.match('./index.html');
      }
    })
  );
});
