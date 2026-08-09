// Минимальный service worker для PWA. Его задача - сделать приложение
// устанавливаемым (браузеры требуют наличие service worker) и дать простой
// экран "нет сети" для переходов между страницами.
//
// Важно: мы НЕ кэшируем HTML-страницы и API. Страницы у Domora личные (заказы,
// сообщения, аккаунт) и серверные - кэш легко показал бы устаревшие или чужие
// данные. Поэтому запросы идут напрямую в сеть, а кэш держит только запасную
// офлайн-страницу. Так надёжнее и без сюрпризов.
const OFFLINE_URL = "/offline.html";
const CACHE = "domora-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Офлайн-запасной экран только для навигации по страницам (не для картинок/API).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
  }
});
