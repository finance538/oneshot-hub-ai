import { ApiError } from "./security.js";

// Only reviewed adapters may create charges. The uploaded generic POST adapter
// did not implement the other providers' protocols and is deliberately excluded.
export const nativeGateways = ["stripe"] as const;
export const nativeTopologies = ["HOSTED_PAGE", "PAYMENT_LINK"] as const;
export type HostedOrder = {
  id: string;
  amountCents: number;
  currency: string;
  description: string;
  gateway: string;
  executionMode: string;
  idempotencyKey: string;
};
type Credentials = { secretKey?: string };
type StripeSession = {
  id?: string;
  url?: string;
  client_reference_id?: string;
  metadata?: { oneshot_order_id?: string };
  amount_total?: number;
  currency?: string;
  livemode?: boolean;
  mode?: string;
  status?: string;
  payment_status?: string;
};
function matchesOrder(session: StripeSession, order: HostedOrder) {
  return (
    session.client_reference_id === order.id &&
    session.metadata?.oneshot_order_id === order.id &&
    session.amount_total === order.amountCents &&
    session.currency === order.currency.toLowerCase() &&
    session.livemode === (order.executionMode === "PRODUCTION") &&
    session.mode === "payment"
  );
}
export function assertNativePayment(gateway: string, topology: string) {
  if (!nativeGateways.some((g) => g === gateway))
    throw new ApiError(
      409,
      "هذه البوابة بانتظار استكمال ربطها المباشر والتحقق منه على Netlify. لم تُنشأ دفعة.",
      "GATEWAY_MIGRATION_PENDING",
    );
  if (!nativeTopologies.some((t) => t === topology))
    throw new ApiError(
      400,
      "استخدم صفحة الدفع المستضافة أو رابط الدفع لهذا الربط.",
      "TOPOLOGY_NOT_SUPPORTED",
    );
}
export function assertStripeCredentials(
  credentials: Credentials,
  mode: string,
) {
  const prefix = mode === "PRODUCTION" ? /^(sk|rk)_live_/ : /^(sk|rk)_test_/;
  if (
    typeof credentials.secretKey !== "string" ||
    !prefix.test(credentials.secretKey)
  )
    throw new ApiError(
      503,
      "مفتاح Stripe لا يطابق البيئة المحددة. حدّث الخزنة.",
      "GATEWAY_ENVIRONMENT_MISMATCH",
    );
}
async function stripeRequest(
  path: string,
  credentials: Credentials,
  form?: URLSearchParams,
  key?: string,
): Promise<StripeSession> {
  try {
    const response = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: form ? "POST" : "GET",
      redirect: "error",
      signal: AbortSignal.timeout(form ? 20000 : 6000),
      headers: {
        Authorization: `Bearer ${credentials.secretKey}`,
        "Stripe-Version": "2026-09-30.endive",
        ...(form
          ? { "Content-Type": "application/x-www-form-urlencoded" }
          : {}),
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      ...(form ? { body: form.toString() } : {}),
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("application/json")
    )
      throw new Error("provider");
    const text = await response.text();
    if (text.length > 100000) throw new Error("size");
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("format");
    return value;
  } catch {
    // Never log provider responses or retry a financial request, including 4xx.
    throw new ApiError(
      502,
      "تعذّر تأكيد استجابة Stripe. راجع الطلب قبل أي محاولة دفع جديدة.",
      "UPSTREAM_UNCONFIRMED",
    );
  }
}
export async function createHostedCheckout(
  order: HostedOrder,
  credentials: Credentials,
  returnOrigin: string,
) {
  assertStripeCredentials(credentials, order.executionMode);
  const returnUrl = `${returnOrigin}/?module=gateway&order=${order.id}`;
  const form = new URLSearchParams({
    mode: "payment",
    client_reference_id: order.id,
    "metadata[oneshot_order_id]": order.id,
    "payment_intent_data[metadata][oneshot_order_id]": order.id,
    "payment_method_options[card][request_three_d_secure]": "any",
    "allowed_payment_method_types[0]": "card",
    "line_items[0][price_data][currency]": order.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(order.amountCents),
    "line_items[0][price_data][product_data][name]": order.description,
    "line_items[0][quantity]": "1",
    success_url: returnUrl,
    cancel_url: returnUrl,
  });
  const session = await stripeRequest(
    "checkout/sessions",
    credentials,
    form,
    order.idempotencyKey,
  );
  if (
    typeof session.id !== "string" ||
    !/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(session.id)
  )
    throw new ApiError(
      502,
      "لم يصل مرجع دفع صالح. راجع المزود قبل التكرار.",
      "UPSTREAM_UNCONFIRMED",
    );
  // A redirect never confirms a payment, even when session creation says paid.
  // Retain a valid session reference even when its details mismatch, but never
  // send a customer to checkout for a different order/account/environment.
  return {
    transactionId: session.id,
    redirectUrl: matchesOrder(session, order) ? session.url : undefined,
  };
}
export async function verifyHostedCheckout(
  order: HostedOrder & { upstreamId: string | null },
  credentials: Credentials,
) {
  assertStripeCredentials(credentials, order.executionMode);
  if (
    !order.upstreamId ||
    !/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(order.upstreamId)
  )
    throw new ApiError(
      409,
      "لا يوجد مرجع مزود مؤكد لهذا الطلب. يلزم مطابقته من لوحة Stripe دون إعادة الخصم.",
      "RECONCILIATION_REQUIRED",
    );
  const session = await stripeRequest(
    `checkout/sessions/${encodeURIComponent(order.upstreamId)}`,
    credentials,
  );
  if (session.id !== order.upstreamId || !matchesOrder(session, order))
    throw new ApiError(
      409,
      "بيانات المزود لا تطابق الطلب أو البيئة. لم تُؤكد العملية.",
      "PAYMENT_VERIFICATION_MISMATCH",
    );
  if (session.status === "complete" && session.payment_status === "paid")
    return "paid" as const;
  if (session.status === "expired" && session.payment_status === "unpaid")
    return "failed" as const;
  return null;
}
