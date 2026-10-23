// The 23 calculation engines behind all 500 pages. Each engine is pure:
// values in, numbers/text out. They run entirely in the visitor's browser.
import type {
  Bar,
  EngineId,
  EngineResult,
  FieldDef,
  Kpi,
  Swatch,
  ToolPage,
  Values,
} from "./types.ts";
import { cpuOptions, gateways, gpuOptions, youtubeNiches } from "./entities.ts";

type Lang = "ar" | "en";

export interface Engine {
  id: EngineId;
  widget?: "palette" | "resizer" | "refresh";
  fields: (page: ToolPage) => FieldDef[];
  compute: (values: Values, page: ToolPage, lang: Lang) => EngineResult;
}

const num = (v: Values, key: string, fallback = 0) => {
  const n = Number(v[key]);
  return Number.isFinite(n) ? n : fallback;
};
const str = (v: Values, key: string) => String(v[key] ?? "").trim();
const round = (n: number, d = 0) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(n, lo), hi);

const number = (
  key: string,
  ar: string,
  en: string,
  min: number,
  max: number,
  step = 1,
  unit?: string,
): FieldDef => ({ key, kind: "number", ar, en, min, max, step, unit });
const select = (
  key: string,
  ar: string,
  en: string,
  options: [string, string, string][],
): FieldDef => ({
  key,
  kind: "select",
  ar,
  en,
  options: options.map(([value, oar, oen]) => ({ value, ar: oar, en: oen })),
});
const text = (
  key: string,
  ar: string,
  en: string,
  placeholder: string,
  maxLength = 80,
): FieldDef => ({ key, kind: "text", ar, en, placeholder, maxLength });
const yesNo = (key: string, ar: string, en: string) =>
  select(key, ar, en, [
    ["yes", "نعم", "Yes"],
    ["no", "لا", "No"],
  ]);
const kpi = (
  ar: string,
  en: string,
  value: number | string,
  format: Kpi["format"],
  tone?: Kpi["tone"],
): Kpi => ({ ar, en, value, format, tone });
const bar = (
  ar: string,
  en: string,
  value: number,
  format: Bar["format"],
): Bar => ({
  ar,
  en,
  value,
  format,
});

// ── Cluster 1 ───────────────────────────────────────────────────────────
const gatewayFees: Engine = {
  id: "gateway-fees",
  fields: () => [
    number(
      "order",
      "متوسط قيمة الطلب",
      "Average order value",
      10,
      20000,
      10,
      "SAR",
    ),
    number("orders", "عدد الطلبات شهرياً", "Orders per month", 1, 100000, 10),
    number(
      "pct",
      "نسبة رسوم البوابة",
      "Gateway percentage fee",
      0,
      10,
      0.05,
      "%",
    ),
    number(
      "fixed",
      "الرسم الثابت لكل عملية",
      "Fixed fee per transaction",
      0,
      10,
      0.1,
      "SAR",
    ),
    number("refunds", "نسبة الاسترجاع", "Refund rate", 0, 50, 0.5, "%"),
    number(
      "platform",
      "عمولة المنصة الإضافية",
      "Extra platform commission",
      0,
      10,
      0.1,
      "%",
    ),
  ],
  compute(v) {
    const order = num(v, "order"),
      orders = num(v, "orders"),
      pct = num(v, "pct"),
      fixed = num(v, "fixed"),
      refunds = num(v, "refunds"),
      platform = num(v, "platform");
    const perOrder = (order * (pct + platform)) / 100 + fixed;
    const gross = order * orders;
    const monthly = perOrder * orders;
    const refundLoss = (gross * refunds) / 100;
    const net = gross - monthly - refundLoss;
    const effective = gross > 0 ? (monthly / gross) * 100 : 0;
    return {
      kpis: [
        kpi("الرسوم لكل طلب", "Fee per order", round(perOrder, 2), "sar"),
        kpi(
          "إجمالي الرسوم شهرياً",
          "Monthly fees",
          round(monthly),
          "sar",
          "warn",
        ),
        kpi(
          "صافي التحويل الشهري",
          "Net monthly payout",
          round(net),
          "sar",
          "good",
        ),
        kpi("النسبة الفعلية", "Effective rate", round(effective, 2), "pct"),
        kpi("الرسوم سنوياً", "Yearly fees", round(monthly * 12), "sar"),
      ],
      bars: gateways.map((g) =>
        bar(
          g.ar,
          g.en,
          round(((order * (g.pct + platform)) / 100 + g.fixed) * orders),
          "sar",
        ),
      ),
      verdictAr:
        effective > 3
          ? "النسبة الفعلية مرتفعة؛ فاوض المزوّد أو فعّل مدى كوسيلة افتراضية للطلبات المحلية."
          : "النسبة الفعلية ضمن نطاق تنافسي للمتاجر المحلية.",
      verdictEn:
        effective > 3
          ? "Your effective rate is high; negotiate or make Mada the default for local orders."
          : "Your effective rate is competitive for a local store.",
      tone: effective > 3 ? "warn" : "good",
    };
  },
};

const bnpl: Engine = {
  id: "bnpl",
  fields: () => [
    number(
      "aov",
      "متوسط قيمة الطلب",
      "Average order value",
      50,
      20000,
      10,
      "SAR",
    ),
    number(
      "orders",
      "الطلبات الشهرية الحالية",
      "Current monthly orders",
      1,
      100000,
      10,
    ),
    number(
      "share",
      "حصة الطلبات بالتقسيط",
      "Share paid with BNPL",
      0,
      100,
      1,
      "%",
    ),
    number("pct", "عمولة التاجر", "Merchant fee", 0, 15, 0.1, "%"),
    number("fixed", "الرسم الثابت", "Fixed fee", 0, 10, 0.1, "SAR"),
    number(
      "aovLift",
      "زيادة متوسط السلة مع التقسيط",
      "BNPL basket uplift",
      0,
      100,
      1,
      "%",
    ),
    number(
      "convLift",
      "زيادة الطلبات المتوقعة",
      "Expected order uplift",
      0,
      100,
      1,
      "%",
    ),
    number("margin", "هامش الربح الإجمالي", "Gross margin", 1, 95, 1, "%"),
  ],
  compute(v) {
    const aov = num(v, "aov"),
      orders = num(v, "orders"),
      share = num(v, "share") / 100,
      pct = num(v, "pct") / 100,
      fixed = num(v, "fixed"),
      aovLift = num(v, "aovLift") / 100,
      convLift = num(v, "convLift") / 100,
      margin = num(v, "margin") / 100;
    const newOrders = orders * (1 + convLift);
    const bnplOrders = newOrders * share;
    const bnplAov = aov * (1 + aovLift);
    const fees = bnplOrders * (bnplAov * pct + fixed);
    const baseRevenue = orders * aov;
    const newRevenue = (newOrders - bnplOrders) * aov + bnplOrders * bnplAov;
    const extraProfit = (newRevenue - baseRevenue) * margin - fees;
    return {
      kpis: [
        kpi(
          "رسوم التقسيط شهرياً",
          "Monthly BNPL fees",
          round(fees),
          "sar",
          "warn",
        ),
        kpi(
          "الإيراد الإضافي",
          "Extra revenue",
          round(newRevenue - baseRevenue),
          "sar",
        ),
        kpi(
          "صافي الربح الإضافي",
          "Net extra profit",
          round(extraProfit),
          "sar",
          extraProfit >= 0 ? "good" : "bad",
        ),
        kpi("طلبات التقسيط", "BNPL orders", round(bnplOrders), "num"),
      ],
      bars: [
        bar("الإيراد قبل", "Revenue before", round(baseRevenue), "sar"),
        bar("الإيراد بعد", "Revenue after", round(newRevenue), "sar"),
        bar("رسوم التقسيط", "BNPL fees", round(fees), "sar"),
      ],
      verdictAr:
        extraProfit >= 0
          ? "التقسيط مربح وفق افتراضاتك؛ اعرضه بوضوح في صفحة المنتج والسلة."
          : "الرسوم تتجاوز الربح الإضافي؛ ارفع الحد الأدنى للتقسيط أو راجع الهامش.",
      verdictEn:
        extraProfit >= 0
          ? "BNPL is profitable under your assumptions; show it on product and cart pages."
          : "Fees exceed the extra profit; raise the BNPL minimum or revisit margin.",
      tone: extraProfit >= 0 ? "good" : "bad",
    };
  },
};

export const VAT_RATE = 15;
export const VAT_MANDATORY = 375000;
export const VAT_VOLUNTARY = 187500;

export function profitBreakdown(input: {
  cost: number;
  price: number;
  shipping: number;
  pct: number;
  ad: number;
  returns: number;
  vat?: number;
}) {
  const vat = input.vat ?? VAT_RATE;
  const exVat = input.price / (1 + vat / 100);
  const vatDue = input.price - exVat;
  const gatewayFee = (input.price * input.pct) / 100;
  const returnsLoss = (input.returns / 100) * input.shipping * 2;
  const contribution =
    exVat - input.cost - input.shipping - gatewayFee - returnsLoss;
  const profit = contribution - input.ad;
  return {
    exVat,
    vatDue,
    gatewayFee,
    returnsLoss,
    contribution,
    profit,
    margin: exVat > 0 ? (profit / exVat) * 100 : 0,
    breakEvenRoas: contribution > 0 ? input.price / contribution : Infinity,
  };
}

