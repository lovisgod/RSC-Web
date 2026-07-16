const CACHE_NAME = "rsc-outlet-admin-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/rsc-outlet-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function shouldBypass(request) {
  const url = new URL(request.url);

  return (
    request.method !== "GET" ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/socket.io") ||
    (url.protocol !== "http:" && url.protocol !== "https:")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (shouldBypass(request)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/") || Response.error()),
    );
    return;
  }

  if (["script", "style", "image", "font"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fresh = fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });

        return cached || fresh;
      }),
    );
  }
});
