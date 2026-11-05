/* Fenatran Cost Engineering - modo offline.
   Guarda o app no aparelho. Com internet usa a versão mais nova (espera até 4 s);
   sem internet ou com sinal ruim abre a versão guardada.
   Chamadas ao Google (envio e galeria) nao passam por aqui. */
var CACHE = "fencost-app-v1";
var ARQUIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ARQUIVOS.map(function (u) { return c.add(new Request(u, { cache: "reload" })).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("fencost-app-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.slice(-6) === "/sw.js") return;
  e.respondWith(
    new Promise(function (resolve) {
      var feito = false;
      function usaCache() {
        caches.match(req, { ignoreSearch: true }).then(function (r) {
          if (r) { if (!feito) { feito = true; resolve(r); } return; }
          if (req.mode === "navigate") { return caches.match("./index.html").then(function (i) { if (i && !feito) { feito = true; resolve(i); } }); }
        });
      }
      var timer = setTimeout(usaCache, 4000);
      fetch(req).then(function (resp) {
        clearTimeout(timer);
        if (resp && resp.ok) { var copia = resp.clone(); caches.open(CACHE).then(function (c) { c.put(req, copia); }); }
        if (!feito) { feito = true; resolve(resp); }
      }).catch(function () {
        clearTimeout(timer); usaCache();
        setTimeout(function () { if (!feito) { feito = true; resolve(Response.error()); } }, 300);
      });
    })
  );
});
