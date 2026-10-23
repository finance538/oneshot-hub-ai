import { GoogleGenAI } from "@google/genai";
import { normalizeAdDraft } from "../../shared/ad-draft.js";
import { and, desc, eq } from "drizzle-orm";
import { database } from "../../db/index.js";
import { growthCampaigns } from "../../db/schema.js";
import {
  ApiError,
  authenticate,
  limit,
  payload,
  stringField,
  uuid,
} from "./security.js";
import {
  calculateBudget,
  generateCampaign,
  type AdPlatform,
  type BusinessKind,
} from "../../shared/growth.js";

const SITE_URL = "https://www.1shotcam.com";

const platforms: AdPlatform[] = ["google", "snap", "tiktok"];
const kinds: BusinessKind[] = [
  "store",
  "photography",
  "restaurant",
  "services",
  "fashion",
];

function platformOf(value: unknown): AdPlatform {
  if (typeof value === "string" && (platforms as string[]).includes(value))
    return value as AdPlatform;
  throw new ApiError(
    400,
    "المنصة غير مدعومة. اختر Google أو Snapchat أو TikTok.",
  );
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

export type GrowthPlatform = "google" | "snap" | "tiktok" | "all";

const PLATFORMS: GrowthPlatform[] = ["google", "snap", "tiktok", "all"];

export const GROWTH_GUIDES = [
  {
    slug: "payment-gateways",
    titleAr: "دليل ربط بوابات الدفع للمتاجر السعودية",
    titleEn: "Payment Gateway Integration Guide for Saudi Stores",
    descriptionAr:
      "كيف تختار بوابة الدفع المناسبة لمتجرك: الرسوم، التوافق مع مدى وApple Pay، وخطوات الربط الآمن دون لمس بيانات البطاقات.",
    descriptionEn:
      "How to choose the right payment gateway: fees, mada and Apple Pay support, and secure integration steps.",
    keywords: ["ربط بوابات الدفع", "بوابات الدفع السعودية", "مدى", "Apple Pay"],
    updatedAt: "2026-10-23",
  },
  {
    slug: "store-automation",
    titleAr: "دليل أتمتة المتاجر: من الطلب حتى التسليم",
    titleEn: "Store Automation Guide: From Order to Delivery",
    descriptionAr:
      "خارطة عملية لأتمتة متجرك: تأكيد الطلبات، الفواتير، التتبع، وربط المخزون — مع حاسبة تفاعلية لوقت التوفير.",
    descriptionEn:
      "A practical map for automating orders, invoices, tracking and inventory — with an interactive time-savings calculator.",
    keywords: ["أتمتة المتاجر", "أتمتة الطلبات", "إدارة المخزون"],
    updatedAt: "2026-10-23",
  },
  {
    slug: "ai-employees",
    titleAr: "دليل موظفي الذكاء الاصطناعي للأعمال",
    titleEn: "AI Employees Guide for Businesses",
    descriptionAr:
      "ما الذي يفعله موظف AI فعلاً؟ المهام المناسبة، حدود الصلاحيات، وكيف تقيس العائد قبل التوظيف.",
    descriptionEn:
      "What an AI employee actually does: suitable tasks, permission boundaries, and how to measure ROI before hiring.",
    keywords: ["موظفي الذكاء الاصطناعي", "موظف AI", "أتمتة خدمة العملاء"],
    updatedAt: "2026-10-23",
  },
  {
    slug: "commercial-photography",
    titleAr: "دليل التصوير التجاري الاحترافي للمنتجات",
    titleEn: "Professional Commercial Product Photography Guide",
    descriptionAr:
      "كيف تجهّز منتجاتك لجلسة تصوير تبيع: الإضاءة، الزوايا، المقاسات، وقائمة تحقق تفاعلية قبل الحجز.",
    descriptionEn:
      "How to prepare products for a shoot that sells: lighting, angles, sizes, and an interactive pre-booking checklist.",
    keywords: ["التصوير التجاري", "تصوير المنتجات", "تصوير إعلاني"],
    updatedAt: "2026-10-23",
  },
] as const;

export type GrowthGuideMeta = (typeof GROWTH_GUIDES)[number];

/** Exact display sizes per platform, kept as configuration. */
export const BANNER_SIZES: Record<
  Exclude<GrowthPlatform, "all">,
  { size: string; use: string }[]
> = {
  google: [
    { size: "300 × 250", use: "مستطيل متوسط — الأعلى أداءً في شبكة العرض" },
    { size: "336 × 280", use: "مستطيل كبير للمحتوى المقالات" },
    { size: "728 × 90", use: "لوحة علوية للمواقع" },
    { size: "300 × 600", use: "نصف صفحة جانبية" },
    { size: "320 × 100", use: "بانر جوال كبير" },
    { size: "320 × 50", use: "بانر جوال قياسي" },
    { size: "970 × 250", use: "بيلبورد للصفحات الرئيسية" },
  ],
  snap: [
    { size: "1080 × 1920", use: "ملء الشاشة العمودي — إعلان سناب" },
    { size: "1080 × 1920", use: "فلاتر وعدسات: اترك هامش أمان علوي وسفلي" },
  ],
  tiktok: [
    { size: "1080 × 1920", use: "فيديو عمودي بملء الشاشة" },
    { size: "1080 × 1080", use: "مربع للخلاصات والتجربة" },
    { size: "1080 × 1350", use: "عمودي 4:5 للخلاصة" },
  ],
};

/** Transparent ROAS estimate: fixed market assumptions, shown as ranges. */
export function estimateBudgetPlan(budgetSar: number, avgOrderSar: number) {
  const assumptions = {
    google: { cpcLow: 0.8, cpcHigh: 2.5, convLow: 0.015, convHigh: 0.04 },
    snap: { cpcLow: 0.5, cpcHigh: 1.8, convLow: 0.008, convHigh: 0.025 },
    tiktok: { cpcLow: 0.4, cpcHigh: 1.5, convLow: 0.008, convHigh: 0.03 },
  };
  const plan: Record<
    string,
    {
      clicksLow: number;
      clicksHigh: number;
      ordersLow: number;
      ordersHigh: number;
      revenueLow: number;
      revenueHigh: number;
      roasLow: number;
      roasHigh: number;
    }
  > = {};
  for (const [platform, a] of Object.entries(assumptions)) {
    const clicksHigh = Math.round(budgetSar / a.cpcLow);
    const clicksLow = Math.round(budgetSar / a.cpcHigh);
    const ordersLow = Math.round(clicksLow * a.convLow);
    const ordersHigh = Math.round(clicksHigh * a.convHigh);
    const revenueLow = Math.round(ordersLow * avgOrderSar);
    const revenueHigh = Math.round(ordersHigh * avgOrderSar);
    plan[platform] = {
      clicksLow,
      clicksHigh,
      ordersLow,
      ordersHigh,
      revenueLow,
      revenueHigh,
      roasLow: Math.round((revenueLow / budgetSar) * 100) / 100,
      roasHigh: Math.round((revenueHigh / budgetSar) * 100) / 100,
    };
  }
  return { budgetSar, avgOrderSar, plan, assumptions };
}

function fallbackDraft(input: {
  business: string;
  product: string;
  audience: string;
  platform: GrowthPlatform;
  goal: string;
  language?: "ar" | "en";
}) {
  const en = input.language === "en",
    name = input.business;
  return {
    headlines: en
      ? [
          input.product,
          `Explore ${name}`,
          `Discover ${input.product}`,
          `View details at ${name}`,
          "Ask our team",
        ]
      : [
          input.product,
          `اكتشف ${name}`,
          `تعرّف على ${input.product}`,
          `راجع التفاصيل لدى ${name}`,
          "استفسر من فريقنا",
        ],
    descriptions: en
      ? [
          `Explore ${input.product} from ${name}. Review the details and contact the team to confirm availability.`,
          "Compare the scope and cost before deciding.",
        ]
      : [
          `تعرّف على ${input.product} من ${name}. راجع التفاصيل وتواصل مع الفريق لتأكيد التوفر.`,
          "قارن النطاق والتكلفة قبل اتخاذ قرارك.",
        ],
    keywords: en
      ? [
          input.product,
          `${input.product} Saudi Arabia`,
          `${input.product} details`,
          name,
        ]
      : [
          input.product,
          `${input.product} السعودية`,
          `تفاصيل ${input.product}`,
          name,
        ],
    negativeKeywords: en ? ["jobs", "free download"] : ["وظائف", "تحميل مجاني"],
    audience: {
      description:
        input.audience ||
        (en
          ? "Define your target audience before publishing."
          : "حدّد جمهورك المستهدف قبل النشر."),
      targeting: en
        ? [
            "Confirm the target location",
            "Use interests relevant to your product",
            "Review consent before retargeting",
          ]
        : [
            "تأكد من الموقع المستهدف",
            "اختر اهتمامات مرتبطة بالمنتج",
            "راجع الموافقة قبل إعادة الاستهداف",
          ],
    },
    callToActions: en
      ? ["Explore details", "Contact us", "Compare options"]
      : ["راجع التفاصيل", "تواصل معنا", "قارن الخيارات"],
  };
}

async function generateCopy(input: {
  business: string;
  product: string;
  audience: string;
  platform: GrowthPlatform;
  goal: string;
  language?: "ar" | "en";
}): Promise<{ draft: Record<string, unknown>; ai: boolean }> {
  const fallback = fallbackDraft(input);
  const prompt = `أنت خبير إعلانات Google وSnap وTikTok للسوق السعودي. اكتب باللغة ${input.language === "en" ? "الإنجليزية" : "العربية"}. لا تختلق خصومات أو ضمانات أو توصيلاً سريعاً أو طرق دفع غير واردة في بيانات النشاط.
النشاط: ${input.business} | المنتج: ${input.product} | الجمهور: ${input.audience || "غير محدد"} | المنصة: ${input.platform} | الهدف: ${input.goal || "زيادة المبيعات"}.
أعد JSON فقط بهذا الشكل بالضبط، بدون أي نص آخر:
{"headlines":["5 عناوين خاطفة، كل عنوان 30 حرفاً كحد أقصى"],"descriptions":["وصفان، كل وصف 90 حرفاً كحد أقصى"],"keywords":["8 كلمات مفتاحية عالية النية الشرائية بالسعودية"],"negativeKeywords":["4 كلمات مستبعدة"],"audience":{"description":"سطر واحد","targeting":["4 بنود استهداف"]},"callToActions":["4 عبارات دعوة"]}`;
  try {
    const response = await new GoogleGenAI({}).models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { maxOutputTokens: 2048, httpOptions: { timeout: 30000 } },
    });
    const text = (response.text || "").trim();
    if (!text) return { draft: fallback, ai: false };
    const match =
      text.match(/```(?:json)?\s*([\s\S]*?)```/) || ([null, text] as const);
    const parsed = JSON.parse(String(match[1]).trim()) as Record<
      string,
      unknown
    >;
    const draft = normalizeAdDraft({ ...fallback, ...parsed });
    if (!draft) return { draft: fallback, ai: false };
    return { draft, ai: true };
  } catch {
    return { draft: fallback, ai: false };
  }
}

