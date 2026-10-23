import { verifiedRevenue } from "./revenue.js";
// Public tool telemetry and the owner radar. Visitors send only a known slug
// and an event name; nothing typed into a calculator ever reaches the server.
import { eq, gte, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import { toolMetrics, toolOffers } from "../../db/schema.js";
import { ApiError, audit, authenticate, limit, payload } from "./security.js";
import { findTool, toolPages } from "../../shared/tools/catalog.ts";
import {
  isWinner,
  TOOL_EVENTS,
  type ToolEvent,
} from "../../shared/tools/radar.ts";

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

function knownSlug(value: unknown) {
  const page = typeof value === "string" ? findTool(value) : undefined;
  if (!page) throw new ApiError(404, "الأداة غير موجودة.", "TOOL_NOT_FOUND");
  return page;
}

async function track(req: Request) {
  const body = await payload(req, 400);
  const page = knownSlug(body.slug);
  const event = body.event as ToolEvent;
  if (!TOOL_EVENTS.includes(event))
    throw new ApiError(400, "نوع الحدث غير صالح.", "INVALID_EVENT");
  // The client address is only hashed inside the per-minute limiter key.
  const client =
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous";
  await limit(`tools:${client}`, "tools-track", 120);
  const inc = (e: ToolEvent) => (event === e ? 1 : 0);
  await database()
    .insert(toolMetrics)
    .values({
      slug: page.slug,
      day: today(),
      cluster: page.cluster,
      views: inc("view"),
      uses: inc("use"),
      funnels: inc("funnel"),
    })
    .onConflictDoUpdate({
      target: [toolMetrics.slug, toolMetrics.day],
      set: {
        views: sql`${toolMetrics.views} + ${inc("view")}`,
        uses: sql`${toolMetrics.uses} + ${inc("use")}`,
        funnels: sql`${toolMetrics.funnels} + ${inc("funnel")}`,
        updatedAt: new Date(),
      },
    });
  return { ok: true };
}

async function proList() {
  const rows = await database()
    .select({ slug: toolOffers.slug })
    .from(toolOffers)
    .where(eq(toolOffers.pro, true));
  return { pro: rows.map((r) => r.slug) };
}

async function radar(req: Request) {
  await authenticate(req, true);
  const db = database();
  const since = daysAgo(6);
  const [totals, recent, offers] = await Promise.all([
    db
      .select({
        slug: toolMetrics.slug,
        views: sql<number>`coalesce(sum(${toolMetrics.views}), 0)::int`,
        uses: sql<number>`coalesce(sum(${toolMetrics.uses}), 0)::int`,
        funnels: sql<number>`coalesce(sum(${toolMetrics.funnels}), 0)::int`,
      })
      .from(toolMetrics)
      .groupBy(toolMetrics.slug),
    db
      .select({
        slug: toolMetrics.slug,
        views: sql<number>`coalesce(sum(${toolMetrics.views}), 0)::int`,
      })
      .from(toolMetrics)
      .where(gte(toolMetrics.day, since))
      .groupBy(toolMetrics.slug),
    db.select().from(toolOffers),
  ]);
  const week = new Map(recent.map((r) => [r.slug, Number(r.views)]));
  const pro = new Set(offers.filter((o) => o.pro).map((o) => o.slug));
  const rows = totals
    .filter((t) => findTool(t.slug))
    .map((t) => {
      const counts = {
        views: Number(t.views),
        uses: Number(t.uses),
        funnels: Number(t.funnels),
      };
      return {
        slug: t.slug,
        cluster: findTool(t.slug)!.cluster,
        ...counts,
        views7: week.get(t.slug) ?? 0,
        winner: isWinner(counts),
        pro: pro.has(t.slug),
      };
    });
  return {
    verified: await verifiedRevenue(),
    telemetryKind: "interaction_estimates",
    rows,
    pro: [...pro],
    tracked: toolPages.length,
    since,
    generatedAt: new Date().toISOString(),
  };
}

async function setPro(req: Request) {
  const user = await authenticate(req, true);
  const body = await payload(req, 400);
  const page = knownSlug(body.slug);
  if (typeof body.pro !== "boolean")
    throw new ApiError(400, "قيمة Pro غير صالحة.", "INVALID_PRO");
  await limit(user.id, "tools-pro", 60);
  await database()
    .insert(toolOffers)
    .values({ slug: page.slug, pro: body.pro, updatedBy: user.id })
    .onConflictDoUpdate({
      target: toolOffers.slug,
      set: { pro: body.pro, updatedBy: user.id, updatedAt: new Date() },
    });
  await audit(
    user.id,
    body.pro ? "tool.pro.enable" : "tool.pro.disable",
    page.slug,
  );
  return { slug: page.slug, pro: body.pro };
}

export async function toolsRoute(req: Request, path: string) {
  const method = req.method;
  if (path === "/api/tools/track" && method === "POST") return track(req);
  if (path === "/api/tools/pro" && method === "GET") return proList();
  if (path === "/api/tools/pro" && method === "PATCH") return setPro(req);
  if (path === "/api/tools/radar" && method === "GET") return radar(req);
  throw new ApiError(404, "المسار المطلوب غير متاح.", "ROUTE_NOT_FOUND");
}
