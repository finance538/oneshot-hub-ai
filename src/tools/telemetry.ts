import type { ToolEvent } from "../../shared/tools/radar";

// Anonymous counters only: the slug and event name. Calculator inputs never
// leave the browser. Views and uses are counted once per tab session.
export function trackTool(slug: string, event: ToolEvent) {
  if (event !== "funnel") {
    const key = `oneshot.tool.${event}.${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Without session storage we still send a single event per call.
    }
  }
  void fetch("/api/tools/track", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, event }),
  }).catch(() => {});
}

let proPromise: Promise<Set<string>> | null = null;
/** Owner-designated Pro tools; an unavailable API simply means none. */
export function loadProTools() {
  proPromise ??= fetch("/api/tools/pro", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : { pro: [] }))
    .then(
      (d: { pro?: unknown }) =>
        new Set(
          Array.isArray(d.pro)
            ? d.pro.filter((s): s is string => typeof s === "string")
            : [],
        ),
    )
    .catch(() => new Set<string>());
  return proPromise;
}
