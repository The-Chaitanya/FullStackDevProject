const CACHE_NAME = "messbuddy-v1";
const APP_SHELL = [
  "/",
  "/welcome.html",
  "/login.html",
  "/student-dashboard.html",
  "/vendor-dashboard.html",
  "/profile.html",
  "/menu-details.html",
  "/welcome.css",
  "/login.css",
  "/style.css",
  "/vendor-dashboard.css",
  "/profile.css",
  "/menu-details.css",
  "/script.js",
  "/login.js",
  "/menu-data.js",
  "/student-dashboard.js",
  "/vendor-dashboard.js",
  "/profile.js",
  "/menu-details.js",
  "/manifest.webmanifest",
  "/assets/app-icon-192.png",
  "/assets/app-icon-512.png",
  "/assets/app-icon-maskable-512.png",
  "/assets/app-icon.svg",
  "/assets/app-icon-maskable.svg",
  "/assets/welcome-bg.webp",
  "/assets/food-thali.webp",
  "/assets/food-burger.webp",
  "/assets/food-sweets.webp",
  "/assets/student-login.png",
  "/assets/vendor-image.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve();
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match("/welcome.html");
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match("/welcome.html"));
    }),
  );
});