const margin: Engine = {
  id: "margin",
  fields: () => [
    number("cost", "تكلفة المنتج", "Product cost", 0, 100000, 1, "SAR"),
    number(
      "price",
      "سعر البيع شامل الضريبة",
      "Selling price incl. VAT",
      1,
      100000,
      1,
      "SAR",
    ),
    number(
      "shipping",
      "تكلفة الشحن والتغليف",
      "Shipping & packaging",
      0,
      1000,
      1,
      "SAR",
    ),
    number("pct", "رسوم بوابة الدفع", "Payment fee", 0, 10, 0.1, "%"),
    number(
      "ad",
      "تكلفة الإعلان لكل طلب",
      "Ad cost per order",
      0,
      5000,
      1,
      "SAR",
    ),
    number("returns", "نسبة المرتجعات", "Return rate", 0, 60, 0.5, "%"),
    number("target", "الهامش المستهدف", "Target margin", 1, 80, 1, "%"),
  ],
  compute(v) {
    const input = {
      cost: num(v, "cost"),
      price: num(v, "price"),
      shipping: num(v, "shipping"),
      pct: num(v, "pct"),
      ad: num(v, "ad"),
      returns: num(v, "returns"),
    };
    const r = profitBreakdown(input);
    const target = num(v, "target") / 100;
    const costs = input.cost + input.shipping + input.ad + r.returnsLoss;
    const denom = 1 - target - (1 + VAT_RATE / 100) * (input.pct / 100);
    const suggested = denom > 0 ? (costs / denom) * (1 + VAT_RATE / 100) : 0;
    return {
      kpis: [
        kpi(
          "صافي الربح لكل طلب",
          "Net profit per order",
          round(r.profit, 2),
          "sar",
          r.profit > 0 ? "good" : "bad",
        ),
        kpi("هامش الربح الصافي", "Net margin", round(r.margin, 1), "pct"),
        kpi(
          "ضريبة القيمة المضافة المستحقة",
          "Output VAT due",
          round(r.vatDue, 2),
          "sar",
        ),
        kpi(
          "ROAS نقطة التعادل",
          "Break-even ROAS",
          Number.isFinite(r.breakEvenRoas) ? round(r.breakEvenRoas, 2) : "∞",
          "x",
        ),
        kpi(
          "السعر المقترح للهامش المستهدف",
          "Price for target margin",
          round(suggested),
          "sar",
        ),
      ],
      bars: [
        bar("التكلفة", "Cost", input.cost, "sar"),
        bar("الشحن", "Shipping", input.shipping, "sar"),
        bar("الضريبة", "VAT", round(r.vatDue, 2), "sar"),
        bar("رسوم الدفع", "Payment fee", round(r.gatewayFee, 2), "sar"),
        bar("الإعلان", "Ads", input.ad, "sar"),
        bar("الربح", "Profit", round(Math.max(r.profit, 0), 2), "sar"),
      ],
      verdictAr:
        r.profit <= 0
          ? "كل طلب يخسر حالياً؛ ارفع السعر أو خفّض تكلفة الإعلان قبل التوسع."
          : r.margin < 15
            ? "الهامش رقيق؛ أي ارتفاع في تكلفة الإعلان قد يحوّل الطلب إلى خسارة."
            : "هامش صحي يتحمل التوسع الإعلاني المدروس.",
      verdictEn:
        r.profit <= 0
          ? "Every order loses money; raise price or cut ad cost before scaling."
          : r.margin < 15
            ? "Thin margin; a small ad-cost rise could turn orders unprofitable."
            : "Healthy margin that can absorb measured ad scaling.",
      tone: r.profit <= 0 ? "bad" : r.margin < 15 ? "warn" : "good",
    };
  },
};

export function vatSplit(amount: number, inclusive: boolean, rate = VAT_RATE) {
  const net = inclusive ? amount / (1 + rate / 100) : amount;
  const vat = (net * rate) / 100;
  return { net, vat, gross: net + vat };
}

const vat: Engine = {
  id: "vat",
  fields: () => [
    number("amount", "المبلغ", "Amount", 0, 10000000, 1, "SAR"),
    select("mode", "نوع المبلغ", "Amount type", [
      ["inclusive", "شامل الضريبة", "VAT inclusive"],
      ["exclusive", "غير شامل الضريبة", "VAT exclusive"],
    ]),
    number("rate", "نسبة الضريبة", "VAT rate", 0, 30, 0.5, "%"),
    number(
      "sales",
      "المبيعات الشهرية (قبل الضريبة)",
      "Monthly sales (ex. VAT)",
      0,
      100000000,
      100,
      "SAR",
    ),
    number(
      "purchases",
      "المشتريات الخاضعة شهرياً",
      "Monthly taxable purchases",
      0,
      100000000,
      100,
      "SAR",
    ),
  ],
  compute(v) {
    const rate = num(v, "rate");
    const s = vatSplit(num(v, "amount"), str(v, "mode") !== "exclusive", rate);
    const sales = num(v, "sales"),
      purchases = num(v, "purchases");
    const payable = ((sales - purchases) * rate) / 100;
    const annual = sales * 12;
    const status =
      annual >= VAT_MANDATORY
        ? "mandatory"
        : annual >= VAT_VOLUNTARY
          ? "voluntary"
          : "below";
    return {
      kpis: [
        kpi("المبلغ قبل الضريبة", "Net amount", round(s.net, 2), "sar"),
        kpi("قيمة الضريبة", "VAT", round(s.vat, 2), "sar", "warn"),
        kpi("الإجمالي شامل الضريبة", "Gross amount", round(s.gross, 2), "sar"),
        kpi(
          "صافي الضريبة المستحقة شهرياً",
          "Net VAT payable monthly",
          round(payable, 2),
          "sar",
        ),
        kpi(
          "صافي الضريبة لكل ربع",
          "Net VAT per quarter",
          round(payable * 3, 2),
          "sar",
        ),
      ],
      bars: [
        bar("ضريبة المخرجات", "Output VAT", round((sales * rate) / 100), "sar"),
        bar(
          "ضريبة المدخلات",
          "Input VAT",
          round((purchases * rate) / 100),
          "sar",
        ),
        bar("الصافي", "Net", round(payable), "sar"),
      ],
      verdictAr:
        status === "mandatory"
          ? "مبيعاتك السنوية المقدّرة تتجاوز 375,000 ريال: التسجيل في ضريبة القيمة المضافة إلزامي."
          : status === "voluntary"
            ? "مبيعاتك بين 187,500 و375,000 ريال: التسجيل اختياري."
            : "مبيعاتك المقدّرة أقل من حد التسجيل الاختياري.",
      verdictEn:
        status === "mandatory"
          ? "Estimated annual sales exceed SAR 375,000: VAT registration is mandatory."
          : status === "voluntary"
            ? "Sales between SAR 187,500 and 375,000: registration is voluntary."
            : "Estimated sales are below the voluntary registration threshold.",
      tone: status === "mandatory" ? "warn" : "good",
    };
  },
};

export const conversionChecks: {
  key: string;
  ar: string;
  en: string;
  weight: number;
}[] = [
  {
    key: "speed",
    ar: "تحميل الصفحة أقل من 3 ثوانٍ على الجوال",
    en: "Mobile load under 3 seconds",
    weight: 0.12,
  },
  {
    key: "local",
    ar: "مدى وApple Pay متاحان",
    en: "Mada and Apple Pay available",
    weight: 0.1,
  },
  {
    key: "bnpl",
    ar: "خيار تقسيط تمارا أو تابي",
    en: "Tamara or Tabby instalments",
    weight: 0.08,
  },
  {
    key: "photos",
    ar: "صور منتجات احترافية بعدة زوايا",
    en: "Professional multi-angle photos",
    weight: 0.1,
  },
  {
    key: "reviews",
    ar: "تقييمات عملاء ظاهرة",
    en: "Visible customer reviews",
    weight: 0.08,
  },
  {
    key: "shipping",
    ar: "حد شحن مجاني واضح",
    en: "Clear free-shipping threshold",
    weight: 0.06,
  },
  {
    key: "whatsapp",
    ar: "دعم واتساب سريع",
    en: "Fast WhatsApp support",
    weight: 0.05,
  },
  {
    key: "returns",
    ar: "سياسة استرجاع واضحة قبل الدفع",
    en: "Clear return policy before checkout",
    weight: 0.05,
  },
];

const conversion: Engine = {
  id: "conversion",
  fields: () => [
    number("visitors", "الزوار شهرياً", "Monthly visitors", 100, 10000000, 100),
    number(
      "cr",
      "معدل التحويل الحالي",
      "Current conversion rate",
      0.1,
      20,
      0.1,
      "%",
    ),
    number(
      "aov",
      "متوسط قيمة الطلب",
      "Average order value",
      10,
      20000,
      10,
      "SAR",
    ),
    ...conversionChecks.map((c) => yesNo(c.key, c.ar, c.en)),
  ],
  compute(v) {
    const visitors = num(v, "visitors"),
      cr = num(v, "cr"),
      aov = num(v, "aov");
    const total = conversionChecks.reduce((s, c) => s + c.weight, 0);
    const passed = conversionChecks.filter((c) => v[c.key] === "yes");
    const missing = conversionChecks.filter((c) => v[c.key] !== "yes");
    const score = Math.round(
      (passed.reduce((s, c) => s + c.weight, 0) / total) * 100,
    );
    const uplift = missing.reduce((s, c) => s + c.weight, 0);
    const potentialCr = cr * (1 + uplift);
    const now = (visitors * cr * aov) / 100;
    const potential = (visitors * potentialCr * aov) / 100;
    return {
      kpis: [
        kpi(
          "درجة جاهزية التحويل",
          "Conversion readiness",
          score,
          "num",
          score >= 75 ? "good" : score >= 50 ? "warn" : "bad",
        ),
        kpi(
          "الإيراد الشهري الحالي",
          "Current monthly revenue",
          round(now),
          "sar",
        ),
        kpi(
          "معدل التحويل المحتمل",
          "Potential conversion rate",
          round(potentialCr, 2),
          "pct",
        ),
        kpi(
          "الإيراد الإضافي المحتمل",
          "Potential extra revenue",
          round(potential - now),
          "sar",
          "good",
        ),
      ],
      bars: conversionChecks.map((c) =>
        bar(c.ar, c.en, v[c.key] === "yes" ? 0 : round(now * c.weight), "sar"),
      ),
      blocks: missing.length
        ? [
            {
              ar: "أولويات الإصلاح حسب الأثر",
              en: "Fix priorities by impact",
              lines: [...missing]
                .sort((a, b) => b.weight - a.weight)
                .map((c) => c.ar + " — " + c.en),
            },
          ]
        : undefined,
      verdictAr: missing.length
        ? `أصلح ${missing.length} عناصر لرفع التحويل؛ ابدأ بالأعلى أثراً.`
        : "كل أساسيات التحويل موجودة؛ ركّز على الاختبارات A/B والمحتوى.",
      verdictEn: missing.length
        ? `Fix ${missing.length} items to lift conversion; start with the highest impact.`
        : "All conversion basics are in place; focus on A/B tests and content.",
      tone: missing.length > 3 ? "warn" : "good",
    };
  },
};

// ── Cluster 2 ───────────────────────────────────────────────────────────
const inbox: Engine = {
  id: "inbox",
  fields: () => [
    number("emails", "رسائل يومياً", "Emails per day", 1, 2000, 1),
    number("minutes", "دقائق لكل رسالة", "Minutes per email", 0.5, 30, 0.5),
    number("automation", "نسبة ما تؤتمته", "Share automated", 0, 100, 5, "%"),
    number("hourly", "تكلفة الساعة", "Hourly cost", 10, 2000, 5, "SAR"),
    number("days", "أيام العمل شهرياً", "Workdays per month", 1, 31, 1),
  ],
  compute(v) {
    const hours = (num(v, "emails") * num(v, "minutes") * num(v, "days")) / 60;
    const saved = (hours * num(v, "automation")) / 100;
    const money = saved * num(v, "hourly");
    return {
      kpis: [
        kpi(
          "ساعات البريد شهرياً",
          "Inbox hours per month",
          round(hours, 1),
          "hours",
        ),
        kpi(
          "الساعات الموفّرة شهرياً",
          "Hours saved per month",
          round(saved, 1),
          "hours",
          "good",
        ),
        kpi(
          "القيمة الموفّرة شهرياً",
          "Value saved per month",
          round(money),
          "sar",
          "good",
        ),
        kpi(
          "القيمة الموفّرة سنوياً",
          "Value saved per year",
          round(money * 12),
          "sar",
          "good",
        ),
        kpi(
          "أيام عمل مستعادة سنوياً",
          "Workdays regained per year",
          round((saved * 12) / 8, 1),
          "num",
        ),
      ],
      bars: [
        bar("قبل الأتمتة", "Before", round(hours, 1), "hours"),
        bar("بعد الأتمتة", "After", round(hours - saved, 1), "hours"),
      ],
      verdictAr:
        "ابدأ بأتمتة الأسئلة المتكررة، وأبقِ الموافقة البشرية على أي رد مالي أو قانوني.",
      verdictEn:
        "Automate repetitive questions first; keep human approval for financial or legal replies.",
      tone: "good",
    };
  },
};

