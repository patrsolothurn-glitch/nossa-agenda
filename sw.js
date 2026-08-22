const CACHE = 'nossa-agenda-v76';
const ASSETS = ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

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
  const url = new URL(e.request.url);

  // HTML (index.html, /): network-first — garante versão mais recente
  if (e.request.headers.get('accept')?.includes('text/html') || url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Outros recursos (ícones, manifest): cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
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
