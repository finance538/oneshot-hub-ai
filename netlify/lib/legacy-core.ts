import { and, eq } from "drizzle-orm";
import { database } from "../../db/index.js";
import {
  aiEmployees,
  coreEmployeeSelections,
  corePolicies,
  organizations,
  vaultKeys,
} from "../../db/schema.js";
import {
  gateways,
  securityControls,
  topologies,
} from "../../shared/contracts.js";
import {
  ApiError,
  authenticate,
  resolveUser,
  payload,
  stringField,
  uuid,
  limit,
  encrypt,
  audit,
} from "./security.js";
import { executePayment, rejectCardData } from "./payments.js";
import { workforceConversation } from "./workforce-conversation.js";

// Preserve V6 entry points while using the existing account-isolated application.
const employeeMap: Record<string, string> = {
  ai_ceo: "ceo",
  ai_accountant: "analyst",
  ai_programmer: "developer",
  ai_sales: "sales",
  ai_marketer: "marketing",
  ai_researcher: "researcher",
  ai_support: "support",
};
const channelMap: Record<string, string> = {
  hosted_payment_page: "HOSTED_PAGE",
  embedded_iframe_on_site: "IFRAME_EMBED",
  direct_server_to_server_api: "DIRECT_API",
  android_native_sdk: "MOBILE_SDK",
  smart_payment_link: "PAYMENT_LINK",
  tokenization_recurring: "TOKENIZATION",
  all: "ALL_6_MODES",
  all_6_modes: "ALL_6_MODES",
  all_channels_matrix: "ALL_6_MODES",
};
const defaultPolicy = () => ({
  assignedGatewayCode: "paytabs",
  assignedIntegrationChannel: "all_channels_matrix",
  executionMode: "SANDBOX",
  lockGatewaySelectionToAdmin: true,
  securityToggles: Object.fromEntries(
    securityControls.map(([key]) => [key, true]),
  ),
});
export function isLegacyCorePath(path: string) {
  return (
    path.startsWith("/api/ai-workforce/") ||
    /^\/api\/gateways\/[^/]+\/credentials$/.test(path) ||
    [
      "/api/admin/loader-policy",
      "/api/gateways/register",
      "/api/tester/run-global-check",
    ].includes(path)
  );
}
function normalizeMode(value: unknown) {
  if (value === "live_production" || value === "PRODUCTION")
    return "PRODUCTION";
  if (value === "sandbox" || value === "SANDBOX") return "SANDBOX";
  throw new ApiError(
    400,
    "وضع التنفيذ غير مدعوم. استخدم SANDBOX أو PRODUCTION.",
  );
}
async function getPolicy() {
  const [row] = await database()
    .select()
    .from(corePolicies)
    .where(eq(corePolicies.id, "loader"));
  return row?.policy || defaultPolicy();
}
export async function legacyCoreRoute(
  req: Request,
  path: string,
): Promise<unknown> {
  const db = database();
  if (path === "/api/ai-workforce/catalog" && req.method === "GET") {
    const user = await resolveUser(req);
    const [org] = user
      ? await db
          .select()
          .from(organizations)
          .where(eq(organizations.ownerId, user.id))
      : [];
    const selections = org
      ? await db
          .select()
          .from(coreEmployeeSelections)
          .where(eq(coreEmployeeSelections.organizationId, org.id))
      : [];
    const rows = await db
      .select({
        id: aiEmployees.id,
        title: aiEmployees.title,
        bio: aiEmployees.bio,
        skills: aiEmployees.skills,
      })
      .from(aiEmployees);
    const employees = Object.entries(employeeMap).flatMap(([code, id]) => {
      const row = rows.find((r) => r.id === id);
      return row
        ? [
            {
              code,
              employeeId: id,
              titleAr: row.title.ar,
              titleEn: row.title.en,
              descriptionAr: row.bio.ar,
              capabilities: row.skills,
              isHired: selections.some((s) => s.employeeId === id),
              billingActivated: false,
            },
          ]
        : [];
    });
    return {
      employees,
      hiredCodes: employees.filter((e) => e.isHired).map((e) => e.code),
    };
  }
  if (path.startsWith("/api/ai-workforce/")) {
    if (!["/api/ai-workforce/hire", "/api/ai-workforce/chat"].includes(path))
      throw new ApiError(404, "المسار غير موجود.", "ROUTE_NOT_FOUND");
    if (req.method !== "POST") throw new ApiError(405, "طريقة غير مدعومة.");
    const user = await authenticate(req);
    await limit(user.id, "legacy_workforce", 12);
    const body = await payload(req);
    const code = String(body.employeeCode || "ai_ceo");
    const employeeId = Object.hasOwn(employeeMap, code)
      ? employeeMap[code]
      : undefined;
    if (!employeeId) throw new ApiError(400, "الموظف غير مدعوم.");
    if (body.aiProvider && body.aiProvider !== "gemini")
      throw new ApiError(
        409,
        "انتقل هذا المسار إلى Gemini عبر Netlify. استخدم aiProvider=gemini.",
        "AI_PROVIDER_MIGRATED",
      );
    const [employee] = await db
      .select({ id: aiEmployees.id, title: aiEmployees.title })
      .from(aiEmployees)
      .where(eq(aiEmployees.id, employeeId));
    if (!employee)
      throw new ApiError(503, "كتالوج الموظفين بانتظار تهيئة قاعدة البيانات.");
    let [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, user.id));
    if (!org) {
      await db
        .insert(organizations)
        .values({
          ownerId: user.id,
          name: (user.name || "منشأتي").slice(0, 100),
          outputLanguage: "ar",
        })
        .onConflictDoNothing();
      [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.ownerId, user.id));
    }
    if (!org) throw new ApiError(409, "تعذر إنشاء مساحة المنشأة.");
    if (path.endsWith("/hire")) {
      await db
        .insert(coreEmployeeSelections)
        .values({ organizationId: org.id, employeeId })
        .onConflictDoNothing();
      const selected = await db
        .select()
        .from(coreEmployeeSelections)
        .where(eq(coreEmployeeSelections.organizationId, org.id));
      return {
        hiredEmployee: { code, employeeId, titleAr: employee.title.ar },
        activeStaffList: Object.keys(employeeMap).filter((c) =>
          selected.some((r) => r.employeeId === employeeMap[c]),
        ),
        billingActivated: false,
        message: "حُفظ اختيار الموظف لمنشأتك. لم يُنشأ اشتراك مدفوع أو خصم.",
      };
    }
    if (code !== "ai_ceo") {
      const [selected] = await db
        .select()
        .from(coreEmployeeSelections)
        .where(
          and(
            eq(coreEmployeeSelections.organizationId, org.id),
            eq(coreEmployeeSelections.employeeId, employeeId),
          ),
        );
      if (!selected) throw new ApiError(403, "اختر هذا الموظف لمنشأتك أولاً.");
    }
    // Caller must retain this key across timeouts. No silent generation retries.
    const requestKey = uuid(
      String(body.requestKey || req.headers.get("Idempotency-Key") || ""),
    );
    const translated = new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        input: stringField(body.message, "الرسالة", 4000),
        requestKey,
        outputLanguage: org.outputLanguage,
      }),
    });
    const result = await workforceConversation(
      translated,
      "/api/workforce/chat",
      org.id,
      user.id,
      false,
    );
    const turn = "turn" in result ? result.turn : undefined;
    return {
      ...result,
      employeeCode: code,
      employeeTitle: employee.title.ar,
      providerUsed: "gemini",
      reply: turn?.output || "",
      status: turn?.status,
    };
  }
  const user = await authenticate(req, true);
  if (!["GET", "POST"].includes(req.method))
    throw new ApiError(405, "طريقة غير مدعومة.");
  if (req.method === "POST") await limit(user.id, "legacy_core_admin", 10);
  const match = path.match(/^\/api\/gateways\/([^/]+)\/credentials$/);
  if (match) {
    const gateway = match[1];
    if (!gateways.some(([code]) => code === gateway))
      throw new ApiError(400, "البوابة غير مدعومة.");
    const body = req.method === "POST" ? await payload(req) : {};
    const environment = String(
      body.environment ||
        new URL(req.url).searchParams.get("environment") ||
        "sandbox",
    );
    if (!["sandbox", "live"].includes(environment))
      throw new ApiError(400, "البيئة غير صالحة.");
    if (req.method === "POST") {
      if (body.custom_endpoint_url)
        throw new ApiError(
          400,
          "تُستخدم عناوين المزود المعتمدة فقط؛ لا يقبل الربط عنوانًا مخصصًا.",
        );
      const credentials = {
        merchantId: stringField(
          String(
            body.merchantId ||
              body.profile_id ||
              body.merchant_or_store_id ||
              "",
          ),
          "معرّف التاجر",
        ),
        secretKey: stringField(
          body.secretKey || body.server_secret_key,
          "المفتاح السري",
          4000,
        ),
        clientKey:
          typeof body.client_iframe_key === "string"
            ? body.client_iframe_key.slice(0, 4000)
            : "",
      };
      const encrypted = encrypt(credentials, `${gateway}:${environment}`);
      await db
        .insert(vaultKeys)
        .values({ gateway, environment, encrypted, updatedBy: user.id })
        .onConflictDoUpdate({
          target: [vaultKeys.gateway, vaultKeys.environment],
          set: { encrypted, updatedBy: user.id, updatedAt: new Date() },
        });
      await audit(user.id, "vault.updated", `${gateway}:${environment}`);
    }
    const [row] = await db
      .select({ updatedAt: vaultKeys.updatedAt })
      .from(vaultKeys)
      .where(
        and(
          eq(vaultKeys.gateway, gateway),
          eq(vaultKeys.environment, environment),
        ),
      );
    const summary = {
      gateway,
      environment,
      configured: !!row,
      updatedAt: row?.updatedAt,
    };
    return req.method === "GET"
      ? summary
      : { credentialsSummary: summary, saved: true };
  }
  if (path === "/api/admin/loader-policy") {
    if (req.method === "GET") return { policy: await getPolicy() };
    const body = await payload(req);
    const policy = { ...defaultPolicy(), ...(await getPolicy()) };
    if (body.assignedGatewayCode !== undefined) {
      if (!gateways.some(([code]) => code === body.assignedGatewayCode))
        throw new ApiError(400, "البوابة غير مدعومة.");
      policy.assignedGatewayCode = String(body.assignedGatewayCode);
    }
    if (body.assignedIntegrationChannel !== undefined) {
      if (!Object.hasOwn(channelMap, String(body.assignedIntegrationChannel)))
        throw new ApiError(400, "المسار غير مدعوم.");
      policy.assignedIntegrationChannel = String(
        body.assignedIntegrationChannel,
      );
    }
    if (body.executionMode !== undefined) {
      policy.executionMode = normalizeMode(body.executionMode);
    }
    // Former security toggle flags never disable mandatory production protections.
    policy.securityToggles = defaultPolicy().securityToggles;
    policy.lockGatewaySelectionToAdmin = true;
    await db
      .insert(corePolicies)
      .values({ id: "loader", policy, updatedBy: user.id })
      .onConflictDoUpdate({
        target: corePolicies.id,
        set: { policy, updatedBy: user.id, updatedAt: new Date() },
      });
    await audit(user.id, "core.policy.updated", "loader");
    return { policy };
  }
  if (path === "/api/gateways/register")
    throw new ApiError(
      409,
      "إضافة بوابة جديدة تتطلب تنفيذ ربط موثّق والتحقق منه؛ لا تُسجل عناوين دفع عشوائية.",
      "GATEWAY_ADAPTER_REQUIRED",
    );
  if (path === "/api/tester/run-global-check" && req.method === "POST") {
    const body = await payload(req);
    rejectCardData(body);
    const policy = await getPolicy();
    const topology =
      channelMap[
        String(body.integrationChannel || policy.assignedIntegrationChannel)
      ] || String(body.topologyMode || "");
    if (!topologies.some(([code]) => code === topology))
      throw new ApiError(400, "المسار غير مدعوم.");
    const region = String(body.region || "US");
    const currency = String(
      body.currency ||
        (
          {
            US: "USD",
            SA: "SAR",
            AE: "AED",
            GB: "GBP",
            UK: "GBP",
            EU: "EUR",
          } as Record<string, string>
        )[region] ||
        "",
    );
    return executePayment(
      {
        ...body,
        gatewayCode: body.gatewayCode || policy.assignedGatewayCode,
        executionMode: normalizeMode(
          body.executionMode || policy.executionMode,
        ),
        topologyMode: topology,
        region: `${region === "UK" ? "GB" : region}-${currency}`,
        description: body.description || "فحص دفع مستضاف",
        amount: body.amount ?? "1.00",
      },
      user,
      req.headers.get("Idempotency-Key"),
    );
  }
  throw new ApiError(405, "طريقة غير مدعومة.");
}
