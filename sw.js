// Trace VTT : fonctionnement hors réseau
const SHELL = 'tvtt-shell-v4';
const TILES = 'tvtt-tiles';
const TILE_HOSTS = ['tile.opentopomap.org', 'data.geopf.fr', 'wmts.geo.admin.ch', 'tile.openstreetmap.org'];
const LIBS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const SHELL_URLS = [
  './', './index.html', './icon-180.png', './favicon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdn.jsdelivr.net/npm/leaflet-rotate@0.2.8/dist/leaflet-rotate-src.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(SHELL_URLS.map(u => c.add(u).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('tvtt-shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Tuiles : d'abord les cartes enregistrées, sinon le réseau
  if (TILE_HOSTS.some(h => (url.hostname === h || url.hostname.endsWith('.' + h)))){
    e.respondWith(caches.open(TILES)
      .then(c => c.match(req.url, {ignoreVary:true}))
      .then(r => r || fetch(req)));
    return;
  }

  // Page : réseau d'abord (pour les mises à jour), cache si pas de réseau
  if (req.mode === 'navigate'){
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone(); caches.open(SHELL).then(c => c.put(req, copy)); return r;
    }).catch(() => caches.match(req, {ignoreSearch:true})
      .then(r => r || caches.match(new URL('index.html', self.registration.scope).href))
      .then(r => r || caches.match(self.registration.scope))));
    return;
  }

  // Leaflet, polices et fichiers de l'app : cache d'abord
  if (LIBS.includes(url.hostname) || url.origin === self.location.origin){
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque'){ const copy = r.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
      return r;
    })));
  }
});
