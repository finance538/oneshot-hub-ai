// Smart Merchant Guide: white-hat, high-value reference pages.
// Each guide is unique, interactive content — never duplicated filler.
export type GuideWidget = "roas-mini" | "automation-time" | "photo-checklist";

export interface GuideTable {
  headAr: [string, string, string];
  headEn: [string, string, string];
  rowsAr: [string, string, string][];
  rowsEn: [string, string, string][];
}

export interface GuideSection {
  headingAr: string;
  headingEn: string;
  bodyAr: string[];
  bodyEn: string[];
  bulletsAr?: string[];
  bulletsEn?: string[];
  table?: GuideTable;
  widget?: GuideWidget;
}

export interface Guide {
  slug: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  keywordsAr: string[];
  readingMinutes: number;
  updatedAt: string;
  sections: GuideSection[];
}

export const guides: Guide[] = [
  {
    slug: "payment-gateways",
    titleAr: "دليل ربط بوابات الدفع للمتاجر السعودية",
    titleEn: "Payment Gateway Integration Guide for Saudi Stores",
    descriptionAr:
      "كيف تختار بوابة الدفع المناسبة لمتجرك: دعم مدى وApple Pay، أنواع الربط، وخطوات التفعيل الآمن دون لمس بيانات البطاقات.",
    descriptionEn:
      "How to choose the right payment gateway: mada and Apple Pay support, integration types, and safe activation steps.",
    keywordsAr: ["ربط بوابات الدفع", "بوابات الدفع السعودية", "مدى", "Apple Pay"],
    readingMinutes: 7,
    updatedAt: "2026-10-23",
    sections: [
      {
        headingAr: "ما الذي تدفعه فعلاً؟ مكوّنات تكلفة البوابة",
        headingEn: "What do you actually pay? Gateway cost components",
        bodyAr: [
          "تتقاضى بوابات الدفع عادةً نسبة من كل عملية ناجحة مضافاً إليها مبلغ ثابت بسيط، وقد تختلف النسبة بين مدى والبطاقات الائتمانية الدولية. قبل المقارنة اطلب جدول الرسوم الرسمي الحالي من كل مزود، لأن العروض تتغير باستمرار.",
          "انتبه للتكاليف الخفية: رسوم التفعيل لمرة واحدة، الاشتراك الشهري لبعض الباقات، ورسوم استرداد المبالغ. التاجر الذكي يحسب التكلفة على حجم مبيعاته الشهري الفعلي لا على النسبة المعلنة وحدها.",
        ],
        bodyEn: [
          "Gateways usually charge a percentage per successful transaction plus a small fixed fee, and rates may differ between mada and international cards. Always request the current official fee schedule before comparing.",
          "Watch for hidden costs: one-time setup fees, monthly plan fees, and refund charges. Calculate cost against your actual monthly volume, not the advertised rate alone.",
        ],
      },
      {
        headingAr: "جدول المقارنة: ماذا تدعم كل بوابة؟",
        headingEn: "Comparison table: what does each gateway support?",
        bodyAr: [
          "الجدول التالي يلخص المعايير التي تهم المتجر السعودي. تحقق من التفاصيل الحالية في المواقع الرسمية قبل التعاقد.",
        ],
        bodyEn: [
          "The table below summarizes the criteria that matter for a Saudi store. Verify current details on official sites before signing.",
        ],
        table: {
          headAr: ["المعيار", "لماذا يهمك؟", "ماذا تسأل عنه؟"],
          headEn: ["Criterion", "Why it matters", "What to ask"],
          rowsAr: [
            ["دعم مدى", "أغلب عملائك يدفعون بمدى", "هل مدى مفعّل افتراضياً أم يتطلب طلباً؟"],
            ["المحافظ الرقمية", "Apple Pay يرفع التحويل على الجوال", "هل Apple Pay وGoogle Pay مدعومة؟"],
            ["صفحة الدفع", "ثقة العميل لحظة الدفع", "صفحة مستضافة أم دفع مدمج داخل متجرك؟"],
            ["التسوية المالية", "سيولتك اليومية", "خلال كم يوم تصل الأموال لحسابك البنكي؟"],
            ["الدعم العربي", "حل المشاكل بسرعة", "هل يوجد دعم فني بالعربية على مدار الساعة؟"],
          ],
          rowsEn: [
            ["mada support", "Most customers pay with mada", "Is mada enabled by default?"],
            ["Digital wallets", "Apple Pay lifts mobile conversion", "Are Apple Pay and Google Pay supported?"],
            ["Checkout page", "Customer trust at payment time", "Hosted page or embedded checkout?"],
            ["Settlement", "Your daily cash flow", "How many days until funds reach your bank?"],
            ["Arabic support", "Fast issue resolution", "Is 24/7 Arabic support available?"],
          ],
        },
      },
      {
        headingAr: "القاعدة الذهبية: لا تجمع بيانات البطاقات أبداً",
        headingEn: "The golden rule: never collect card data",
        bodyAr: [
          "الطريقة الآمنة الوحيدة للتاجر هي تحويل العميل إلى صفحة الدفع الرسمية للمزود (صفحة مستضافة) أو استخدام مكوّن الترميز الرسمي، بحيث لا تمر أرقام البطاقات عبر سيرفرات متجرك إطلاقاً.",
          "أي حل يطلب منك تخزين أرقام البطاقات أو رموز CVV في متجرك مرفوض تماماً: يعرّضك لمسؤولية نظامية جسيمة ويفقدك ثقة عملائك.",
        ],
        bodyEn: [
          "The only safe approach is redirecting customers to the provider's official checkout page or using its official tokenization component, so card numbers never touch your servers.",
          "Any solution asking you to store card numbers or CVV codes is unacceptable: it creates serious compliance liability and destroys customer trust.",
        ],
        bulletsAr: [
          "استخدم صفحة دفع مستضافة أو ترميزاً رسمياً فقط",
          "فعّل التحقق 3D Secure للعمليات المشبوهة",
          "طابق المبلغ والعملة مع الطلب قبل التأكيد",
        ],
        bulletsEn: [
          "Use hosted checkout or official tokenization only",
          "Enable 3D Secure verification for risky transactions",
          "Match amount and currency with the order before confirming",
        ],
      },
      {
        headingAr: "جرّب الحاسبة: ما عائد حملتك الإعلانية المتوقع؟",
        headingEn: "Try the calculator: your expected campaign return",
        bodyAr: [
          "قبل أن تشحن رصيدك الإعلاني، قدّر العائد بميزانيتك ومتوسط قيمة طلبك. الأرقام استرشادية من افتراضات سوقية معلنة وليست ضماناً للنتائج.",
        ],
        bodyEn: [
          "Before topping up your ad budget, estimate returns from your budget and average order value. Figures are indicative market-based estimates, not guarantees.",
        ],
        widget: "roas-mini",
      },
    ],
  },
  {
    slug: "store-automation",
    titleAr: "دليل أتمتة المتاجر: من الطلب حتى التسليم",
    titleEn: "Store Automation Guide: From Order to Delivery",
    descriptionAr:
      "خارطة عملية لأتمتة متجرك: تأكيد الطلبات، الفواتير، التتبع، وربط المخزون — مع حاسبة تفاعلية لوقت التوفير الشهري.",
    descriptionEn:
      "A practical automation map: order confirmation, invoicing, tracking and inventory — with an interactive time-savings calculator.",
    keywordsAr: ["أتمتة المتاجر", "أتمتة الطلبات", "إدارة المخزون"],
    readingMinutes: 6,
    updatedAt: "2026-10-23",
    sections: [
      {
        headingAr: "ابدأ من الاختناق: أين يضيع وقتك؟",
        headingEn: "Start from the bottleneck: where does your time go?",
        bodyAr: [
          "معظم المتاجر الصغيرة تختنق في ثلاث نقاط: تأكيد الطلبات عبر الرسائل يدوياً، إصدار الفواتير وبوليصات الشحن واحدة واحدة، والرد على سؤال «وين طلبي؟» عشرات المرات يومياً.",
          "سجّل لمدة أسبوع واحد كم دقيقة تقضيها في كل مهمة متكررة. هذا السجل هو بوصلة الأتمتة: ابدأ بالمهمة الأعلى تكلفة زمنية، لا بالأداة الأكثر بريقاً.",
        ],
        bodyEn: [
          "Most small stores choke at three points: manual order confirmation over messages, issuing invoices and shipping labels one by one, and answering “where is my order?” dozens of times daily.",
          "Log for one week how many minutes each repeated task costs you. That log is your automation compass: start with the costliest task, not the shiniest tool.",
        ],
      },
      {
        headingAr: "خارطة الأتمتة الأربع: رتّبها بهذا الترتيب",
        headingEn: "The four automation layers, in this order",
        bodyAr: [
          "الترتيب مهم: أتمتة الطبقات السفلية أولاً تمنحك عائداً فورياً وتموّل الخطوات التالية.",
        ],
        bodyEn: [
          "Order matters: automating lower layers first gives instant returns that fund the next steps.",
        ],
        bulletsAr: [
          "تأكيد الطلب الفوري: رسالة آلية برقم الطلب وملخصه لحظة الدفع",
          "التتبع الذاتي: رابط تتبع يغني العميل عن سؤالك",
          "الفوترة والمخزون: خصم تلقائي من المخزون وفاتورة PDF جاهزة",
          "إعادة الاستهداف: تذكير بأصحاب السلات المتروكة بعد 24 ساعة",
        ],
        bulletsEn: [
          "Instant confirmation: automated message with order number at payment time",
          "Self tracking: a tracking link that answers customers for you",
          "Invoicing and inventory: automatic stock deduction and ready PDF invoices",
          "Retargeting: abandoned-cart reminders after 24 hours",
        ],
      },
      {
        headingAr: "حاسبة التوفير: كم ساعة تستعيد شهرياً؟",
        headingEn: "Savings calculator: how many hours do you reclaim monthly?",
        bodyAr: [
          "أدخل أرقام متجرك الحقيقية وشاهد حجم الوقت المستعاد عند أتمتة المهام المتكررة.",
        ],
        bodyEn: [
          "Enter your real store numbers and see the hours reclaimed by automating repeated tasks.",
        ],
        widget: "automation-time",
      },
    ],
  },
  {
    slug: "ai-employees",
    titleAr: "دليل موظفي الذكاء الاصطناعي للأعمال",
    titleEn: "AI Employees Guide for Businesses",
    descriptionAr:
      "ما الذي يفعله موظف AI فعلاً؟ المهام المناسبة، حدود الصلاحيات، وكيف تقيس العائد قبل التوظيف.",
    descriptionEn:
      "What an AI employee actually does: suitable tasks, permission boundaries, and how to measure ROI before hiring.",
    keywordsAr: ["موظفي الذكاء الاصطناعي", "موظف AI", "أتمتة خدمة العملاء"],
    readingMinutes: 6,
    updatedAt: "2026-10-23",
    sections: [
      {
        headingAr: "موظف AI مساعد استشاري — وليس بديلاً عنك",
        headingEn: "An AI employee is an advisory assistant, not your replacement",
        bodyAr: [
          "موظف الذكاء الاصطناعي يتفوق في ثلاث مناطق: صياغة المحتوى والردود بسرعة، تلخيص البيانات والتقارير، والرد الفوري على الاستفسارات المتكررة بمعلومات موثقة من كتالوجك.",
          "لكنه لا يملك صلاحية تنفيذية: لا ينفذ مدفوعات، لا يغيّر أسعاراً، ولا يرسل التزامات باسمك دون مراجعتك. أي مزود يعدك بغير ذلك يبيعك الوهم.",
        ],
        bodyEn: [
          "An AI employee excels in three areas: drafting content and replies fast, summarizing data and reports, and instantly answering repeated questions from your catalog.",
          "But it holds no executive authority: no payments, no price changes, no commitments in your name without your review. Any provider promising otherwise is selling an illusion.",
        ],
      },
      {
        headingAr: "جدول المهام: ما الذي توكله وما الذي تُبقيه؟",
        headingEn: "Task table: what to delegate and what to keep",
        bodyAr: [
          "استخدم هذا الجدول عند توزيع العمل بين فريقك البشري وموظفي AI.",
        ],
        bodyEn: [
          "Use this table when splitting work between your human team and AI employees.",
        ],
        table: {
          headAr: ["المهمة", "موظف AI", "إشراف بشري"],
          headEn: ["Task", "AI employee", "Human oversight"],
          rowsAr: [
            ["الرد على الأسئلة المتكررة", "يرد فورياً من المعرفة الموثقة", "مراجعة أسبوعية للردود"],
            ["صياغة وصف المنتجات", "مسودات أولى خلال دقائق", "اعتماد النشر النهائي"],
            ["تلخيص تقارير المبيعات", "ملخص تنفيذي عند الطلب", "قرارات الشراء والتسعير لك"],
            ["استقبال الشكاوى الحساسة", "يسجّل ويصنّف فقط", "المعالجة والاعتذار بشري"],
            ["المدفوعات والاسترداد", "ممنوع تماماً", "تنفيذ بشري موثق"],
          ],
          rowsEn: [
            ["Answering repeated questions", "Instant replies from verified knowledge", "Weekly reply review"],
            ["Drafting product descriptions", "First drafts in minutes", "Final publish approval"],
            ["Summarizing sales reports", "Executive summary on demand", "Buying and pricing decisions stay yours"],
            ["Handling sensitive complaints", "Log and classify only", "Resolution stays human"],
            ["Payments and refunds", "Strictly forbidden", "Documented human execution"],
          ],
        },
      },
      {
        headingAr: "كيف تقيس العائد قبل أن توظف؟",
        headingEn: "How to measure ROI before you hire",
        bodyAr: [
          "اختر مهمة واحدة قابلة للقياس — مثلاً زمن الرد على استفسارات الواتساب — وقِسها أسبوعين قبل وبعد تفعيل موظف AI. المعيار الذهبي: انخفاض زمن الاستجابة مع ثبات رضا العملاء أو ارتفاعه.",
          "ابدأ بموظف واحد ومهمة واحدة. التوسع قبل إثبات العائد هو الطريق الأسرع لفاتورة بلا قيمة.",
        ],
        bodyEn: [
          "Pick one measurable task — e.g. WhatsApp response time — and measure it two weeks before and after activating an AI employee. The gold standard: lower response time with steady or higher satisfaction.",
          "Start with one employee and one task. Scaling before proving ROI is the fastest road to a worthless bill.",
        ],
      },
    ],
  },
  {
    slug: "commercial-photography",
    titleAr: "دليل التصوير التجاري الاحترافي للمنتجات",
    titleEn: "Professional Commercial Product Photography Guide",
    descriptionAr:
      "كيف تجهّز منتجاتك لجلسة تصوير تبيع: الإضاءة، الزوايا، المقاسات، وقائمة تحقق تفاعلية قبل الحجز.",
    descriptionEn:
      "How to prepare products for a shoot that sells: lighting, angles, sizes, and an interactive pre-booking checklist.",
    keywordsAr: ["التصوير التجاري", "تصوير المنتجات", "تصوير إعلاني"],
    readingMinutes: 5,
    updatedAt: "2026-10-23",
    sections: [
      {
        headingAr: "الصورة تبيع قبل السعر: لماذا؟",
        headingEn: "The photo sells before the price: why?",
        bodyAr: [
          "المتسوق الإلكتروني لا يلمس منتجك؛ الصورة هي يده وعينه. المنتجات المصورة بإضاءة نظيفة وخلفية موحدة تحقق معدلات نقر وإضافة للسلة أعلى بكثير من صور الجوال العشوائية — لأنها تختصر الشك.",
          "القاعدة العملية: 5 صور على الأقل لكل منتج — عامة، قريبة للتفاصيل، زاوية استخدام، مقاس/حجم بمرجع، وصورة سياقية (lifestyle).",
        ],
        bodyEn: [
          "Online shoppers cannot touch your product; the photo is their hand and eye. Clean-lit, consistent-background shots earn far higher click and add-to-cart rates than casual phone photos — because they remove doubt.",
          "The practical rule: at least 5 shots per product — hero, detail close-up, usage angle, size reference, and one lifestyle shot.",
        ],
      },
      {
        headingAr: "جدول المقاسات: ماذا تطلب من الاستوديو؟",
        headingEn: "Size table: what to request from the studio",
        bodyAr: [
          "اطلب ملفاتك بهذه المقاسات من البداية لتتفادى إعادة التصوير عند إطلاق حملتك.",
        ],
        bodyEn: [
          "Request your files in these sizes upfront to avoid reshooting when your campaign launches.",
        ],
        table: {
          headAr: ["الاستخدام", "المقاس", "ملاحظة"],
          headEn: ["Usage", "Size", "Note"],
          rowsAr: [
            ["صفحة المنتج", "2000 × 2000 بكسل", "خلفية بيضاء أو موحدة"],
            ["إعلان سناب وتيك توك", "1080 × 1920 بكسل", "عمودي بمساحة آمنة للنص"],
            ["بانر المتجر", "1920 × 600 بكسل", "النص في الثلث الأيمن"],
            ["انستقرام مربع", "1080 × 1080 بكسل", "المنتج في المركز"],
          ],
          rowsEn: [
            ["Product page", "2000 × 2000 px", "White or uniform background"],
            ["Snap and TikTok ads", "1080 × 1920 px", "Vertical with safe text area"],
            ["Store banner", "1920 × 600 px", "Text in the right third"],
            ["Instagram square", "1080 × 1080 px", "Product centered"],
          ],
        },
      },
      {
        headingAr: "قائمة التحقق التفاعلية: هل منتجك جاهز؟",
        headingEn: "Interactive checklist: is your product ready?",
        bodyAr: [
          "أكمل القائمة التالية قبل حجز جلستك — كل بند غير جاهز يؤخر تسليم صورك.",
        ],
        bodyEn: [
          "Complete this list before booking — every unready item delays your delivery.",
        ],
        widget: "photo-checklist",
      },
    ],
  },
];

export const guideBySlug = (slug: string) =>
  guides.find((g) => g.slug === slug);
