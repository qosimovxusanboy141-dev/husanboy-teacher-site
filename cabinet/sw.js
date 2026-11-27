// Enzo Academy: oddiy service worker. Faqat ilova qobig'ini (index, js, css) keshlaydi.
// Kurs fayllari (kurs/) juda katta, ular keshga olinmaydi va har doim tarmoqdan/brauzer keshidan keladi.
const C = "enzo-shell-v2";
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/kurs/") || u.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok && (u.pathname === "/" || u.pathname.startsWith("/assets/") || u.pathname.startsWith("/icons/"))) {
        const copy = r.clone(); caches.open(C).then((c) => c.put(e.request, copy));
      }
      return r;
    }).catch(() => caches.match(e.request).then((m) => m || caches.match("/")))
  );
});
