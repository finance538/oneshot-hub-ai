import { createHmac } from "node:crypto";
import { env } from "./security.js";

type Event = {
  actor?: string;
  email?: string;
  action: string;
  resource?: string;
  anonymous?: boolean;
  status?: "success" | "failure";
  metadata?: Record<string, string | number | boolean | null>;
};

const ENDPOINT = "https://ai.1shotcam.com/api/ai/activity/ingest";
const PROD = "https://www.1shotcam.com";

export function queueHubActivity(req: Request, event: Event, waitUntil?: (task: Promise<unknown>) => void): void {
  if (new URL(req.url).origin !== PROD) return;
  const secret = env("ONESHOT_ACTIVITY_HUB_KEY");
  if (!secret || secret.length < 32) {
    console.error("hub_activity_key_missing");
    return;
  }
  const envelope = {
    id: crypto.randomUUID(),
    app: "hub", at: Date.now(),
    ...event,
  };
  const body = JSON.stringify(envelope);
  const task = fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-oneshot-activity-source": "hub",
      "x-oneshot-activity-signature": createHmac("sha256", secret).update(body).digest("hex"),
    },
    body, redirect: "error", signal: AbortSignal.timeout(3500),
  }).then(response => {
    if (!response.ok) console.error("hub_activity_delivery_failed", response.status);
  }).catch(() => { console.error("hub_activity_transport_failed"); });
  if (waitUntil) waitUntil(task);
  else void task;
}

/** No record identifiers, customer paths, query strings, or URL fragments. */
export function safeHubPage(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.length > 180) return "/other";
  const section = value.split(/[?#]/)[0].split("/").filter(Boolean)[0];
  return section && ["hub", "dashboard", "tools", "workforce", "store", "pricing", "signin", "checkout", "solutions"].includes(section)
    ? "/" + section : section ? "/other" : "/";
}
