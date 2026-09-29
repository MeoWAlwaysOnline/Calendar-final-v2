// Service worker: приложение работает без интернета.
// Свои файлы — «сначала сеть, при её отсутствии кеш» (обновления подтягиваются сразу, оффлайн всё открывается).
// Шрифты Google — из кеша, в фоне обновляются. Запросы курсов валют не перехватываются.
var CACHE = 'lessoncal-v2';
var CORE = [
  './', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
  'favicon-32.png?v=2', 'icon-192.png?v=2', 'icon-512.png?v=2', 'apple-touch-icon.png?v=2'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method!=='GET') return;
  var url = new URL(req.url);
  var isFont = url.hostname==='fonts.googleapis.com' || url.hostname==='fonts.gstatic.com';

  if(url.origin===self.location.origin){
    e.respondWith(
      fetch(req).then(function(res){
        if(res && res.ok){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(req, {ignoreSearch: true}).then(function(r){
          if(r) return r;
          if(req.mode==='navigate') return caches.match('index.html');
          return Response.error();
        });
      })
    );
  } else if(isFont){
    e.respondWith(
      caches.match(req).then(function(cached){
        var net = fetch(req).then(function(res){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
          return res;
        }).catch(function(){ return cached; });
        return cached || net;
      })
    );
  }
});
