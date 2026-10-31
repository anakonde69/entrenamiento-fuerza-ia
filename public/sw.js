// Service worker mínimo para XOPATS (PWA instalable).
// Red directa (network-only): nunca se cachea nada, así nunca se sirven
// bundles obsoletos. Solo habilita la instalación como app.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
