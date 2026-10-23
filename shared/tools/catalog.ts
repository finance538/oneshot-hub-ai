// Builds the 500-page matrix deterministically from entity data. The same
// list drives routes, pre-rendered HTML, the sitemap, search and telemetry.
import type { ClusterId, EngineId, Faq, ToolPage, Values } from "./types.ts";
import {
  adIndustries,
  adPlatforms,
  bnplCategories,
  bnplProviders,
  exposureScenarios,
  games,
  gateways,
  gmailScenarios,
  gpuOptions,
  inboxRoles,
  localModels,
  micTypes,
  obsTargets,
  paletteIndustries,
  photoCategories,
  platforms,
  productCategories,
  promptUseCases,
  psuBuilds,
  refreshRates,
  resizePlatforms,
  sheetsTasks,
  storeTypes,
  vatBusinesses,
  workforceIndustries,
  workforceRoles,
  youtubeNiches,
} from "./entities.ts";

type Draft = Omit<ToolPage, "related" | "cluster" | "engine"> & {
  cluster?: ClusterId;
  engine?: EngineId;
};

const sar = (n: number) => `${n.toLocaleString("en-US")} SAR`;
const offlineFaq: Faq = {
  qAr: "هل الحاسبة مجانية وتعمل على جهازي؟",
  aAr: "نعم. كل الحسابات تجري داخل متصفحك دون إرسال الأرقام التي تدخلها إلى أي خادم، وتبقى متاحة مجاناً.",
  qEn: "Is the tool free and does it run on my device?",
  aEn: "Yes. Every calculation runs in your browser; the numbers you type are not sent to a server.",
};
const assumptionsFaq: Faq = {
  qAr: "هل الأرقام الافتراضية أسعار رسمية؟",
  aAr: "لا. القيم الافتراضية نقطة بداية استرشادية قابلة للتعديل، وليست عرض سعر أو وعداً بنتيجة. راجع عقدك أو مزوّدك للأرقام النهائية.",
  qEn: "Are the default numbers official prices?",
  aEn: "No. Defaults are editable starting assumptions, not quotes or promised results. Confirm final numbers with your provider.",
};

function page(
  cluster: ClusterId,
  engine: EngineId,
  d: Omit<Draft, "cluster" | "engine">,
): Omit<ToolPage, "related"> {
  return { ...d, cluster, engine, faq: [...d.faq, offlineFaq] };
}

const all: Omit<ToolPage, "related">[] = [];
const add = (p: Omit<ToolPage, "related">) => all.push(p);

// ── Cluster 1: e-commerce (100) ─────────────────────────────────────────
for (const g of gateways)
  for (const pl of platforms)
    add(
      page("ecommerce", "gateway-fees", {
        slug: `${g.id}-fees-${pl.id}`,
        titleAr: `حاسبة رسوم ${g.ar} لمتاجر ${pl.ar} وصافي التحويل`,
        titleEn: `${g.en} fee calculator for ${pl.en} stores`,
        descriptionAr: `احسب رسوم ${g.ar} لكل طلب وشهرياً وصافي ما يصلك في متجر ${pl.ar}، وقارنها ببوابات الدفع الأخرى، مع خطوات الربط الآمن.`,
        descriptionEn: `Calculate ${g.en} fees per order and per month, your net payout on ${pl.en}, and compare with other gateways.`,
        introAr: `أدخل متوسط قيمة الطلب وعدد الطلبات لتعرف كم تقتطع ${g.ar} من مبيعات متجرك على ${pl.ar}، وما النسبة الفعلية بعد الرسم الثابت والاسترجاعات.`,
        introEn: `Enter your order value and volume to see what ${g.en} takes from your ${pl.en} sales after fixed fees and refunds.`,
        guideAr: [
          `${g.noteAr} الوسائل الشائعة: ${g.methodsAr}. مدة التسوية الاسترشادية نحو ${g.settleDays} أيام عمل وقد تختلف حسب تصنيف منشأتك.`,
          `خطوات الربط في ${pl.ar}: ${pl.setupAr}`,
          "الأمان أولاً: لا تجمع رقم البطاقة أو رمز CVV في متجرك، واعتمد صفحة الدفع المستضافة أو أدوات المزوّد الرسمية مع التحقق ثلاثي الأبعاد 3D Secure، ولا تؤكد الطلب إلا بعد إشعار دفع موثّق.",
          "النسبة الفعلية هي ما يهمك: الرسم الثابت يرفع التكلفة على الطلبات الصغيرة، لذا قد يكون لمدى أو المحافظ أثر أكبر على هامشك من خصم بسيط في النسبة.",
        ],
        guideEn: [
          `${g.noteEn} Indicative settlement is about ${g.settleDays} business days.`,
          `Setup on ${pl.en}: ${pl.setupEn}`,
          "Never collect card numbers or CVV yourself; use hosted checkout with 3D Secure and confirm orders only after a verified payment notification.",
        ],
        keywords: [
          `رسوم ${g.ar}`,
          `${g.ar} ${pl.ar}`,
          `ربط ${g.ar}`,
          `${g.en} fees`,
          `${g.en} ${pl.en}`,
          "بوابات الدفع",
        ],
        faq: [
          {
            qAr: `كم رسوم ${g.ar} في ${pl.ar}؟`,
            aAr: `القيمة الافتراضية هنا ${g.pct}%${g.fixed ? ` + ${g.fixed} ريال` : ""} لكل عملية كنقطة بداية. الرسوم الفعلية يحددها عقدك مع المزوّد وقد تختلف حسب الحجم ونوع البطاقة.`,
            qEn: `What are ${g.en} fees on ${pl.en}?`,
            aEn: `The editable default is ${g.pct}%${g.fixed ? ` + SAR ${g.fixed}` : ""} per transaction; your contract sets the actual fee.`,
          },
          {
            qAr: `متى تصل أموال ${g.ar} إلى حسابي؟`,
            aAr: `استرشادياً خلال ${g.settleDays} أيام عمل تقريباً بعد العملية، وقد تُحجز مبالغ احتياطية للمتاجر الجديدة.`,
            qEn: `When does ${g.en} settle?`,
            aEn: `Indicatively about ${g.settleDays} business days; new merchants may have reserves.`,
          },
          {
            qAr: `هل أحتاج سجلاً تجارياً لتفعيل ${g.ar}؟`,
            aAr: "غالباً نعم، أو وثيقة عمل حر حسب المزوّد، مع حساب بنكي باسم المنشأة.",
            qEn: "Do I need a commercial registration?",
            aEn: "Usually yes, or a freelance document, plus a business bank account.",
          },
          assumptionsFaq,
        ],
        table: {
          headAr: ["البوابة", "النسبة الافتراضية", "الرسم الثابت", "التسوية"],
          headEn: ["Gateway", "Default %", "Fixed fee", "Settlement"],
          rows: gateways.map((x) => [
            x.ar,
            `${x.pct}%`,
            `${x.fixed} SAR`,
            `${x.settleDays}d`,
          ]),
        },
        defaults: {
          order: 250,
          orders: 400,
          pct: g.pct,
          fixed: g.fixed,
          refunds: 3,
          platform: 0,
        },
        params: { gateway: g.id, platform: pl.id },
      }),
    );

for (const b of bnplProviders)
  for (const c of bnplCategories)
    add(
      page("ecommerce", "bnpl", {
        slug: `${b.id}-${c.id}-calculator`,
        titleAr: `حاسبة ربح التقسيط عبر ${b.ar} لمتاجر ${c.ar}`,
        titleEn: `${b.en} BNPL profit calculator for ${c.en} stores`,
        descriptionAr: `هل يستحق ${b.ar} عمولته في متجر ${c.ar}؟ احسب الرسوم مقابل زيادة السلة والطلبات وصافي الربح الإضافي.`,
        descriptionEn: `Is ${b.en} worth its fee for a ${c.en} store? Weigh fees against basket and order uplift.`,
        introAr: `التقسيط يرفع متوسط السلة لكنه يكلّف أعلى من مدى. أدخل أرقام متجر ${c.ar} لترى النقطة التي يصبح فيها ${b.ar} مربحاً.`,
        introEn: `BNPL lifts baskets but costs more than Mada. Enter your ${c.en} numbers to find where ${b.en} pays off.`,
        guideAr: [
          `${b.ar} يدفع لك قيمة الطلب ويتحمل تحصيل الأقساط من العميل مقابل عمولة على التاجر. القيمة الافتراضية ${b.pct}% + ${b.fixed} ريال استرشادية.`,
          `في فئة ${c.ar} بمتوسط سعر نحو ${sar(c.price)}، يرتفع أثر التقسيط كلما ارتفع السعر لأن العميل يرى قسطاً أصغر.`,
          "اعرض شارة التقسيط في صفحة المنتج وليس في السلة فقط، وحدد حداً أدنى للطلب حتى لا تأكل العمولة هامش المنتجات الرخيصة.",
        ],
        guideEn: [
          `${b.en} pays you upfront and collects instalments for a merchant fee (default ${b.pct}% + SAR ${b.fixed}, indicative).`,
          "Show the instalment badge on product pages and set a minimum order so fees don't consume margins on cheap items.",
        ],
        keywords: [
          `${b.ar}`,
          `${b.ar} للتجار`,
          `عمولة ${b.ar}`,
          `تقسيط ${c.ar}`,
          `${b.en} merchant fee`,
        ],
        faq: [
          {
            qAr: `كم عمولة ${b.ar} على التاجر؟`,
            aAr: `نستخدم ${b.pct}% + ${b.fixed} ريال كافتراض قابل للتعديل؛ العمولة الفعلية حسب عقدك.`,
            qEn: `What does ${b.en} charge merchants?`,
            aEn: `We assume ${b.pct}% + SAR ${b.fixed}, editable; your contract decides.`,
          },
          {
            qAr: "هل يتحمل التاجر خطر عدم السداد؟",
            aAr: "في نموذج التقسيط الشائع يتحمل المزوّد التحصيل، لكن راجع شروط الاسترجاع والنزاعات في العقد.",
            qEn: "Who carries non-payment risk?",
            aEn: "Typically the provider, but review refund and dispute terms.",
          },
          assumptionsFaq,
        ],
        table: {
          headAr: ["المزوّد", "العمولة الافتراضية", "الرسم الثابت"],
          headEn: ["Provider", "Default fee", "Fixed"],
          rows: bnplProviders.map((x) => [x.ar, `${x.pct}%`, `${x.fixed} SAR`]),
        },
        defaults: {
          aov: c.price,
          orders: 300,
          share: 25,
          pct: b.pct,
          fixed: b.fixed,
          aovLift: 20,
          convLift: 10,
          margin: 40,
        },
        params: { provider: b.id, category: c.id },
      }),
    );

