/*
 * Seedwall service worker — deliberately tiny.
 * It never caches the site itself (pages stay fresh). It only:
 *   1. precaches /offline.html and the two fonts it uses, and
 *   2. serves that page when a page navigation fails because the network is down.
 * Bump VERSION when offline.html changes.
 */
const VERSION = "v1";
const CACHE = `seedwall-offline-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const ASSETS = [OFFLINE_URL, "/fonts/JetBrainsMono-Regular.ttf", "/fonts/SchibstedGrotesk-Regular.ttf"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("seedwall-offline-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Only the offline page's own fonts are served from cache.
  const url = new URL(request.url);
  if (url.origin === self.location.origin && ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
  }
});
