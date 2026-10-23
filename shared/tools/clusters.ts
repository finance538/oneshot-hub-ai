import type { Cluster, ClusterId } from "./types.ts";

export const SITE = "https://www.1shotcam.com";

export const clusters: Cluster[] = [
  {
    id: "ecommerce",
    app: "pay",
    origin: "https://pay.1shotcam.com",
    emoji: "💳",
    nameAr: "التجارة الإلكترونية وبوابات الدفع",
    nameEn: "E-commerce & payment gateways",
    blurbAr:
      "حاسبات رسوم مدى وتمارا وتابي وStripe وغيرها، هوامش الربح وضريبة القيمة المضافة وتدقيق التحويل لمتاجر سلة وزد وShopify.",
    blurbEn:
      "Fee calculators for Mada, Tamara, Tabby, Stripe and more, profit margins, Saudi VAT and conversion audits for Salla, Zid and Shopify stores.",
    ctaAr:
      "💳 اربط بوابة الدفع لمتجرك الآن في ثوانٍ عبر OneShot Pay (pay.1shotcam.com)",
    ctaEn: "💳 Connect your store's payment gateway with OneShot Pay",
    accent: "#cfa46a",
  },
  {
    id: "google-ai",
    app: "ai",
    origin: "https://ai.1shotcam.com",
    emoji: "🤖",
    nameAr: "Google Workspace ويوتيوب وأتمتة الذكاء الاصطناعي",
    nameEn: "Google Workspace, YouTube & AI automation",
    blurbAr:
      "مولدات ردود Gmail، حاسبات توفير وقت البريد، محسّن SEO يوتيوب، حاسبة أرباح RPM، مولد صيغ Google Sheets ومهندس الأوامر.",
    blurbEn:
      "Gmail reply builders, inbox time savings, YouTube SEO and RPM calculators, Google Sheets formula generators and prompt architects.",
    ctaAr:
      "🤖 نفّذ هذه المهمة بالذكاء الاصطناعي الكامل واربط حساب جوجل في OneShot AI (ai.1shotcam.com)",
    ctaEn: "🤖 Run this task with full AI and connect Google in OneShot AI",
    accent: "#9fb7c9",
  },
  {
    id: "gaming",
    app: "loader",
    origin: "https://loader.1shotcam.com",
    emoji: "⚡",
    nameAr: "الألعاب والبث وعتاد PC ومختبر الذكاء المحلي",
    nameEn: "Gaming, streaming, PC hardware & local AI lab",
    blurbAr:
      "حاسبات عنق الزجاجة وFPS، مزود الطاقة، معدل البت في OBS، اختبار معدل التحديث، وهل يشغّل جهازك Llama وDeepSeek وFlux محلياً؟",
    blurbEn:
      "Bottleneck & FPS, PSU, OBS bitrate, refresh-rate tests and 'can my rig run Llama, DeepSeek or Flux locally?' calculators.",
    ctaAr:
      "⚡ افتح الترسانة الكاملة ومختبر الفحص في OneShot Loader (loader.1shotcam.com)",
    ctaEn: "⚡ Open the full arsenal and test lab in OneShot Loader",
    accent: "#a7c08f",
  },
  {
    id: "brand",
    app: "brand",
    origin: "https://brand.1shotcam.com",
    emoji: "🎨",
    nameAr: "التصوير التجاري والهوية وعائد الإعلانات",
    nameEn: "Commercial photography, brand & ads ROAS",
    blurbAr:
      "محاكي العدسة وفتحة الضوء، حاسبة تكلفة تصوير المنتجات، مولد ألوان فاخرة مريحة، مقاسات المنصات وحاسبات ميزانية وعائد إعلانات Google وSnap وTikTok.",
    blurbEn:
      "Lens & aperture simulators, product photography cost, calm luxury palettes, platform image sizes and Google/Snap/TikTok ROAS calculators.",
    ctaAr:
      "🎨 صمّم هويتك وإعلاناتك في استوديو البراند (brand.1shotcam.com) أو اطلب باقة التصوير الاحترافية",
    ctaEn:
      "🎨 Design your brand and ads in Brand Studio, or book a photography package",
    secondary: {
      href: "/products",
      ar: "📸 تصفّح باقات التصوير في المتجر",
      en: "📸 Browse photography packages",
    },
    accent: "#d3b48c",
  },
  {
    id: "workforce",
    app: "workflow",
    origin: "https://workflow.1shotcam.com",
    emoji: "🧠",
    nameAr: "موظفو الذكاء الاصطناعي وعائد الاستثمار",
    nameEn: "AI employees & workforce ROI",
    blurbAr:
      "قارن تكلفة الموظف التقليدي بموظف OneShot الذكي عبر 100 دور وقطاع: التوفير الشهري والسنوي وفترة الاسترداد بافتراضاتك أنت.",
    blurbEn:
      "Compare a traditional hire with a OneShot AI employee across 100 roles and industries: monthly and yearly savings using your own assumptions.",
    ctaAr:
      "🧠 وظّف موظف الذكاء الاصطناعي لمتجرك الآن عبر OneShot Workflow (workflow.1shotcam.com)",
    ctaEn: "🧠 Hire an AI employee for your store with OneShot Workflow",
    accent: "#b6a7d0",
  },
];

export const clusterById = Object.fromEntries(
  clusters.map((c) => [c.id, c]),
) as Record<ClusterId, Cluster>;

export const isClusterId = (value: unknown): value is ClusterId =>
  typeof value === "string" && value in clusterById;

export const toolPath = (cluster: ClusterId, slug: string) =>
  `/tools/${cluster}/${slug}`;

/** Funnel link carrying the tool slug so destination apps can attribute it. */
export function funnelHref(cluster: Cluster, slug: string) {
  const url = new URL(cluster.origin);
  url.searchParams.set("utm_source", "1shotcam");
  url.searchParams.set("utm_medium", "tool");
  url.searchParams.set("utm_campaign", slug);
  return url.href;
}