for (const c of productCategories)
  add(
    page("ecommerce", "margin", {
      slug: `profit-margin-${c.id}`,
      titleAr: `حاسبة هامش الربح وضريبة القيمة المضافة لمتاجر ${c.ar}`,
      titleEn: `Profit margin & VAT calculator for ${c.en}`,
      descriptionAr: `احسب صافي ربح كل طلب في ${c.ar} بعد ضريبة 15% والشحن ورسوم الدفع والإعلان والمرتجعات، واعرف ROAS التعادل والسعر المقترح.`,
      descriptionEn: `Net profit per ${c.en} order after 15% VAT, shipping, payment fees, ads and returns, with break-even ROAS.`,
      introAr: `كثير من متاجر ${c.ar} تبيع بخسارة دون أن تعلم لأن الضريبة ورسوم الدفع تُحسب من السعر الشامل. هذه الحاسبة تفصّل كل ريال.`,
      introEn: `Many ${c.en} stores lose money unknowingly because VAT and fees come out of the gross price. This breaks down every riyal.`,
      guideAr: [
        `السعر الذي يدفعه العميل في السعودية يشمل ضريبة القيمة المضافة 15%، لذا فإن ${sar(c.price)} تعني إيراداً صافياً نحو ${sar(Math.round(c.price / 1.15))} قبل أي تكاليف.`,
        `نسبة المرتجعات في ${c.ar} تقديرياً ${c.returns}%؛ كل مرتجع يكلّف شحناً مضاعفاً على الأقل.`,
        "ROAS التعادل هو الحد الأدنى لعائد الإعلان كي لا تخسر: إن كان 3x فكل ريال إعلان يجب أن يجلب 3 ريالات مبيعات على الأقل.",
      ],
      guideEn: [
        "Saudi consumer prices include 15% VAT, so revenue before costs is price ÷ 1.15.",
        "Break-even ROAS is the minimum ad return to avoid losses on each order.",
      ],
      keywords: [
        `هامش ربح ${c.ar}`,
        `حساب الربح ${c.ar}`,
        "حاسبة ضريبة القيمة المضافة",
        `${c.en} profit margin`,
        "break-even ROAS",
      ],
      faq: [
        {
          qAr: `ما هامش الربح الجيد في ${c.ar}؟`,
          aAr: "يختلف حسب الفئة، لكن هامشاً صافياً فوق 15% بعد الإعلان يمنح مساحة آمنة للتوسع.",
          qEn: `What is a good ${c.en} margin?`,
          aEn: "A net margin above 15% after ads gives safe room to scale.",
        },
        {
          qAr: "هل أخصم ضريبة المدخلات من التكلفة؟",
          aAr: "إن كنت مسجلاً في الضريبة يمكنك استرداد ضريبة المدخلات؛ أدخل التكلفة قبل الضريبة في هذه الحالة.",
          qEn: "Should cost include input VAT?",
          aEn: "If VAT-registered, enter cost excluding recoverable input VAT.",
        },
        assumptionsFaq,
      ],
      table: {
        headAr: ["الفئة", "تكلفة افتراضية", "سعر افتراضي", "المرتجعات"],
        headEn: ["Category", "Default cost", "Default price", "Returns"],
        rows: productCategories
          .slice(0, 10)
          .map((x) => [x.ar, `${x.cost}`, `${x.price}`, `${x.returns}%`]),
      },
      defaults: {
        cost: c.cost,
        price: c.price,
        shipping: 25,
        pct: 2.5,
        ad: Math.round(c.price * 0.15),
        returns: c.returns,
        target: 25,
      },
      params: { category: c.id },
    }),
  );

for (const b of vatBusinesses)
  add(
    page("ecommerce", "vat", {
      slug: `vat-calculator-${b.id}`,
      titleAr: `حاسبة ضريبة القيمة المضافة 15% لـ${b.ar}`,
      titleEn: `Saudi 15% VAT calculator for ${b.en}`,
      descriptionAr: `استخرج الضريبة من المبلغ الشامل أو أضفها، واحسب صافي الضريبة المستحقة شهرياً وربعياً وحالة التسجيل لـ${b.ar}.`,
      descriptionEn: `Extract or add 15% VAT, estimate net VAT payable monthly and quarterly, and check registration status for ${b.en}.`,
      introAr: `أداة سريعة لـ${b.ar}: المبلغ قبل الضريبة وبعدها، وضريبة المخرجات مقابل المدخلات، ومتى يصبح التسجيل إلزامياً.`,
      introEn: `A quick VAT tool for ${b.en}: net and gross, output vs input VAT, and when registration becomes mandatory.`,
      guideAr: [
        "نسبة ضريبة القيمة المضافة الأساسية في السعودية 15%. لاستخراجها من مبلغ شامل: الضريبة = المبلغ − المبلغ ÷ 1.15.",
        "حد التسجيل الإلزامي 375,000 ريال من التوريدات السنوية، والاختياري 187,500 ريال. راجع هيئة الزكاة والضريبة والجمارك للحالات الخاصة والإعفاءات.",
        `في ${b.ar} احتفظ بفواتير المشتريات الضريبية لأن ضريبة المدخلات تُخصم من المستحق، وأصدر فواتير إلكترونية متوافقة مع متطلبات الفوترة.`,
      ],
      guideEn: [
        "Saudi standard VAT is 15%. VAT in an inclusive amount = amount − amount ÷ 1.15.",
        "Mandatory registration starts at SAR 375,000 annual supplies; voluntary from SAR 187,500. Check ZATCA for special cases.",
      ],
      keywords: [
        "حاسبة الضريبة",
        "ضريبة القيمة المضافة 15",
        `ضريبة ${b.ar}`,
        "استخراج الضريبة من المبلغ",
        "Saudi VAT calculator",
      ],
      faq: [
        {
          qAr: "كيف أستخرج الضريبة من مبلغ شامل؟",
          aAr: "اقسم المبلغ على 1.15 لتحصل على الصافي، والفرق هو الضريبة.",
          qEn: "How do I extract VAT?",
          aEn: "Divide by 1.15 for the net; the difference is VAT.",
        },
        {
          qAr: "متى يجب التسجيل في الضريبة؟",
          aAr: "عند تجاوز التوريدات السنوية 375,000 ريال أو توقع تجاوزها خلال 12 شهراً.",
          qEn: "When must I register?",
          aEn: "When annual supplies exceed or are expected to exceed SAR 375,000.",
        },
        {
          qAr: "هل هذه استشارة ضريبية؟",
          aAr: "لا، هي أداة حسابية. للحالات الخاصة راجع محاسباً معتمداً أو الهيئة.",
          qEn: "Is this tax advice?",
          aEn: "No, it is a calculator; consult an accountant for special cases.",
        },
      ],
      table: {
        headAr: ["المبلغ الشامل", "قبل الضريبة", "الضريبة"],
        headEn: ["Gross", "Net", "VAT"],
        rows: [115, 230, 575, 1150, 11500].map((x) => [
          `${x}`,
          `${(x / 1.15).toFixed(2)}`,
          `${(x - x / 1.15).toFixed(2)}`,
        ]),
      },
      defaults: {
        amount: 1150,
        mode: "inclusive",
        rate: 15,
        sales: 40000,
        purchases: 15000,
      },
      params: { business: b.id },
    }),
  );

for (const s of storeTypes)
  add(
    page("ecommerce", "conversion", {
      slug: `conversion-audit-${s.id}`,
      titleAr: `مدقق معدل التحويل لـ${s.ar}: كم تخسر من الزوار؟`,
      titleEn: `Conversion audit for a ${s.en}`,
      descriptionAr: `قيّم جاهزية ${s.ar} للتحويل عبر 8 عناصر حاسمة، واعرف الإيراد الإضافي المحتمل وأولويات الإصلاح.`,
      descriptionEn: `Score your ${s.en} on 8 conversion essentials and see the potential revenue and fix priorities.`,
      introAr: `معدل التحويل المعتاد في ${s.ar} نحو ${s.cr}% كافتراض. أجب عن قائمة التحقق لترى أين تتسرب المبيعات.`,
      introEn: `A typical ${s.en} converts around ${s.cr}% (assumption). Answer the checklist to find the leaks.`,
      guideAr: [
        "السرعة على الجوال، وسائل الدفع المحلية، والصور الاحترافية هي أكبر ثلاثة عوامل أثراً في المتاجر السعودية.",
        `في ${s.ar} بمتوسط طلب ${sar(s.aov)}، كل 0.1% تحسّن في التحويل يساوي مبيعات إضافية ملموسة شهرياً.`,
        "الأوزان المستخدمة افتراضات نسبية لترتيب الأولويات وليست ضماناً لنتيجة؛ اختبر كل تغيير على حدة.",
      ],
      guideEn: [
        "Mobile speed, local payment methods and professional photos are the highest-impact factors.",
        "Weights are relative assumptions for prioritisation, not guaranteed outcomes.",
      ],
      keywords: [
        `معدل التحويل ${s.ar}`,
        "تحسين التحويل",
        "تدقيق المتجر",
        `${s.en} conversion rate`,
        "CRO",
      ],
      faq: [
        {
          qAr: `ما معدل التحويل الجيد لـ${s.ar}؟`,
          aAr: `الافتراض هنا ${s.cr}%، وتختلف المعدلات حسب مصدر الزيارات والسعر والموسم.`,
          qEn: "What is a good conversion rate?",
          aEn: `We assume ${s.cr}%; it varies with traffic source, price and season.`,
        },
        {
          qAr: "بماذا أبدأ؟",
          aAr: "ابدأ بالعنصر الأعلى أثراً في قائمة الأولويات، ثم قِس أسبوعين قبل التغيير التالي.",
          qEn: "Where do I start?",
          aEn: "Fix the top-impact item, measure two weeks, then the next.",
        },
        assumptionsFaq,
      ],
      table: {
        headAr: ["نوع المتجر", "تحويل افتراضي", "متوسط الطلب"],
        headEn: ["Store", "Default CR", "AOV"],
        rows: storeTypes.map((x) => [x.ar, `${x.cr}%`, `${x.aov}`]),
      },
      defaults: {
        visitors: s.visitors,
        cr: s.cr,
        aov: s.aov,
        speed: "no",
        local: "yes",
        bnpl: "no",
        photos: "no",
        reviews: "yes",
        shipping: "no",
        whatsapp: "yes",
        returns: "no",
      },
      params: { store: s.id },
    }),
  );

