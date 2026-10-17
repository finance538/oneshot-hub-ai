import { ApiError, env } from "./security.js";
export const coreBase = "https://api.1shotcam.com";
export async function coreHealth() {
  try {
    const res = await fetch(`${coreBase}/api/health`, {
      signal: AbortSignal.timeout(6000),
      redirect: "error",
    });
    const data = await res.json();
    const connected =
      res.ok &&
      !!data &&
      ["ok", "online", "healthy", "connected"].includes(
        String(data.status).toLowerCase(),
      );
    return {
      connected,
      secure: true,
      databaseVerified:
        connected &&
        (data.database?.connected === true ||
          data.database?.status === "connected"),
    };
  } catch {
    return { connected: false, secure: false, databaseVerified: false };
  }
}
export async function coreRequest(
  paths: string[],
  body: unknown,
  idempotencyKey?: string,
) {
  const deadline = Date.now() + 25000;
  for (const path of paths) {
    let response: Response;
    try {
      response = await fetch(`${coreBase}${path}`, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
        headers: {
          "Content-Type": "application/json",
          ...(env("ONESHOT_API_TOKEN")
            ? { Authorization: `Bearer ${env("ONESHOT_API_TOKEN")}` }
            : {}),
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ApiError(
        502,
        "تعذّر تأكيد استجابة الباك إند عبر HTTPS. راجع حالة العملية قبل إعادة التنفيذ.",
        "UPSTREAM_UNCONFIRMED",
      );
    }
    const raw = await response.text();
    if (/^\s*<(?:!doctype|html)/i.test(raw))
      throw new ApiError(
        502,
        "عاد الباك إند بصفحة HTML. أُوقف التكرار لتجنّب تنفيذ العملية مرتين.",
        "UPSTREAM_UNCONFIRMED",
      );
    let data: Record<string, any>;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new ApiError(
        502,
        "استجابة الباك إند غير صالحة. تحقق من حالة العملية.",
        "UPSTREAM_UNCONFIRMED",
      );
    }
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new ApiError(
        502,
        "استجابة الباك إند غير متوقعة.",
        "UPSTREAM_UNCONFIRMED",
      );
    // Retry aliases only when the server explicitly says the route does not exist.
    if (
      response.status === 404 &&
      (data.code === "ROUTE_NOT_FOUND" || data.code === "NOT_FOUND")
    )
      continue;
    if (!response.ok || data.success === false)
      throw new ApiError(
        502,
        "لم يؤكد الباك إند قبول العملية. راجع سجل المزود.",
        "UPSTREAM_UNCONFIRMED",
      );
    return data;
  }
  throw new ApiError(
    502,
    "المسار المطلوب غير متاح على الباك إند.",
    "ROUTE_UNAVAILABLE",
  );
}
export function checkoutUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const domains = [
      "telr.com",
      "paytabs.com",
      "stripe.com",
      "moyasar.com",
      "hyperpay.com",
      "oppwa.com",
      "tap.company",
      "checkout.com",
    ];
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      return null;
    return domains.some(
      (h) => url.hostname === h || url.hostname.endsWith(`.${h}`),
    )
      ? url.href
      : null;
  } catch {
    return null;
  }
}
