const APP_VERSION = '1.14.5';
const CACHE_NAME = `agora-sir-${APP_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './assets/escudo-agora.png',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './js/app.js',
  './js/storage.js',
  './js/catalog.js',
  './js/recipes.js',
  './js/media.js',
  './js/settings.js',
  './js/export.js'
];

self.addEventListener('install',event => {
  event.waitUntil((async()=>{
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async url => {
      const response = await fetch(new Request(url,{cache:'reload'}));
      if (!response.ok) throw new Error(`No se pudo precargar ${url}`);
      await cache.put(url,response);
    }));
  })());
});

self.addEventListener('activate',event => {
  event.waitUntil((async()=>{
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('agora-sir-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch',event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/app-version.json')) {
    event.respondWith(fetch(request,{cache:'no-store'}));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async()=>{
      try {
        const response = await fetch(request);
        if (response?.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html',response.clone()).catch(()=>{});
        }
        return response;
      } catch {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached = await caches.match(request);
    const network = fetch(request).then(async response => {
      if (response?.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request,response.clone()).catch(()=>{});
      }
      return response;
    }).catch(()=>null);
    return cached || await network || Response.error();
  })());
});
