// Enzo Academy: oddiy service worker. Faqat ilova qobig'ini (index, js, css) keshlaydi.
// Kurs fayllari (kurs/, kids/, audio) keshga olinmaydi va har doim tarmoqdan/brauzer keshidan keladi.
const C = "enzo-shell-v4";
self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || /\/(kurs|kids|audio|audio_sub|ml-audio|api)(\/|$)/.test(u.pathname)) return;
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok && (/\/(assets|icons|fonts)\//.test(u.pathname) || u.pathname.endsWith("/") || u.pathname.endsWith("/index.html"))) {
        const copy = r.clone(); caches.open(C).then((c) => c.put(e.request, copy));
      }
      return r;
    }).catch(() => caches.match(e.request).then((m) => m || caches.match("./index.html") || caches.match("./")))
  );
});
