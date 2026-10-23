import { ApiError, payload, stringField } from "./security.js";
import {
  calculateBudget,
  generateCampaign,
  type AdPlatform,
  type BusinessKind,
} from "../../shared/growth.js";

const platforms: AdPlatform[] = ["google", "snap", "tiktok"];
const kinds: BusinessKind[] = ["store", "photography", "restaurant", "services", "fashion"];

function platformOf(value: unknown): AdPlatform {
  if (typeof value === "string" && (platforms as string[]).includes(value))
    return value as AdPlatform;
  throw new ApiError(400, "المنصة غير مدعومة. اختر Google أو Snapchat أو TikTok.");
}

function kindOf(value: unknown): BusinessKind {
  if (typeof value === "string" && (kinds as string[]).includes(value))
    return value as BusinessKind;
  throw new ApiError(400, "نوع النشاط غير صالح.");
}

function num(value: unknown, name: string, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max)
    throw new ApiError(400, `قيمة ${name} غير صالحة.`);
  return n;
}

export async function growthCampaign(req: Request) {
  const body = (await payload(req, 8000)) as Record<string, unknown>;
  // Stateless generation: user inputs become ad copy only. Nothing is stored,
  // no external calls, no secrets — safe to expose without authentication.
  const language = body.language === "en" ? "en" : "ar";
  const campaign = generateCampaign({
    platform: platformOf(body.platform),
    businessName: stringField(body.businessName, "اسم النشاط", 80),
    businessKind: kindOf(body.businessKind),
    offer: stringField(body.offer, "العرض", 80),
    city: stringField(body.city, "المدينة", 60),
    language,
  });
  return { campaign, language, generatedAt: new Date().toISOString() };
}

export async function growthBudget(req: Request) {
  const body = (await payload(req, 4000)) as Record<string, unknown>;
  const currency =
    typeof body.currency === "string" && /^[A-Z]{3}$/.test(body.currency)
      ? body.currency
      : "SAR";
  return {
    result: calculateBudget(
      {
        dailyBudget: num(body.dailyBudget, "الميزانية اليومية", 100000),
        days: Math.min(num(body.days, "المدة", 365), 365),
        avgOrderValue: num(body.avgOrderValue, "متوسط الطلب", 1000000),
        conversionRate: num(body.conversionRate, "معدل التحويل", 100),
        currency,
      },
      num(body.avgCpc ?? 1.5, "متوسط النقرة", 500),
    ),
    currency,
  };
}