// ── Cluster 2: Google & AI (100) ────────────────────────────────────────
for (const r of inboxRoles)
  add(
    page("google-ai", "inbox", {
      slug: `inbox-time-saver-${r.id}`,
      titleAr: `حاسبة توفير وقت البريد بالذكاء الاصطناعي لـ${r.ar}`,
      titleEn: `AI inbox time-savings calculator for a ${r.en}`,
      descriptionAr: `كم ساعة يقضيها ${r.ar} في Gmail؟ احسب الوقت والمال الموفّرين شهرياً وسنوياً عند أتمتة الردود المتكررة.`,
      descriptionEn: `How many hours does a ${r.en} spend in Gmail? Calculate time and money saved by automating repetitive replies.`,
      introAr: `بافتراض ${r.emails} رسالة يومياً و${r.minutes} دقائق لكل رسالة، يقضي ${r.ar} وقتاً كبيراً في البريد. عدّل الأرقام لترى أثر الأتمتة.`,
      introEn: `Assuming ${r.emails} emails a day at ${r.minutes} minutes each, a ${r.en} spends a lot of time in email.`,
      guideAr: [
        "الأتمتة الآمنة تبدأ بالتصنيف والقوالب والمسودات المقترحة، لا بالإرسال التلقائي لكل شيء.",
        `لـ${r.ar}: صنّف الرسائل إلى استفسارات متكررة، طلبات تحتاج قراراً، ورسائل حساسة. أتمت الأولى وأبقِ الأخيرتين للمراجعة.`,
        "قِس النتيجة بعد أسبوعين: زمن الرد الأول، عدد الرسائل المغلقة، ورضا العملاء.",
      ],
      guideEn: [
        "Safe automation starts with labels, templates and suggested drafts, not auto-sending everything.",
        "Measure first-response time and resolved threads after two weeks.",
      ],
      keywords: [
        `أتمتة البريد ${r.ar}`,
        "توفير الوقت Gmail",
        "رد آلي Gmail",
        "AI email assistant",
        `${r.en} email automation`,
      ],
      faq: [
        {
          qAr: "هل يرسل الذكاء الاصطناعي الرسائل دون موافقتي؟",
          aAr: "في OneShot يمكن إبقاء الموافقة على كل رد خارجي؛ ابدأ بالمسودات.",
          qEn: "Will AI send without approval?",
          aEn: "You can require approval for every outgoing reply; start with drafts.",
        },
        {
          qAr: "كم نسبة الرسائل القابلة للأتمتة؟",
          aAr: "نفترض 50% كبداية؛ الرسائل المتكررة كحالة الطلب والمواعيد هي الأسهل.",
          qEn: "What share can be automated?",
          aEn: "We start at 50%; repetitive status and booking emails are easiest.",
        },
        assumptionsFaq,
      ],
      table: {
        headAr: ["الدور", "رسائل يومياً", "دقائق/رسالة"],
        headEn: ["Role", "Emails/day", "Min/email"],
        rows: inboxRoles
          .slice(0, 10)
          .map((x) => [x.ar, `${x.emails}`, `${x.minutes}`]),
      },
      defaults: {
        emails: r.emails,
        minutes: r.minutes,
        automation: 50,
        hourly: r.hourly,
        days: 22,
      },
      params: { role: r.id },
    }),
  );

for (const n of youtubeNiches) {
  add(
    page("google-ai", "yt-rpm", {
      slug: `youtube-rpm-${n.id}`,
      titleAr: `حاسبة أرباح يوتيوب RPM لقنوات ${n.ar}`,
      titleEn: `YouTube RPM earnings calculator for ${n.en} channels`,
      descriptionAr: `قدّر أرباح قناة ${n.ar} من المشاهدات الشهرية وRPM ونسبة المشاهدات المحققة للربح، مع توقع 12 شهراً بالدولار والريال.`,
      descriptionEn: `Estimate ${n.en} channel earnings from monthly views, RPM and monetized share with a 12-month projection.`,
      introAr: `RPM الافتراضي لقنوات ${n.ar} هنا ${n.rpm}$ لكل ألف مشاهدة كنقطة بداية. عدّله بحسب بيانات YouTube Studio.`,
      introEn: `The default RPM for ${n.en} is $${n.rpm} per 1,000 views as a starting point. Adjust from YouTube Studio.`,
      guideAr: [
        "RPM هو ما تحصل عليه فعلياً لكل ألف مشاهدة بعد حصة يوتيوب، بخلاف CPM الذي يدفعه المعلن.",
        `قنوات ${n.ar} تتأثر بموسم الإعلانات (الربع الرابع أعلى عادة) وبدول المشاهدين؛ المشاهدات الخليجية والأمريكية غالباً أعلى قيمة.`,
        "لزيادة RPM: فيديوهات أطول من 8 دقائق تتيح إعلانات وسطية، ومواضيع ذات نية شرائية، وجمهور من دول ذات إنفاق إعلاني أعلى.",
      ],
      guideEn: [
        "RPM is what you earn per 1,000 views after YouTube's share, unlike advertiser CPM.",
        "Longer videos (8+ min) allow mid-rolls; buyer-intent topics lift RPM.",
      ],
      keywords: [
        `أرباح يوتيوب ${n.ar}`,
        "حاسبة أرباح يوتيوب",
        "RPM يوتيوب",
        `YouTube RPM ${n.en}`,
        "youtube money calculator",
      ],
      faq: [
        {
          qAr: `كم RPM قنوات ${n.ar}؟`,
          aAr: `نستخدم ${n.rpm}$ كافتراض؛ الأرقام الفعلية تختلف بشدة حسب الجمهور والدولة.`,
          qEn: `What RPM do ${n.en} channels get?`,
          aEn: `We assume $${n.rpm}; real numbers vary widely.`,
        },
        {
          qAr: "ما الفرق بين RPM وCPM؟",
          aAr: "CPM ما يدفعه المعلن لكل ألف ظهور إعلاني، وRPM ما يصلك لكل ألف مشاهدة بعد كل الخصومات.",
          qEn: "RPM vs CPM?",
          aEn: "CPM is advertiser cost per 1,000 ad impressions; RPM is your revenue per 1,000 views.",
        },
        assumptionsFaq,
      ],
      table: {
        headAr: ["المجال", "RPM افتراضي"],
        headEn: ["Niche", "Default RPM"],
        rows: youtubeNiches.map((x) => [x.ar, `$${x.rpm}`]),
      },
      defaults: {
        views: 200000,
        rpm: n.rpm,
        monetized: 70,
        growth: 5,
        fx: 3.75,
      },
      params: { niche: n.id },
    }),
  );
  add(
    page("google-ai", "yt-seo", {
      slug: `youtube-seo-${n.id}`,
      titleAr: `مولّد عناوين ووسوم ووصف يوتيوب لقنوات ${n.ar}`,
      titleEn: `YouTube SEO title, tag & description generator for ${n.en}`,
      descriptionAr: `ولّد عناوين محسّنة بطول مثالي، ووسوم ضمن حد 500 حرف، ووصفاً بفصول زمنية لفيديوهات ${n.ar} — مجاناً وفي متصفحك.`,
      descriptionEn: `Generate optimized titles, tags under 500 characters and a chaptered description for ${n.en} videos.`,
      introAr: `اكتب موضوع الفيديو وكلمتك المفتاحية لتحصل على حزمة SEO جاهزة لقناة ${n.ar}.`,
      introEn: `Enter your topic and keyword for a ready SEO pack for your ${n.en} channel.`,
      guideAr: [
        "العنوان المثالي بين 50 و70 حرفاً، يبدأ بالكلمة المفتاحية ويَعِد بنتيجة واضحة.",
        "الوسوم أقل أهمية من العنوان والوصف لكنها تساعد في الأخطاء الإملائية والمرادفات؛ لا تتجاوز 500 حرف.",
        `وصف فيديوهات ${n.ar}: سطران أولان يحملان الكلمة المفتاحية، ثم فصول زمنية، ثم روابط ودعوة للاشتراك.`,
      ],
      guideEn: [
        "Ideal titles are 50–70 characters, keyword-first, with a clear promise.",
        "Tags help with misspellings and synonyms; keep under 500 characters.",
      ],
      keywords: [
        `سيو يوتيوب ${n.ar}`,
        "عناوين يوتيوب",
        "وسوم يوتيوب",
        "YouTube tag generator",
        `YouTube SEO ${n.en}`,
      ],
      faq: [
        {
          qAr: "هل الوسوم ما زالت مهمة؟",
          aAr: "أثرها محدود مقارنة بالعنوان والصورة المصغرة ومدة المشاهدة، لكنها مفيدة للمرادفات.",
          qEn: "Do tags still matter?",
          aEn: "Less than title, thumbnail and watch time, but useful for synonyms.",
        },
        {
          qAr: "كم طول الوصف المناسب؟",
          aAr: "200 كلمة أو أكثر مع فصول زمنية تساعد الفهرسة وتجربة المشاهد.",
          qEn: "How long should descriptions be?",
          aEn: "200+ words with chapters helps indexing and viewers.",
        },
      ],
      table: {
        headAr: ["العنصر", "الحد الموصى به"],
        headEn: ["Element", "Recommended"],
        rows: [
          ["Title", "50–70"],
          ["Tags", "≤ 500 chars"],
          ["Description", "200+ words"],
          ["Chapters", "≥ 3, first at 00:00"],
          ["Hashtags", "3"],
        ],
      },
      defaults: {
        topic: "",
        keyword: n.tagsAr[0],
        year: 2026,
        channel: "OneShot",
      },
      params: { niche: n.id },
    }),
  );
}

