// Service worker: precaches the app shell so the app works fully offline.
// Bump VERSION whenever any shell file changes so clients pick up the update.
const VERSION = 'geschichten-v1';

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'data/freq2000.tsv',
  'vendor/anthropic-sdk-1.11.0.js',
  'js/app.js',
  'js/ui.js',
  'js/db.js',
  'js/day.js',
  'js/store.js',
  'js/fsrs.js',
  'js/srs.js',
  'js/text.js',
  'js/tts.js',
  'js/claude.js',
  'js/stats.js',
  'js/seed.js',
  'js/backup.js',
  'js/content/phases.js',
  'js/content/lessons-phase0.js',
  'js/content/function-words.js',
  'js/content/irregular-forms.js',
  'js/content/prompts.js',
  'js/views/today.js',
  'js/views/progress.js',
  'js/views/grammar.js',
  'js/views/review.js',
  'js/views/input.js',
  'js/views/output.js',
  'js/views/errors.js',
  'js/views/settings.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Only handle same-origin GETs. Claude API calls go straight to the network.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match('index.html'))),
  );
});
