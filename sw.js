const CACHE = 'kharcha-v3';

// Cache the app shell on install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Use relative URLs so it works on any host (GitHub Pages, localhost etc)
      return cache.addAll([
        './',
        './index.html',
        './manifest.json'
      ]);
    }).then(() => self.skipWaiting())
  );
});

// Clean old caches on activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Serve from cache first, update cache in background
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept sync/delete/health API calls to laptop server
  if (url.pathname === '/sync' || url.pathname === '/delete' || url.pathname === '/health') return;
  // Don't intercept cross-origin requests (laptop server IP)
  if (url.origin !== location.origin) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Fetch fresh copy in background and update cache
      const networkFetch = fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => null);

      // Return cached immediately if available, else wait for network
      return cached || networkFetch || caches.match('./index.html');
    })
  );
});