const ytRpm: Engine = {
  id: "yt-rpm",
  fields: () => [
    number(
      "views",
      "المشاهدات الشهرية",
      "Monthly views",
      1000,
      1000000000,
      1000,
    ),
    number(
      "rpm",
      "RPM لكل 1000 مشاهدة",
      "RPM per 1,000 views",
      0.1,
      50,
      0.1,
      "USD",
    ),
    number(
      "monetized",
      "نسبة المشاهدات المحققة للربح",
      "Monetized share",
      0,
      100,
      1,
      "%",
    ),
    number(
      "growth",
      "النمو الشهري المتوقع",
      "Expected monthly growth",
      -20,
      50,
      1,
      "%",
    ),
    number("fx", "سعر الدولار بالريال", "USD to SAR", 3, 4, 0.01),
  ],
  compute(v) {
    const rpm = num(v, "rpm"),
      fx = num(v, "fx", 3.75),
      growth = num(v, "growth") / 100;
    const monthlyUsd =
      (num(v, "views") * (num(v, "monetized") / 100) * rpm) / 1000;
    let year = 0;
    const months: Bar[] = [];
    for (let m = 1; m <= 12; m++) {
      const value = monthlyUsd * (1 + growth) ** (m - 1);
      year += value;
      if ([1, 3, 6, 9, 12].includes(m))
        months.push(bar(`الشهر ${m}`, `Month ${m}`, round(value), "usd"));
    }
    return {
      kpis: [
        kpi(
          "الأرباح الشهرية",
          "Monthly earnings",
          round(monthlyUsd),
          "usd",
          "good",
        ),
        kpi(
          "الأرباح الشهرية بالريال",
          "Monthly earnings (SAR)",
          round(monthlyUsd * fx),
          "sar",
        ),
        kpi(
          "الأرباح لـ 12 شهراً مع النمو",
          "12-month earnings with growth",
          round(year),
          "usd",
          "good",
        ),
        kpi("بالريال سنوياً", "Yearly (SAR)", round(year * fx), "sar"),
      ],
      bars: months,
      verdictAr:
        "RPM يختلف حسب الدولة والموسم وطول الفيديو؛ قارن بإحصاءات YouTube Studio الفعلية.",
      verdictEn:
        "RPM varies by country, season and video length; compare with your YouTube Studio data.",
    };
  },
};

function ytTitles(topic: string, keyword: string, year: number, lang: Lang) {
  return lang === "ar"
    ? [
        `${keyword}: ${topic} (دليل ${year} الكامل)`,
        `${topic} — كل ما تحتاج معرفته عن ${keyword}`,
        `جرّبت ${keyword} لمدة 30 يوماً… هذه النتيجة`,
        `أفضل ${keyword} في ${year}؟ مقارنة صادقة`,
        `${topic} في 10 دقائق | ${keyword} للمبتدئين`,
      ]
    : [
        `${keyword}: ${topic} (Complete ${year} Guide)`,
        `${topic} — Everything You Need to Know About ${keyword}`,
        `I Tried ${keyword} for 30 Days… Here's What Happened`,
        `Best ${keyword} in ${year}? An Honest Comparison`,
        `${topic} in 10 Minutes | ${keyword} for Beginners`,
      ];
}

const ytSeo: Engine = {
  id: "yt-seo",
  fields: () => [
    text("topic", "موضوع الفيديو", "Video topic", "مثال: إعداد متجر سلة", 70),
    text(
      "keyword",
      "الكلمة المفتاحية",
      "Main keyword",
      "مثال: متجر إلكتروني",
      40,
    ),
    number("year", "السنة", "Year", 2024, 2030, 1),
    text("channel", "اسم القناة", "Channel name", "OneShot", 40),
  ],
  compute(v, page, lang) {
    const niche = youtubeNiches.find((n) => n.id === page.params.niche);
    const topic =
        str(v, "topic") || (lang === "ar" ? niche?.ar || "" : niche?.en || ""),
      keyword = str(v, "keyword") || topic,
      channel = str(v, "channel") || "OneShot",
      year = num(v, "year", 2026);
    const titles = ytTitles(topic, keyword, year, lang);
    const baseTags = lang === "ar" ? niche?.tagsAr || [] : niche?.tagsEn || [];
    const tags = Array.from(
      new Set(
        [keyword, topic, ...baseTags, `${keyword} ${year}`, channel].filter(
          Boolean,
        ),
      ),
    );
    const tagChars = tags.join(",").length;
    const best = titles.reduce((a, b) =>
      Math.abs(a.length - 60) <= Math.abs(b.length - 60) ? a : b,
    );
    const description =
      lang === "ar"
        ? [
            `${topic} — في هذا الفيديو نشرح ${keyword} خطوة بخطوة.`,
            "",
            "⏱️ المحتوى:",
            "00:00 المقدمة",
            "01:00 الأساسيات",
            "04:00 التطبيق العملي",
            "08:00 أخطاء شائعة",
            "",
            `🔔 اشترك في ${channel} لمزيد من محتوى ${niche?.ar ?? ""}.`,
            tags
              .slice(0, 3)
              .map((t) => `#${t.replace(/\s+/g, "_")}`)
              .join(" "),
          ]
        : [
            `${topic} — in this video we walk through ${keyword} step by step.`,
            "",
            "⏱️ Chapters:",
            "00:00 Intro",
            "01:00 Basics",
            "04:00 Hands-on",
            "08:00 Common mistakes",
            "",
            `🔔 Subscribe to ${channel} for more ${niche?.en ?? ""} videos.`,
            tags
              .slice(0, 3)
              .map((t) => `#${t.replace(/\s+/g, "")}`)
              .join(" "),
          ];
    const score = clamp(
      100 -
        Math.abs(best.length - 60) -
        (tagChars > 500 ? 20 : 0) -
        (keyword && best.toLowerCase().startsWith(keyword.toLowerCase())
          ? 0
          : 10),
      0,
      100,
    );
    return {
      kpis: [
        kpi(
          "درجة تحسين العنوان",
          "Title SEO score",
          Math.round(score),
          "num",
          score >= 80 ? "good" : "warn",
        ),
        kpi("طول أفضل عنوان", "Best title length", best.length, "num"),
        kpi(
          "حروف الوسوم (الحد 500)",
          "Tag characters (max 500)",
          tagChars,
          "num",
          tagChars > 500 ? "bad" : "good",
        ),
      ],
      blocks: [
        {
          ar: "عناوين مقترحة",
          en: "Title ideas",
          lines: titles.map((t) => `${t} (${t.length})`),
        },
        { ar: "الوسوم", en: "Tags", lines: [tags.join(", ")] },
        { ar: "قالب الوصف", en: "Description template", lines: description },
      ],
      verdictAr: "ضع الكلمة المفتاحية في أول العنوان وفي أول سطرين من الوصف.",
      verdictEn:
        "Put the keyword at the start of the title and in the first two description lines.",
    };
  },
};

const colLetter = (value: string, fallback: string) =>
  /^[A-Za-z]{1,3}$/.test(value) ? value.toUpperCase() : fallback;
const cellRef = (value: string, fallback: string) =>
  /^[A-Za-z]{1,3}[0-9]{1,7}$/.test(value) ? value.toUpperCase() : fallback;