function bannerBriefs(
  platform: GrowthPlatform,
  input: { business: string; product: string; language?: "ar" | "en" },
) {
  const targets: Exclude<GrowthPlatform, "all">[] =
    platform === "all" ? ["google", "snap", "tiktok"] : [platform];
  return targets.flatMap((p) =>
    BANNER_SIZES[p].map((s, i) => ({
      platform: p,
      size: s.size,
      use: input.language === "en" ? `${p} advertising placement` : s.use,
      headline:
        i === 0 ? input.product : `${input.business} — ${input.product}`,
      cta: input.language === "en" ? "Explore details" : "راجع التفاصيل",
      palette:
        input.language === "en"
          ? "Charcoal background, orange accent, white text"
          : "خلفية فحمية #101211، لمسة برتقالية، نص أبيض",
      safeArea:
        p === "google"
          ? input.language === "en"
            ? "Keep text inside 80% of the area"
            : "أبقِ النص داخل 80% من المساحة"
          : input.language === "en"
            ? "Keep 250px clear at the top and bottom for platform controls"
            : "هامش أمان 250px علوي وسفلي للأزرار الأصلية",
    })),
  );
}

function publicCampaign(row: typeof growthCampaigns.$inferSelect) {
  return {
    id: row.id,
    platform: row.platform,
    businessName: row.businessName,
    product: row.product,
    draft: row.draft,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function growthRoute(req: Request, path: string) {
  const method = req.method;

  if (path === "/api/growth/guides" && method === "GET")
    return { guides: GROWTH_GUIDES };

  if (path === "/api/growth/seo" && method === "GET") {
    const pages = [
      "/",
      "/products",
      "/workforce",
      ...GROWTH_GUIDES.map((g) => `/guides/${g.slug}`),
    ];
    return {
      site: SITE_URL,
      sitemap: pages.map((p) => `${SITE_URL}${p === "/" ? "" : p}`),
      defaults: {
        title: "OneShot — أعمالك، ببُعدٍ آخر",
        description:
          "منظومة OneShot: التصوير التجاري، أتمتة المتاجر، ربط بوابات الدفع، وموظفو AI — مع دليل التجار الذكي وحاسبات النمو.",
        locale: "ar_SA",
      },
      organizationSchema: {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "OneShot Photography",
        url: SITE_URL,
        logo: `${SITE_URL}/brand/oneshot.svg`,
        contactPoint: {
          "@type": "ContactPoint",
          email: "support@1shotcam.com",
          contactType: "customer service",
          availableLanguage: ["ar", "en"],
        },
      },
    };
  }

  if (path === "/api/growth/ads-generate" && method === "POST") {
    const user = await authenticate(req);
    await limit(user.id, "growth_ads", 10);
    const body = await payload(req, 8000);
    const business = stringField(body.business, "اسم النشاط", 120);
    const product = stringField(body.product, "المنتج أو الخدمة", 200);
    const audience =
      typeof body.audience === "string" ? body.audience.slice(0, 300) : "";
    const goal = typeof body.goal === "string" ? body.goal.slice(0, 200) : "";
    const platform = String(body.platform || "google");
    if (!PLATFORMS.includes(platform as GrowthPlatform))
      throw new ApiError(400, "المنصة الإعلانية غير صالحة.");
    const budgetSar = Number(body.budgetSar);
    if (!Number.isFinite(budgetSar) || budgetSar < 100 || budgetSar > 1000000)
      throw new ApiError(400, "الميزانية يجب أن تكون بين 100 ومليون ريال.");
    const avgOrderSar = Number(body.avgOrderSar);
    if (
      !Number.isFinite(avgOrderSar) ||
      avgOrderSar < 10 ||
      avgOrderSar > 1000000
    )
      throw new ApiError(400, "متوسط قيمة الطلب غير صالح.");
    const { draft, ai } = await generateCopy({
      business,
      product,
      audience,
      platform: platform as GrowthPlatform,
      goal,
      language: body.language === "en" ? "en" : "ar",
    });
    return {
      draft,
      budgetPlan: estimateBudgetPlan(
        Math.round(budgetSar),
        Math.round(avgOrderSar),
      ),
      banners: bannerBriefs(platform as GrowthPlatform, {
        business,
        product,
        language: body.language === "en" ? "en" : "ar",
      }),
      ai,
      note:
        body.language === "en"
          ? "Budget and return estimates use illustrative market assumptions, not guaranteed outcomes."
          : "تقديرات الميزانية والعائد استرشادية من افتراضات سوقية معلنة، وليست ضماناً للنتائج.",
    };
  }

  if (path === "/api/growth/campaigns" && method === "GET") {
    const user = await authenticate(req);
    const rows = await database()
      .select()
      .from(growthCampaigns)
      .where(eq(growthCampaigns.ownerId, user.id))
      .orderBy(desc(growthCampaigns.updatedAt))
      .limit(50);
    return { campaigns: rows.map(publicCampaign) };
  }

  if (path === "/api/growth/campaigns" && method === "POST") {
    const user = await authenticate(req);
    await limit(user.id, "growth_campaigns", 10);
    const body = await payload(req);
    const platform = String(body.platform || "google");
    if (!PLATFORMS.includes(platform as GrowthPlatform))
      throw new ApiError(400, "المنصة الإعلانية غير صالحة.");
    if (
      !body.draft ||
      typeof body.draft !== "object" ||
      Array.isArray(body.draft)
    )
      throw new ApiError(400, "مسودة الحملة غير صالحة.");
    const draft = normalizeAdDraft(body.draft);
    if (!draft)
      throw new ApiError(
        400,
        "مسودة الحملة ناقصة العناوين أو الكلمات المفتاحية.",
      );
    const [row] = await database()
      .insert(growthCampaigns)
      .values({
        ownerId: user.id,
        platform,
        businessName:
          typeof body.businessName === "string"
            ? body.businessName.slice(0, 120)
            : "",
        product:
          typeof body.product === "string" ? body.product.slice(0, 200) : "",
        draft,
      })
      .returning();
    return { campaign: publicCampaign(row) };
  }

  const deleteMatch = path.match(/^\/api\/growth\/campaigns\/([^/]+)$/);
  if (deleteMatch && method === "DELETE") {
    const user = await authenticate(req);
    const id = uuid(deleteMatch[1]);
    const db = database();
    const [row] = await db
      .select()
      .from(growthCampaigns)
      .where(
        and(eq(growthCampaigns.id, id), eq(growthCampaigns.ownerId, user.id)),
      );
    if (!row) throw new ApiError(404, "الحملة غير موجودة.");
    await db.delete(growthCampaigns).where(eq(growthCampaigns.id, id));
    return { deleted: true };
  }

  if (path === "/api/growth/banner-image" && method === "POST") {
    const user = await authenticate(req);
    await limit(user.id, "growth_banner", 3);
    const body = await payload(req, 4000);
    const brief = stringField(body.brief, "وصف البانر", 500);
    const gatewayKey = Netlify.env.get("NETLIFY_AI_GATEWAY_KEY");
    const gatewayUrl = Netlify.env.get("NETLIFY_AI_GATEWAY_URL");
    if (!gatewayKey || !gatewayUrl)
      throw new ApiError(
        503,
        "خدمة توليد الصور غير متاحة حالياً.",
        "AI_UNAVAILABLE",
      );
    try {
      const ai = new GoogleGenAI({
        apiKey: gatewayKey,
        httpOptions: { baseUrl: gatewayUrl.replace(/\/$/, "") },
      });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: `Clean Arabic commercial ad banner, no cluttered text: ${brief}. Charcoal background #101211, restrained orange accent, premium minimal studio style.`,
      });
      const part = response.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData?.data,
      );
      if (!part?.inlineData?.data)
        throw new ApiError(502, "لم تُرجع الخدمة صورة صالحة.");
      return {
        image: `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        502,
        "تعذّر توليد الصورة. حاول مجدداً.",
        "AI_UNAVAILABLE",
      );
    }
  }

  throw new ApiError(404, "المسار غير موجود.", "ROUTE_NOT_FOUND");
}
