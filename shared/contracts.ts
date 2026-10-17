import type { OriginalProduct } from "./storefront";
export const gateways = [
  ["telr", "Telr"],
  ["paytabs", "PayTabs"],
  ["stripe", "Stripe"],
  ["moyasar", "Moyasar"],
  ["hyperpay", "HyperPay"],
  ["tap", "Tap Payments"],
  ["checkout", "Checkout.com"],
] as const;
export const topologies = [
  ["HOSTED_PAGE", "صفحة دفع مستضافة"],
  ["DIRECT_API", "الربط المباشر بالسيرفر"],
  ["IFRAME_EMBED", "نافذة دفع مدمجة"],
  ["TOKENIZATION", "ترميز البطاقة والاشتراكات"],
  ["MOBILE_SDK", "جسر تطبيق الجوال"],
  ["PAYMENT_LINK", "رابط دفع فوري"],
  ["ALL_6_MODES", "فحص جاهزية المسارات الستة"],
] as const;
export const securityControls = [
  ["ipCountryMatch", "مطابقة عنوان IP والدولة"],
  ["vpnProxyDetection", "كشف VPN والبروكسي"],
  ["emulatorVmDetection", "كشف المحاكي والآلة الافتراضية"],
  ["behavioralBiometrics", "تحليل سلوك المستخدم"],
  ["browserFingerprinting", "فحص بصمة المتصفح"],
  ["enforce3DSecure2", "التحقق الآمن 3D Secure 2.0"],
  ["velocityRateLimit", "حماية تكرار المحاولات"],
  ["avsPostalCheck", "مطابقة الرمز البريدي AVS"],
] as const;
export const regions = [
  ["US-USD", "الولايات المتحدة · USD"],
  ["SA-SAR", "السعودية · SAR"],
  ["AE-AED", "الإمارات · AED"],
  ["GB-GBP", "بريطانيا · GBP"],
  ["EU-EUR", "الاتحاد الأوروبي · EUR"],
] as const;
export type Module = "store" | "gateway" | "vault" | "ceo" | "ai";
export interface Product {
  catalogDetails?: OriginalProduct | null;
  id: string;
  name: string;
  description: string;
  badge: string;
  category: string;
  priceCents: number;
  currency: string;
  image: string | null;
  active: boolean;
}
export interface Health {
  status: string;
  database: { connected: boolean };
  core: { connected: boolean; secure: boolean; databaseVerified: boolean };
  checkedAt: string;
}
export interface Order {
  id: string;
  description: string;
  amountCents: number;
  currency: string;
  status: string;
  gateway: string;
  executionMode: string;
  checkoutUrl: string | null;
  createdAt: string;
}
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
export interface Conversation {
  id: string;
  title: string;
  kind: string;
  updatedAt: string;
}
export const endpoints = {
  payment: [
    "/api/gateways/execute-live",
    "/api/loader/execute",
    "/api/payment/execute",
  ],
  vault: ["/api/admin/vault/keys", "/api/vault/keys", "/api/gateways/keys"],
  ceo: ["/api/ai/ceo", "/api/ceo/command", "/api/ai/chat"],
  chat: ["/api/ai/chat", "/api/ai/ceo"],
};
