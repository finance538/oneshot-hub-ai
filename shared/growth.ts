// Shared growth engine: deterministic, stateless campaign + budget math.
// Used by the server route and as an offline fallback in the browser dock.
// No secrets, no database, no external calls — pure white-hat templates.

export type AdPlatform = "google" | "snap" | "tiktok";
export type BusinessKind =
  | "store"
  | "photography"
  | "restaurant"
  | "services"
  | "fashion";

export interface CampaignInput {
  platform: AdPlatform;
  businessName: string;
  businessKind: BusinessKind;
  offer: string;
  city: string;
  language: "ar" | "en";
}

export interface CampaignOutput {
  headlines: string[];
  descriptions: string[];
  keywords: string[];
  negativeKeywords: string[];
  audience: string[];
  callToAction: string;
  bannerSizes: { platform: string; size: string; use: string }[];
  notes: string[];
}

export const businessLabels: Record<BusinessKind, { ar: string; en: string }> = {
  store: { ar: "متجر إلكتروني", en: "Online store" },
  photography: { ar: "استوديو تصوير", en: "Photography studio" },
  restaurant: { ar: "مطعم ومقهى", en: "Restaurant & café" },
  services: { ar: "خدمات مهنية", en: "Professional services" },
  fashion: { ar: "أزياء وتجميل", en: "Fashion & beauty" },
};

const bannerMatrix: CampaignOutput["bannerSizes"] = [
  { platform: "Google Display", size: "300 × 250", use: "مستطيل متوسط داخل المحتوى" },
  { platform: "Google Display", size: "336 × 280", use: "مستطيل كبير عالي الظهور" },
  { platform: "Google Display", size: "728 × 90", use: "لوحة علوية للمواقع" },
  { platform: "Google Display", size: "300 × 600", use: "نصف صفحة جانبية" },
  { platform: "Google Display", size: "320 × 100", use: "بانر الجوال الكبير" },
  { platform: "Snapchat", size: "1080 × 1920", use: "إعلان ستوري عمودي بملء الشاشة" },
  { platform: "Snapchat", size: "160 × 600", use: "وحدة ويب مصاحبة" },
  { platform: "TikTok", size: "1080 × 1920", use: "فيديو عمودي 9:16 حتى 60 ثانية" },
  { platform: "TikTok", size: "1200 × 628", use: "صورة أفقية لإعلانات الويب" },
];

function clean(value: string, fallback: string): string {
  const text = value.replace(/\s+/g, " ").trim().slice(0, 80);
  return text || fallback;
}