for (const t of sheetsTasks)
  add(
    page("google-ai", "sheets", {
      slug: `sheets-${t.id}`,
      titleAr: `مولّد صيغة ${t.ar} في Google Sheets بالعربي`,
      titleEn: `Google Sheets ${t.en} formula generator`,
      descriptionAr: `أدخل أسماء الأعمدة والورقة لتحصل على صيغة ${t.fn} جاهزة للنسخ مع شرح عربي ونسخة للغات الفاصلة المنقوطة.`,
      descriptionEn: `Enter your columns and sheet to get a copy-ready ${t.fn} formula with an explanation.`,
      introAr: `بدلاً من البحث عن تركيب ${t.fn}، أخبرنا بمكان بياناتك ونولّد الصيغة الصحيحة فوراً.`,
      introEn: `Instead of searching ${t.fn} syntax, tell us where your data lives and get the right formula.`,
      guideAr: [
        `دالة ${t.fn} من أكثر الدوال استخداماً في تقارير المتاجر والمحاسبة. احرص على أن تكون النطاقات بنفس الطول.`,
        "إن ظهر خطأ #N/A فغالباً القيمة غير موجودة أو هناك مسافة زائدة؛ استخدم TRIM للتنظيف.",
        "في الإعدادات المحلية التي تستخدم الفاصلة العشرية تُفصل وسائط الدالة بفاصلة منقوطة؛ لذلك نعرض النسختين.",
      ],
      guideEn: [
        `${t.fn} is common in store and accounting reports; keep ranges the same length.`,
        "#N/A usually means a missing value or extra spaces; clean with TRIM.",
      ],
      keywords: [
        `دالة ${t.fn}`,
        `${t.fn} جوجل شيت`,
        "صيغ Google Sheets",
        `${t.fn} formula`,
        "google sheets formula generator",
      ],
      faq: [
        {
          qAr: "لماذا لا تعمل الصيغة عند اللصق؟",
          aAr: "جرّب نسخة الفاصلة المنقوطة إن كانت لغة الملف تستخدمها، وتأكد من اسم الورقة.",
          qEn: "Why doesn't it work after pasting?",
          aEn: "Try the semicolon version and check the sheet name.",
        },
        {
          qAr: "هل تعمل في Excel؟",
          aAr: "أغلب الدوال متوافقة، عدا QUERY وIMPORTRANGE وREGEXEXTRACT الخاصة بجوجل.",
          qEn: "Does it work in Excel?",
          aEn: "Most do, except Google-only QUERY, IMPORTRANGE and REGEXEXTRACT.",
        },
      ],
      table: {
        headAr: ["الدالة", "الاستخدام"],
        headEn: ["Function", "Use"],
        rows: sheetsTasks.slice(0, 10).map((x) => [x.fn, x.ar]),
      },
      defaults: {
        sheet: "Data",
        keyCol: "A",
        valueCol: "B",
        cell: "A2",
        criteria: "مكتمل",
        rows: 1000,
      },
      params: { task: t.id, fn: t.fn },
    }),
  );

for (const g of gmailScenarios)
  add(
    page("google-ai", "gmail", {
      slug: `gmail-auto-reply-${g.id}`,
      titleAr: `منشئ الرد الآلي في Gmail: ${g.ar}`,
      titleEn: `Gmail auto-reply builder: ${g.en}`,
      descriptionAr: `أنشئ رداً آلياً احترافياً لـ${g.ar} بالعربية والإنجليزية مع استعلام فلتر Gmail وخطوات التفعيل.`,
      descriptionEn: `Build a professional ${g.en} auto-reply with a Gmail filter query and setup steps.`,
      introAr: `رد فوري لـ${g.ar} يطمئن العميل ويحدد موعد المتابعة البشرية، دون وعود لا تستطيع الوفاء بها.`,
      introEn: `An instant ${g.en} reply that reassures and sets a human follow-up time.`,
      guideAr: [
        "الرد الآلي الجيد يؤكد الاستلام، ويحدد موعداً واقعياً، ويعطي قناة بديلة للحالات العاجلة.",
        "قوالب Gmail مع الفلاتر تكفي للبداية؛ ولردود ذكية تفهم السياق اربط حسابك بموظف بريد ذكي مع موافقة بشرية.",
        "لا تذكر مبالغ أو تؤكد استرداداً أو دفعاً في رد آلي؛ اترك القرارات المالية لمراجعة الفريق.",
      ],
      guideEn: [
        "A good auto-reply confirms receipt, sets a realistic time and offers an urgent channel.",
        "Never confirm refunds or payments in automated replies.",
      ],
      keywords: [
        `رد آلي ${g.ar}`,
        "الرد التلقائي Gmail",
        "قوالب Gmail",
        "Gmail auto reply",
        `${g.en} email template`,
      ],
      faq: [
        {
          qAr: "كيف أفعّل القوالب في Gmail؟",
          aAr: "الإعدادات ← عرض كل الإعدادات ← متقدم ← القوالب ← تفعيل.",
          qEn: "How do I enable templates?",
          aEn: "Settings → See all settings → Advanced → Templates → Enable.",
        },
        {
          qAr: "هل يرد القالب على كل رسالة؟",
          aAr: "فقط الرسائل المطابقة لاستعلام الفلتر؛ اختبره بالبحث أولاً.",
          qEn: "Will it reply to everything?",
          aEn: "Only messages matching the filter; test with search first.",
        },
      ],
      table: {
        headAr: ["السيناريو", "الوعد في الرد"],
        headEn: ["Scenario", "Reply promise"],
        rows: gmailScenarios.map((x) => [x.ar, x.promiseAr]),
      },
      defaults: {
        business: "",
        tone: "formal",
        hours: 24,
        contact: "",
        daily: 20,
      },
      params: {
        scenario: g.id,
        promiseAr: g.promiseAr,
        promiseEn: g.promiseEn,
      },
    }),
  );

for (const p of promptUseCases)
  add(
    page("google-ai", "prompt", {
      slug: `prompt-architect-${p.id}`,
      titleAr: `مهندس الأوامر: برومبت احترافي لـ${p.ar}`,
      titleEn: `Prompt architect: professional prompts for ${p.en}`,
      descriptionAr: `ابنِ أمراً هيكلياً لـ${p.ar} يحدد الدور والمهمة والجمهور والقيود وشكل المخرجات لنتائج أدق من Gemini وغيره.`,
      descriptionEn: `Build a structured ${p.en} prompt with role, task, audience, constraints and format.`,
      introAr: `أفضل نتائج الذكاء الاصطناعي تأتي من أوامر واضحة. املأ الحقول لتحصل على أمر جاهز لـ${p.ar}.`,
      introEn: `Clear prompts get better AI results. Fill the fields for a ready ${p.en} prompt.`,
      guideAr: [
        `حدد دوراً مختصاً (${p.roleAr}) لأن النموذج يضبط المصطلحات والنبرة حسبه.`,
        "القيود السلبية (ما يجب تجنبه) بنفس أهمية المطلوب: الادعاءات الطبية، الوعود المبالغ فيها، والأسعار غير المؤكدة.",
        "اطلب من النموذج أن يسأل عند نقص المعلومة بدلاً من الاختلاق، وأن يراجع إجابته ذاتياً قبل التسليم.",
      ],
      guideEn: [
        `Assign a specialist role (${p.roleEn}) so the model adjusts vocabulary and tone.`,
        "Negative constraints matter: ban unverified claims and exaggerated promises.",
      ],
      keywords: [
        `برومبت ${p.ar}`,
        "هندسة الأوامر",
        "prompt engineering عربي",
        `${p.en} prompt`,
        "AI prompt generator",
      ],
      faq: [
        {
          qAr: "هل يعمل الأمر مع أي نموذج؟",
          aAr: "نعم، البنية عامة وتعمل مع Gemini وغيره من النماذج الحديثة.",
          qEn: "Does it work with any model?",
          aEn: "Yes, the structure is model-agnostic.",
        },
        {
          qAr: "لماذا أطلب صيغة JSON؟",
          aAr: "عندما تريد نقل النتائج إلى جدول أو نظام آلي دون تنسيق يدوي.",
          qEn: "Why ask for JSON?",
          aEn: "To move results into sheets or systems without manual formatting.",
        },
      ],
      table: {
        headAr: ["الاستخدام", "الدور المقترح"],
        headEn: ["Use case", "Suggested role"],
        rows: promptUseCases.map((x) => [x.ar, x.roleAr]),
      },
      defaults: {
        goal: "",
        audience: "",
        tone: "expert",
        format: "bullets",
        words: 250,
        avoid: "",
      },
      params: { useCase: p.id, roleAr: p.roleAr, roleEn: p.roleEn },
    }),
  );

