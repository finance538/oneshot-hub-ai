import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import {
  businessSettings,
  orders,
  products,
  quoteRequests,
} from "../../db/schema.js";
import {
  normalizePhone,
  quoteStatuses,
  sarCents,
  type QuoteStatus,
} from "../../shared/commerce.js";
import { findTool } from "../../shared/tools/catalog.ts";
import {
  ApiError,
  authenticate,
  limit,
  payload,
  stringField,
  uuid,
} from "./security.js";
import { auditEvents } from "../../db/schema.js";
import { verifiedRevenue } from "./revenue.js";

const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export const clientAddress = (req: Request) =>
  Netlify.context?.ip ||
  req.headers.get("x-nf-client-connection-ip") ||
  "anonymous";
export function quoteInput(body: Record<string, unknown>) {
  const customerName = stringField(body.customerName, "الاسم", 120);
  const email = stringField(body.email, "البريد", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ApiError(400, "البريد غير صالح.");
  const phone = normalizePhone(body.phone);
  if (!phone)
    throw new ApiError(
      400,
      "أدخل رقم التواصل بصيغة دولية صحيحة.",
      "INVALID_PHONE",
    );
  if (!["ar", "en"].includes(String(body.language)))
    throw new ApiError(400, "لغة التواصل غير صالحة.");
  if (!["service", "pro"].includes(String(body.kind)))
    throw new ApiError(400, "نوع الطلب غير صالح.");
  if (body.website) throw new ApiError(400, "تعذّر قبول الطلب.");
  return {
    customerName,
    email,
    phone,
    notes: stringField(body.notes, "نطاق المشروع", 4000),
    language: String(body.language),
    kind: String(body.kind),
  };
}
async function submit(req: Request) {
  const body = await payload(req, 10000);
  const input = quoteInput(body);
  const key = req.headers.get("Idempotency-Key");
  if (!key || !/^[a-zA-Z0-9-]{16,80}$/.test(key))
    throw new ApiError(400, "معرّف الطلب مطلوب.");
  await limit(clientAddress(req), "quote-submit", 6);
  const submissionHash = digest(key);
  const fingerprint = digest(
    JSON.stringify({
      ...input,
      productId: body.productId || null,
      sku: body.sku || null,
      toolSlug: body.toolSlug || null,
    }),
  );
  const [existing] = await database()
    .select()
    .from(quoteRequests)
    .where(eq(quoteRequests.submissionHash, submissionHash));
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      throw new ApiError(
        409,
        "معرّف الطلب مرتبط ببيانات مختلفة.",
        "QUOTE_SUBMISSION_CONFLICT",
      );
    return {
      reference: existing.reference,
      createdAt: existing.createdAt,
      status: existing.status,
    };
  }
  let productId: string | null = null;
  let serviceName =
    input.language === "ar" ? "استفسار عن مشروع" : "Project inquiry";
  const db = database();
  if (input.kind === "pro") {
    const tool =
      typeof body.toolSlug === "string" ? findTool(body.toolSlug) : undefined;
    if (!tool) throw new ApiError(400, "حدد أداة Pro المطلوبة.");
    serviceName = `Pro · ${tool.slug}`;
  } else if (body.productId || body.sku) {
    const predicate = body.productId
      ? eq(products.id, stringField(body.productId, "الخدمة", 100))
      : sql`${products.catalogDetails}->>'sku' = ${stringField(body.sku, "رمز الخدمة", 100)}`;
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.active, true), predicate));
    if (!product) throw new ApiError(404, "الخدمة غير متاحة.");
    productId = product.id;
    serviceName =
      input.language === "en"
        ? product.catalogDetails?.nameEn || product.name
        : product.name;
  }
  const values = { ...input, productId, serviceName };
  const [inserted] = await db
    .insert(quoteRequests)
    .values({
      ...values,
      submissionHash,
      fingerprint,
      reference: `Q-1SHOT-${randomBytes(8).toString("hex").toUpperCase()}`,
    })
    .onConflictDoNothing({ target: quoteRequests.submissionHash })
    .returning();
  const row =
    inserted ||
    (
      await db
        .select()
        .from(quoteRequests)
        .where(eq(quoteRequests.submissionHash, submissionHash))
    )[0];
  if (!row || row.fingerprint !== fingerprint)
    throw new ApiError(
      409,
      "معرّف الطلب مرتبط ببيانات مختلفة.",
      "QUOTE_SUBMISSION_CONFLICT",
    );
  // A submission receipt contains no customer details or private payment capability.
  return {
    reference: row.reference,
    createdAt: row.createdAt,
    status: row.status,
  };
}
async function contact() {
  const [row] = await database()
    .select({
      email: businessSettings.email,
      phone: businessSettings.phone,
      whatsapp: businessSettings.whatsapp,
    })
    .from(businessSettings)
    .where(eq(businessSettings.id, "official"));
  return row || { email: "support@1shotcam.com", phone: null, whatsapp: null };
}
async function saveContact(req: Request, actor: string) {
  const body = await payload(req, 1500);
  const email = stringField(body.email, "البريد الرسمي", 254).toLowerCase();
  if (!/^[a-z0-9._%+-]+@1shotcam\.com$/.test(email))
    throw new ApiError(400, "استخدم بريداً رسمياً ضمن نطاق المنشأة.");
  const phone = body.phone ? normalizePhone(body.phone) : null;
  const whatsapp = body.whatsapp ? normalizePhone(body.whatsapp) : null;
  if ((body.phone && !phone) || (body.whatsapp && !whatsapp))
    throw new ApiError(400, "أدخل الرقم بصيغة دولية صحيحة.", "INVALID_PHONE");
  if (body.confirmOfficial !== true)
    throw new ApiError(400, "أكد أن قنوات التواصل مملوكة للمنشأة.");
  await database().transaction(async (tx) => {
    await tx
      .insert(businessSettings)
      .values({ id: "official", email, phone, whatsapp, updatedBy: actor })
      .onConflictDoUpdate({
        target: businessSettings.id,
        set: {
          email,
          phone,
          whatsapp,
          updatedBy: actor,
          updatedAt: new Date(),
        },
      });
    await tx
      .insert(auditEvents)
      .values({ actor, action: "contact.updated", resource: "official" });
  });
  return { email, phone, whatsapp };
}
export async function commerceRoute(req: Request, path: string) {
  if (path === "/api/quotes" && req.method === "POST") return submit(req);
  if (path === "/api/commerce/contact" && req.method === "GET")
    return contact();
  const offerMatch = path.match(/^\/api\/quotes\/offers\/([^/]+)$/);
  if (offerMatch && req.method === "GET") {
    await limit(clientAddress(req), "quote-offer", 30);
    const [row] = await database()
      .select()
      .from(quoteRequests)
      .where(eq(quoteRequests.offerId, uuid(offerMatch[1])));
    if (
      !row ||
      row.kind === "pro" ||
      row.status !== "quoted" ||
      !row.expiresAt ||
      row.expiresAt <= new Date()
    )
      throw new ApiError(
        404,
        "عرض السعر غير متاح أو انتهت صلاحيته.",
        "QUOTE_UNAVAILABLE",
      );
    return {
      reference: row.reference,
      serviceName: row.serviceName,
      amountCents: row.amountCents,
      currency: "SAR",
      scope: row.approvedScope,
      expiresAt: row.expiresAt,
    };
  }
  const admin = await authenticate(req, true);
  await limit(admin.id, "commerce-admin", 90);
  if (path === "/api/admin/revenue" && req.method === "GET")
    return verifiedRevenue();
  if (path === "/api/admin/contact") {
    if (req.method === "GET") return contact();
    if (req.method === "PATCH") return saveContact(req, admin.id);
  }
  if (path === "/api/admin/quotes" && req.method === "GET") {
    const params = new URL(req.url).searchParams;
    const status = params.get("status");
    if (status && !quoteStatuses.includes(status as QuoteStatus))
      throw new ApiError(400, "حالة الطلب غير صالحة.");
    const page = Math.max(0, Math.min(100000, Number(params.get("page")) || 0));
    const rows = await database()
      .select({
        quote: quoteRequests,
        orderId: orders.id,
        orderStatus: orders.status,
      })
      .from(quoteRequests)
      .leftJoin(orders, eq(orders.quoteId, quoteRequests.id))
      .where(status ? eq(quoteRequests.status, status) : undefined)
      .orderBy(desc(quoteRequests.createdAt), desc(quoteRequests.id))
      .limit(26)
      .offset(Math.floor(page) * 25);
    return {
      quotes: rows
        .slice(0, 25)
        .map(
          ({
            quote: {
              submissionHash: _,
              fingerprint: __,
              updatedBy: ___,
              ...quote
            },
            orderId,
            orderStatus,
          }) => ({ ...quote, orderId, orderStatus }),
        ),
      hasMore: rows.length > 25,
    };
  }
  const match = path.match(/^\/api\/admin\/quotes\/([^/]+)(\/convert)?$/);
  if (match && ["POST", "PATCH"].includes(req.method)) {
    const id = uuid(match[1]);
    const body = await payload(req, 7000);
    return database().transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(quoteRequests)
        .where(eq(quoteRequests.id, id))
        .for("update");
      if (!row) throw new ApiError(404, "الطلب غير موجود.");
      if (match[2] && req.method === "POST") {
        if (row.kind === "pro")
          throw new ApiError(
            409,
            "Pro للاستفسار فقط حتى ربط اشتراك موثّق.",
            "PRO_INQUIRY_ONLY",
          );
        if (row.status === "closed") throw new ApiError(409, "الطلب مغلق.");
        // One immutable offer per request. Double clicks and retries return the same link.
        if (row.offerId) {
          if (!row.expiresAt || row.expiresAt <= new Date())
            throw new ApiError(
              409,
              "انتهت صلاحية العرض. راجع الطلب المرتبط قبل إصدار عرض جديد.",
              "QUOTE_UNAVAILABLE",
            );
          return { offerId: row.offerId, reference: row.reference };
        }
        const amountCents = sarCents(body.amount);
        if (amountCents === null)
          throw new ApiError(
            400,
            "أدخل مبلغاً صحيحاً بالريال من 1 إلى 1,000,000.",
          );
        const approvedScope = stringField(body.scope, "النطاق المعتمد", 4000);
        const offerId = crypto.randomUUID();
        await tx
          .update(quoteRequests)
          .set({
            amountCents,
            approvedScope,
            offerId,
            status: "quoted",
            expiresAt: new Date(Date.now() + 14 * 86400000),
            updatedAt: new Date(),
            updatedBy: admin.id,
          })
          .where(eq(quoteRequests.id, id));
        await tx
          .insert(auditEvents)
          .values({ actor: admin.id, action: "quote.converted", resource: id });
        return { offerId, reference: row.reference };
      }
      if (!match[2] && req.method === "PATCH") {
        const status = String(body.status);
        if (
          !["new", "in_review", "closed"].includes(status) ||
          (row.offerId && status !== "closed")
        )
          throw new ApiError(409, "العرض المنشور ثابت؛ يمكن إغلاقه فقط.");
        // A live checkout cannot be revoked by merely closing a CRM card.
        const [order] = await tx
          .select({ id: orders.id, status: orders.status })
          .from(orders)
          .where(eq(orders.quoteId, id));
        if (
          order &&
          !["paid", "captured", "failed"].includes(order.status.toLowerCase())
        )
          throw new ApiError(
            409,
            "راجع حالة الدفع قبل إغلاق الطلب.",
            "RECONCILIATION_REQUIRED",
          );
        await tx
          .update(quoteRequests)
          .set({ status, updatedAt: new Date(), updatedBy: admin.id })
          .where(eq(quoteRequests.id, id));
        await tx
          .insert(auditEvents)
          .values({ actor: admin.id, action: `quote.${status}`, resource: id });
        return { status };
      }
      throw new ApiError(405, "طريقة الطلب غير مدعومة.");
    });
  }
  throw new ApiError(404, "المسار غير متاح.", "ROUTE_NOT_FOUND");
}