export function generateCampaign(input: CampaignInput): CampaignOutput {
  const name = clean(input.businessName, input.language === "ar" ? "نشاطك التجاري" : "Your business");
  const offer = clean(input.offer, input.language === "ar" ? "عرض الافتتاح" : "Opening offer");
  const city = clean(input.city, input.language === "ar" ? "مدينتك" : "your city");
  const kind =
    input.language === "ar"
      ? businessLabels[input.businessKind].ar
      : businessLabels[input.businessKind].en;
  const ar = input.language === "ar";

  const headlines = ar
    ? [
        `${name} — ${offer} في ${city}`,
        `${kind} يليق بذوقك: ${offer}`,
        `لماذا يختار أهل ${city} ${name}؟`,
        `${offer} لفترة محدودة — احجز الآن`,
        `${name} | جودة تستحق التجربة`,
        `اكتشف ${kind} الأعلى تقييماً في ${city}`,
        `خصم الافتتاح: ${offer} من ${name}`,
        `توصية جيرانك في ${city}: ${name}`,
        `${name} — احجز موعدك اليوم`,
        `تجربة راقية مع ${name} في ${city}`,
      ]
    : [
        `${name} — ${offer} in ${city}`,
        `${kind} done right: ${offer}`,
        `Why ${city} chooses ${name}`,
        `Limited-time ${offer} — book now`,
        `${name} | Quality worth trying`,
        `Discover top-rated ${kind} in ${city}`,
        `Opening deal: ${offer} at ${name}`,
        `Your ${city} neighbours recommend ${name}`,
        `${name} — book your slot today`,
        `A refined experience with ${name}`,
      ];
  const descriptions = ar
    ? [
        `${name} يقدم ${offer} لعملاء ${city}. احجز في دقيقة واستلم تأكيداً فورياً.`,
        `${kind} بمعايير احترافية وضمان الرضا — ${offer} سارٍ هذا الأسبوع.`,
        `فريق ${name} يخدم ${city} يومياً. شاهد الأعمال السابقة ثم احجز ${offer}.`,
        `لا تفوّت ${offer}: تواصل الآن وسيرد عليك ${name} خلال ساعات العمل.`,
      ]
    : [
        `${name} brings ${offer} to ${city}. Book in a minute with instant confirmation.`,
        `${kind} with professional standards and a satisfaction promise — ${offer} this week.`,
        `The ${name} team serves ${city} daily. See past work, then claim ${offer}.`,
        `Don't miss ${offer}: message now and ${name} replies within working hours.`,
      ];
  const keywords =
    input.platform === "google"
      ? ar
        ? [
            `${kind} في ${city}`,
            `أفضل ${kind} ${city}`,
            `${offer} ${city}`,
            `حجز ${kind} ${city}`,
            `أسعار ${kind} ${city}`,
            `${name}`,
            `${kind} قريب مني`,
            `عروض ${kind} ${city}`,
          ]
        : [
            `${kind} in ${city}`,
            `best ${kind} ${city}`,
            `${offer} ${city}`,
            `book ${kind} ${city}`,
            `${kind} prices ${city}`,
            `${name}`,
            `${kind} near me`,
            `${kind} offers ${city}`,
          ]
      : ar
        ? [`${kind} ${city}`, `${name}`, `${offer}`, `ترند ${city}`, `اكسبلور ${city}`]
        : [`${kind} ${city}`, `${name}`, `${offer}`, `${city} trends`, `viral ${city}`];
  const negativeKeywords = ar
    ? ["مجاني تماماً", "وظائف", "كورس مجاني", "تحميل", "تورنت", "اختراق"]
    : ["totally free", "jobs", "free course", "download", "torrent", "hack"];
  const audience = ar
    ? [
        `الموقع: ${city} + 25 كم، الفئة 22–45 سنة`,
        "الاهتمامات: التسوق المحلي، تقييمات المطاعم والخدمات، صناع المحتوى",
        "الجمهور المشابه: زوار الموقع آخر 180 يوماً وقوائم العملاء",
        "إعادة الاستهداف: من شاهد الأسعار ولم يحجز خلال 14 يوماً",
        input.platform === "google"
          ? "استهداف النية: كلمات الحجز والأسعار فقط، واستبعاد الباحثين عن وظائف"
          : "استهداف السلوك: متابعو حسابات الأعمال المحلية وصناع محتوى المدينة",
      ]
    : [
        `Location: ${city} + 25 km, ages 22–45`,
        "Interests: local shopping, review readers, city creators",
        "Lookalike: site visitors (180 days) + customer lists",
        "Retargeting: priced-page viewers who didn't book in 14 days",
        input.platform === "google"
          ? "Intent only: booking and pricing keywords, exclude job seekers"
          : "Behaviour: followers of local business and city creator accounts",
      ];
  return {
    headlines,
    descriptions,
    keywords,
    negativeKeywords,
    audience,
    callToAction: ar ? "احجز الآن عبر واتساب أو الموقع" : "Book now via WhatsApp or the site",
    bannerSizes: bannerMatrix.filter((b) =>
      input.platform === "google"
        ? b.platform === "Google Display"
        : input.platform === "snap"
          ? b.platform === "Snapchat"
          : b.platform === "TikTok",
    ),
    notes: ar
      ? [
          "ابدأ بميزانية اختبار صغيرة 7 أيام قبل التوسع.",
          "نسخة إعلانية واحدة لكل مجموعة إعلانية لقياس واضح.",
          "صفحة الهبوط يجب أن تذكر العرض نفسه حرفياً.",
        ]
      : [
          "Start with a small 7-day test budget before scaling.",
          "One creative per ad set for clean measurement.",
          "The landing page must repeat the same offer verbatim.",
        ],
  };
}

export interface BudgetInput {
  dailyBudget: number;
  days: number;
  avgOrderValue: number;
  conversionRate: number; // percent, e.g. 2.5
  currency: string;
}