const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function sheetsFormula(
  task: string,
  v: Values,
): { formula: string; explainAr: string; explainEn: string } {
  const sheet = str(v, "sheet").replace(/[^\p{L}\p{N} _-]/gu, "") || "Data";
  const key = colLetter(str(v, "keyCol"), "A");
  const val = colLetter(str(v, "valueCol"), "B");
  const cell = cellRef(str(v, "cell"), "A2");
  const crit = str(v, "criteria") || "مكتمل";
  const rows = clamp(Math.round(num(v, "rows", 1000)), 2, 100000);
  const ref = (col: string) => `'${sheet}'!${col}2:${col}${rows}`;
  const map: Record<string, [string, string, string]> = {
    xlookup: [
      `=XLOOKUP(${cell}, ${ref(key)}, ${ref(val)}, "غير موجود")`,
      `يبحث عن ${cell} في العمود ${key} ويعيد القيمة المقابلة من ${val}.`,
      `Finds ${cell} in column ${key} and returns the matching ${val} value.`,
    ],
    vlookup: [
      `=IFERROR(VLOOKUP(${cell}, '${sheet}'!${key}2:${val}${rows}, ${Math.max(1, val.charCodeAt(0) - key.charCodeAt(0) + 1)}, FALSE), "غير موجود")`,
      `بحث مطابق تماماً؛ يجب أن يكون عمود البحث ${key} أول النطاق.`,
      `Exact-match lookup; the search column ${key} must be first in the range.`,
    ],
    sumifs: [
      `=SUMIFS(${ref(val)}, ${ref(key)}, ${quote(crit)})`,
      `يجمع ${val} للصفوف التي يساوي فيها ${key} القيمة "${crit}".`,
      `Sums ${val} where ${key} equals "${crit}".`,
    ],
    countifs: [
      `=COUNTIFS(${ref(key)}, ${quote(crit)})`,
      `يعدّ الصفوف التي يساوي فيها ${key} "${crit}".`,
      `Counts rows where ${key} equals "${crit}".`,
    ],
    averageifs: [
      `=AVERAGEIFS(${ref(val)}, ${ref(key)}, ${quote(crit)})`,
      `متوسط ${val} للصفوف المطابقة.`,
      `Average of ${val} for matching rows.`,
    ],
    iferror: [
      `=IFERROR(${val}2/${key}2, 0)`,
      "يعيد صفراً بدل خطأ القسمة على صفر.",
      "Returns zero instead of a divide-by-zero error.",
    ],
    unique: [
      `=UNIQUE(${ref(key)})`,
      `يعرض القيم غير المكررة من ${key}.`,
      `Lists distinct values from ${key}.`,
    ],
    filter: [
      `=FILTER('${sheet}'!A2:${val}${rows}, ${ref(key)} = ${quote(crit)})`,
      `يعرض الصفوف التي قيمتها في ${key} هي "${crit}".`,
      `Shows rows whose ${key} is "${crit}".`,
    ],
    sort: [
      `=SORT('${sheet}'!A2:${val}${rows}, ${val.charCodeAt(0) - 64}, FALSE)`,
      `يرتب البيانات تنازلياً حسب العمود ${val}.`,
      `Sorts data descending by column ${val}.`,
    ],
    query: [
      `=QUERY('${sheet}'!A1:${val}${rows}, "select ${key}, sum(${val}) where ${key} is not null group by ${key} order by sum(${val}) desc", 1)`,
      `ملخص مجمّع لكل قيمة في ${key}.`,
      `Grouped summary per ${key} value.`,
    ],
    importrange: [
      `=IMPORTRANGE("رابط_الملف", "${sheet}!A1:${val}${rows}")`,
      "استبدل رابط_الملف برابط Google Sheet المصدر ثم اسمح بالوصول مرة واحدة.",
      "Replace the placeholder with the source sheet URL and allow access once.",
    ],
    arrayformula: [
      `=ARRAYFORMULA(IF(${key}2:${key}${rows}="", "", ${key}2:${key}${rows} * ${val}2:${val}${rows}))`,
      "يحسب العمود كاملاً بصيغة واحدة.",
      "Computes the whole column with one formula.",
    ],
    textjoin: [
      `=TEXTJOIN("، ", TRUE, ${ref(key)})`,
      `يدمج قيم ${key} بفاصلة عربية متجاهلاً الفراغات.`,
      `Joins ${key} values, skipping blanks.`,
    ],
    split: [
      `=SPLIT(${cell}, " ")`,
      `يقسم ${cell} إلى أعمدة عند كل مسافة.`,
      `Splits ${cell} into columns at each space.`,
    ],
    regexextract: [
      `=REGEXEXTRACT(${cell}, "[0-9]+")`,
      `يستخرج أول رقم من ${cell}.`,
      `Extracts the first number from ${cell}.`,
    ],
    datedif: [
      `=DATEDIF(${key}2, ${val}2, "D")`,
      `عدد الأيام بين التاريخين في ${key}2 و${val}2.`,
      `Days between the dates in ${key}2 and ${val}2.`,
    ],
    networkdays: [
      `=NETWORKDAYS.INTL(${key}2, ${val}2, 7)`,
      "أيام العمل مع عطلة الجمعة والسبت (رمز 7).",
      "Working days with a Friday–Saturday weekend (code 7).",
    ],
    "vat-formula": [
      `=ROUND(${cell} * ${VAT_RATE}%, 2)`,
      `ضريبة القيمة المضافة ${VAT_RATE}% على ${cell}؛ وللمبلغ الشامل استخدم =${cell}-${cell}/1.15.`,
      `${VAT_RATE}% VAT on ${cell}; for inclusive amounts use =${cell}-${cell}/1.15.`,
    ],
    "profit-margin-formula": [
      `=IFERROR((${val}2 - ${key}2) / ${val}2, 0)`,
      `الهامش = (السعر ${val} − التكلفة ${key}) ÷ السعر؛ نسّق الخلية كنسبة مئوية.`,
      `Margin = (price ${val} − cost ${key}) ÷ price; format as percent.`,
    ],
    rank: [
      `=RANK(${val}2, ${ref(val)}, 0)`,
      `ترتيب ${val}2 بين القيم تنازلياً.`,
      `Rank of ${val}2 in descending order.`,
    ],
  };
  const [formula, explainAr, explainEn] = map[task] ?? map.xlookup;
  return { formula, explainAr, explainEn };
}

const sheets: Engine = {
  id: "sheets",
  fields: () => [
    text("sheet", "اسم الورقة", "Sheet name", "Data", 30),
    text("keyCol", "عمود البحث/الشرط", "Key / criteria column", "A", 3),
    text("valueCol", "عمود القيم", "Value column", "B", 3),
    text("cell", "الخلية المرجعية", "Reference cell", "A2", 8),
    text("criteria", "قيمة الشرط", "Criteria value", "مكتمل", 40),
    number("rows", "آخر صف في البيانات", "Last data row", 2, 100000, 1),
  ],
  compute(v, page, lang) {
    const r = sheetsFormula(String(page.params.task), v);
    const semicolon = r.formula.replace(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ";");
    return {
      kpis: [
        kpi("طول الصيغة", "Formula length", r.formula.length, "num"),
        kpi("الدالة", "Function", String(page.params.fn), "text"),
      ],
      blocks: [
        { ar: "الصيغة الجاهزة", en: "Ready formula", lines: [r.formula] },
        {
          ar: "للغات التي تستخدم الفاصلة المنقوطة",
          en: "For semicolon locales",
          lines: [semicolon],
        },
        {
          ar: "الشرح",
          en: "Explanation",
          lines: [lang === "ar" ? r.explainAr : r.explainEn],
        },
      ],
    };
  },
};

const gmail: Engine = {
  id: "gmail",
  fields: () => [
    text("business", "اسم المنشأة", "Business name", "متجر الريف", 60),
    select("tone", "نبرة الرد", "Tone", [
      ["formal", "رسمية", "Formal"],
      ["friendly", "ودّية", "Friendly"],
    ]),
    number(
      "hours",
      "زمن الرد البشري المتوقع",
      "Human follow-up time",
      1,
      72,
      1,
      "h",
    ),
    text(
      "contact",
      "قناة تواصل بديلة",
      "Alternative contact",
      "واتساب 05xxxxxxxx",
      60,
    ),
    number(
      "daily",
      "رسائل هذا النوع يومياً",
      "Such emails per day",
      1,
      1000,
      1,
    ),
  ],
  compute(v, page, lang) {
    const business = str(v, "business") || "OneShot",
      hours = num(v, "hours", 24),
      contact = str(v, "contact"),
      formal = str(v, "tone") !== "friendly";
    const promise =
      lang === "ar"
        ? String(page.params.promiseAr)
        : String(page.params.promiseEn);
    const subject =
      lang === "ar"
        ? `تم استلام رسالتك — ${business}`
        : `We received your message — ${business}`;
    const body =
      lang === "ar"
        ? [
            formal ? "السلام عليكم ورحمة الله،" : "أهلاً وسهلاً 👋",
            `شكراً لتواصلك مع ${business}. استلمنا رسالتك و${promise} خلال ${hours} ساعة عمل.`,
            contact ? `للأمور العاجلة: ${contact}` : "",
            formal
              ? `مع التحية،\nفريق ${business}`
              : `نسعد بخدمتك 🌟\nفريق ${business}`,
          ]
        : [
            formal ? "Hello," : "Hi there 👋",
            `Thanks for contacting ${business}. We received your message and ${promise} within ${hours} business hours.`,
            contact ? `For urgent matters: ${contact}` : "",
            formal
              ? `Kind regards,\n${business} team`
              : `Happy to help 🌟\n${business} team`,
          ];
    const keywordsAr: Record<string, string> = {
      "order-status": "(طلب OR شحنة OR تتبع OR order)",
      "refund-request": "(استرجاع OR استرداد OR refund)",
      "price-quote": "(عرض سعر OR تسعير OR quote)",
      booking: "(حجز OR موعد OR booking)",
      "out-of-office": "-from:me",
      "job-applications": "(سيرة ذاتية OR وظيفة OR CV) has:attachment",
      "supplier-inquiry": "(مورد OR توريد OR supplier)",
      complaints: "(شكوى OR مشكلة OR complaint)",
      partnerships: "(شراكة OR تعاون OR partnership)",
      "invoice-request": "(فاتورة OR invoice)",
    };
    const saved = num(v, "daily") * 3 * 22;
    return {
      kpis: [
        kpi(
          "دقائق توفّرها شهرياً",
          "Minutes saved monthly",
          saved,
          "num",
          "good",
        ),
        kpi(
          "ساعات شهرياً",
          "Hours monthly",
          round(saved / 60, 1),
          "hours",
          "good",
        ),
      ],
      blocks: [
        { ar: "عنوان الرد", en: "Reply subject", lines: [subject] },
        {
          ar: "نص الرد التلقائي",
          en: "Auto-reply body",
          lines: body.filter(Boolean),
        },
        {
          ar: "استعلام فلتر Gmail",
          en: "Gmail filter query",
          lines: [keywordsAr[String(page.params.scenario)] ?? "is:unread"],
        },
        {
          ar: "خطوات التفعيل",
          en: "Setup steps",
          lines:
            lang === "ar"
              ? [
                  "Gmail ← الإعدادات ← عرض كل الإعدادات ← متقدم ← فعّل القوالب.",
                  "أنشئ قالباً بالنص أعلاه.",
                  "ابحث بالاستعلام ← أنشئ فلتراً ← إرسال قالب.",
                  "راجع الردود أسبوعياً وأبقِ الحالات المالية للمراجعة البشرية.",
                ]
              : [
                  "Gmail → Settings → See all settings → Advanced → enable Templates.",
                  "Create a template with the text above.",
                  "Search with the query → Create filter → Send template.",
                  "Review weekly; keep financial cases for human review.",
                ],
        },
      ],
    };
  },
};

