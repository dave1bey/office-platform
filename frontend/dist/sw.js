// Service Worker for Office Attendance & Action Plan PWA
const CACHE_NAME = 'office-pwa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Always network-first so the browser always gets the latest UI code
  if (event.request.url.includes('/api/') || event.request.url.includes('/ws-attendance')) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
