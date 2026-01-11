const CACHE_NAME = '7wonders-duel-v9';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const CDN_ASSETS = [
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'
];

// Install event - cache all assets including CDN
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching local assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return caches.open(CACHE_NAME).then((cache) => {
          console.log('Caching CDN assets');
          return Promise.all(
            CDN_ASSETS.map((url) => {
              return fetch(url, { mode: 'cors' })
                .then((response) => {
                  if (response.ok) {
                    return cache.put(url, response);
                  }
                  throw new Error('Failed to fetch ' + url);
                })
                .catch((err) => {
                  console.warn('Could not cache CDN asset:', url, err);
                });
            })
          );
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }
        
        return fetch(event.request).then((networkResponse) => {
          // Cache successful responses for future offline use
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
      .catch((err) => {
        console.log('Fetch failed, offline:', event.request.url);
        // Return a basic offline page if we can't serve the request
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});