const prompt: Engine = {
  id: "prompt",
  fields: () => [
    text("goal", "الهدف", "Goal", "مثال: وصف عطر عودي فاخر", 120),
    text("audience", "الجمهور", "Audience", "مثال: نساء 25–40 في الرياض", 80),
    select("tone", "النبرة", "Tone", [
      ["luxury", "فاخرة", "Luxury"],
      ["friendly", "ودّية", "Friendly"],
      ["expert", "خبيرة", "Expert"],
      ["playful", "مرحة", "Playful"],
    ]),
    select("format", "شكل المخرجات", "Output format", [
      ["bullets", "نقاط", "Bullets"],
      ["table", "جدول", "Table"],
      ["paragraphs", "فقرات", "Paragraphs"],
      ["json", "JSON", "JSON"],
    ]),
    number("words", "عدد الكلمات", "Word count", 20, 3000, 10),
    text("avoid", "تجنّب", "Avoid", "مبالغات، وعود طبية", 120),
  ],
  compute(v, page, lang) {
    const goal = str(v, "goal"),
      audience = str(v, "audience"),
      avoid = str(v, "avoid");
    const filled =
      ["goal", "audience", "avoid"].filter((k) => str(v, k)).length + 2;
    const role =
      lang === "ar" ? String(page.params.roleAr) : String(page.params.roleEn);
    const lines =
      lang === "ar"
        ? [
            `# الدور\nأنت ${role}.`,
            `# المهمة\n${goal || "[اكتب الهدف]"}`,
            `# الجمهور\n${audience || "[حدد الجمهور]"}`,
            `# النبرة\n${str(v, "tone")}`,
            `# القيود\n- الطول: نحو ${num(v, "words")} كلمة\n- اللغة: عربية فصحى سهلة\n- تجنّب: ${avoid || "الادعاءات غير المثبتة"}\n- إن نقصتك معلومة فاسأل قبل الكتابة`,
            `# شكل المخرجات\n${str(v, "format")}`,
            "# تحقق ذاتي\nقبل التسليم: راجع الدقة، أزل التكرار، وتأكد من الالتزام بالقيود.",
          ]
        : [
            `# Role\nYou are ${role}.`,
            `# Task\n${goal || "[describe the goal]"}`,
            `# Audience\n${audience || "[define the audience]"}`,
            `# Tone\n${str(v, "tone")}`,
            `# Constraints\n- Length: about ${num(v, "words")} words\n- Avoid: ${avoid || "unverified claims"}\n- Ask before writing if information is missing`,
            `# Output format\n${str(v, "format")}`,
            "# Self-check\nBefore answering: verify accuracy, remove repetition, confirm constraints.",
          ];
    const score = Math.round((filled / 5) * 100);
    return {
      kpis: [
        kpi(
          "اكتمال الأمر",
          "Prompt completeness",
          score,
          "pct",
          score >= 80 ? "good" : "warn",
        ),
        kpi("طول الأمر", "Prompt length", lines.join("\n").length, "num"),
      ],
      blocks: [{ ar: "الأمر الهيكلي الجاهز", en: "Structured prompt", lines }],
      verdictAr:
        "الأوامر المحددة الدور والقيود تعطي نتائج أدق وتقلل إعادة المحاولة.",
      verdictEn:
        "Prompts with a clear role and constraints produce more precise results.",
    };
  },
};

// ── Cluster 3 ───────────────────────────────────────────────────────────
const resFactor: Record<string, number> = {
  "1080": 1,
  "1440": 0.68,
  "2160": 0.38,
};
const qualityFactor: Record<string, number> = {
  low: 1.6,
  medium: 1.3,
  high: 1,
  ultra: 0.8,
};
const gpuSelect = () =>
  select(
    "gpu",
    "كرت الشاشة",
    "Graphics card",
    gpuOptions.map((g) => [g.value, g.label, g.label]),
  );
const cpuSelect = () =>
  select(
    "cpu",
    "المعالج",
    "Processor",
    cpuOptions.map((c) => [c.value, c.label, c.label]),
  );

export function estimateFps(input: {
  gpuFps: number;
  cpuFps: number;
  gpu: string;
  cpu: string;
  res: string;
  quality: string;
}) {
  const g = gpuOptions.find((x) => x.value === input.gpu) ?? gpuOptions[8];
  const c = cpuOptions.find((x) => x.value === input.cpu) ?? cpuOptions[5];
  const gpuLimited =
    input.gpuFps *
    (g.score / 100) *
    (resFactor[input.res] ?? 1) *
    (qualityFactor[input.quality] ?? 1);
  const cpuLimited = input.cpuFps * (c.score / 100);
  const fps = Math.min(gpuLimited, cpuLimited);
  const bottleneck =
    (Math.abs(gpuLimited - cpuLimited) / Math.max(gpuLimited, cpuLimited)) *
    100;
  return {
    fps,
    gpuLimited,
    cpuLimited,
    bottleneck,
    limiter: gpuLimited < cpuLimited ? "gpu" : "cpu",
  };
}

const fps: Engine = {
  id: "fps",
  fields: () => [
    cpuSelect(),
    gpuSelect(),
    select("res", "الدقة", "Resolution", [
      ["1080", "1080p", "1080p"],
      ["1440", "1440p", "1440p"],
      ["2160", "4K", "4K"],
    ]),
    select("quality", "إعدادات الرسوم", "Graphics preset", [
      ["low", "منخفض", "Low"],
      ["medium", "متوسط", "Medium"],
      ["high", "عالٍ", "High"],
      ["ultra", "فائق", "Ultra"],
    ]),
    number("hz", "معدل تحديث الشاشة", "Monitor refresh rate", 60, 500, 1, "Hz"),
  ],
  compute(v, page) {
    const base = {
      gpuFps: Number(page.params.gpuFps),
      cpuFps: Number(page.params.cpuFps),
      gpu: str(v, "gpu"),
      cpu: str(v, "cpu"),
      quality: str(v, "quality"),
    };
    const r = estimateFps({ ...base, res: str(v, "res") });
    const hz = num(v, "hz", 144);
    return {
      kpis: [
        kpi(
          "الإطارات المتوقعة",
          "Estimated FPS",
          Math.round(r.fps),
          "fps",
          r.fps >= 60 ? "good" : "bad",
        ),
        kpi(
          "حد كرت الشاشة",
          "GPU-limited FPS",
          Math.round(r.gpuLimited),
          "fps",
        ),
        kpi("حد المعالج", "CPU-limited FPS", Math.round(r.cpuLimited), "fps"),
        kpi(
          "نسبة عنق الزجاجة",
          "Bottleneck",
          round(r.bottleneck, 1),
          "pct",
          r.bottleneck > 25 ? "warn" : "good",
        ),
        kpi(
          "زمن الإطار",
          "Frame time",
          round(1000 / Math.max(r.fps, 1), 1),
          "ms",
        ),
      ],
      bars: ["1080", "1440", "2160"].map((res) =>
        bar(
          res === "2160" ? "4K" : `${res}p`,
          res === "2160" ? "4K" : `${res}p`,
          Math.round(estimateFps({ ...base, res }).fps),
          "fps",
        ),
      ),
      verdictAr:
        r.limiter === "gpu"
          ? `كرت الشاشة هو العامل المحدد؛ خفّض الإعدادات أو الدقة${r.fps < hz ? " للاقتراب من معدل تحديث شاشتك" : ""}.`
          : "المعالج هو العامل المحدد؛ رفع الدقة لن يخفض الإطارات كثيراً، وترقية المعالج أجدى.",
      verdictEn:
        r.limiter === "gpu"
          ? `The GPU is the limit; lower settings or resolution${r.fps < hz ? " to approach your refresh rate" : ""}.`
          : "The CPU is the limit; higher resolution costs little, a CPU upgrade helps more.",
      tone: r.bottleneck > 25 ? "warn" : "good",
    };
  },
};

export const quantBits: Record<string, number> = {
  fp16: 16,
  q8: 8.5,
  q6: 6.6,
  q5: 5.5,
  q4: 4.8,
};

export function localAiEstimate(input: {
  kind: string;
  params: number;
  refSeconds: number;
  quant: string;
  ctx: number;
  gpu: string;
  ram: number;
}) {
  const g = gpuOptions.find((x) => x.value === input.gpu) ?? gpuOptions[8];
  const bits = quantBits[input.quant] ?? 4.8;
  const weights = (input.params * bits) / 8;
  const kv =
    input.kind === "llm"
      ? (input.ctx * 0.04 * Math.sqrt(input.params)) / 1024
      : 0;
  const extra =
    input.kind === "image" ? 2.5 : input.kind === "audio" ? 0.6 : 0.8;
  const total = weights + kv + extra;
  const onGpu = Math.min(total, g.vram);
  const offloaded = Math.max(total - g.vram, 0);
  const fitsRam = offloaded <= input.ram * 0.7;
  const secondsPerToken = onGpu / (g.bandwidth * 0.7) + offloaded / 40;
  const tps = input.kind === "llm" && fitsRam ? 1 / secondsPerToken : 0;
  const imageSeconds =
    input.kind === "image"
      ? ((input.refSeconds * 100) / g.score) * (offloaded > 0 ? 3 : 1)
      : 0;
  const realtime =
    input.kind === "audio" ? ((15 * g.score) / 100) * (1.55 / input.params) : 0;
  return {
    total,
    weights,
    kv,
    offloaded,
    fits: offloaded === 0,
    fitsRam,
    tps,
    imageSeconds,
    realtime,
    vram: g.vram,
  };
}

const localAi: Engine = {
  id: "local-ai",
  fields: (page) => [
    gpuSelect(),
    select("quant", "التكميم (Quantization)", "Quantization", [
      ["q4", "Q4 (4-bit)", "Q4 (4-bit)"],
      ["q5", "Q5", "Q5"],
      ["q6", "Q6", "Q6"],
      ["q8", "Q8 (8-bit)", "Q8 (8-bit)"],
      ["fp16", "FP16 كامل الدقة", "FP16 full precision"],
    ]),
    ...(page.params.kind === "llm"
      ? [
          number(
            "ctx",
            "طول السياق",
            "Context length",
            512,
            131072,
            512,
            "tokens",
          ),
        ]
      : []),
    number("ram", "ذاكرة النظام RAM", "System RAM", 8, 512, 8, "GB"),
  ],
  compute(v, page) {
    const r = localAiEstimate({
      kind: String(page.params.kind),
      params: Number(page.params.params),
      refSeconds: Number(page.params.refSeconds || 0),
      quant: str(v, "quant"),
      ctx: num(v, "ctx", 4096),
      gpu: str(v, "gpu"),
      ram: num(v, "ram", 32),
    });
    const kind = page.params.kind;
    const speed =
      kind === "llm"
        ? kpi(
            "سرعة التوليد",
            "Generation speed",
            round(r.tps, 1),
            "tps",
            r.tps >= 15 ? "good" : r.tps >= 5 ? "warn" : "bad",
          )
        : kind === "image"
          ? kpi(
              "ثوانٍ لكل صورة",
              "Seconds per image",
              round(r.imageSeconds, 1),
              "sec",
              r.imageSeconds <= 15 ? "good" : "warn",
            )
          : kpi(
              "أسرع من الزمن الحقيقي",
              "Faster than realtime",
              round(r.realtime, 1),
              "x",
              r.realtime >= 1 ? "good" : "bad",
            );
    return {
      kpis: [
        kpi(
          "الذاكرة المطلوبة",
          "Memory required",
          round(r.total, 1),
          "gb",
          r.fits ? "good" : "warn",
        ),
        kpi("ذاكرة كرت الشاشة", "GPU VRAM", r.vram, "gb"),
        kpi(
          "الجزء المنقول للمعالج",
          "Offloaded to CPU",
          round(r.offloaded, 1),
          "gb",
          r.offloaded ? "warn" : "good",
        ),
        speed,
      ],
      bars: Object.keys(quantBits).map((q) =>
        bar(
          q.toUpperCase(),
          q.toUpperCase(),
          round(
            localAiEstimate({
              kind: String(page.params.kind),
              params: Number(page.params.params),
              refSeconds: Number(page.params.refSeconds || 0),
              quant: q,
              ctx: num(v, "ctx", 4096),
              gpu: str(v, "gpu"),
              ram: num(v, "ram", 32),
            }).total,
            1,
          ),
          "gb",
        ),
      ),
      verdictAr: !r.fitsRam
        ? "لا يتسع النموذج حتى مع النقل للذاكرة؛ اختر تكميماً أقل أو نموذجاً أصغر."
        : r.fits
          ? "يعمل النموذج بالكامل على كرت الشاشة."
          : "يعمل مع نقل جزء للمعالج؛ ستنخفض السرعة بوضوح.",
      verdictEn: !r.fitsRam
        ? "The model does not fit even with offload; pick a smaller quant or model."
        : r.fits
          ? "The model runs fully on the GPU."
          : "Runs with partial CPU offload; expect a clear slowdown.",
      tone: !r.fitsRam ? "bad" : r.fits ? "good" : "warn",
    };
  },
};