// ── Cluster 3: gaming & local AI (100) ──────────────────────────────────
for (const g of games)
  add(
    page("gaming", "fps", {
      slug: `fps-bottleneck-${g.id}`,
      titleAr: `حاسبة FPS وعنق الزجاجة للعبة ${g.ar}`,
      titleEn: `${g.en} FPS & bottleneck calculator`,
      descriptionAr: `كم إطاراً ستحصل في ${g.ar}؟ اختر المعالج وكرت الشاشة والدقة لتعرف الإطارات المتوقعة ونسبة عنق الزجاجة والقطعة المحددة.`,
      descriptionEn: `How many FPS in ${g.en}? Pick CPU, GPU and resolution to see estimated FPS and bottleneck.`,
      introAr: `${g.ar} (${g.genre}) لها حمل مختلف على المعالج والكرت. هذه الأداة تقدّر الحد الذي يفرضه كل منهما.`,
      introEn: `${g.en} (${g.genre}) loads CPU and GPU differently. This estimates each component's limit.`,
      guideAr: [
        `في الدقة 1080p تكون ${g.ar} أكثر اعتماداً على المعالج، ومع 1440p و4K ينتقل الحمل إلى كرت الشاشة.`,
        "عنق الزجاجة تحت 10–15% طبيعي؛ فوق 25% يعني أن ترقية القطعة الأضعف أجدى من الأقوى.",
        "التقديرات نموذجية مبنية على مستويات أداء نسبية، والنتائج الفعلية تتأثر بالتعريفات والذاكرة والتبريد وتحديثات اللعبة.",
      ],
      guideEn: [
        `At 1080p ${g.en} leans on the CPU; at 1440p and 4K the GPU takes over.`,
        "Estimates come from relative tiers; drivers, RAM, cooling and patches change real results.",
      ],
      keywords: [
        `فريمات ${g.ar}`,
        `متطلبات ${g.ar}`,
        "حاسبة عنق الزجاجة",
        `${g.en} FPS calculator`,
        `${g.en} bottleneck`,
      ],
      faq: [
        {
          qAr: `هل يشغّل جهازي ${g.ar} على 144 إطاراً؟`,
          aAr: "اختر قطعك والدقة؛ إن كان المؤشر الأول فوق 144 فالتقدير يقول نعم.",
          qEn: `Can I hit 144 FPS in ${g.en}?`,
          aEn: "Pick your parts; if the estimate is above 144, likely yes.",
        },
        {
          qAr: "هل التقدير دقيق؟",
          aAr: "هو نموذج تقريبي لمقارنة الخيارات، وليس قياساً فعلياً. اختبر بأداة قياس داخل اللعبة.",
          qEn: "Is it exact?",
          aEn: "It is an approximation for comparison, not a benchmark.",
        },
      ],
      table: {
        headAr: ["كرت الشاشة", "مستوى الأداء النسبي", "VRAM"],
        headEn: ["GPU", "Relative score", "VRAM"],
        rows: gpuOptions.map((x) => [x.label, `${x.score}`, `${x.vram} GB`]),
      },
      defaults: {
        cpu: "r5-7600",
        gpu: "rtx4060",
        res: "1080",
        quality: "high",
        hz: 144,
      },
      params: { gpuFps: g.gpuFps, cpuFps: g.cpuFps, game: g.id },
    }),
  );

for (const m of localModels) {
  const kindAr =
    m.kind === "llm"
      ? "نموذج لغوي"
      : m.kind === "image"
        ? "نموذج توليد صور"
        : "نموذج تفريغ صوتي";
  add(
    page("gaming", "local-ai", {
      slug: `run-${m.id}-locally`,
      titleAr: `هل يشغّل جهازك ${m.ar} محلياً؟ حاسبة VRAM والسرعة`,
      titleEn: `Can your PC run ${m.en} locally? VRAM & speed calculator`,
      descriptionAr: `احسب ذاكرة كرت الشاشة المطلوبة لتشغيل ${m.ar} بكل مستويات التكميم، والسرعة المتوقعة على كرتك.`,
      descriptionEn: `Calculate the VRAM needed to run ${m.en} at each quantization and the expected speed on your GPU.`,
      introAr: `${m.ar} ${kindAr} من ${m.family} بحجم ${m.params} مليار معامل. اختر كرتك والتكميم لتعرف إن كان سيعمل وبأي سرعة.`,
      introEn: `${m.en} is a ${m.params}B-parameter ${m.kind} model from ${m.family}. Pick your GPU and quantization.`,
      guideAr: [
        `حجم الأوزان ≈ عدد المعاملات × بتات التكميم ÷ 8. لـ${m.ar} بتكميم Q4 نحو ${((m.params * 4.8) / 8).toFixed(1)} GB قبل ذاكرة السياق.`,
        m.kind === "llm"
          ? "سرعة التوليد محدودة بعرض نطاق الذاكرة: كل رمز يتطلب قراءة الأوزان كاملة تقريباً، لذا كرت بذاكرة أسرع يولّد أسرع."
          : m.kind === "image"
            ? "نماذج الصور تحتاج ذاكرة إضافية لمشفّر النص وفك الترميز؛ عند النقص يمكن تفعيل التحميل الجزئي على حساب الوقت."
            : "Whisper يعمل بسرعة أعلى من الزمن الحقيقي على أغلب الكروت الحديثة، والنسخ الأصغر أسرع بدقة أقل قليلاً.",
        "إن لم تتسع الذاكرة، ينقل البرنامج جزءاً إلى ذاكرة النظام وتنخفض السرعة كثيراً. التكميم Q4–Q5 أفضل توازن للأجهزة المنزلية.",
      ],
      guideEn: [
        `Weights ≈ parameters × bits ÷ 8; ${m.en} at Q4 needs about ${((m.params * 4.8) / 8).toFixed(1)} GB before context.`,
        "Generation speed is bound by memory bandwidth; offloading to system RAM slows it sharply.",
      ],
      keywords: [
        `تشغيل ${m.ar} محلياً`,
        `متطلبات ${m.ar}`,
        `${m.en} VRAM`,
        `run ${m.en} locally`,
        "local AI calculator",
      ],
      faq: [
        {
          qAr: `كم VRAM يحتاج ${m.ar}؟`,
          aAr: `بتكميم Q4 نحو ${((m.params * 4.8) / 8 + 1).toFixed(1)} GB تقريباً شاملاً هامشاً بسيطاً، وFP16 نحو ${(m.params * 2 + 1).toFixed(1)} GB.`,
          qEn: `How much VRAM for ${m.en}?`,
          aEn: `About ${((m.params * 4.8) / 8 + 1).toFixed(1)} GB at Q4 and ${(m.params * 2 + 1).toFixed(1)} GB at FP16.`,
        },
        {
          qAr: "ما أفضل تكميم؟",
          aAr: "Q4_K_M أو Q5 يحافظان على جودة قريبة من الأصل بنصف الذاكرة تقريباً مقارنة بـ Q8.",
          qEn: "Best quantization?",
          aEn: "Q4_K_M or Q5 keep near-original quality at about half of Q8's memory.",
        },
        assumptionsFaq,
      ],
      table: {
        headAr: ["كرت الشاشة", "VRAM", "عرض النطاق GB/s"],
        headEn: ["GPU", "VRAM", "Bandwidth GB/s"],
        rows: gpuOptions.map((x) => [
          x.label,
          `${x.vram} GB`,
          `${x.bandwidth}`,
        ]),
      },
      defaults: {
        gpu: m.params > 30 ? "rtx4090" : "rtx4060ti16",
        quant: "q4",
        ...(m.kind === "llm" ? { ctx: 8192 } : {}),
        ram: 32,
      },
      params: {
        kind: m.kind,
        params: m.params,
        refSeconds: m.refSeconds ?? 0,
        model: m.id,
      },
    }),
  );
}

for (const g of psuBuilds)
  add(
    page("gaming", "psu", {
      slug: `psu-calculator-${g.value}`,
      titleAr: `حاسبة مزود الطاقة PSU لتجميعة ${g.label}`,
      titleEn: `PSU wattage calculator for a ${g.label} build`,
      descriptionAr: `كم واط تحتاج تجميعة ${g.label}؟ احسب الحمل الفعلي والحجم الموصى به مع هامش أمان لقفزات الطاقة.`,
      descriptionEn: `How many watts does a ${g.label} build need? Estimated load and recommended PSU with headroom.`,
      introAr: `استهلاك ${g.label} المرجعي نحو ${g.tbp} واط. أضف المعالج والملحقات لتعرف المزود المناسب.`,
      introEn: `${g.label} draws about ${g.tbp} W at reference. Add CPU and parts for the right PSU.`,
      guideAr: [
        "الكروت الحديثة تسبب قفزات لحظية أعلى من استهلاكها المعلن؛ لذلك نوصي بهامش 30% على الأقل.",
        `مع ${g.label} يفضل مزود 80 Plus Gold بكابل 12V-2x6 أصلي إن كان الكرت يستخدمه، وتجنب المحولات الرخيصة.`,
        "المزود الذي يعمل عند 50–70% من سعته يكون أكثر كفاءة وأهدأ صوتاً وأطول عمراً.",
      ],
      guideEn: [
        "Modern GPUs spike above rated power; keep at least 30% headroom.",
        "A PSU running at 50–70% load is most efficient and quiet.",
      ],
      keywords: [
        `باور ${g.label}`,
        `مزود طاقة ${g.label}`,
        "حاسبة الباور",
        `${g.label} PSU`,
        "PSU calculator",
      ],
      faq: [
        {
          qAr: `كم واط يحتاج ${g.label}؟`,
          aAr: `الحمل المرجعي للكرت نحو ${g.tbp} واط، والمزود المناسب يعتمد على المعالج والهامش — استخدم الحاسبة.`,
          qEn: `How many watts for ${g.label}?`,
          aEn: `About ${g.tbp} W for the card; the PSU depends on CPU and headroom.`,
        },
        {
          qAr: "هل الأكبر دائماً أفضل؟",
          aAr: "لا، المبالغة ترفع السعر دون فائدة؛ الجودة والشهادة أهم من الواط الزائد.",
          qEn: "Is bigger always better?",
          aEn: "No; quality and certification matter more than extra watts.",
        },
      ],
      table: {
        headAr: ["كرت الشاشة", "الاستهلاك المرجعي"],
        headEn: ["GPU", "Reference power"],
        rows: psuBuilds.map((x) => [x.label, `${x.tbp} W`]),
      },
      defaults: {
        cpu: g.score >= 150 ? "r7-7800x3d" : "r5-7600",
        gpuTbp: g.tbp,
        drives: 2,
        fans: 4,
        oc: "0",
        headroom: 30,
      },
      params: { gpu: g.value },
    }),
  );

