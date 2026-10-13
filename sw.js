// Service Worker strictly transparent: no aggressive caching to avoid freeze issues
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Always fetch directly from network
    event.respondWith(fetch(event.request));
});