export const psuSizes = [450, 550, 650, 750, 850, 1000, 1200, 1300, 1600];
export function psuEstimate(
  cpuTdp: number,
  gpuTbp: number,
  drives: number,
  fans: number,
  oc: number,
  headroom: number,
) {
  const load = (cpuTdp + gpuTbp) * (1 + oc / 100) + 60 + drives * 8 + fans * 3;
  const target = load * (1 + headroom / 100);
  const size =
    psuSizes.find((s) => s >= target) ?? psuSizes[psuSizes.length - 1];
  return { load, target, size, loadPct: (load / size) * 100 };
}

const psu: Engine = {
  id: "psu",
  fields: () => [
    cpuSelect(),
    number("gpuTbp", "استهلاك كرت الشاشة", "GPU board power", 50, 700, 5, "W"),
    number("drives", "عدد أقراص التخزين", "Storage drives", 0, 12, 1),
    number("fans", "عدد المراوح", "Fans", 0, 16, 1),
    select("oc", "كسر السرعة", "Overclocking", [
      ["0", "بدون", "None"],
      ["10", "خفيف (+10%)", "Light (+10%)"],
      ["20", "قوي (+20%)", "Heavy (+20%)"],
    ]),
    number("headroom", "هامش الأمان", "Safety headroom", 10, 60, 5, "%"),
  ],
  compute(v) {
    const c =
      cpuOptions.find((x) => x.value === str(v, "cpu")) ?? cpuOptions[5];
    const r = psuEstimate(
      c.tdp,
      num(v, "gpuTbp"),
      num(v, "drives"),
      num(v, "fans"),
      num(v, "oc"),
      num(v, "headroom"),
    );
    return {
      kpis: [
        kpi("الحمل المتوقع", "Estimated load", Math.round(r.load), "w"),
        kpi("الحجم الموصى به", "Recommended PSU", r.size, "w", "good"),
        kpi(
          "نسبة الحمل على المزود",
          "Load on PSU",
          round(r.loadPct, 0),
          "pct",
          r.loadPct > 80 ? "warn" : "good",
        ),
      ],
      bars: [
        bar("المعالج", "CPU", c.tdp, "w"),
        bar("كرت الشاشة", "GPU", num(v, "gpuTbp"), "w"),
        bar("اللوحة والذاكرة", "Board & RAM", 60, "w"),
        bar(
          "الأقراص والمراوح",
          "Drives & fans",
          num(v, "drives") * 8 + num(v, "fans") * 3,
          "w",
        ),
      ],
      verdictAr:
        "اختر مزوداً بشهادة 80 Plus Gold على الأقل ويدعم ATX 3.x لكروت الجيل الحديث.",
      verdictEn:
        "Choose at least 80 Plus Gold and ATX 3.x for modern graphics cards.",
    };
  },
};

export function obsBitrate(input: {
  height: number;
  fps: number;
  encoder: string;
  motion: string;
  upload: number;
  max: number;
}) {
  const width = Math.round((input.height * 16) / 9);
  const bpp = input.motion === "high" ? 0.1 : 0.07;
  const eff: Record<string, number> = {
    x264: 1,
    nvenc: 1.05,
    hevc: 0.7,
    av1: 0.6,
  };
  const ideal =
    ((width * input.height * input.fps * bpp) / 1000) *
    (eff[input.encoder] ?? 1);
  const cap = Math.min(input.max, input.upload * 1000 * 0.75 - 160);
  const bitrate = Math.max(Math.min(ideal, cap), 500);
  return {
    width,
    ideal,
    bitrate,
    uploadPct: ((bitrate + 160) / (input.upload * 1000)) * 100,
    capped: ideal > cap,
  };
}

const obs: Engine = {
  id: "obs",
  fields: () => [
    number("upload", "سرعة الرفع", "Upload speed", 1, 1000, 1, "Mbps"),
    select("height", "الدقة", "Resolution", [
      ["720", "720p", "720p"],
      ["936", "936p", "936p"],
      ["1080", "1080p", "1080p"],
      ["1440", "1440p", "1440p"],
      ["2160", "4K", "4K"],
    ]),
    select("fps", "الإطارات", "Frame rate", [
      ["30", "30", "30"],
      ["60", "60", "60"],
    ]),
    select("encoder", "المرمّز", "Encoder", [
      ["x264", "x264 (المعالج)", "x264 (CPU)"],
      ["nvenc", "NVENC H.264", "NVENC H.264"],
      ["hevc", "HEVC", "HEVC"],
      ["av1", "AV1", "AV1"],
    ]),
    select("motion", "نوع المحتوى", "Content motion", [
      ["high", "ألعاب سريعة", "Fast games"],
      ["low", "محادثة وشاشة ثابتة", "Talk / static"],
    ]),
  ],
  compute(v, page) {
    const r = obsBitrate({
      height: num(v, "height", 1080),
      fps: num(v, "fps", 60),
      encoder: str(v, "encoder"),
      motion: str(v, "motion"),
      upload: num(v, "upload", 20),
      max: Number(page.params.max),
    });
    return {
      kpis: [
        kpi(
          "معدل البت الموصى به",
          "Recommended bitrate",
          Math.round(r.bitrate),
          "kbps",
          "good",
        ),
        kpi(
          "المعدل المثالي للجودة",
          "Ideal for quality",
          Math.round(r.ideal),
          "kbps",
        ),
        kpi(
          "استهلاك سرعة الرفع",
          "Upload used",
          round(r.uploadPct),
          "pct",
          r.uploadPct > 80 ? "bad" : "good",
        ),
        kpi("فاصل الإطار المفتاحي", "Keyframe interval", 2, "sec"),
      ],
      blocks: [
        {
          ar: "إعدادات OBS",
          en: "OBS settings",
          lines: [
            `Output resolution: ${r.width}×${num(v, "height", 1080)}`,
            `FPS: ${num(v, "fps", 60)}`,
            `Rate control: CBR · Bitrate: ${Math.round(r.bitrate)} Kbps`,
            "Keyframe interval: 2 s · Audio: AAC 160 Kbps 48 kHz",
            `Encoder: ${str(v, "encoder")} · Preset: Quality / P5`,
          ],
        },
      ],
      verdictAr: r.capped
        ? "سرعة الرفع أو حد المنصة يقيّد الجودة؛ خفّض الدقة إلى 720p60 أو 936p للحفاظ على الوضوح."
        : "سرعتك تكفي للجودة المثالية بهذه الإعدادات.",
      verdictEn: r.capped
        ? "Upload or platform limit caps quality; drop to 720p60 or 936p to keep clarity."
        : "Your upload supports ideal quality at these settings.",
      tone: r.capped ? "warn" : "good",
    };
  },
};

const refresh: Engine = {
  id: "refresh",
  widget: "refresh",
  fields: () => [
    number(
      "hz",
      "معدل تحديث الشاشة",
      "Display refresh rate",
      30,
      1000,
      1,
      "Hz",
    ),
    number("fps", "إطارات اللعبة", "Game FPS", 20, 1000, 1),
    number(
      "system",
      "زمن الإدخال والمعالجة",
      "Input + processing latency",
      1,
      100,
      1,
      "ms",
    ),
    number("display", "تأخير الشاشة", "Display processing lag", 0, 50, 1, "ms"),
  ],
  compute(v) {
    const hz = num(v, "hz", 144),
      fpsValue = num(v, "fps", 144);
    const frame = 1000 / hz;
    const render = 1000 / fpsValue;
    const total = num(v, "system") + render + num(v, "display") + frame / 2;
    return {
      kpis: [
        kpi("زمن تحديث الإطار", "Refresh interval", round(frame, 2), "ms"),
        kpi("زمن إطار اللعبة", "Game frame time", round(render, 2), "ms"),
        kpi(
          "التأخير الكلي التقريبي",
          "Approx. total latency",
          round(total, 1),
          "ms",
          total < 30 ? "good" : "warn",
        ),
        kpi(
          "إطارات تفوق الشاشة",
          "FPS above refresh",
          Math.max(Math.round(fpsValue - hz), 0),
          "fps",
        ),
      ],
      bars: [60, 144, 240, hz].map((r) =>
        bar(`${r}Hz`, `${r}Hz`, round(1000 / r, 2), "ms"),
      ),
      verdictAr:
        fpsValue < hz
          ? "الإطارات أقل من معدل التحديث؛ فعّل G-Sync/FreeSync وخفّض الإعدادات."
          : "الإطارات تغطي معدل التحديث؛ ثبّت حداً أعلى أقل بـ 3 إطارات مع VRR لتقليل التأخير.",
      verdictEn:
        fpsValue < hz
          ? "FPS is below refresh; enable G-Sync/FreeSync and lower settings."
          : "FPS covers refresh; cap 3 FPS below it with VRR for lower latency.",
    };
  },
};