export interface BudgetOutput {
  totalSpend: number;
  expectedClicks: number;
  expectedOrders: number;
  expectedRevenue: number;
  roas: number;
  breakEvenRoas: number;
  verdict: "scale" | "watch" | "fix";
}

/** Transparent ROAS math shown step-by-step in the dock — no black boxes. */
export function calculateBudget(input: BudgetInput, avgCpc = 1.5): BudgetOutput {
  const daily = Math.min(Math.max(input.dailyBudget, 0), 100000);
  const days = Math.min(Math.max(Math.round(input.days), 1), 365);
  const totalSpend = daily * days;
  const expectedClicks = avgCpc > 0 ? totalSpend / avgCpc : 0;
  const rate = Math.min(Math.max(input.conversionRate, 0), 100) / 100;
  const expectedOrders = expectedClicks * rate;
  const expectedRevenue = expectedOrders * Math.max(input.avgOrderValue, 0);
  const roas = totalSpend > 0 ? expectedRevenue / totalSpend : 0;
  return {
    totalSpend,
    expectedClicks: Math.round(expectedClicks),
    expectedOrders: Math.round(expectedOrders * 10) / 10,
    expectedRevenue: Math.round(expectedRevenue * 100) / 100,
    roas: Math.round(roas * 100) / 100,
    breakEvenRoas: 1,
    verdict: roas >= 3 ? "scale" : roas >= 1.5 ? "watch" : "fix",
  };
}

export interface SeoGuide {
  slug: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  keywordsAr: string[];
  audienceAr: string;
}

export const seoGuides: SeoGuide[] = [
  {
    slug: "payment-gateways",
    titleAr: "دليل ربط بوابات الدفع للمتاجر السعودية",
    titleEn: "Payment gateway integration guide",
    descriptionAr:
      "مقارنة عملية بين بوابات الدفع: الرسوم، سرعة التسوية، الدفع بالتقسيط، وخطوات الربط الآمن دون تخزين بيانات البطاقات.",
    keywordsAr: ["ربط بوابات الدفع", "بوابات الدفع للمتاجر", "رسوم مدى", "التحقق 3D Secure"],
    audienceAr: "أصحاب المتاجر الإلكترونية في السعودية والإمارات",
  },
  {
    slug: "store-automation",
    titleAr: "أتمتة المتاجر: من الطلب حتى التوصيل",
    titleEn: "Store automation playbook",
    descriptionAr:
      "خارطة أتمتة الطلبات والمخزون والتنبيهات والفواتير، مع حاسبة تفاعلية لزمن التوفير وجدول جاهزية قبل مواسم الذروة.",
    keywordsAr: ["أتمتة المتاجر", "إدارة المخزون", "تنبيهات الطلبات", "ربط الشحن"],
    audienceAr: "مديرو المتاجر وفرق العمليات",
  },
  {
    slug: "ai-employees",
    titleAr: "موظفو الذكاء الاصطناعي لخدمة العملاء",
    titleEn: "AI employees for customer service",
    descriptionAr:
      "كيف يرد موظف الذكاء الاصطناعي على الاستفسارات، ويؤهل العملاء، ويسلّم للفريق البشري — مع سياسات الخصوصية والحدود الآمنة.",
    keywordsAr: ["موظفي الذكاء الاصطناعي", "شات بوت للمتاجر", "أتمتة خدمة العملاء", "الرد الآلي واتساب"],
    audienceAr: "التجار الباحثون عن تغطية عملاء على مدار الساعة",
  },
  {
    slug: "commercial-photography",
    titleAr: "التصوير التجاري الاحترافي لمنتجاتك",
    titleEn: "Commercial product photography",
    descriptionAr:
      "أسعار جلسات التصوير، تجهيز المنتج قبل الجلسة، وقائمة تحقق لصور ترفع التحويل — بخبرة OneShot Photography الميدانية.",
    keywordsAr: ["التصوير التجاري", "تصوير المنتجات", "أسعار التصوير", "صور متجر احترافية"],
    audienceAr: "العلامات التجارية والمتاجر الباحثة عن صور تبيع",
  },
];
