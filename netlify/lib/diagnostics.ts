import { desc, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import { diagnosticEvents } from "../../db/schema.js";
import {
  diagnosticArea,
  diagnosticCodes,
  type DiagnosticCode,
} from "../../shared/commerce.js";
import { ApiError, authenticate, limit, payload } from "./security.js";
import { ecosystemRoute } from "./ecosystem.js";
import { clientAddress } from "./commerce.js";

export async function recordDiagnostic(
  source: "client" | "server",
  code: DiagnosticCode,
  area: string,
  status: number | null = null,
) {
  try {
    await database()
      .insert(diagnosticEvents)
      .values({ source, code, area, status });
  } catch {
    /* Monitoring never overrides a payment or API outcome. */
  }
}
export async function diagnosticsRoute(req: Request, path: string) {
  if (path === "/api/diagnostics/client" && req.method === "POST") {
    await limit(clientAddress(req), "client-diagnostics", 12);
    const body = await payload(req, 600);
    const code = body.code as DiagnosticCode;
    if (!diagnosticCodes.includes(code) || code.startsWith("SSO_"))
      throw new ApiError(400, "نوع التشخيص غير صالح.");
    const areas = [
      "application",
      "sso",
      "payments",
      "quotes",
      "admin",
      "workforce",
    ];
    const area = areas.includes(String(body.area))
      ? String(body.area)
      : "application";
    await recordDiagnostic("client", code, area);
    return { accepted: true };
  }
  await authenticate(req, true);
  if (path !== "/api/admin/diagnostics" || req.method !== "GET")
    throw new ApiError(404, "المسار غير متاح.");
  const start = performance.now();
  const connected = await database()
    .execute(sql`select 1`)
    .then(() => true)
    .catch(() => false);
  const databaseLatencyMs = Math.round(performance.now() - start);
  const [ecosystem, logs] = await Promise.all([
    ecosystemRoute(req, "/api/ecosystem/status").catch(() => null),
    database()
      .select({
        id: diagnosticEvents.id,
        source: diagnosticEvents.source,
        code: diagnosticEvents.code,
        area: diagnosticEvents.area,
        status: diagnosticEvents.status,
        createdAt: diagnosticEvents.createdAt,
      })
      .from(diagnosticEvents)
      .orderBy(desc(diagnosticEvents.createdAt))
      .limit(50)
      .catch(() => null),
  ]);
  return {
    api: "reachable",
    database: connected ? "connected" : "unavailable",
    databaseLatencyMs,
    identity: "authenticated_admin",
    ecosystem,
    logs,
    checkedAt: new Date().toISOString(),
    retentionDays: 14,
  };
}
export function captureServerFailure(req: Request, status: number) {
  const url = new URL(req.url);
  const path = url.searchParams.has("route")
    ? `/api/${url.searchParams.get("route")}`
    : url.pathname;
  if (status < 500 || path.includes("diagnostics")) return;
  const task = limit(clientAddress(req), "server-diagnostics", 12)
    .then(() =>
      recordDiagnostic("server", "API_SERVER", diagnosticArea(path), status),
    )
    .catch(() => {});
  Netlify.context?.waitUntil(task);
}
