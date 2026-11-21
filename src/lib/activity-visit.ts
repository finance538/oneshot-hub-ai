/** Coarse pageview analytics. No credentials, device IDs, query strings or hash. */
export function installHubActivityVisit(): void {
  const log = () => {
    if (location.hostname !== "www.1shotcam.com") return;
    void fetch("/api/activity/visit", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: location.pathname }),
      keepalive: true,
    }).catch(() => undefined);
  };
  log();
  addEventListener("popstate", log);
}
