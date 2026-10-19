/* Only explicitly public resources are cached. Never cache navigation HTML,
   APIs, Identity, callbacks, tokens, conversations, tasks, orders or checkout. */
const CACHE = "oneshot-hub-offline-v2";
const PUBLIC = [
  "/hub-offline.html",
  "/offline-guide.js",
  "/oneshot.svg",
  "/hub-icon-192.png",
  "/hub-icon-512.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PUBLIC)));
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
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/.netlify/") ||
    url.pathname.startsWith("/sso/")
  )
    return;
  if (PUBLIC.includes(url.pathname) && !url.search) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const saved = await cache.match(event.request);
        if (saved) return saved;
        const response = await fetch(event.request);
        if (response.ok && !response.redirected)
          await cache.put(event.request, response.clone());
        return response;
      }),
    );
    return;
  }
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request)
      .then(async (response) => {
        if (response.status < 500) return response;
        return (await caches.match("/hub-offline.html")) || response;
      })
      .catch(
        async () =>
          (await caches.match("/hub-offline.html")) ||
          new Response("OneShot requires an internet connection.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          }),
      ),
  );
});
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    /* Display a generic safe notification. */
  }
  const title =
    typeof data.title === "string" ? data.title.slice(0, 80) : "OneShot";
  const body =
    typeof data.body === "string"
      ? data.body.slice(0, 220)
      : "لديك تحديث في OneShot. · An update is available.";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/hub-icon-192.png",
      badge: "/hub-icon-192.png",
      tag:
        typeof data.tag === "string" ? data.tag.slice(0, 80) : "oneshot-update",
      data: {
        url: ["/hub", "/products"].includes(data.url) ? data.url : "/hub",
      },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url;
  const destination = new URL(
    ["/hub", "/products"].includes(path) ? path : "/hub",
    self.location.origin,
  ).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        const existing = windows.find((client) => client.url === destination);
        if (existing) return existing.focus();
        return self.clients.openWindow(destination);
      }),
  );
});