for (const o of obsTargets)
  add(
    page("gaming", "obs", {
      slug: `obs-bitrate-${o.id}`,
      titleAr: `إعدادات OBS ومعدل البت المثالي للبث على ${o.ar}`,
      titleEn: `Best OBS bitrate & settings for ${o.en}`,
      descriptionAr: `احسب معدل البت المناسب لسرعة الرفع لديك والمرمّز وحد المنصة للبث على ${o.ar}، مع إعدادات OBS جاهزة.`,
      descriptionEn: `Calculate the right ${o.en} bitrate for your upload, encoder and ${o.platform} limit, with ready OBS settings.`,
      introAr: `حد معدل البت الاسترشادي على ${o.platform} لهذا الإعداد نحو ${o.max.toLocaleString("en-US")} Kbps. أدخل سرعتك لتعرف المعدل الآمن.`,
      introEn: `${o.platform}'s indicative limit here is about ${o.max.toLocaleString("en-US")} Kbps. Enter your upload for a safe bitrate.`,
      guideAr: [
        "لا تستخدم أكثر من 75% من سرعة الرفع للبث حتى تتحمل تذبذب الشبكة دون تقطيع.",
        "ألعاب الحركة السريعة تحتاج معدل بت أعلى من البث الحواري؛ إن كان الرفع محدوداً فـ 720p60 أو 936p60 أوضح من 1080p بمعدل منخفض.",
        "مرمّزات HEVC وAV1 تعطي جودة أعلى بنفس المعدل، لكن تأكد أن المنصة تدعمها في طريقة البث التي تستخدمها.",
      ],
      guideEn: [
        "Use at most 75% of upload for streaming to absorb network jitter.",
        "With limited upload, 720p60 or 936p60 looks cleaner than starved 1080p.",
      ],
      keywords: [
        `إعدادات OBS ${o.platform}`,
        "معدل البت للبث",
        "bitrate OBS",
        `${o.en} bitrate`,
        "OBS settings",
      ],
      faq: [
        {
          qAr: "ما فاصل الإطار المفتاحي الصحيح؟",
          aAr: "ثانيتان هو المعيار الشائع لأغلب المنصات.",
          qEn: "Keyframe interval?",
          aEn: "2 seconds is the common standard.",
        },
        {
          qAr: "x264 أم NVENC؟",
          aAr: "NVENC الحديث يقارب جودة x264 دون تحميل المعالج؛ مناسب لمن يبث ويلعب على نفس الجهاز.",
          qEn: "x264 or NVENC?",
          aEn: "Modern NVENC rivals x264 without CPU load.",
        },
        assumptionsFaq,
      ],
      table: {
        headAr: ["الإعداد", "حد المنصة Kbps"],
        headEn: ["Target", "Platform limit Kbps"],
        rows: obsTargets.map((x) => [x.en, x.max.toLocaleString("en-US")]),
      },
      defaults: {
        upload: 20,
        height: String(o.height === 1280 ? 720 : o.height),
        fps: String(o.fps),
        encoder: "nvenc",
        motion: "high",
      },
      params: { max: o.max, target: o.id },
    }),
  );

for (const hz of refreshRates)
  add(
    page("gaming", "refresh", {
      slug: `refresh-rate-${hz}hz`,
      titleAr: `اختبار معدل تحديث الشاشة ${hz}Hz وحاسبة تأخير الإدخال`,
      titleEn: `${hz}Hz refresh rate test & input lag calculator`,
      descriptionAr: `اختبر معدل تحديث شاشتك الفعلي في المتصفح، واحسب زمن الإطار والتأخير الكلي عند ${hz}Hz مقارنة بالمعدلات الأخرى.`,
      descriptionEn: `Measure your real refresh rate in the browser and calculate frame time and total latency at ${hz}Hz.`,
      introAr: `عند ${hz}Hz يتحدث الإطار كل ${(1000 / hz).toFixed(2)} ملّي ثانية. شغّل الاختبار لترى المعدل الذي يقيسه متصفحك.`,
      introEn: `At ${hz}Hz a frame refreshes every ${(1000 / hz).toFixed(2)} ms. Run the test to see what your browser measures.`,
      guideAr: [
        "المتصفح يقيس معدل الرسم عبر requestAnimationFrame؛ إن ظهر 60 على شاشة أعلى فتحقق من إعدادات العرض في النظام والكابل.",
        `الانتقال من 60 إلى ${hz}Hz يقلل زمن الإطار من 16.7 إلى ${(1000 / hz).toFixed(1)} ملّي ثانية، والفائدة تتناقص كلما ارتفع المعدل.`,
        "التأخير الكلي = تأخير الإدخال والمعالجة + زمن إطار اللعبة + معالجة الشاشة + نصف فترة التحديث تقريباً.",
      ],
      guideEn: [
        "Browsers measure via requestAnimationFrame; 60 on a faster panel suggests OS or cable settings.",
        "Total latency ≈ input/processing + game frame time + display lag + half the refresh interval.",
      ],
      keywords: [
        `اختبار ${hz} هيرتز`,
        "اختبار معدل التحديث",
        "input lag",
        `${hz}Hz test`,
        "refresh rate test",
      ],
      faq: [
        {
          qAr: "لماذا يظهر الاختبار رقماً أقل؟",
          aAr: "وضع توفير الطاقة، الكابل، أو إعداد العرض قد يقيد المعدل؛ أغلق التبويبات الأخرى وأعد الاختبار.",
          qEn: "Why is the result lower?",
          aEn: "Power saving, cable or OS settings may cap it; close other tabs and retry.",
        },
        {
          qAr: `هل ${hz}Hz مفيد للألعاب التنافسية؟`,
          aAr: "كلما ارتفع المعدل قلّ زمن الإطار، بشرط أن تنتج اللعبة إطارات كافية.",
          qEn: `Is ${hz}Hz worth it?`,
          aEn: "Higher refresh lowers frame time if the game produces enough FPS.",
        },
      ],
      table: {
        headAr: ["معدل التحديث", "زمن الإطار ms"],
        headEn: ["Refresh", "Frame time ms"],
        rows: refreshRates.map((r) => [`${r}Hz`, (1000 / r).toFixed(2)]),
      },
      defaults: { hz, fps: hz, system: 10, display: 4 },
      params: { hz },
    }),
  );

for (const m of micTypes)
  add(
    page("gaming", "mic-eq", {
      slug: `mic-eq-${m.id}`,
      titleAr: `إعدادات EQ والضاغط في OBS لمايك ${m.ar}`,
      titleEn: `${m.en} OBS EQ, gate & compressor settings`,
      descriptionAr: `احصل على سلسلة فلاتر OBS مخصصة لمايك ${m.ar} حسب صوتك وغرفتك والضجيج: مرشح منخفض، EQ، بوابة ضجيج وضاغط.`,
      descriptionEn: `A tailored OBS filter chain for the ${m.en} by voice, room and noise.`,
      introAr: `${m.ar} مايك ${m.kind === "dynamic" ? "ديناميكي" : m.kind === "condenser" ? "مكثف" : m.kind === "lav" ? "لاسلكي مشبكي" : "سماعة"}. اختر ظروفك لتحصل على إعدادات تبدأ بها.`,
      introEn: `The ${m.en} is a ${m.kind} mic. Choose your conditions for starting settings.`,
      guideAr: [
        "الترتيب مهم: إزالة الضجيج ← البوابة ← EQ ← الضاغط ← المحدد.",
        m.kind === "condenser"
          ? "المايكات المكثفة تلتقط الغرفة أكثر؛ المعالجة الصوتية البسيطة (سجاد، ستائر) تفيد أكثر من أي فلتر."
          : "المايكات الديناميكية تحتاج كسباً أعلى وقرباً من الفم، وتعزيز الوضوح يعوّض نعومتها.",
        "اضبط الكسب حتى تصل ذروة صوتك إلى نحو -10 dB في OBS قبل الضاغط.",
      ],
      guideEn: [
        "Order matters: suppression → gate → EQ → compressor → limiter.",
        "Set gain so voice peaks near -10 dB before compression.",
      ],
      keywords: [
        `إعدادات ${m.ar}`,
        "فلاتر OBS للمايك",
        "EQ للصوت",
        `${m.en} OBS settings`,
        `${m.en} EQ`,
      ],
      faq: [
        {
          qAr: "هل أحتاج كل الفلاتر؟",
          aAr: "في غرفة هادئة قد تكفي EQ والضاغط؛ البوابة والإزالة للضجيج المستمر.",
          qEn: "Do I need every filter?",
          aEn: "In a quiet room, EQ and compressor may suffice.",
        },
        {
          qAr: "لماذا صوتي مكتوم؟",
          aAr: "خفّض 250–400Hz قليلاً وارفع 3–5kHz، وتأكد من المسافة الصحيحة.",
          qEn: "Why is my voice muddy?",
          aEn: "Cut 250–400Hz slightly, lift 3–5kHz and check distance.",
        },
      ],
      table: {
        headAr: ["المايك", "النوع", "مرشح منخفض"],
        headEn: ["Mic", "Type", "HPF"],
        rows: micTypes.map((x) => [x.en, x.kind, `${x.hpf} Hz`]),
      },
      defaults: {
        voice: "medium",
        room: "normal",
        noise: "fan",
        distance: m.kind === "dynamic" ? 7 : 20,
      },
      params: { kind: m.kind, hpf: m.hpf },
    }),
  );

