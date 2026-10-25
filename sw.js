// Guarda la app en el teléfono para que abra rápido y funcione aunque falle internet.
const VERSION = "noel-app-v1";
const SHELL = [
  "./", "index.html", "css/app.css", "manifest.webmanifest",
  "js/app.js", "js/rig.js", "js/face.js", "js/voice.js", "js/ears.js", "js/brain.js", "js/lines.js", "js/memory.js", "js/g2p-es.js",
  "js/llm.js", "js/llm-worker.js", "js/kokoro-worker.js",
  "img/santa.jpg", "img/icon-192.png", "img/icon-512.png", "img/apple-touch-icon.png", "voz/index.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("noel-app-") && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  // páginas: primero la red, para recibir actualizaciones
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(VERSION).then((ca) => ca.put("index.html", c)); return r; }).catch(() => caches.match("index.html")));
    return;
  }
  // archivos propios, voces pregrabadas, fuentes y librerías: primero lo guardado
  if (same || url.hostname === "cdn.jsdelivr.net" || url.hostname.endsWith("gstatic.com") || url.hostname === "fonts.googleapis.com") {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok && (r.type === "basic" || r.type === "cors")) { const c = r.clone(); caches.open(VERSION).then((ca) => ca.put(req, c)); }
      return r;
    })));
  }
});
