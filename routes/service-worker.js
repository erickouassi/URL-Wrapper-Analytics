const CACHE_NAME = "url-wrapper-cache-v1";
const ASSETS = [
  "/stats",
  "/offline.html",
  "/public/stats.html",
  "/public/manifest.json",
  "/public/icons/icon-192.png",
  "/public/icons/icon-512.png",
  "https://cdn.jsdelivr.net/npm/chart.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;

  // Network-first for API
  if (req.url.includes("/stats/json")) {
    event.respondWith(
      fetch(req).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).catch(() => caches.match("/offline.html"));
    })
  );
});