const micEq: Engine = {
  id: "mic-eq",
  fields: () => [
    select("voice", "طبقة الصوت", "Voice type", [
      ["deep", "عميق", "Deep"],
      ["medium", "متوسط", "Medium"],
      ["high", "حاد", "High"],
    ]),
    select("room", "الغرفة", "Room", [
      ["treated", "معالجة صوتياً", "Treated"],
      ["normal", "غرفة عادية", "Normal room"],
      ["echo", "صدى عالٍ", "Echoey"],
    ]),
    select("noise", "الضجيج", "Background noise", [
      ["quiet", "هادئ", "Quiet"],
      ["fan", "مروحة أو مكيف", "Fan / AC"],
      ["street", "شارع", "Street"],
    ]),
    number("distance", "المسافة عن المايك", "Distance to mic", 2, 60, 1, "cm"),
  ],
  compute(v, page) {
    const kind = String(page.params.kind);
    const voice = str(v, "voice"),
      room = str(v, "room"),
      noise = str(v, "noise");
    const hpf =
      Number(page.params.hpf) +
      (voice === "deep" ? -10 : voice === "high" ? 20 : 0);
    const mud = room === "echo" ? -5 : room === "normal" ? -3 : -2;
    const presence = kind === "dynamic" ? 4 : kind === "condenser" ? 2 : 3;
    const air = kind === "dynamic" ? 2 : 0;
    const gate = noise === "street" ? -38 : noise === "fan" ? -45 : -55;
    const ratio = kind === "condenser" ? 3 : 4;
    return {
      kpis: [
        kpi("مرشح القطع المنخفض (Hz)", "High-pass filter (Hz)", hpf, "num"),
        kpi("عتبة بوابة الضجيج (dB)", "Noise gate threshold (dB)", gate, "num"),
        kpi("نسبة الضاغط", "Compressor ratio", `${ratio}:1`, "text"),
      ],
      bars: [
        bar("250–400Hz (تعكير)", "250–400Hz (mud)", mud, "num"),
        bar("3–5kHz (وضوح)", "3–5kHz (presence)", presence, "num"),
        bar("10kHz+ (هواء)", "10kHz+ (air)", air, "num"),
        bar("6–8kHz (صفير)", "6–8kHz (sibilance)", -3, "num"),
      ],
      blocks: [
        {
          ar: "سلسلة فلاتر OBS بالترتيب",
          en: "OBS filter chain in order",
          lines: [
            `1. Noise Suppression: RNNoise${noise === "quiet" ? " (optional)" : ""}`,
            `2. Noise Gate: close ${gate} dB / open ${gate + 6} dB`,
            `3. EQ: HPF ${hpf} Hz · ${mud} dB @ 300 Hz · +${presence} dB @ 4 kHz${air ? ` · +${air} dB @ 10 kHz` : ""}`,
            `4. Compressor: ratio ${ratio}:1 · threshold -18 dB · attack 6 ms · release 60 ms`,
            "5. Limiter: -1 dB",
            `Distance: ${num(v, "distance")} cm — ${kind === "dynamic" ? "keep 5–10 cm" : "keep 15–25 cm"}`,
          ],
        },
      ],
    };
  },
};

// ── Cluster 4 ───────────────────────────────────────────────────────────
const photoCost: Engine = {
  id: "photo-cost",
  fields: () => [
    number("products", "عدد المنتجات", "Number of products", 1, 2000, 1),
    number("angles", "الزوايا لكل منتج", "Angles per product", 1, 12, 1),
    number(
      "rate",
      "سعر الصورة الافتراضي",
      "Assumed price per photo",
      10,
      2000,
      5,
      "SAR",
    ),
    select("retouch", "مستوى الريتوش", "Retouching level", [
      ["0", "أساسي", "Basic"],
      ["30", "متقدم (+30%)", "Advanced (+30%)"],
      ["60", "فاخر (+60%)", "Premium (+60%)"],
    ]),
    number("lifestyle", "صور لايف ستايل", "Lifestyle shots", 0, 200, 1),
    select("rush", "سرعة التسليم", "Turnaround", [
      ["0", "عادي", "Standard"],
      ["25", "مستعجل (+25%)", "Rush (+25%)"],
    ]),
  ],
  compute(v) {
    const photos = num(v, "products") * num(v, "angles");
    const rate = num(v, "rate");
    const retouch = num(v, "retouch") / 100,
      rush = num(v, "rush") / 100;
    const base = photos * rate * (1 + retouch);
    const lifestyle = num(v, "lifestyle") * rate * 2.5;
    const total = (base + lifestyle) * (1 + rush);
    return {
      kpis: [
        kpi(
          "إجمالي الصور",
          "Total photos",
          photos + num(v, "lifestyle"),
          "num",
        ),
        kpi("التقدير الإجمالي", "Estimated total", round(total), "sar", "good"),
        kpi(
          "التكلفة لكل منتج",
          "Cost per product",
          round(total / Math.max(num(v, "products"), 1)),
          "sar",
        ),
        kpi(
          "المتوسط لكل صورة",
          "Average per photo",
          round(total / Math.max(photos + num(v, "lifestyle"), 1)),
          "sar",
        ),
      ],
      bars: [
        bar("صور المنتجات", "Product photos", round(base * (1 + rush)), "sar"),
        bar("لايف ستايل", "Lifestyle", round(lifestyle * (1 + rush)), "sar"),
      ],
      verdictAr:
        "هذا تقدير ذاتي بافتراضاتك. الأسعار الرسمية والباقات في متجر OneShot.",
      verdictEn:
        "This is a self-estimate with your assumptions. Official packages are in the OneShot store.",
    };
  },
};

export const cocBySensor: Record<string, number> = {
  ff: 0.03,
  apsc: 0.02,
  mft: 0.015,
};
export const cropBySensor: Record<string, number> = {
  ff: 1,
  apsc: 1.5,
  mft: 2,
};

export function depthOfField(
  focal: number,
  aperture: number,
  distanceM: number,
  sensor: string,
) {
  const c = cocBySensor[sensor] ?? 0.03;
  const f = focal,
    s = distanceM * 1000;
  const H = (f * f) / (aperture * c) + f;
  const near = (s * (H - f)) / (H + s - 2 * f);
  const far = s < H ? (s * (H - f)) / (H - s) : Infinity;
  return {
    hyperfocal: H / 1000,
    near: near / 1000,
    far: far / 1000,
    total: (far - near) / 1000,
  };
}

const exposure: Engine = {
  id: "exposure",
  fields: () => [
    number("focal", "البعد البؤري", "Focal length", 8, 800, 1, "mm"),
    number("aperture", "فتحة العدسة f/", "Aperture f/", 1, 32, 0.1),
    number(
      "distance",
      "المسافة عن الهدف",
      "Subject distance",
      0.1,
      500,
      0.1,
      "m",
    ),
    select("sensor", "حجم المستشعر", "Sensor size", [
      ["ff", "كامل الإطار", "Full frame"],
      ["apsc", "APS-C", "APS-C"],
      ["mft", "Micro 4/3", "Micro 4/3"],
    ]),
    number("shutter", "سرعة الغالق 1/x", "Shutter speed 1/x", 0.03, 8000, 1),
    number("iso", "ISO", "ISO", 50, 25600, 50),
  ],
  compute(v) {
    const focal = num(v, "focal", 50),
      aperture = num(v, "aperture", 8),
      distance = num(v, "distance", 1),
      sensor = str(v, "sensor") || "ff";
    const d = depthOfField(focal, aperture, distance, sensor);
    const t = 1 / Math.max(num(v, "shutter", 125), 0.001);
    const ev =
      Math.log2((aperture * aperture) / t) -
      Math.log2(num(v, "iso", 100) / 100);
    const safe = focal * (cropBySensor[sensor] ?? 1);
    const handheld = num(v, "shutter") >= safe;
    return {
      kpis: [
        kpi(
          "عمق الميدان (سم)",
          "Depth of field (cm)",
          Number.isFinite(d.total) ? round(d.total * 100, 1) : "∞",
          "text",
        ),
        kpi("أقرب نقطة حادة", "Near limit", round(d.near, 2), "m"),
        kpi(
          "أبعد نقطة حادة",
          "Far limit",
          Number.isFinite(d.far) ? round(d.far, 2) : "∞",
          "m",
        ),
        kpi(
          "المسافة فوق البؤرية",
          "Hyperfocal distance",
          round(d.hyperfocal, 2),
          "m",
        ),
        kpi("قيمة التعريض EV100", "Exposure EV100", round(ev, 1), "num"),
        kpi(
          "التصوير باليد",
          "Handheld safe",
          handheld ? "✓" : "✗",
          "text",
          handheld ? "good" : "warn",
        ),
      ],
      bars: [2.8, 5.6, 8, 11, 16].map((n) => {
        const r = depthOfField(focal, n, distance, sensor);
        return bar(
          `f/${n} (سم)`,
          `f/${n} (cm)`,
          Number.isFinite(r.total) ? round(r.total * 100, 1) : 99999,
          "num",
        );
      }),
      verdictAr: handheld
        ? "الغالق آمن للتصوير باليد. عمق الميدان بالسنتيمتر في المؤشر الأول."
        : `استخدم حامل ثلاثي أو سرعة 1/${Math.ceil(safe)} على الأقل لتجنب الاهتزاز.`,
      verdictEn: handheld
        ? "Shutter is handheld-safe. Depth of field is shown in centimetres."
        : `Use a tripod or at least 1/${Math.ceil(safe)} s to avoid shake.`,
      tone: handheld ? "good" : "warn",
    };
  },
};

