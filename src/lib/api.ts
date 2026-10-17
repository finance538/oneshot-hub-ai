import type { Order } from "../../shared/contracts";
export interface ApiEntry {
  id: string;
  path: string;
  method: string;
  status: number;
  duration: number;
  time: string;
  response: unknown;
}
const listeners = new Set<(entry: ApiEntry) => void>();
export const subscribeApi = (listener: (entry: ApiEntry) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
let generation = 0;
export function clearApiSession() {
  generation++;
}
function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([k]) =>
            !/(secret|key$|credential|token|cardnumber|cvv|password|email|content|reply|messages)/i.test(
              k,
            ),
        )
        .map(([k, v]) => [k, clean(v)]),
    );
  if (typeof value === "string" && value.startsWith("https://")) {
    try {
      const u = new URL(value);
      return `${u.origin}/[رابط محجوب]`;
    } catch {
      return "[رابط]";
    }
  }
  return value;
}
export class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
export function isUnconfirmedRequest(error: unknown) {
  if (!(error instanceof RequestError)) return true;
  if (
    [
      "VAULT_NOT_CONFIGURED",
      "PAYMENTS_NOT_CONFIGURED",
      "GATEWAY_NOT_CONFIGURED",
    ].includes(error.code || "")
  )
    return false;
  return error.status === 0 || error.status >= 500;
}
export async function callBackendApi<T = Record<string, any>>(
  endpoints: string[],
  payload?: unknown,
  options: { method?: string; idempotencyKey?: string; quiet?: boolean } = {},
): Promise<T> {
  const method = options.method || (payload === undefined ? "GET" : "POST"),
    start = performance.now(),
    session = generation;
  for (const path of endpoints) {
    const id = crypto.randomUUID();
    const record = (status: number, response: unknown) => {
      if (!options.quiet && session === generation)
        listeners.forEach((fn) =>
          fn({
            id,
            path,
            method,
            status,
            duration: Math.round(performance.now() - start),
            time: new Date().toISOString(),
            response: clean(response),
          }),
        );
    };
    const failure = (message: string, status: number, code: string): never => {
      record(status, { error: message, code });
      throw new RequestError(message, status, code);
    };
    record(102, {
      status: "pending",
      message: "جارٍ إرسال الطلب وانتظار استجابة الخادم.",
    });
    let response: Response;
    try {
      response = await fetch(path, {
        method,
        credentials: "same-origin",
        signal: AbortSignal.timeout(50000),
        headers: {
          ...(payload !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
          ...(options.idempotencyKey
            ? { "Idempotency-Key": options.idempotencyKey }
            : {}),
        },
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
    } catch {
      return failure(
        method === "GET"
          ? "تعذّر الاتصال. تحقق من الشبكة وأعد المحاولة."
          : "انقطع الاتصال قبل تأكيد النتيجة. راجع سجل العملية قبل إعادة التنفيذ.",
        0,
        "CONNECTION_UNCONFIRMED",
      );
    }
    let raw: string;
    let data: any;
    try {
      raw = await response.text();
    } catch {
      return failure(
        "انقطع استقبال رد الخادم. تحقق من حالة العملية قبل التكرار.",
        0,
        "CONNECTION_UNCONFIRMED",
      );
    }
    if (/^\s*<(?:!doctype|html)/i.test(raw)) {
      // Read-only health may use the independent HTTPS origin. Never replay a financial mutation.
      if (method === "GET" && path === "/api/health") {
        try {
          const fallback = await fetch("https://api.1shotcam.com/api/health", {
            signal: AbortSignal.timeout(6000),
            credentials: "omit",
          });
          const text = await fallback.text();
          if (fallback.ok && !/^\s*</.test(text)) {
            JSON.parse(text);
            failure(
              "الباك إند يستجيب، لكن توجيه API المحلي يحتاج إلى تصحيح.",
              502,
              "LOCAL_PROXY_UNAVAILABLE",
            );
          }
        } catch (error) {
          if (error instanceof RequestError) throw error;
        }
      }
      return failure(
        "مسار API يعيد صفحة HTML. لم يُكرر الطلب؛ راجع إعدادات النشر.",
        502,
        "INVALID_API_RESPONSE",
      );
    }
    try {
      data = JSON.parse(raw);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw 0;
    } catch {
      return failure(
        "الخادم لا يعيد JSON صالحاً.",
        502,
        "INVALID_API_RESPONSE",
      );
    }
    if (session !== generation)
      throw new RequestError("تغيّرت جلسة المستخدم.", 401, "SESSION_CHANGED");
    record(response.status, data);
    if (response.status === 404 && data.code === "ROUTE_NOT_FOUND") continue;
    if (!response.ok)
      throw new RequestError(
        data.error || "تعذّر إتمام الطلب.",
        response.status,
        data.code,
      );
    return data as T;
  }
  throw new RequestError("المسار المطلوب غير متاح.", 404, "ROUTE_NOT_FOUND");
}
export const api = <T = Record<string, any>>(
  path: string,
  payload?: unknown,
  options?: Parameters<typeof callBackendApi>[2],
) => callBackendApi<T>([path], payload, options);
export const money = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100,
  );
const orderLabels: Record<string, string> = {
  pending: "قيد المعالجة",
  awaiting_payment: "بانتظار إتمام الدفع",
  paid: "مدفوع",
  failed: "لم يكتمل",
  unconfirmed: "النتيجة غير مؤكدة",
};
export const orderLabel = (status: Order["status"]) =>
  orderLabels[status] || status;
export const imageUrl = (name: string, width = 640) =>
  `/.netlify/images?url=${encodeURIComponent(`/img/${name}.png`)}&w=${width}&fm=webp`;
