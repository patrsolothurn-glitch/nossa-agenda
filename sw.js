const CACHE = 'nossa-agenda-v55';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});

self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'NossaAgenda', {
        body: data.message || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200],
      }),
      // Avisa todos os tabs/janelas abertas para refresh imediato
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'REFRESH_EVENTS' }));
      })
    ])
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
