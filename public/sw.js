const CACHE_NAME = "greenroute-crew-v1"
const OFFLINE_URL = "/crew/offline"
const PRECACHE_URLS = [
  "/crew/today",
  "/crew/offline",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const url = new URL(event.request.url)

  // Only intercept same-origin requests for crew pages
  if (url.origin !== self.location.origin) return
  if (!url.pathname.startsWith("/crew")) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for crew pages
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached ?? caches.match(OFFLINE_URL))
      )
  )
})

// ── Web Push ──────────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? "GreenRoute", {
      body: data.body ?? "",
      icon: data.icon ?? "/icon-192x192.png",
      badge: "/icon-192x192.png",
      vibrate: [100, 50, 100],
      data: { url: data.url ?? "/" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? "/"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
