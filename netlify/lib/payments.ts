import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { database } from "../../db/index.js";
import {
  orders,
  products,
  vaultKeys,
  webhookReceipts,
} from "../../db/schema.js";
import { gateways, topologies, regions } from "../../shared/contracts.js";
import {
  ApiError,
  decrypt,
  env,
  stringField,
  uuid,
  audit,
  webhookReady,
} from "./security.js";
import { checkoutUrl, coreHealth } from "./upstream.js";
import {
  assertNativePayment,
  assertStripeCredentials,
  createHostedCheckout,
  verifyHostedCheckout,
  nativeGateways,
  nativeTopologies,
} from "./payment-providers.js";
export function publicOrder(row: typeof orders.$inferSelect) {
  return {
    id: row.id,
    description: row.description,
    amountCents: row.amountCents,
    currency: row.currency,
    status: row.status,
    gateway: row.gateway,
    executionMode: row.executionMode,
    checkoutUrl: row.checkoutUrl,
    createdAt: row.createdAt,
    processor: row.processor,
  };
}
function checkoutOrigin() {
  const value = env("ONESHOT_CHECKOUT_ORIGIN") || "https://1shotcam.com";
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !(
        url.hostname === "1shotcam.com" ||
        url.hostname === "www.1shotcam.com" ||
        url.hostname === "1shotcam-ecosystem.netlify.app" ||
        url.hostname.endsWith("--1shotcam-ecosystem.netlify.app")
      )
    )
      throw 0;
    return url.origin;
  } catch {
    throw new ApiError(503, "عنوان العودة من صفحة الدفع غير مهيأ بصورة صحيحة.");
  }
}
export function rejectCardData(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (
      /^(cardNumber|cardExpiry|cardCvv|cvv|cvc|pan|card|cardDetails|card_details)$/i.test(
        key,
      )
    )
      throw new ApiError(400, "أدخل بيانات البطاقة داخل صفحة بوابة الدفع فقط.");
    rejectCardData(child);
  }
}
export async function executePayment(
  body: Record<string, unknown>,
  user: { id: string; roles?: string[] },
  key: string | null,
) {
  if (!key || !/^[a-zA-Z0-9-]{16,80}$/.test(key))
    throw new ApiError(400, "مفتاح العملية مطلوب.");
  const db = database(),
    isAdmin = user.roles?.includes("admin");
  rejectCardData(body);
  const gateway = String(body.gatewayCode || "telr"),
    executionMode = body.productId
      ? "PRODUCTION"
      : String(body.executionMode || "SANDBOX");
  const topology = body.productId
    ? "HOSTED_PAGE"
    : String(body.topologyMode || "HOSTED_PAGE");
  if (
    !gateways.some((g) => g[0] === gateway) ||
    !["PRODUCTION", "SANDBOX"].includes(executionMode) ||
    !topologies.some((t) => t[0] === topology)
  )
    throw new ApiError(400, "إعدادات بوابة الدفع غير صالحة.");
  if (!body.productId && !isAdmin)
    throw new ApiError(403, "مختبر بوابات الدفع متاح للمسؤول فقط.");
  if (topology === "ALL_6_MODES") {
    return {
      diagnostic: true,
      core: await coreHealth(),
      modes: topologies
        .filter((t) => t[0] !== "ALL_6_MODES")
        .map(([mode]) => ({
          mode,
          executed: false,
          status:
            nativeGateways.some((g) => g === gateway) &&
            nativeTopologies.some((t) => t === mode)
              ? "requires_individual_execution"
              : "adapter_not_available",
        })),
      message:
        "فحص خدمات Netlify والمسارات المتاحة فقط؛ لم تُنشأ أي دفعة ولم يُتحقق من حساب التاجر لدى المزود.",
    };
  }
  let productId: string | null = null,
    amountCents: number,
    currency: string,
    description: string;
  if (body.productId) {
    productId = stringField(body.productId, "المنتج", 100);
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.active, true)));
    if (!product) throw new ApiError(404, "هذا المنتج غير متاح.");
    if (product.catalogDetails)
      throw new ApiError(
        409,
        "هذه الخدمة تتطلب تأكيد النطاق وعرض السعر من الفريق قبل الدفع.",
        "SERVICE_QUOTE_REQUIRED",
      );
    ({ priceCents: amountCents, currency, name: description } = product);
  } else {
    const region = String(body.region || "US-USD");
    if (!regions.some((r) => r[0] === region))
      throw new ApiError(400, "المنطقة غير صالحة.");
    currency = region.split("-")[1];
    const amount = String(body.amount);
    if (!/^\d{1,5}(\.\d{1,2})?$/.test(amount))
      throw new ApiError(400, "أدخل مبلغاً موجباً بدقة منزلتين عشريتين.");
    amountCents = Math.round(Number(amount) * 100);
    if (amountCents < 100 || amountCents > 1000000)
      throw new ApiError(400, "المبلغ المسموح من 1 إلى 10,000.");
    description = stringField(
      body.cardholder || body.description,
      "وصف الطلب",
      200,
    );
  }
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        productId,
        amountCents,
        currency,
        description,
        gateway,
        executionMode,
        topology,
      }),
    )
    .digest("hex");
  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.idempotencyKey, key));
  if (existing) {
    if (existing.ownerId !== user.id || existing.fingerprint !== fingerprint)
      throw new ApiError(409, "هذا المعرّف مرتبط بطلب آخر.");
    return { order: publicOrder(existing), replayed: true };
  }
  const environment = executionMode === "PRODUCTION" ? "live" : "sandbox";
  assertNativePayment(gateway, topology);
  const [vault] = await db
    .select()
    .from(vaultKeys)
    .where(
      and(
        eq(vaultKeys.gateway, gateway),
        eq(vaultKeys.environment, environment),
      ),
    );
  if (!vault)
    throw new ApiError(
      503,
      "مفاتيح هذه البوابة غير مضافة في البيئة المختارة.",
      "GATEWAY_NOT_CONFIGURED",
    );
  const credentials = decrypt(vault.encrypted, `${gateway}:${environment}`);
  assertStripeCredentials(credentials, executionMode);
  const returnOrigin = checkoutOrigin();
  const [order] = await db
    .insert(orders)
    .values({
      ownerId: user.id,
      productId,
      amountCents,
      currency,
      description,
      gateway,
      executionMode,
      topology,
      processor: "netlify",
      idempotencyKey: key,
      fingerprint,
    })
    .onConflictDoNothing({ target: orders.idempotencyKey })
    .returning();
  if (!order)
    throw new ApiError(409, "العملية قيد التنفيذ بالفعل. راجع سجل الطلبات.");
  try {
    const response = await createHostedCheckout(
      order,
      credentials,
      returnOrigin,
    );
    const redirect = checkoutUrl(response.redirectUrl, gateway);
    const upstreamId =
      typeof response.transactionId === "string"
        ? response.transactionId.slice(0, 200)
        : null;
    await db
      .update(orders)
      .set({
        status: redirect ? "awaiting_payment" : "unconfirmed",
        checkoutUrl: redirect,
        upstreamId,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending")));
    const [fresh] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, order.id));
    return {
      order: publicOrder(fresh),
      redirectUrl: fresh.checkoutUrl,
      message: redirect
        ? "أكمل التحقق في صفحة الدفع."
        : "استُلم الرد دون رابط دفع موثوق. راجع العملية لدى البوابة.",
    };
  } catch (error) {
    await db
      .update(orders)
      .set({ status: "unconfirmed", updatedAt: new Date() })
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending")));
    // Preserve the order identifier without exposing provider errors or credentials.
    const [fresh] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, order.id));
    return {
      order: publicOrder(fresh),
      ...(fresh.status === "paid"
        ? { message: "تم تأكيد الدفع بإشعار موقّع." }
        : {
            error:
              error instanceof ApiError
                ? error.message
                : "تعذّر تأكيد نتيجة الدفع.",
            code: "UPSTREAM_UNCONFIRMED",
          }),
    };
  }
}
export async function paymentWebhook(req: Request) {
  const secret = env("ONESHOT_WEBHOOK_SECRET");
  if (!secret || !webhookReady())
    throw new ApiError(503, "استقبال إشعارات الدفع غير مهيأ.");
  const timestamp = req.headers.get("x-oneshot-timestamp") || "",
    signature = req.headers.get("x-oneshot-signature") || "";
  if (
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
    !/^[0-9a-f]{64}$/i.test(signature)
  )
    throw new ApiError(401, "توقيع الإشعار غير صالح.");
  const raw = await req.text();
  if (raw.length > 32000)
    throw new ApiError(413, "الإشعار أكبر من الحد المسموح.");
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${raw}`)
    .digest();
  const received = Buffer.from(signature, "hex");
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  )
    throw new ApiError(401, "توقيع الإشعار غير صالح.");
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(raw);
    if (!event || typeof event !== "object") throw 0;
  } catch {
    throw new ApiError(400, "الإشعار غير صالح.");
  }
  const eventId = stringField(event.eventId, "معرّف الإشعار"),
    orderId = uuid(stringField(event.orderId, "معرّف الطلب"));
  if (!["paid", "failed"].includes(String(event.status)))
    throw new ApiError(400, "حالة الإشعار غير مدعومة.");
  const db = database();
  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    if (
      !order ||
      order.processor !== "legacy_core" ||
      order.amountCents !== event.amountCents ||
      order.currency !== event.currency ||
      order.gateway !== event.gatewayCode ||
      order.executionMode !== event.executionMode
    )
      throw new ApiError(400, "بيانات الإشعار لا تطابق الطلب.");
    const [receipt] = await tx
      .insert(webhookReceipts)
      .values({ eventId, orderId })
      .onConflictDoNothing()
      .returning();
    if (!receipt) return;
    await tx
      .update(orders)
      .set({ status: String(event.status), updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), ne(orders.status, "paid")));
  });
  await audit("payment-core", "payment.callback", orderId);
  return { received: true };
}

// Status reconciliation only: never creates or retries a checkout.
export async function reconcilePayment(id: string, ownerId?: string) {
  const db = database();
  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(eq(orders.id, id), ownerId ? eq(orders.ownerId, ownerId) : undefined),
    );
  if (!order) throw new ApiError(404, "الطلب غير موجود.");
  if (order.status === "paid") return { order: publicOrder(order) };
  if (order.processor !== "netlify")
    return {
      order: publicOrder(order),
      message: "طلب سابق للنقل؛ يحتاج تسوية عبر معالجه الأصلي.",
    };
  if (order.gateway !== "stripe")
    throw new ApiError(409, "التحقق من هذه البوابة غير متاح بعد.");
  const environment = order.executionMode === "PRODUCTION" ? "live" : "sandbox";
  const [vault] = await db
    .select()
    .from(vaultKeys)
    .where(
      and(
        eq(vaultKeys.gateway, order.gateway),
        eq(vaultKeys.environment, environment),
      ),
    );
  if (!vault) throw new ApiError(503, "مفاتيح البوابة غير مهيأة للتحقق.");
  const status = await verifyHostedCheckout(
    order,
    decrypt(vault.encrypted, `${order.gateway}:${environment}`),
  );
  if (status) {
    await db.transaction(async (tx) => {
      const [fresh] = await tx.select().from(orders).where(eq(orders.id, id));
      if (
        !fresh ||
        fresh.upstreamId !== order.upstreamId ||
        fresh.amountCents !== order.amountCents ||
        fresh.currency !== order.currency ||
        fresh.gateway !== order.gateway ||
        fresh.executionMode !== order.executionMode ||
        fresh.processor !== "netlify"
      )
        throw new ApiError(409, "تغير مرجع الطلب. أعد تحميل الحالة.");
      const [receipt] = await tx
        .insert(webhookReceipts)
        .values({
          eventId: `stripe:verified:${order.upstreamId}:${status}`,
          orderId: id,
        })
        .onConflictDoNothing()
        .returning();
      if (receipt)
        await tx
          .update(orders)
          .set({ status, updatedAt: new Date() })
          .where(and(eq(orders.id, id), ne(orders.status, "paid")));
    });
  }
  const [fresh] = await db.select().from(orders).where(eq(orders.id, id));
  return { order: publicOrder(fresh) };
}
