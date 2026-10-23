import { ecosystemSession, receiverApp } from "./ecosystem-session";
import { hubOrigin } from "../../shared/ecosystem";
import type { Order } from "../../shared/contracts";
import { prepareIdentitySession } from "./auth-session";
import { storedLanguage } from "./preferences";
const englishErrors: Record<string, string> = {
  AUTH_REQUIRED: "Sign in to continue.",
  ADMIN_REQUIRED: "This area requires an administrator account.",
  SESSION_CHANGED: "Your account session changed. Reload to continue.",
  RATE_LIMIT: "Too many requests. Wait a minute and try again.",
  CONNECTION_UNCONFIRMED:
    "The connection ended before the outcome was confirmed. Check the operation status before trying again.",
  INVALID_API_RESPONSE:
    "The server returned an invalid response. The operation was not repeated. Check its status before trying again.",
  ROUTE_NOT_FOUND: "This service endpoint is unavailable.",
  VAULT_NOT_CONFIGURED: "Vault encryption is awaiting administrator setup.",
  GATEWAY_NOT_CONFIGURED:
    "This gateway has no saved credentials for the selected environment.",
  GATEWAY_ENVIRONMENT_MISMATCH:
    "Gateway credentials do not match the selected environment.",
  GATEWAY_MIGRATION_PENDING:
    "This gateway integration is not ready. No payment was created.",
  SERVICE_QUOTE_REQUIRED:
    "Confirm the service scope and quote with our team before paying.",
  ORGANIZATION_REQUIRED: "Create your organization workspace first.",
  RECONCILIATION_REQUIRED:
    "Check this order in the provider dashboard before attempting another payment.",
  PAYMENT_VERIFICATION_MISMATCH:
    "Provider details do not match this order. Payment remains unconfirmed.",
  UPSTREAM_UNCONFIRMED:
    "The provider outcome could not be confirmed. Review the order before creating another payment.",
  SSO_NOT_ENABLED: "This application has not enabled shared sign-in.",
  SSO_PRODUCTION_ONLY:
    "Shared sign-in is available on the production Hub only.",
  AI_UNAVAILABLE:
    "The AI service is currently unavailable. Your existing work remains available.",
  WORKFORCE_AI_UNAVAILABLE:
    "Could not generate the draft. Check the task status before trying again.",
};
function requestMessage(message: string, code?: string, status?: number) {
  if (storedLanguage() === "ar") return message;
  return (
    englishErrors[code || ""] ||
    (!/[\u0600-\u06ff]/.test(message)
      ? message
      : status === 401
        ? englishErrors.AUTH_REQUIRED
        : status === 403
          ? "You do not have permission for this operation."
          : status === 400 || status === 422
            ? "Check the supplied information and try again."
            : status === 409
              ? "The operation conflicts with the current state. Refresh its status before trying again."
              : status === 503
                ? "This service is awaiting configuration or is temporarily unavailable. Contact support."
                : "The request could not be completed. Check the operation status or contact support.")
  );
}
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
    super(requestMessage(message, code, status));
  }
}
export function isUnconfirmedRequest(error: unknown) {
  if (!(error instanceof RequestError)) return true;
  if (
    [
      "VAULT_NOT_CONFIGURED",
      "PAYMENTS_NOT_CONFIGURED",
      "GATEWAY_NOT_CONFIGURED",
      "GATEWAY_ENVIRONMENT_MISMATCH",
    ].includes(error.code || "")
  )
    return false;
  return error.status === 0 || error.status >= 500;
}
export async function callBackendApi<T = Record<string, any>>(
  endpoints: string[],
  payload?: unknown,
  options: {
    method?: string;
    idempotencyKey?: string;
    quiet?: boolean;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const method = options.method || (payload === undefined ? "GET" : "POST"),
    start = performance.now(),
    session = generation;
  for (const path of endpoints) {
    const publicRequest =
      method === "GET" &&
      /^\/api\/(products|health|payments\/capabilities|ecosystem\/(status|handshake)|experience\/config|workforce\/catalog|tools\/pro|growth\/(guides|seo))(?:\?|$)/.test(
        path,
      );
    const id = crypto.randomUUID();
    const record = (status: number, response: unknown) => {
      if (
        !options.quiet &&
        !/^\/api\/(workforce|ai-workforce)\//.test(path) &&
        session === generation
      )
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
      const crossApp = receiverApp();
      const sharedSession = ecosystemSession();
      if (!crossApp && !publicRequest) await prepareIdentitySession();
      if (!publicRequest && session !== generation)
        throw new RequestError("تغيّرت جلسة المستخدم.", 401, "SESSION_CHANGED");
      response = await fetch(crossApp ? new URL(path, hubOrigin).href : path, {
        method,
        credentials: crossApp ? "omit" : "same-origin",
        signal: AbortSignal.timeout(options.timeoutMs || 50000),
        headers: {
          ...(crossApp && sharedSession
            ? { Authorization: `Bearer ${sharedSession.sessionToken}` }
            : {}),
          ...(payload !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
          ...(options.idempotencyKey
            ? { "Idempotency-Key": options.idempotencyKey }
            : {}),
        },
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
    } catch (error) {
      if (error instanceof RequestError) throw error;
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
    if (!publicRequest && session !== generation)
      throw new RequestError("تغيّرت جلسة المستخدم.", 401, "SESSION_CHANGED");
    if (typeof data.error === "string")
      data.error = requestMessage(data.error, data.code, response.status);
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
  storedLanguage() === "ar"
    ? orderLabels[status] || status
    : (
        {
          pending: "Pending",
          awaiting_payment: "Awaiting payment",
          paid: "Paid",
          failed: "Failed",
          unconfirmed: "Unconfirmed",
        } as Record<string, string>
      )[status] || status;
export const imageUrl = (name: string, width = 640) =>
  `/.netlify/images?url=${encodeURIComponent(`/img/${name}.png`)}&w=${width}&fm=webp`;
