/* Cache only public assets and a dedicated offline document. Never cache
   navigations, API/Identity responses, account data or payments. */
const CACHE = "oneshot-hub-offline-v2";
const STATIC = [
  "/hub-offline.html",
  "/offline.js",
  "/oneshot.svg",
  "/hub-icon-192.png",
  "/hub-icon-512.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC)));
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
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/.netlify/") ||
    url.pathname.startsWith("/sso/")
  )
    return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await caches.match("/hub-offline.html")) ||
          new Response("OneShot requires an internet connection.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
      ),
    );
    return;
  }
  const asset =
    !url.search &&
    (STATIC.includes(url.pathname) ||
      (/^\/assets\/[^/]+\.(js|css|woff2)$/.test(url.pathname) &&
        ["script", "style", "font"].includes(request.destination)));
  if (!asset) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE),
        cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (
        response.ok &&
        response.type === "basic" &&
        !response.redirected &&
        !response.headers.get("content-type")?.includes("text/html")
      ) {
        await cache.put(request, response.clone());
        const entries = await cache.keys();
        const removable = entries.filter(
          (entry) => !STATIC.includes(new URL(entry.url).pathname),
        );
        if (removable.length > 70) await cache.delete(removable[0]);
      }
      return response;
    })(),
  );
});
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    /* Generic fallback, no raw payload. */
  }
  const title =
    typeof data.title === "string" ? data.title.slice(0, 80) : "OneShot";
  const body =
    typeof data.body === "string"
      ? data.body.slice(0, 240)
      : "لديك إشعار جديد في ون شوت.";
  const destination = ["/hub", "/products", "/workforce"].includes(data.url)
    ? data.url
    : "/hub";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/hub-icon-192.png",
      badge: "/hub-icon-192.png",
      tag: "oneshot-notification",
      data: { destination },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.destination;
  const destination = new URL(
    ["/hub", "/products", "/workforce"].includes(path) ? path : "/hub",
    self.location.origin,
  ).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        // Do not navigate an open payment or draft away from unsaved work.
        const existing = clients.find((client) => client.url === destination);
        if (existing) return existing.focus();
        return self.clients.openWindow(destination);
      }),
  );
});
