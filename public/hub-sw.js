/* Only the public offline document is cached. Never cache API requests,
   Identity, tokens, conversations, task results or authenticated documents. */
const CACHE = "oneshot-hub-offline-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add("/hub-offline.html")),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("oneshot-hub-offline-") && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate")
    return;
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/.netlify/") ||
    url.pathname.startsWith("/sso/")
  )
    return;
  event.respondWith(
    fetch(event.request).catch(
      async () =>
        (await caches.match("/hub-offline.html")) ||
        new Response("OneShot requires an internet connection.", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        }),
    ),
  );
});