// ── Cluster 4: brand & photography (100) ────────────────────────────────
for (const c of photoCategories)
  add(
    page("brand", "photo-cost", {
      slug: `product-photography-cost-${c.id}`,
      titleAr: `حاسبة تكلفة تصوير ${c.ar} التجاري`,
      titleEn: `${c.en} commercial photography cost calculator`,
      descriptionAr: `قدّر ميزانية تصوير ${c.ar} حسب عدد المنتجات والزوايا والريتوش وصور اللايف ستايل، ثم قارنها بباقات OneShot الرسمية.`,
      descriptionEn: `Estimate your ${c.en} photography budget by products, angles, retouching and lifestyle shots.`,
      introAr: `${c.ar} تحتاج عادة ${c.angles} زوايا لكل منتج. أدخل احتياجك لتعرف الميزانية التقريبية قبل طلب عرض السعر.`,
      introEn: `${c.en} usually need ${c.angles} angles per product. Enter your needs for an approximate budget.`,
      guideAr: [
        `صور ${c.ar} الجيدة تعرض التفاصيل والخامة والحجم الحقيقي؛ زاوية أمامية وجانبية وقريبة ولقطة استخدام.`,
        "الريتوش المتقدم يشمل إزالة الغبار والانعكاسات وتوحيد الألوان، والفاخر يضيف تركيب الخلفيات والظلال الواقعية.",
        "هذه حاسبة تقدير ذاتي بسعر صورة افتراضي تعدّله أنت؛ الأسعار الرسمية والنطاق في باقات OneShot على صفحة المنتجات.",
      ],
      guideEn: [
        `Good ${c.en} photos show detail, material and true scale.`,
        "This is a self-estimate with an editable assumed rate; official packages are on the products page.",
      ],
      keywords: [
        `تصوير ${c.ar}`,
        `أسعار تصوير ${c.ar}`,
        "تصوير منتجات",
        `${c.en} product photography cost`,
        "تصوير تجاري",
      ],
      faq: [
        {
          qAr: `كم زاوية تحتاج ${c.ar}؟`,
          aAr: `نقترح ${c.angles} زوايا كبداية؛ المنتجات ذات التفاصيل الدقيقة تحتاج لقطات قريبة إضافية.`,
          qEn: "How many angles?",
          aEn: `We suggest ${c.angles} as a start.`,
        },
        {
          qAr: "هل هذا عرض سعر من OneShot؟",
          aAr: "لا. هو تقدير بافتراضاتك؛ اطلب الباقة من المتجر للحصول على السعر الرسمي.",
          qEn: "Is this a OneShot quote?",
          aEn: "No; request a package from the store for official pricing.",
        },
      ],
      table: {
        headAr: ["الفئة", "زوايا مقترحة", "سعر صورة افتراضي"],
        headEn: ["Category", "Angles", "Assumed rate"],
        rows: photoCategories
          .slice(0, 10)
          .map((x) => [x.ar, `${x.angles}`, `${x.rate}`]),
      },
      defaults: {
        products: 20,
        angles: c.angles,
        rate: c.rate,
        retouch: "30",
        lifestyle: 4,
        rush: "0",
      },
      params: { category: c.id },
    }),
  );

for (const e of exposureScenarios)
  add(
    page("brand", "exposure", {
      slug: `aperture-simulator-${e.id}`,
      titleAr: `محاكي فتحة العدسة وعمق الميدان: ${e.ar}`,
      titleEn: `Aperture & depth-of-field simulator: ${e.en}`,
      descriptionAr: `احسب عمق الميدان والمسافة فوق البؤرية وقيمة التعريض لـ${e.ar} حسب البعد البؤري والفتحة والمسافة والمستشعر.`,
      descriptionEn: `Calculate depth of field, hyperfocal distance and exposure for ${e.en}.`,
      introAr: `إعداد البداية لـ${e.ar}: ${e.focal}mm عند f/${e.aperture} من ${e.distance} م. حرّك القيم لترى أثرها فوراً.`,
      introEn: `Starting point for ${e.en}: ${e.focal}mm at f/${e.aperture} from ${e.distance} m.`,
      guideAr: [
        "عمق الميدان يضيق مع فتحة أوسع (رقم f أصغر)، وبعد بؤري أطول، ومسافة أقرب.",
        `في ${e.ar} الهدف عادة ${e.aperture >= 8 ? "حدة كاملة للمنتج من الأمام للخلف" : "فصل الهدف عن الخلفية بنعومة"}.`,
        "للتصوير باليد اجعل سرعة الغالق لا تقل عن 1/(البعد البؤري × عامل القص)، وارفع ISO بدلاً من إبطاء الغالق.",
      ],
      guideEn: [
        "DoF narrows with wider apertures, longer focal lengths and closer distances.",
        "Handheld: shutter ≥ 1/(focal × crop).",
      ],
      keywords: [
        `إعدادات كاميرا ${e.ar}`,
        "عمق الميدان",
        "حاسبة فتحة العدسة",
        "depth of field calculator",
        `${e.en} camera settings`,
      ],
      faq: [
        {
          qAr: "ما أفضل فتحة لتصوير المنتجات؟",
          aAr: "بين f/8 وf/11 عادة لحدة متوازنة دون انحراف الحيود.",
          qEn: "Best aperture for products?",
          aEn: "Usually f/8–f/11.",
        },
        {
          qAr: "ما دائرة الالتباس المستخدمة؟",
          aAr: "0.03mm لكامل الإطار و0.02 لـ APS-C و0.015 لـ Micro 4/3.",
          qEn: "Which circle of confusion?",
          aEn: "0.03 mm FF, 0.02 APS-C, 0.015 MFT.",
        },
      ],
      table: {
        headAr: ["السيناريو", "البعد", "الفتحة", "ISO"],
        headEn: ["Scenario", "Focal", "Aperture", "ISO"],
        rows: exposureScenarios.map((x) => [
          x.ar,
          `${x.focal}mm`,
          `f/${x.aperture}`,
          `${x.iso}`,
        ]),
      },
      defaults: {
        focal: e.focal,
        aperture: e.aperture,
        distance: e.distance,
        sensor: "ff",
        shutter: e.shutter,
        iso: e.iso,
      },
      params: { scenario: e.id },
    }),
  );

for (const p of paletteIndustries)
  add(
    page("brand", "palette", {
      slug: `luxury-palette-${p.id}`,
      titleAr: `مولّد لوحة ألوان فاخرة مريحة لـ${p.ar}`,
      titleEn: `Calm luxury color palette generator for ${p.en}`,
      descriptionAr: `ولّد لوحة من 5 ألوان هادئة غير مزعجة لهوية ${p.ar} مع فحص تباين WCAG ومتغيرات CSS جاهزة.`,
      descriptionEn: `Generate a calm 5-color palette for ${p.en} with WCAG contrast checks and CSS variables.`,
      introAr: `نبدأ بدرجة ${p.hue}° التي تناسب طابع ${p.ar}. خفّض التشبع للفخامة الهادئة أو غيّر التناغم.`,
      introEn: `We start at hue ${p.hue}°, suited to ${p.en}. Lower saturation for quiet luxury.`,
      guideAr: [
        "الفخامة البصرية تأتي من التشبع المنخفض والتباين المحسوب، لا من الألوان الصارخة.",
        "استخدم Ink للنصوص وCanvas للخلفيات وSignature للأزرار والعناصر التفاعلية فقط.",
        "تباين 4.5:1 هو الحد الأدنى لقراءة النص العادي، و7:1 للمستوى المعزز في WCAG.",
      ],
      guideEn: [
        "Luxury comes from low saturation and deliberate contrast.",
        "WCAG requires 4.5:1 for body text and 7:1 for enhanced contrast.",
      ],
      keywords: [
        `ألوان هوية ${p.ar}`,
        "لوحة ألوان فاخرة",
        "ألوان مريحة للعين",
        `${p.en} color palette`,
        "brand palette generator",
      ],
      faq: [
        {
          qAr: "كيف أختار لوناً لا يزعج العين؟",
          aAr: "اجعل التشبع تحت 30% للمساحات الكبيرة واحتفظ باللون القوي للعناصر الصغيرة.",
          qEn: "How to avoid harsh colors?",
          aEn: "Keep saturation under 30% for large areas.",
        },
        {
          qAr: "هل يمكن استخدامها في الطباعة؟",
          aAr: "الألوان بصيغة HEX للشاشات؛ اطلب تحويلها إلى CMYK وتجربة طباعة قبل الإنتاج.",
          qEn: "Can I print these?",
          aEn: "They are screen HEX values; proof in CMYK before printing.",
        },
      ],
      table: {
        headAr: ["القطاع", "الدرجة", "الطابع"],
        headEn: ["Industry", "Hue", "Mood"],
        rows: paletteIndustries.map((x) => [x.ar, `${x.hue}°`, x.mood]),
      },
      defaults: { hue: p.hue, saturation: 24, harmony: "analogous", shift: 0 },
      params: { industry: p.id },
    }),
  );

for (const r of resizePlatforms)
  add(
    page("brand", "resizer", {
      slug: `image-sizes-${r.id}`,
      titleAr: `مقاسات صور ${r.ar} وأداة تغيير الحجم الفورية`,
      titleEn: `${r.en} image sizes & instant resizer`,
      descriptionAr: `كل مقاسات ${r.ar} المحدثة في جدول واحد، مع أداة تغيّر حجم صورتك لكل المقاسات داخل متصفحك دون رفعها لأي خادم.`,
      descriptionEn: `All ${r.en} image sizes in one table, with a resizer that runs in your browser without uploading.`,
      introAr: `اختر صورة من جهازك لتحصل على نسخ جاهزة لكل مقاسات ${r.ar} بضغطة واحدة.`,
      introEn: `Pick an image to get copies for every ${r.en} size in one click.`,
      guideAr: [
        `المقاسات المرجعية لـ${r.ar}: ${r.sizes.map((s) => `${s.name} ${s.w}×${s.h}`).join("، ")}.`,
        "وضع «ملء وقص» يملأ الإطار ويقص الأطراف، و«احتواء» يحافظ على الصورة كاملة بخلفية. اترك منطقة آمنة 10% للنصوص والشعار.",
        "المنصات تحدّث مقاساتها أحياناً؛ راجع إرشادات المنصة قبل الحملات الكبيرة.",
      ],
      guideEn: [
        `Reference sizes: ${r.sizes.map((s) => `${s.name} ${s.w}×${s.h}`).join(", ")}.`,
        "Keep a 10% safe area for text and logos; platforms update specs occasionally.",
      ],
      keywords: [
        `مقاسات ${r.ar}`,
        `مقاس صورة ${r.ar}`,
        "تغيير حجم الصور",
        `${r.en} image size`,
        "image resizer",
      ],
      faq: [
        {
          qAr: "هل تُرفع صورتي إلى خادم؟",
          aAr: "لا. التحويل يتم داخل متصفحك عبر Canvas ولا تغادر الصورة جهازك.",
          qEn: "Is my image uploaded?",
          aEn: "No. Resizing happens in your browser.",
        },
        {
          qAr: "أي صيغة أختار؟",
          aAr: "JPEG للصور، PNG للشعارات والشفافية، وWebP لأصغر حجم على الويب.",
          qEn: "Which format?",
          aEn: "JPEG for photos, PNG for logos, WebP for smallest web files.",
        },
      ],
      table: {
        headAr: ["الاستخدام", "العرض", "الارتفاع", "النسبة"],
        headEn: ["Use", "Width", "Height", "Ratio"],
        rows: r.sizes.map((s) => [
          s.name,
          `${s.w}`,
          `${s.h}`,
          (s.w / s.h).toFixed(2),
        ]),
      },
      defaults: { fit: "cover", format: "image/jpeg", quality: 88 },
      params: { platform: r.id, sizes: JSON.stringify(r.sizes) },
    }),
  );

