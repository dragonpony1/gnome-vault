// Mahj Helper offline cache. Network first: when online you always get the newest
// version; when offline the last copy opens. Only this site's own files are cached.
const CACHE = "mahj-helper-17";
const FILES = ["./", "./index.html", "./engine.js", "./hands.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./font-brush.woff2", "./font-hanzi.woff2", "./qr.svg"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("mahj-helper-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Version checks (?check=) always go straight to the network and are never stored.
  if (e.request.method !== "GET" || url.origin !== self.location.origin || url.searchParams.has("check")) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || (e.request.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});