export function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (
    "#" +
    [f(0), f(8), f(4)]
      .map((x) =>
        Math.round(x * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export function buildPalette(
  hue: number,
  saturation: number,
  harmony: string,
  shift: number,
): Swatch[] {
  const offsets: Record<string, number[]> = {
    analogous: [0, 18, -18, 36, 0],
    complementary: [0, 0, 180, 180, 0],
    monochrome: [0, 0, 0, 0, 0],
    triad: [0, 120, 240, 0, 0],
  };
  const lights = [14, 32, 52, 72, 94];
  const names = ["Ink", "Deep", "Signature", "Soft", "Canvas"];
  const o = offsets[harmony] ?? offsets.analogous;
  return lights.map((l, i) => {
    const h = (((hue + shift + o[i]) % 360) + 360) % 360;
    const s = i === 0 || i === 4 ? Math.min(saturation, 12) : saturation;
    const hex = hslToHex(h, s, l);
    return {
      name: names[i],
      hex,
      contrastOnDark: round(contrast(hex, "#101211"), 2),
      contrastOnLight: round(contrast(hex, "#ffffff"), 2),
    };
  });
}

const palette: Engine = {
  id: "palette",
  widget: "palette",
  fields: () => [
    number("hue", "درجة اللون الأساسية", "Base hue", 0, 359, 1, "°"),
    number(
      "saturation",
      "التشبع (منخفض = مريح)",
      "Saturation (low = calm)",
      5,
      70,
      1,
      "%",
    ),
    select("harmony", "التناغم", "Harmony", [
      ["analogous", "متجاور", "Analogous"],
      ["complementary", "متكامل", "Complementary"],
      ["monochrome", "أحادي", "Monochrome"],
      ["triad", "ثلاثي", "Triad"],
    ]),
    number("shift", "إزاحة دقيقة", "Fine shift", -30, 30, 1, "°"),
  ],
  compute(v) {
    const swatches = buildPalette(
      num(v, "hue"),
      num(v, "saturation", 25),
      str(v, "harmony"),
      num(v, "shift"),
    );
    const textContrast = contrast(swatches[0].hex, swatches[4].hex);
    const sat = num(v, "saturation", 25);
    return {
      kpis: [
        kpi(
          "تباين النص على الخلفية",
          "Text-on-canvas contrast",
          round(textContrast, 2),
          "x",
          textContrast >= 7 ? "good" : textContrast >= 4.5 ? "warn" : "bad",
        ),
        kpi(
          "مستوى الراحة البصرية",
          "Visual calm",
          sat <= 30
            ? "مريح / Calm"
            : sat <= 50
              ? "متوازن / Balanced"
              : "حاد / Loud",
          "text",
          sat <= 30 ? "good" : sat <= 50 ? "warn" : "bad",
        ),
      ],
      swatches,
      blocks: [
        {
          ar: "متغيرات CSS",
          en: "CSS variables",
          lines: swatches.map(
            (s) => `--brand-${s.name.toLowerCase()}: ${s.hex};`,
          ),
        },
      ],
      verdictAr:
        "التشبع أقل من 30% يعطي فخامة هادئة لا تُتعب العين؛ استخدم Signature للأزرار فقط.",
      verdictEn:
        "Saturation under 30% gives calm luxury; reserve Signature for buttons.",
    };
  },
};

const resizer: Engine = {
  id: "resizer",
  widget: "resizer",
  fields: () => [
    select("fit", "طريقة الملاءمة", "Fit mode", [
      ["cover", "ملء وقص", "Fill & crop"],
      ["contain", "احتواء بخلفية", "Contain with background"],
    ]),
    select("format", "صيغة التصدير", "Export format", [
      ["image/jpeg", "JPEG", "JPEG"],
      ["image/png", "PNG", "PNG"],
      ["image/webp", "WebP", "WebP"],
    ]),
    number("quality", "الجودة", "Quality", 50, 100, 1, "%"),
  ],
  compute(_v, page) {
    const sizes = JSON.parse(String(page.params.sizes)) as {
      name: string;
      w: number;
      h: number;
    }[];
    const biggest = sizes.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b));
    return {
      kpis: [
        kpi("عدد المقاسات", "Sizes", sizes.length, "num"),
        kpi("أكبر مقاس", "Largest size", `${biggest.w}×${biggest.h}`, "text"),
      ],
      bars: sizes.map((s) =>
        bar(s.name, s.name, round((s.w * s.h) / 1e6, 2), "num"),
      ),
    };
  },
};

export function roasPlan(input: {
  daily: number;
  days: number;
  cpc: number;
  cvr: number;
  aov: number;
  margin: number;
}) {
  const spend = input.daily * input.days;
  const clicks = input.cpc > 0 ? spend / input.cpc : 0;
  const orders = (clicks * input.cvr) / 100;
  const revenue = orders * input.aov;
  const roas = spend > 0 ? revenue / spend : 0;
  const breakEven = input.margin > 0 ? 100 / input.margin : Infinity;
  const profit = (revenue * input.margin) / 100 - spend;
  return {
    spend,
    clicks,
    orders,
    revenue,
    roas,
    breakEven,
    profit,
    cpa: orders > 0 ? spend / orders : 0,
  };
}

const roas: Engine = {
  id: "roas",
  fields: () => [
    number("daily", "الميزانية اليومية", "Daily budget", 10, 100000, 10, "SAR"),
    number("days", "مدة الحملة", "Campaign days", 1, 365, 1),
    number("cpc", "متوسط تكلفة النقرة", "Average CPC", 0.05, 100, 0.05, "SAR"),
    number("cvr", "معدل التحويل", "Conversion rate", 0.1, 30, 0.1, "%"),
    number(
      "aov",
      "متوسط قيمة الطلب",
      "Average order value",
      10,
      100000,
      10,
      "SAR",
    ),
    number("margin", "هامش الربح الإجمالي", "Gross margin", 1, 95, 1, "%"),
  ],
  compute(v) {
    const r = roasPlan({
      daily: num(v, "daily"),
      days: num(v, "days"),
      cpc: num(v, "cpc"),
      cvr: num(v, "cvr"),
      aov: num(v, "aov"),
      margin: num(v, "margin"),
    });
    const tone =
      r.roas >= r.breakEven * 1.3
        ? "good"
        : r.roas >= r.breakEven
          ? "warn"
          : "bad";
    return {
      kpis: [
        kpi("إجمالي الإنفاق", "Total spend", round(r.spend), "sar"),
        kpi("النقرات المتوقعة", "Expected clicks", Math.round(r.clicks), "num"),
        kpi("الطلبات المتوقعة", "Expected orders", round(r.orders, 1), "num"),
        kpi("الإيراد المتوقع", "Expected revenue", round(r.revenue), "sar"),
        kpi("ROAS", "ROAS", round(r.roas, 2), "x", tone),
        kpi(
          "ROAS التعادل",
          "Break-even ROAS",
          Number.isFinite(r.breakEven) ? round(r.breakEven, 2) : "∞",
          "x",
        ),
        kpi(
          "صافي الربح بعد الإعلان",
          "Profit after ads",
          round(r.profit),
          "sar",
          r.profit >= 0 ? "good" : "bad",
        ),
        kpi("تكلفة الطلب CPA", "Cost per order", round(r.cpa, 2), "sar"),
      ],
      bars: [
        bar("الإنفاق", "Spend", round(r.spend), "sar"),
        bar("الإيراد", "Revenue", round(r.revenue), "sar"),
        bar(
          "الربح الإجمالي",
          "Gross profit",
          round((r.revenue * num(v, "margin")) / 100),
          "sar",
        ),
      ],
      verdictAr:
        tone === "good"
          ? "الحملة مربحة بهامش أمان؛ وسّع الميزانية 20% أسبوعياً مع المراقبة."
          : tone === "warn"
            ? "قريبة من التعادل؛ حسّن صفحة الهبوط والصور قبل رفع الميزانية."
            : "الحملة تخسر وفق افتراضاتك؛ ارفع التحويل أو متوسط الطلب أولاً.",
      verdictEn:
        tone === "good"
          ? "Profitable with a safety margin; scale budget 20% weekly while monitoring."
          : tone === "warn"
            ? "Near break-even; improve landing page and creatives before scaling."
            : "Loses money under your assumptions; lift conversion or order value first.",
      tone,
    };
  },
};

// ── Cluster 5 ───────────────────────────────────────────────────────────
export function workforceRoi(input: {
  salary: number;
  overhead: number;
  hiring: number;
  headcount: number;
  shifts: number;
  share: number;
  ai: number;
  setup: number;
}) {
  const traditional =
    input.salary * (1 + input.overhead / 100) * input.headcount * input.shifts;
  const replaced = (traditional * input.share) / 100;
  const aiCost = input.ai * input.headcount;
  const monthly = replaced - aiCost;
  const yearly =
    monthly * 12 +
    input.hiring * input.headcount * input.shifts * (input.share / 100) -
    input.setup;
  const payback = monthly > 0 ? input.setup / monthly : Infinity;
  return { traditional, replaced, aiCost, monthly, yearly, payback };
}

const employeeRoi: Engine = {
  id: "employee-roi",
  fields: () => [
    number(
      "salary",
      "الراتب الشهري للموظف",
      "Monthly salary",
      1000,
      100000,
      100,
      "SAR",
    ),
    number(
      "overhead",
      "التكاليف الإضافية (تأمينات، تأمين طبي، بدلات)",
      "Overhead (insurance, medical, allowances)",
      0,
      100,
      1,
      "%",
    ),
    number(
      "hiring",
      "تكلفة التوظيف والتدريب لمرة واحدة",
      "One-off hiring & training",
      0,
      100000,
      100,
      "SAR",
    ),
    number("headcount", "عدد الموظفين", "Headcount", 1, 200, 1),
    select("shifts", "ساعات التغطية", "Coverage", [
      ["1", "8 ساعات", "8 hours"],
      ["2", "16 ساعة", "16 hours"],
      ["3", "24/7", "24/7"],
    ]),
    number(
      "share",
      "حصة العمل التي يتولاها الذكاء",
      "Workload share handled by AI",
      0,
      100,
      5,
      "%",
    ),
    number(
      "ai",
      "اشتراك الموظف الذكي الشهري (افتراض)",
      "AI employee monthly (assumption)",
      0,
      50000,
      50,
      "SAR",
    ),
    number(
      "setup",
      "تكلفة الإعداد لمرة واحدة (افتراض)",
      "One-off setup (assumption)",
      0,
      100000,
      100,
      "SAR",
    ),
  ],
  compute(v) {
    const r = workforceRoi({
      salary: num(v, "salary"),
      overhead: num(v, "overhead"),
      hiring: num(v, "hiring"),
      headcount: num(v, "headcount", 1),
      shifts: num(v, "shifts", 1),
      share: num(v, "share"),
      ai: num(v, "ai"),
      setup: num(v, "setup"),
    });
    return {
      kpis: [
        kpi(
          "التكلفة التقليدية شهرياً",
          "Traditional monthly cost",
          round(r.traditional),
          "sar",
        ),
        kpi(
          "الجزء الذي يتولاه الذكاء",
          "Cost of AI-handled share",
          round(r.replaced),
          "sar",
        ),
        kpi(
          "تكلفة الموظف الذكي شهرياً",
          "AI employee monthly",
          round(r.aiCost),
          "sar",
        ),
        kpi(
          "التوفير الشهري",
          "Monthly savings",
          round(r.monthly),
          "sar",
          r.monthly >= 0 ? "good" : "bad",
        ),
        kpi(
          "التوفير في السنة الأولى",
          "First-year savings",
          round(r.yearly),
          "sar",
          r.yearly >= 0 ? "good" : "bad",
        ),
        kpi(
          "فترة الاسترداد",
          "Payback period",
          Number.isFinite(r.payback) ? round(r.payback, 1) : "—",
          "text",
        ),
      ],
      bars: [
        bar("تقليدي", "Traditional", round(r.traditional), "sar"),
        bar(
          "مختلط (بشري + ذكي)",
          "Hybrid (human + AI)",
          round(r.traditional - r.replaced + r.aiCost),
          "sar",
        ),
      ],
      verdictAr:
        r.monthly > 0
          ? "النموذج المختلط يوفّر وفق افتراضاتك؛ أبقِ الإشراف البشري على القرارات الحساسة."
          : "لا يظهر توفير بهذه الافتراضات؛ زد حصة المهام المؤتمتة أو راجع التكلفة.",
      verdictEn:
        r.monthly > 0
          ? "The hybrid model saves money under your assumptions; keep human oversight of sensitive decisions."
          : "No saving under these assumptions; increase the automated share or revisit cost.",
      tone: r.monthly > 0 ? "good" : "bad",
    };
  },
};

export const engines: Record<EngineId, Engine> = {
  "gateway-fees": gatewayFees,
  bnpl,
  margin,
  vat,
  conversion,
  inbox,
  "yt-rpm": ytRpm,
  "yt-seo": ytSeo,
  sheets,
  gmail,
  prompt,
  fps,
  "local-ai": localAi,
  psu,
  obs,
  refresh,
  "mic-eq": micEq,
  "photo-cost": photoCost,
  exposure,
  palette,
  resizer,
  roas,
  "employee-roi": employeeRoi,
};

export function runEngine(
  page: ToolPage,
  values: Values,
  lang: Lang,
): EngineResult {
  return engines[page.engine].compute(
    { ...page.defaults, ...values },
    page,
    lang,
  );
}
