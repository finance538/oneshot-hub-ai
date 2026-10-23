import type { OriginalProduct } from "./storefront.ts";

export const quoteStatuses = ["new", "in_review", "quoted", "closed"] as const;
export type QuoteStatus = (typeof quoteStatuses)[number];
export const quoteStatusLabels: Record<QuoteStatus, [string, string]> = {
  new: ["جديد", "New"],
  in_review: ["قيد المراجعة", "In review"],
  quoted: ["تم اعتماد العرض", "Quote approved"],
  closed: ["مغلق", "Closed"],
};
export type PriceKind = "fixed" | "starting" | "monthly";
export function priceKind(
  details?: Pick<OriginalProduct, "pricing"> | null,
): PriceKind {
  if (details?.pricing.billingCycle === "monthly") return "monthly";
  return !details || details.pricing.type === "fixed" ? "fixed" : "starting";
}
export function instantCheckout(details?: OriginalProduct | null) {
  return (
    !details ||
    (priceKind(details) === "fixed" && details.status === "ready_to_sell")
  );
}
export function sarCents(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{1,7}(\.\d{1,2})?$/.test(value))
    return null;
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents >= 100 && cents <= 100000000
    ? cents
    : null;
}
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const phone = value.trim().replace(/[\s()-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(phone) && !/(\d)\1{6}/.test(phone)
    ? phone
    : null;
}
export function isPaidRevenue(order: {
  status: string;
  executionMode: string;
  currency: string;
}) {
  return (
    order.executionMode === "PRODUCTION" &&
    order.currency === "SAR" &&
    ["paid", "captured"].includes(order.status.toLowerCase())
  );
}
export const estimateNotice = [
  "تقديرات استرشادية ونقرات تفاعل — ليست إيرادات محصلة",
  "Estimates and interaction clicks — not collected revenue",
] as const;
export interface QuoteRecord {
  id: string;
  reference: string;
  kind: "service" | "pro";
  customerName: string;
  email: string;
  phone: string;
  productId: string | null;
  serviceName: string;
  notes: string;
  language: "ar" | "en";
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  amountCents: number | null;
  approvedScope: string | null;
  offerId: string | null;
  expiresAt: string | null;
  orderId: string | null;
  orderStatus: string | null;
}
export interface RevenueSummary {
  kind: "verified_paid";
  currency: "SAR";
  paidOrders: number;
  revenueCents: number;
  checkedAt: string;
}
export interface OfficialContact {
  businessNameAr?: string;
  tradeNameAr?: string;
  businessNameEn?: string;
  crNumber?: string;
  issueDate?: string;
  entityType?: string;
  status?: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  ownershipAttested?: boolean;
}
// Never send exception messages, stack traces, URLs, query strings or form values.
export const diagnosticCodes = [
  "CLIENT_ERROR",
  "CLIENT_REJECTION",
  "CLIENT_RENDER",
  "API_NETWORK",
  "API_INVALID_RESPONSE",
  "API_SERVER",
  "SSO_GRANT",
  "SSO_REDEEM",
] as const;
export type DiagnosticCode = (typeof diagnosticCodes)[number];
export function diagnosticArea(path: string) {
  if (/^\/api\/(ecosystem|sso)\//.test(path)) return "sso";
  if (/^\/api\/(payment|payments|orders|webhooks)(\/|$)/.test(path))
    return "payments";
  if (/^\/api\/(quotes|commerce)(\/|$)/.test(path)) return "quotes";
  if (/^\/api\/admin(\/|$)/.test(path)) return "admin";
  if (/^\/api\/workforce(\/|$)/.test(path)) return "workforce";
  return "application";
}
