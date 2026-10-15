/* ---------------------------------------------------------------------------
 * File      : 1-5731n/sw.js
 * Version   : 1.3.1
 * Role      : Service worker: offline cache (cache-first) of the application files; cache name carries the release version.
 * Depends on: none
 * Called by : app.js (navigator.serviceWorker.register)
 * Produces  : Cache Storage entry "stein-<version>"
 * Changelog : see CHANGELOG.md
 * ---------------------------------------------------------------------------
 * Cache name = stein-<release>: bump it at every release so installed copies refresh.
 */
const V = 'stein-1.3.1';
const FILES = ['./', 'index.html', 'i18n.js', 'lang/fr.js', 'lang/en.js', 'lang/es.js', 'lang/de.js', 'lang/it.js', 'lang/pt-pt.js', 'lang/pt-br.js', 'lang/ru.js', 'lang/ar.js', 'lang/zh.js', 'lang/ko.js', 'lang/ja.js', 'lang/hi.js', 'lang/tr.js', 'lang/nl.js', 'lang/pl.js', 'lang/uk.js', 'lang/id.js', 'lang/vi.js', 'lang/la.js', 'engine.js', 'library.js', 'lib_base.js', 'worker.js', 'logo.js', 'glyphs.js', 'themes.js', 'app.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png'];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    try {
      await c.addAll(FILES);
      const extra = ['snd/laser.wav', 'snd/whizz.wav', 'snd/glasbk2.wav', 'snd/applause.wav', 'snd/click.wav'];
      await c.addAll(extra);
    } catch (err) {
      await caches.delete(V);                    // a half-filled cache of the new version must not stay behind: the old version keeps serving
      throw err;
    }
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
