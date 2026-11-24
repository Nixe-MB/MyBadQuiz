/* MyBadQuiz service worker: network-first (always fresh when online), offline fallback from cache. */
const V = 'mbq-v1.7';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'css/style.css', 'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png',
  'config.js', 'js/frames.js', 'js/chaos.js', 'js/secret.js', 'js/ranks.js', 'js/fx.js', 'js/app.js', 'js/profile.js', 'js/tools.js', 'js/bossart.js', 'js/boss.js', 'js/versus.js', 'js/about.js', 'js/main.js',
  'data/csa.js', 'data/lcd.js', 'data/ddc.js', 'data/fmss.js', 'data/econ.js', 'data/fcs.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
});
