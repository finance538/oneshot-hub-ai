import type { Language } from "../storefront/i18n";

type Four = [string, string, string, string];
type Three = [string, string, string];
export type MarketingCopy = {
  badge: string;
  headline: string;
  intro: string;
  examples: string;
  team: string;
  signInHeadquarters: string;
  enterHeadquarters: string;
  why: string;
  comparisonTitle: string;
  compareBy: string;
  cost: string;
  workflow: string;
  oversight: string;
  columns: Four;
  cells: [Four, Four, Four];
  trustTitles: Three;
  trustBodies: Three;
  marketNote: string;
  comparisonNote: string;
  scrollHint: string;
};

export const marketingCopy = {
  ar: {
    badge: "مقر رقمي وفريق AI بلغتك",
    headline: "مقرّك الرقمي. فريقك في مكان واحد.",
    intro: "خطّط مع مديرك التنفيذي، وتعاون مع موظفي AI بالنص والصوت.",
    examples:
      "سلة، زد، Shopify وWhatsApp — أمثلة قريبة من التجارة الخليجية والعربية.",
    team: "استكشف فريقك",
    signInHeadquarters: "تسجيل الدخول للمقر",
    enterHeadquarters: "ادخل مقرّك",
    why: "لماذا oneShot؟",
    comparisonTitle: "اختر طريقة العمل التي تناسب مرحلتك",
    compareBy: "قارن حسب",
    cost: "التكلفة",
    workflow: "تنظيم العمل",
    oversight: "الإشراف والتنفيذ",
    columns: [
      "التوظيف التقليدي",
      "الشات بوت المعتاد",
      "أدوات AI المنفصلة",
      "oneShot",
    ],
    cells: [
      [
        "رواتب وتجهيزات وتكاليف تختلف حسب السوق والفريق.",
        "قد يبدأ بتكلفة منخفضة؛ تختلف الرسوم بحسب الاستخدام.",
        "قد تحتاج عدة اشتراكات؛ تتفاوت الأسعار والخطط.",
        "ابدأ بتجربة المدير التنفيذي الاستشاري المجاني. توافر الخدمات وتكاليف الربط يختلفان.",
      ],
      [
        "فريق بشري بخبرة ومسؤوليات مباشرة، يحتاج تنسيقاً وإدارة.",
        "مناسب للأسئلة المتكررة؛ التخطيط والتنفيذ يعتمدان على تصميمه وربطه.",
        "تخصصات متنوعة؛ قد تتطلب نقل السياق أو إعداد تكاملات.",
        "سوق كفاءات وتجارب، شات سريع أو مقر تفاعلي، صوت وغرفة اجتماعات.",
      ],
      [
        "البشر ينفذون ضمن الصلاحيات والإجراءات المتفق عليها.",
        "قد ينفذ إجراءات إذا زُوّد بتكاملات وصلاحيات مناسبة.",
        "قد تنفذ مهام متقدمة؛ مستوى المراجعة يختلف بين المنتجات.",
        "البريد بعد الربط والاعتماد؛ بحث بمصادر وتصفح مدعوم. الصوت والاتصالات تحتاج إعداداً، وبقية الأدوار استشارية.",
      ],
    ],
    trustTitles: [
      "جرّب القدرات قبل القرار",
      "حضور مهني يناسب البداية",
      "اختر إيقاع عملك",
    ],
    trustBodies: [
      "شاهد المخرجات والقيود قبل أي التزام؛ التجربة ليست وعداً بتنفيذ غير مفعّل.",
      "اجمع التخطيط والمحتوى في مقر رقمي دون اشتراط مكتب فعلي.",
      "انتقل بين بساطة الشات وتجربة المقر التفاعلي حسب المهمة والجهاز.",
    ],
    marketNote:
      "الأسماء المذكورة أمثلة سوقية، وليست إعلان شراكة أو ضمان تكامل. لا تعني لغة الواجهة وجود شركة مسجلة في ذلك السوق.",
    comparisonNote:
      "مقارنة عامة؛ تختلف القدرات والأسعار حسب المنتج والخطة. لا تمثل ضماناً للتوفير أو النتائج.",
    scrollHint: "مرّر الجدول أفقياً لعرض الخيارات الأربعة.",
  },
  en: {
    badge: "For global founders · Your AI workforce & digital HQ",
    headline: "Build your headquarters. Bring your team together.",
    intro:
      "Plan with your advisory CEO. Work with your AI team through chat and voice.",
    examples:
      "Think Shopify, WooCommerce, Stripe and Gmail — familiar contexts for global commerce.",
    team: "Explore your team",
    signInHeadquarters: "Sign in to your HQ",
    enterHeadquarters: "Enter your HQ",
    why: "Why oneShot?",
    comparisonTitle: "Choose the working model that fits your stage",
    compareBy: "Compare by",
    cost: "Cost",
    workflow: "Workflow",
    oversight: "Oversight & execution",
    columns: [
      "Traditional hiring",
      "Typical chatbots",
      "Separate AI tools",
      "oneShot",
    ],
    cells: [
      [
        "Salaries, equipment and overhead vary by location and team.",
        "Often a low entry cost; usage and service fees vary.",
        "Multiple subscriptions may be needed; plans and prices vary.",
        "Start with the free advisory CEO experience. Service availability and connection costs vary.",
      ],
      [
        "Human expertise and direct accountability, with coordination and management needs.",
        "Useful for recurring questions; planning and actions depend on design and integrations.",
        "Specialist capabilities, sometimes requiring context transfers or integrations.",
        "A talent market with demos, quick chat or an interactive HQ, voice and a meeting room.",
      ],
      [
        "People execute within agreed responsibilities and permissions.",
        "Can perform actions when appropriate integrations and permissions are configured.",
        "May automate advanced tasks; review controls differ by product.",
        "Email after connection and approval; sourced research and supported browsing. Voice and connections require setup; other roles are advisory.",
      ],
    ],
    trustTitles: [
      "Try before you commit",
      "A professional home for a growing business",
      "Work in your own mode",
    ],
    trustBodies: [
      "Inspect outputs and limits before committing; a demo does not promise an inactive capability.",
      "Bring planning and content into a digital headquarters without requiring a physical office.",
      "Switch between focused chat and an interactive office to suit the task and device.",
    ],
    marketNote:
      "Market examples are not partnership or integration claims. Interface language does not imply local company registration.",
    comparisonNote:
      "A general comparison: capabilities and prices vary by product and plan. No savings or outcome is guaranteed.",
    scrollHint: "Scroll horizontally to compare all four options.",
  },
  fr: {
    badge: "Entrepreneurs francophones · Votre équipe IA, votre QG numérique",
    headline: "Votre entreprise mérite plus qu’un outil : un quartier général.",
    intro:
      "De la boutique indépendante aux ambitions internationales, réunissez conseil, création et organisation dans un espace de travail en français.",
    examples:
      "Shopify, PrestaShop et Gmail : des repères pour les commerces de France, d’Europe et d’Afrique francophone.",
    team: "Découvrir l’équipe",
    signInHeadquarters: "Connexion au siège",
    enterHeadquarters: "Ouvrir mon siège",
    why: "Pourquoi oneShot ?",
    comparisonTitle: "Un mode de travail à la mesure de votre activité",
    compareBy: "Comparer par",
    cost: "Coût",
    workflow: "Organisation",
    oversight: "Contrôle et exécution",
    columns: [
      "Recrutement classique",
      "Chatbots courants",
      "Outils IA séparés",
      "oneShot",
    ],
    cells: [
      [
        "Salaires, équipement et frais variables selon le pays et l’équipe.",
        "Un accès souvent peu coûteux ; les frais dépendent de l’usage.",
        "Plusieurs abonnements peuvent être nécessaires, selon les offres.",
        "Commencez par le CEO conseil gratuit. Disponibilité des services et coûts de connexion variables.",
      ],
      [
        "Expertise humaine et responsabilités directes, avec un besoin de coordination.",
        "Adaptés aux questions récurrentes ; planification et actions dépendent des intégrations.",
        "Des fonctions spécialisées, parfois avec des transferts de contexte manuels.",
        "Un marché de talents à essayer, un chat rapide ou un QG interactif, la voix et une salle de réunion.",
      ],
      [
        "Les personnes agissent dans le cadre de leurs responsabilités et autorisations.",
        "Des actions possibles si les connexions et autorisations sont configurées.",
        "Des tâches avancées possibles ; le contrôle varie selon les outils.",
        "E-mails après connexion et validation ; recherche sourcée et navigation compatible. Voix et connexions à configurer ; autres rôles consultatifs.",
      ],
    ],
    trustTitles: [
      "Essayez avant de vous engager",
      "Une présence professionnelle dès le départ",
      "Votre rythme, votre espace",
    ],
    trustBodies: [
      "Évaluez les résultats et les limites ; une démonstration ne garantit pas une fonction inactive.",
      "Réunissez stratégie et contenus dans un QG numérique sans imposer de bureau physique.",
      "Passez du chat au bureau interactif selon votre tâche et votre appareil.",
    ],
    marketNote:
      "Les exemples ne constituent ni un partenariat ni une garantie d’intégration. La langue ne signifie pas une immatriculation locale.",
    comparisonNote:
      "Comparaison générale : fonctions et tarifs varient selon les offres. Aucune économie ni résultat garanti.",
    scrollHint: "Faites défiler horizontalement pour voir les quatre options.",
  },
  tr: {
    badge: "Türkçe e-ticaret için · Dijital merkeziniz, yapay zekâ ekibiniz",
    headline: "Bir araçla yetinmeyin. İşinizin dijital merkezini kurun.",
    intro:
      "Mağazanızın günlük işlerinden büyüme planlarına: danışman CEO, uzman demoları ve marka çalışmalarını Türkçe bir çalışma alanında buluşturun.",
    examples:
      "Trendyol, Shopify ve Gmail: Türkçe e-ticaret yapan işletmelere tanıdık örnekler.",
    team: "Ekibi keşfedin",
    signInHeadquarters: "Merkeze giriş yap",
    enterHeadquarters: "Merkezini aç",
    why: "Neden oneShot?",
    comparisonTitle: "İşinizin aşamasına uygun çalışma biçimini seçin",
    compareBy: "Karşılaştırma ölçütü",
    cost: "Maliyet",
    workflow: "İş akışı",
    oversight: "Kontrol ve uygulama",
    columns: [
      "Geleneksel işe alım",
      "Standart sohbet botları",
      "Ayrı yapay zekâ araçları",
      "oneShot",
    ],
    cells: [
      [
        "Maaş, ekipman ve genel giderler pazara ve ekibe göre değişir.",
        "Başlangıç maliyeti düşük olabilir; kullanım ücretleri değişir.",
        "Birden fazla abonelik gerekebilir; fiyatlar plana göre değişir.",
        "Ücretsiz danışman CEO deneyimiyle başlayın. Hizmet erişimi ve bağlantı maliyetleri değişir.",
      ],
      [
        "İnsan uzmanlığı ve doğrudan sorumluluk; koordinasyon ve yönetim gerektirir.",
        "Tekrarlanan sorulara uygundur; planlama ve işlemler entegrasyonlara bağlıdır.",
        "Uzmanlaşmış özellikler; bağlam aktarımı veya entegrasyon gerekebilir.",
        "Denemeler sunan yetenek pazarı, hızlı sohbet veya etkileşimli merkez, ses ve toplantı odası.",
      ],
      [
        "İnsanlar belirlenen görev ve yetkiler çerçevesinde işlem yapar.",
        "Uygun bağlantı ve izinlerle işlem yapabilir.",
        "Gelişmiş görevler mümkün olabilir; denetim ürüne göre değişir.",
        "E-posta bağlantı ve onay sonrası gönderilir; kaynaklı araştırma ve desteklenen gezinme sunulur. Ses ve bağlantılar kurulum ister; diğer roller danışmandır.",
      ],
    ],
    trustTitles: [
      "Karar vermeden deneyin",
      "Yeni işletmelere profesyonel bir merkez",
      "Çalışma biçiminizi siz seçin",
    ],
    trustBodies: [
      "Çıktıları ve sınırları inceleyin; demo, etkin olmayan bir özelliğin vaadi değildir.",
      "Fiziksel ofis gerektirmeden planlama ve içeriği dijital merkezde birleştirin.",
      "Görevinize ve cihazınıza göre sohbet ile etkileşimli ofis arasında geçin.",
    ],
    marketNote:
      "Örnekler ortaklık veya entegrasyon garantisi değildir. Arayüz dili, o ülkede şirket kaydı olduğu anlamına gelmez.",
    comparisonNote:
      "Genel karşılaştırmadır; özellik ve fiyatlar ürüne ve plana göre değişir. Tasarruf veya sonuç garantisi verilmez.",
    scrollHint: "Dört seçeneği görmek için tabloyu yatay kaydırın.",
  },
  es: {
    badge: "Para negocios en español · Tu equipo IA y tu sede digital",
    headline: "Tu negocio necesita más que herramientas. Dale una sede.",
    intro:
      "De tu tienda local a nuevos mercados: reúne planificación, especialistas y creación de marca en un espacio pensado para emprender en español.",
    examples:
      "Shopify, WooCommerce y Gmail: ejemplos para negocios de España y América Latina.",
    team: "Descubre tu equipo",
    signInHeadquarters: "Inicia sesión en tu sede",
    enterHeadquarters: "Entra en tu sede",
    why: "¿Por qué oneShot?",
    comparisonTitle: "Elige cómo trabajar según la etapa de tu negocio",
    compareBy: "Comparar por",
    cost: "Coste",
    workflow: "Organización",
    oversight: "Control y ejecución",
    columns: [
      "Contratación tradicional",
      "Chatbots habituales",
      "Herramientas IA separadas",
      "oneShot",
    ],
    cells: [
      [
        "Sueldos, equipos y gastos varían según el mercado y el equipo.",
        "El coste inicial puede ser bajo; las tarifas dependen del uso.",
        "Pueden requerir varias suscripciones, con precios diferentes.",
        "Empieza con el CEO asesor gratuito. La disponibilidad y los costes de conexión varían.",
      ],
      [
        "Experiencia humana y responsabilidad directa; requiere coordinación.",
        "Útiles para consultas frecuentes; planificar y actuar depende de las integraciones.",
        "Funciones especializadas; puede ser necesario trasladar contexto entre herramientas.",
        "Un mercado de talentos con demos, chat rápido o sede interactiva, voz y sala de reuniones.",
      ],
      [
        "Las personas ejecutan según las funciones y permisos acordados.",
        "Pueden actuar con las integraciones y los permisos adecuados.",
        "Pueden automatizar tareas avanzadas; el control depende del producto.",
        "Correo tras conexión y aprobación; investigación con fuentes y navegación compatible. Voz y conexiones requieren configuración; los demás roles son consultivos.",
      ],
    ],
    trustTitles: [
      "Prueba antes de decidir",
      "Una sede profesional para empezar",
      "Trabaja a tu manera",
    ],
    trustBodies: [
      "Revisa resultados y límites; una demo no promete funciones sin activar.",
      "Reúne planificación y contenidos sin necesitar una oficina física.",
      "Alterna entre chat y oficina interactiva según la tarea y el dispositivo.",
    ],
    marketNote:
      "Los ejemplos no indican alianzas ni garantizan integraciones. El idioma no implica que exista una sociedad registrada localmente.",
    comparisonNote:
      "Comparación general: funciones y precios varían según producto y plan. Sin garantía de ahorro ni resultados.",
    scrollHint:
      "Desplaza la tabla horizontalmente para ver las cuatro opciones.",
  },
  zh: {
    badge: "面向跨境电商 · 你的 AI 团队与数字总部",
    headline: "不止添一款工具，为业务建立数字总部。",
    intro:
      "从产品定位到海外市场规划，把顾问、专业角色体验与品牌内容放在同一个工作空间，支持你的全球业务思考。",
    examples:
      "以 Shopify、WooCommerce 和 Gmail 为场景示例，关注跨境店铺与国际客户沟通。",
    team: "探索团队",
    signInHeadquarters: "登录你的总部",
    enterHeadquarters: "进入你的总部",
    why: "为什么选择 oneShot？",
    comparisonTitle: "根据业务阶段选择工作方式",
    compareBy: "比较维度",
    cost: "成本",
    workflow: "工作组织",
    oversight: "监督与执行",
    columns: ["传统招聘", "常见聊天机器人", "独立 AI 工具", "oneShot"],
    cells: [
      [
        "薪酬、设备和办公成本因地区及团队而异。",
        "入门成本可能较低，具体费用取决于用量。",
        "可能需要多个订阅，套餐和价格各不相同。",
        "从免费的 CEO 顾问体验开始。服务可用性及连接费用有所不同。",
      ],
      [
        "拥有人的经验与直接责任，也需要协调和管理。",
        "适合常见问答；规划和执行能力取决于设计与集成。",
        "提供专业功能，但可能需要手动传递上下文或配置集成。",
        "可体验的人才市场、快捷聊天或互动总部，以及语音和会议室。",
      ],
      [
        "人员在约定的职责和授权范围内执行工作。",
        "配置适当的集成与权限后，可执行操作。",
        "可能支持复杂任务，审核机制因产品而异。",
        "邮件需连接并确认后发送；研究附来源，浏览仅支持兼容场景。语音和连接需配置，其他角色提供建议。",
      ],
    ],
    trustTitles: ["体验后再决定", "为起步阶段建立专业形象", "按自己的节奏工作"],
    trustBodies: [
      "查看输出和限制；演示不代表未启用的功能已经可用。",
      "将规划和内容汇集在数字总部，无需先设立实体办公室。",
      "根据任务和设备，在简洁聊天与互动办公室之间切换。",
    ],
    marketNote:
      "所列平台仅为市场场景示例，不代表合作关系或集成保证。界面语言不代表在当地注册公司。",
    comparisonNote:
      "这是一般性比较，功能和价格随产品与套餐变化，不保证节省费用或业务结果。",
    scrollHint: "横向滚动表格，查看全部四种选择。",
  },
  hi: {
    badge: "हिंदी में बढ़ते कारोबार के लिए · आपका AI दल और डिजिटल कार्यालय",
    headline: "सिर्फ एक टूल नहीं। अपने कारोबार का डिजिटल कार्यालय बनाइए।",
    intro:
      "नई दुकान से बढ़ते स्टार्टअप तक: सलाहकार CEO, विशेषज्ञों के डेमो और ब्रांड सामग्री को एक ही कार्यस्थल पर साथ लाइए।",
    examples:
      "Shopify, WooCommerce और Gmail — ऑनलाइन दुकानों और डिजिटल सेवाओं के परिचित उदाहरण।",
    team: "अपनी टीम खोजें",
    signInHeadquarters: "कार्यालय में लॉग इन करें",
    enterHeadquarters: "अपना कार्यालय खोलें",
    why: "oneShot क्यों?",
    comparisonTitle: "अपने कारोबार के चरण के अनुसार काम करने का तरीका चुनें",
    compareBy: "तुलना का आधार",
    cost: "लागत",
    workflow: "काम का संगठन",
    oversight: "निगरानी और कार्रवाई",
    columns: ["पारंपरिक भर्ती", "सामान्य चैटबॉट", "अलग-अलग AI टूल", "oneShot"],
    cells: [
      [
        "वेतन, उपकरण और कार्यालय का खर्च बाजार और टीम पर निर्भर करता है।",
        "शुरुआती लागत कम हो सकती है; शुल्क उपयोग पर निर्भर हैं।",
        "कई सदस्यताओं की जरूरत हो सकती है; योजनाओं के दाम अलग हैं।",
        "मुफ्त सलाहकार CEO अनुभव से शुरू करें। सेवाओं की उपलब्धता और कनेक्शन की लागत अलग हो सकती है।",
      ],
      [
        "मानवीय अनुभव और सीधी जिम्मेदारी, साथ में समन्वय की जरूरत।",
        "बार-बार पूछे जाने वाले सवालों के लिए उपयोगी; योजना और कार्रवाई इंटीग्रेशन पर निर्भर हैं।",
        "विशेष सुविधाएं; संदर्भ साझा करने या इंटीग्रेशन की जरूरत हो सकती है।",
        "डेमो वाला प्रतिभा बाजार, तेज चैट या इंटरैक्टिव कार्यालय, आवाज और बैठक कक्ष।",
      ],
      [
        "लोग तय जिम्मेदारियों और अनुमतियों के दायरे में काम करते हैं।",
        "उचित इंटीग्रेशन और अनुमति मिलने पर कार्रवाई कर सकते हैं।",
        "जटिल काम संभव हो सकते हैं; समीक्षा के तरीके उत्पाद के अनुसार बदलते हैं।",
        "कनेक्शन और मंजूरी के बाद ईमेल; स्रोतों सहित खोज और समर्थित ब्राउज़िंग। आवाज और कनेक्शन के लिए सेटअप जरूरी है; अन्य भूमिकाएं सलाह देती हैं।",
      ],
    ],
    trustTitles: [
      "फैसला लेने से पहले आजमाएं",
      "शुरुआत से पेशेवर उपस्थिति",
      "अपने तरीके से काम करें",
    ],
    trustBodies: [
      "नतीजे और सीमाएं देखें; डेमो किसी निष्क्रिय सुविधा का वादा नहीं है।",
      "भौतिक कार्यालय की जरूरत के बिना योजना और सामग्री को साथ रखें।",
      "काम और डिवाइस के हिसाब से चैट और इंटरैक्टिव कार्यालय के बीच बदलें।",
    ],
    marketNote:
      "ये बाजार के उदाहरण हैं, साझेदारी या इंटीग्रेशन की गारंटी नहीं। इंटरफेस की भाषा स्थानीय कंपनी पंजीकरण का दावा नहीं है।",
    comparisonNote:
      "यह सामान्य तुलना है; सुविधाएं और कीमतें उत्पाद और योजना के अनुसार बदलती हैं। बचत या नतीजों की गारंटी नहीं है।",
    scrollHint: "चारों विकल्प देखने के लिए तालिका को आड़ा स्क्रॉल करें।",
  },
  ur: {
    badge: "اردو میں کاروبار کے لیے · آپ کی AI ٹیم اور ڈیجیٹل دفتر",
    headline: "صرف ایک ٹول نہیں۔ اپنے کاروبار کا ڈیجیٹل دفتر بنائیں۔",
    intro:
      "پاکستان، خلیج اور دنیا بھر کے اردو بولنے والے تاجروں کے لیے: مشاورتی CEO، ماہرین کے ڈیمو اور برانڈ کے کام ایک جگہ۔",
    examples:
      "Shopify، WooCommerce اور WhatsApp — آن لائن دکانوں اور صارفین سے رابطے کی مانوس مثالیں۔",
    team: "اپنی ٹیم دریافت کریں",
    signInHeadquarters: "دفتر میں لاگ اِن کریں",
    enterHeadquarters: "اپنا دفتر کھولیں",
    why: "oneShot کیوں؟",
    comparisonTitle: "اپنے کاروبار کے مرحلے کے مطابق کام کا طریقہ چنیں",
    compareBy: "موازنہ کریں",
    cost: "لاگت",
    workflow: "کام کی ترتیب",
    oversight: "نگرانی اور عمل",
    columns: ["روایتی بھرتی", "عام چیٹ بوٹس", "الگ الگ AI ٹولز", "oneShot"],
    cells: [
      [
        "تنخواہیں، آلات اور دفتر کے اخراجات بازار اور ٹیم کے مطابق بدلتے ہیں۔",
        "ابتدائی لاگت کم ہو سکتی ہے؛ فیس استعمال کے مطابق ہوتی ہے۔",
        "کئی سبسکرپشن درکار ہو سکتے ہیں؛ منصوبوں کی قیمتیں مختلف ہیں۔",
        "مفت مشاورتی CEO کے تجربے سے شروع کریں۔ خدمات کی دستیابی اور رابطے کی لاگت مختلف ہو سکتی ہے۔",
      ],
      [
        "انسانی تجربہ اور براہ راست ذمہ داری، ساتھ ہی انتظام اور رابطے کی ضرورت۔",
        "بار بار پوچھے جانے والے سوالات کے لیے مفید؛ منصوبہ بندی اور عمل انضمام پر منحصر ہیں۔",
        "خصوصی صلاحیتیں؛ سیاق منتقل کرنے یا انضمام کی ضرورت پڑ سکتی ہے۔",
        "ڈیمو کے ساتھ مہارتوں کی مارکیٹ، فوری چیٹ یا انٹرایکٹو دفتر، آواز اور اجلاس کا کمرہ۔",
      ],
      [
        "لوگ طے شدہ ذمہ داریوں اور اختیارات کے تحت کام کرتے ہیں۔",
        "مناسب رابطوں اور اجازت کے ساتھ کارروائی کر سکتے ہیں۔",
        "پیچیدہ کام ممکن ہو سکتے ہیں؛ جائزے کا طریقہ ہر ٹول میں مختلف ہے۔",
        "ای میل رابطے اور منظوری کے بعد؛ حوالوں کے ساتھ تحقیق اور معاون براؤزنگ۔ آواز اور رابطوں کی ترتیب ضروری ہے؛ دیگر کردار مشاورتی ہیں۔",
      ],
    ],
    trustTitles: [
      "فیصلے سے پہلے آزمائیں",
      "نئے کاروبار کے لیے پیشہ ورانہ موجودگی",
      "اپنی سہولت سے کام کریں",
    ],
    trustBodies: [
      "نتائج اور حدود دیکھیں؛ ڈیمو غیر فعال صلاحیت کا وعدہ نہیں ہے۔",
      "حقیقی دفتر کی شرط کے بغیر منصوبہ بندی اور مواد ایک جگہ جمع کریں۔",
      "کام اور ڈیوائس کے مطابق چیٹ اور انٹرایکٹو دفتر کے درمیان بدلیں۔",
    ],
    marketNote:
      "یہ بازار کی مثالیں ہیں، شراکت یا انضمام کی ضمانت نہیں۔ زبان کا انتخاب مقامی کمپنی رجسٹریشن کا دعویٰ نہیں ہے۔",
    comparisonNote:
      "یہ عمومی موازنہ ہے؛ صلاحیتیں اور قیمتیں پراڈکٹ اور منصوبے کے مطابق بدلتی ہیں۔ بچت یا نتائج کی ضمانت نہیں۔",
    scrollHint:
      "چاروں اختیارات دیکھنے کے لیے جدول کو افقی سمت میں اسکرول کریں۔",
  },
} satisfies Record<Language, MarketingCopy>;