for (const p of adPlatforms)
  for (const i of adIndustries)
    add(
      page("brand", "roas", {
        slug: `${p.id}-ads-roas-${i.id}`,
        titleAr: `حاسبة ميزانية وعائد ${p.ar} لقطاع ${i.ar}`,
        titleEn: `${p.en} budget & ROAS calculator for ${i.en}`,
        descriptionAr: `خطط ميزانية ${p.ar} لقطاع ${i.ar}: النقرات والطلبات والإيراد وROAS ونقطة التعادل والربح بعد الإعلان.`,
        descriptionEn: `Plan ${p.en} for ${i.en}: clicks, orders, revenue, ROAS, break-even and profit after ads.`,
        introAr: `بافتراض تكلفة نقرة ${(i.cpc * p.cpcFactor).toFixed(2)} ريال وتحويل ${(i.cvr * p.cvrFactor).toFixed(1)}% في ${i.ar} على ${p.ar}، هل تربح الحملة؟`,
        introEn: `Assuming SAR ${(i.cpc * p.cpcFactor).toFixed(2)} CPC and ${(i.cvr * p.cvrFactor).toFixed(1)}% conversion, is the campaign profitable?`,
        guideAr: [
          "ROAS وحده لا يكفي: قارنه بـ ROAS التعادل = 100 ÷ هامش الربح. هامش 40% يعني أنك تحتاج 2.5x لتتعادل.",
          p.id === "google"
            ? "جوجل يلتقط نية بحث عالية بتكلفة نقرة أعلى؛ ركّز على كلمات الحجز والأسعار واستبعد كلمات الوظائف والمجاني."
            : "سناب وتيك توك يعتمدان على المحتوى العمودي الأصلي؛ نقرات أرخص لكن التحويل يعتمد على جودة الفيديو وصفحة الهبوط.",
          `في ${i.ar} ابدأ بميزانية اختبار 7–14 يوماً، ثم وسّع 20% أسبوعياً للحملات التي تتجاوز التعادل بهامش أمان.`,
        ],
        guideEn: [
          "Compare ROAS with break-even ROAS = 100 ÷ margin.",
          "Start with a 7–14 day test budget, then scale winners by 20% a week.",
        ],
        keywords: [
          `ميزانية ${p.ar}`,
          `${p.ar} ${i.ar}`,
          "حاسبة ROAS",
          `${p.en} ROAS ${i.en}`,
          "ads budget calculator",
        ],
        faq: [
          {
            qAr: `كم تكلفة النقرة في ${p.ar} لقطاع ${i.ar}؟`,
            aAr: `نفترض ${(i.cpc * p.cpcFactor).toFixed(2)} ريال كبداية؛ الأرقام الفعلية تتغير حسب المنافسة والجمهور والموسم.`,
            qEn: "What CPC should I expect?",
            aEn: `We assume SAR ${(i.cpc * p.cpcFactor).toFixed(2)}; real CPC varies.`,
          },
          {
            qAr: "ما ROAS الجيد؟",
            aAr: "أي ROAS أعلى من نقطة التعادل بـ 30% أو أكثر يعتبر قابلاً للتوسع.",
            qEn: "What is a good ROAS?",
            aEn: "30%+ above break-even is scalable.",
          },
          assumptionsFaq,
        ],
        table: {
          headAr: ["القطاع", "CPC افتراضي", "تحويل افتراضي", "هامش"],
          headEn: ["Industry", "CPC", "CVR", "Margin"],
          rows: adIndustries.map((x) => [
            x.ar,
            (x.cpc * p.cpcFactor).toFixed(2),
            `${(x.cvr * p.cvrFactor).toFixed(1)}%`,
            `${x.margin}%`,
          ]),
        },
        defaults: {
          daily: 150,
          days: 30,
          cpc: Math.round(i.cpc * p.cpcFactor * 100) / 100,
          cvr: Math.round(i.cvr * p.cvrFactor * 10) / 10,
          aov: i.aov,
          margin: i.margin,
        },
        params: { platform: p.id, industry: i.id },
      }),
    );

// ── Cluster 5: AI workforce (100) ───────────────────────────────────────
for (const r of workforceRoles)
  for (const i of workforceIndustries) {
    const salary = Math.round((r.salary * i.factor) / 100) * 100;
    add(
      page("workforce", "employee-roi", {
        slug: `ai-${r.id}-vs-employee-${i.id}`,
        titleAr: `موظف ${r.ar} الذكي مقابل التقليدي في ${i.ar}: حاسبة التوفير`,
        titleEn: `AI ${r.en} vs a traditional hire in ${i.en}: savings calculator`,
        descriptionAr: `قارن تكلفة ${r.ar} التقليدي في ${i.ar} بموظف OneShot الذكي: التوفير الشهري والسنوي وفترة الاسترداد بافتراضاتك.`,
        descriptionEn: `Compare a traditional ${r.en} in ${i.en} with a OneShot AI employee: monthly and yearly savings.`,
        introAr: `${r.ar} يتولى عادة: ${r.tasksAr}. افترضنا أن الذكاء الاصطناعي يتولى ${r.automatable}% من هذا العمل مع إشراف بشري.`,
        introEn: `A ${r.en} typically handles ${r.tasksEn}. We assume AI covers ${r.automatable}% with human oversight.`,
        guideAr: [
          `الراتب الافتراضي لـ${r.ar} في ${i.ar} هنا ${sar(salary)} شهرياً كنقطة بداية؛ عدّله بحسب سوقك.`,
          "التكلفة الحقيقية للموظف تشمل التأمينات الاجتماعية والتأمين الطبي والبدلات والتوظيف والتدريب، وتتضاعف مع تغطية 24/7.",
          "النموذج الأنجح غالباً مختلط: الذكاء الاصطناعي للمهام المتكررة والمسودات، والبشر للعلاقات والقرارات والاستثناءات. قيمة اشتراك الموظف الذكي هنا افتراض قابل للتعديل وليست سعراً رسمياً.",
        ],
        guideEn: [
          `Default salary for a ${r.en} in ${i.en}: ${sar(salary)}/month — adjust for your market.`,
          "The best model is usually hybrid; the AI subscription value is an editable assumption, not an official price.",
        ],
        keywords: [
          `موظف ${r.ar} ذكاء اصطناعي`,
          `تكلفة ${r.ar}`,
          `${r.ar} ${i.ar}`,
          `AI ${r.en}`,
          `${r.en} cost ${i.en}`,
        ],
        faq: [
          {
            qAr: `هل يستبدل الذكاء الاصطناعي ${r.ar} بالكامل؟`,
            aAr: `لا نفترض ذلك؛ نحسب حصة ${r.automatable}% من العمل المتكرر مع بقاء الإشراف البشري.`,
            qEn: `Does AI fully replace a ${r.en}?`,
            aEn: `We assume ${r.automatable}% of repetitive work with human oversight.`,
          },
          {
            qAr: "ما تكلفة موظف OneShot الذكي؟",
            aAr: "القيمة في الحاسبة افتراض تعدّله؛ الخطط الفعلية متاحة في OneShot Workflow.",
            qEn: "What does a OneShot AI employee cost?",
            aEn: "The calculator value is an assumption; see OneShot Workflow for plans.",
          },
          assumptionsFaq,
        ],
        table: {
          headAr: ["الدور", "راتب افتراضي", "قابلية الأتمتة"],
          headEn: ["Role", "Default salary", "Automatable"],
          rows: workforceRoles
            .slice(0, 10)
            .map((x) => [
              x.ar,
              `${Math.round((x.salary * i.factor) / 100) * 100}`,
              `${x.automatable}%`,
            ]),
        },
        defaults: {
          salary,
          overhead: 30,
          hiring: salary,
          headcount: 1,
          shifts: "1",
          share: r.automatable,
          ai: 1500,
          setup: 0,
        },
        params: { role: r.id, industry: i.id },
      }),
    );
  }

// ── Related links ───────────────────────────────────────────────────────
function withRelated(list: Omit<ToolPage, "related">[]): ToolPage[] {
  return list.map((p, index) => {
    const sameEngine = list.filter(
      (x) => x.engine === p.engine && x.slug !== p.slug,
    );
    const at = sameEngine.findIndex((x) => list.indexOf(x) > index);
    const start = at < 0 ? 0 : at;
    const near = [0, 1, 2, 3]
      .map((k) => sameEngine[(start + k) % Math.max(sameEngine.length, 1)])
      .filter(Boolean);
    const other = list.filter(
      (x) => x.cluster === p.cluster && x.engine !== p.engine,
    );
    const cross = other.length
      ? [other[index % other.length], other[(index * 7 + 3) % other.length]]
      : [];
    return {
      ...p,
      related: Array.from(
        new Set([...near, ...cross].map((x) => x.slug)),
      ).slice(0, 6),
    };
  });
}

export const toolPages: ToolPage[] = withRelated(all);
export const toolBySlug = new Map(toolPages.map((p) => [p.slug, p]));
export const findTool = (slug: string) => toolBySlug.get(slug);
export const defaultsOf = (p: ToolPage): Values => ({ ...p.defaults });
