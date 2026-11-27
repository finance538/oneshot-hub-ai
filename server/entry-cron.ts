// Vercel cron entry. Each scheduled job keeps its Netlify implementation; Vercel calls this route
// with Authorization: Bearer CRON_SECRET, and anything else is refused.
import { timingSafeEqual } from "node:crypto";

const jobs: Record<string, () => Promise<unknown>> = {
  "experience-notifications": async () => (await import("../netlify/functions/experience-notifications.mts")).default(),
  "follow-ups": async () => (await import("../netlify/functions/follow-ups-cron.mts")).default(),
  maintenance: async () => (await import("../netlify/functions/maintenance.mts")).default(),
  "payment-reconcile": async () => (await import("../netlify/functions/payment-reconcile.mts")).default(),
  "workforce-mail-sync": async () => (await import("../netlify/functions/workforce-mail-sync.mts")).default(),
};

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return "not_configured" as const;
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied)
    ? ("ok" as const)
    : ("denied" as const);
}

export default async function handler(request: Request): Promise<Response> {
  const state = authorized(request);
  if (state === "not_configured")
    return Response.json({ error: "cron_not_configured" }, { status: 503 });
  if (state === "denied") return Response.json({ error: "unauthorized" }, { status: 401 });

  const job = new URL(request.url).pathname.split("/").pop() || "";
  const run = jobs[job];
  if (!run) return Response.json({ error: "unknown_job" }, { status: 404 });
  try {
    await run();
    return Response.json({ ok: true, job });
  } catch (error) {
    console.error("cron_job_failed", job, error instanceof Error ? error.message : "error");
    return Response.json({ ok: false, job }, { status: 500 });
  }
}
