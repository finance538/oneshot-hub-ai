import { getUser } from "@netlify/identity";
import { ecosystemRoute } from "../lib/ecosystem.js";
import { notificationRoute } from "../lib/notifications.js";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import {
  products,
  orders,
  vaultKeys,
  conversations,
  messages,
  staff,
  webhookReceipts,
} from "../../db/schema.js";
import {
  ApiError,
  assertOrigin,
  authenticate,
  resolveUser,
  corsHeaders,
  payload,
  limit,
  encrypt,
  stringField,
  uuid,
  audit,
  safeError,
  vaultReady,
  webhookReady,
} from "../lib/security.js";
import { coreHealth } from "../lib/upstream.js";
import {
  executePayment,
  publicOrder,
  paymentWebhook,
  reconcilePayment,
} from "../lib/payments.js";
import { isLegacyCorePath, legacyCoreRoute } from "../lib/legacy-core.js";
import { nativeGateways, nativeTopologies } from "../lib/payment-providers.js";
import { workforceRoute } from "../lib/workforce.js";
import { executiveChat, overview } from "../lib/ai.js";
import { gateways, endpoints } from "../../shared/contracts.js";

export default async (req: Request) => {
  const requestId = crypto.randomUUID();
  const cors = corsHeaders(req);
  const json = (value: unknown, status = 200) =>
    Response.json(value, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
        "X-Content-Type-Options": "nosniff",
        ...cors,
      },
    });
  try {
    const url = new URL(req.url);
    const route = url.searchParams.get("route");
    const path = (
      route ? `/api/${route.replace(/^\/+/, "")}` : url.pathname
    ).replace(/\/+$/, "");
    const method = req.method;
    // Retired studio requests must stop before auth, database work or inference.
    if (
      path === "/api/ai/chat" ||
      (path === "/api/conversations" && url.searchParams.get("kind") !== "ceo")
    )
      return json(
        {
          error:
            "هذه الخدمة لم تعد متاحة. استخدم موظفي AI في مقر شركتك الرقمي.",
          code: "AI_STUDIO_RETIRED",
          destination: "/workforce",
          requestId,
        },
        410,
      );
    if (method === "OPTIONS") {
      assertOrigin(req);
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "Cache-Control": "no-store",
        },
      });
    }
    if (path === "/api/webhooks/callback") {
      if (method !== "POST") throw new ApiError(405, "طريقة الطلب غير مدعومة.");
      return json(await paymentWebhook(req));
    }
    if (!["GET", "POST", "DELETE", "PATCH"].includes(method))
      throw new ApiError(405, "طريقة الطلب غير مدعومة.");
    if (method !== "GET") assertOrigin(req);
    if (path.startsWith("/api/notifications/"))
      return json(await notificationRoute(req, path));
    if (path.startsWith("/api/ecosystem/"))
      return json(await ecosystemRoute(req, path));
    if (isLegacyCorePath(path)) return json(await legacyCoreRoute(req, path));
    if (path.startsWith("/api/workforce/"))
      return json(await workforceRoute(req, path));
    if (path === "/api/health" && method === "GET") {
      const [dbConnected, core] = await Promise.all([
        database()
          .execute(sql`select 1`)
          .then(() => true)
          .catch(() => false),
        coreHealth(),
      ]);
      return json({
        status: dbConnected && core.connected ? "connected" : "degraded",
        database: { connected: dbConnected },
        core,
        checkedAt: new Date().toISOString(),
      });
    }
    if (path === "/api/products" && method === "GET")
      return json({
        products: await database()
          .select()
          .from(products)
          .where(eq(products.active, true))
          .orderBy(asc(products.priceCents)),
      });
    if (path === "/api/payments/capabilities" && method === "GET")
      return json({
        runtime: "netlify",
        gateways: nativeGateways,
        topologies: nativeTopologies,
        confirmation: "authenticated_provider_query",
      });
    if (path === "/api/session" && method === "GET") {
      const user = await resolveUser(req);
      return json({
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              roles: user.roles || [],
            }
          : null,
      });
    }
    if (endpoints.payment.includes(path) && method === "POST") {
      const user = await authenticate(req);
      await limit(user.id, "payment", 8);
      return json(
        await executePayment(
          await payload(req),
          user,
          req.headers.get("Idempotency-Key"),
        ),
      );
    }
    if (path === "/api/orders" && method === "GET") {
      const user = await authenticate(req);
      return json({
        orders: (
          await database()
            .select()
            .from(orders)
            .where(eq(orders.ownerId, user.id))
            .orderBy(desc(orders.createdAt))
            .limit(50)
        ).map(publicOrder),
      });
    }
    const reconcileMatch = path.match(/^\/api\/orders\/([^/]+)\/reconcile$/);
    if (reconcileMatch && method === "POST") {
      const user = await authenticate(req);
      await limit(user.id, "payment_reconciliation", 12);
      return json(await reconcilePayment(uuid(reconcileMatch[1]), user.id));
    }
    if (/^\/api\/orders\/[^/]+$/.test(path) && method === "GET") {
      const user = await authenticate(req),
        id = uuid(path.split("/").pop()!);
      const [order] = await database()
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.ownerId, user.id)));
      if (!order) throw new ApiError(404, "الطلب غير موجود.");
      return json({ order: publicOrder(order) });
    }
    if (endpoints.vault.includes(path)) {
      const user = await authenticate(req, true),
        db = database();
      if (method === "GET")
        return json({
          keys: await db
            .select({
              id: vaultKeys.id,
              gateway: vaultKeys.gateway,
              environment: vaultKeys.environment,
              updatedAt: vaultKeys.updatedAt,
            })
            .from(vaultKeys),
        });
      if (method === "POST") {
        await limit(user.id, "vault", 10);
        const body = await payload(req),
          gateway = String(body.gatewayCode),
          environment = String(body.environment);
        if (
          !gateways.some((g) => g[0] === gateway) ||
          !["live", "sandbox"].includes(environment)
        )
          throw new ApiError(400, "البوابة أو البيئة غير صالحة.");
        const credentials = {
          merchantId: stringField(body.merchantId, "معرّف التاجر", 200),
          secretKey: stringField(body.secretKey, "المفتاح السري", 4000),
          clientKey:
            typeof body.clientKey === "string"
              ? body.clientKey.slice(0, 4000)
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
        return json({
          saved: true,
          gateway,
          environment,
          message: "حُفظت المفاتيح مشفّرة في قاعدة بيانات المنظومة.",
        });
      }
    }
    if (path === "/api/admin/readiness" && method === "GET") {
      await authenticate(req, true);
      const core = await coreHealth();
      const receipts = await database()
        .select({ id: orders.id })
        .from(orders)
        .innerJoin(webhookReceipts, eq(orders.id, webhookReceipts.orderId))
        .where(
          and(
            eq(orders.executionMode, "PRODUCTION"),
            eq(orders.processor, "netlify"),
            eq(orders.gateway, "stripe"),
            eq(orders.status, "paid"),
          ),
        )
        .limit(1);
      return json({
        database: { connected: true },
        core,
        vaultEncryptionConfigured: vaultReady(),
        signedCallbacksConfigured: webhookReady(),
        paymentProcessor: "netlify",
        supportedGateways: nativeGateways,
        confirmation: "authenticated_provider_query",
        adminVerified: true,
        livePaymentVerified: receipts.length > 0,
        domainTransfer: "after_successful_deployment_and_verification",
      });
    }
    if (path === "/api/admin/overview" && method === "GET") {
      await authenticate(req, true);
      return json(await overview());
    }
    if (path === "/api/admin/orders" && method === "GET") {
      await authenticate(req, true);
      return json({
        orders: (
          await database()
            .select()
            .from(orders)
            .orderBy(desc(orders.createdAt))
            .limit(50)
        ).map(publicOrder),
      });
    }
    if (path === "/api/admin/staff") {
      const user = await authenticate(req, true);
      if (method === "GET")
        return json({
          staff: await database()
            .select()
            .from(staff)
            .orderBy(desc(staff.createdAt)),
        });
      if (method === "POST") {
        await limit(user.id, "staff", 10);
        const body = await payload(req);
        const [employee] = await database()
          .insert(staff)
          .values({
            name: stringField(body.name, "الاسم", 100),
            role: stringField(body.role, "الدور", 150),
            instructions: stringField(body.instructions, "التعليمات", 2000),
          })
          .returning();
        await audit(user.id, "staff.created", employee.id);
        return json({ employee }, 201);
      }
    }
    if (/^\/api\/admin\/staff\/[^/]+$/.test(path) && method === "PATCH") {
      const user = await authenticate(req, true),
        id = uuid(path.split("/").pop()!),
        body = await payload(req);
      if (typeof body.active !== "boolean")
        throw new ApiError(400, "حالة الموظف غير صالحة.");
      const [employee] = await database()
        .update(staff)
        .set({ active: body.active })
        .where(eq(staff.id, id))
        .returning();
      if (!employee) throw new ApiError(404, "الموظف غير موجود.");
      await audit(user.id, "staff.updated", id);
      return json({ employee });
    }
    if (endpoints.ceo.includes(path) && method === "POST") {
      const user = await authenticate(req, true);
      await limit(user.id, "ai", 10);
      return json(await executiveChat(await payload(req), user.id));
    }
    if (path === "/api/conversations" && method === "GET") {
      const user = await authenticate(req, true);
      return json({
        conversations: await database()
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.ownerId, user.id),
              eq(conversations.kind, "ceo"),
            ),
          )
          .orderBy(desc(conversations.updatedAt))
          .limit(50),
      });
    }
    if (/^\/api\/conversations\/[^/]+$/.test(path)) {
      const user = await authenticate(req, true),
        id = uuid(path.split("/").pop()!),
        db = database();
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, id),
            eq(conversations.ownerId, user.id),
            eq(conversations.kind, "ceo"),
          ),
        );
      if (!conversation) throw new ApiError(404, "المحادثة غير موجودة.");
      if (method === "GET")
        return json({
          conversation,
          messages: await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, id))
            .orderBy(asc(messages.createdAt)),
        });
      if (method === "DELETE") {
        await db.delete(conversations).where(eq(conversations.id, id));
        return json({ deleted: true });
      }
    }
    throw new ApiError(404, "المسار غير موجود.", "ROUTE_NOT_FOUND");
  } catch (error) {
    return json(
      { ...safeError(error), requestId },
      error instanceof ApiError ? error.status : 500,
    );
  }
};
