/* Zeiterfassung · Ingenieurbüro Muthmann – Offline-Ablage der App-Dateien.
   Nur die eigenen Dateien (gleiche Adresse) werden zwischengespeichert, nie Daten aus der Nextcloud. */
const CACHE = 'zeiten-1.2.0';
const DATEIEN = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('zeiten-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;   // Nextcloud-Zugriffe nie anfassen
  if (req.mode === 'navigate' || req.url.endsWith('index.html')) {
    // Seite: zuerst aus dem Netz (damit Updates ankommen), nach 4 s oder offline aus dem Speicher
    e.respondWith(new Promise(resolve => {
      let erledigt = false;
      const ausSpeicher = () => caches.match('index.html').then(r => r || caches.match('./'));
      const t = setTimeout(() => { if (!erledigt) { erledigt = true; ausSpeicher().then(resolve); } }, 4000);
      fetch(req).then(r => {
        if (r && r.ok) { const k = r.clone(); caches.open(CACHE).then(c => c.put('index.html', k)); }
        if (!erledigt) { erledigt = true; clearTimeout(t); resolve(r); }
      }).catch(() => { if (!erledigt) { erledigt = true; clearTimeout(t); ausSpeicher().then(r => resolve(r || Response.error())); } });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { if (n && n.ok) { const k = n.clone(); caches.open(CACHE).then(c => c.put(req, k)); } return n; })));
});
