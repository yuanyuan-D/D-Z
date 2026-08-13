const CACHE = 'wedding-plan-v6'
const ASSETS = [
  './',
  './index.html',
  './styles/main.css',
  './js/app.js',
  './js/plan.js',
  './js/store.js',
  './js/weight.js',
  './js/content-model.js',
  './js/edit-ui.js',
  './js/cloud-config.js',
  './js/cloud-sync.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  // 不同步接口 / 配置，始终走网络
  if (request.url.includes('/api/') || request.url.includes('share-config.json')) return
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          if (response && response.ok && new URL(request.url).origin === self.location.origin) {
            const clone = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => cached)
      return cached || fetched
    })
  )
})
