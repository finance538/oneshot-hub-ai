import type { Language } from "../storefront/i18n";
import type { EcosystemAppId } from "../../shared/ecosystem";

/** Marketing copy for "Your space" (مساحتك): the ONESHOTHUB showcase. */
export interface SpaceCopy {
  kicker: string;
  title: string;
  lead: string;
  plainLabel: string;
  plain: string;
  stepsTitle: string;
  steps: [string, string, string];
  trust: [string, string, string, string];
  servicesTitle: string;
  servicesIntro: string;
  roles: Record<EcosystemAppId, string>;
  productsTitle: string;
  productsIntro: string;
  productsLoading: string;
  productsEmpty: string;
  productsError: string;
  startsAt: string;
  price: string;
  monthly: string;
  delivery: (days: number) => string;
  quote: string;
  details: string;
  allProducts: string;
  enter: string;
  enterGuest: string;
  current: string;
  pageTitle: string;
  pageIntro: string;
  portalNote: string;
}
export const spaceCopy: Record<Language, SpaceCopy> = {
  ar: {
    kicker: "YOUR SPACE · ONESHOT HUB",
    title: "مساحتك: حساب واحد يفتح خدمات أعمالك.",
    lead: "OneShot Hub هو الباب. من هنا تدخل مقر شركتك الرقمي وفريقك الذكي، ومساحة الذكاء المتخصص، وبوابات الدفع، واستوديو الهوية، ومختبر الأداء. ومن المساحة نفسها تطلب خدمات ومنتجات OneShot التي تنفّذها لك فرقنا.",
    plainLabel: "بكلمات بسيطة:",
    plain:
      "تسجّل مرة واحدة، فتجد كل أدوات شركتك في مكان واحد: موظفون أذكياء يتابعون المهام، ومدفوعات منظمة، وهوية بصرية جاهزة، وكتالوج خدمات تطلبه بضغطة.",
    stepsTitle: "تبدأ في 3 خطوات",
    steps: [
      "أنشئ حسابك ببريدك الإلكتروني وسمِّ مساحة عملك",
      "اختر خدمتك: فريقك، الهوية أو الذكاء",
      "اطلب المنتج المناسب من الكتالوج أو ابدأ العمل مع فريقك",
    ],
    trust: [
      "حساب واحد لكل التطبيقات",
      "فريق ذكي يحفظ محادثاتك ومهامك",
      "دفع مستضاف دون تخزين بطاقات",
      "أسعار معلنة بالريال السعودي",
    ],
    servicesTitle: "خدمات منظومة OneShot",
    servicesIntro:
      "اختر خدمة لتعرف ما تقدمه لك عملياً، وما المنتجات المرتبطة بها من كتالوجنا.",
    roles: {
      hub: "الباب والمركز: الدخول الموحد، فريقك الذكي الخفيف، وطلباتك.",
      workflow: "مقر شركتك: موظفون أذكياء، اجتماعات، بريد وبحث ومهام.",
      ai: "ذكاء متخصص: بحث وتحليل ونماذج أعمق عند الحاجة.",
      pay: "المدفوعات: بوابات، خزنة مشفرة ودفع مستضاف آمن.",
      brand: "الهوية: شعارك وألوانك وأصولك وثيماتك الموسمية.",
      loader: "المختبر: الحركة وواجهات التحميل وتشخيص الأداء.",
      media: "المحتوى: استوديو للمبدعين — مخرج ذكاء اصطناعي، مصنع مقاطع، وثائقي ومترجم عقود.",
    },
    productsTitle: "منتجات وخدمات مرتبطة",
    productsIntro:
      "من كتالوج OneShot الفعلي. الأسعار بالريال السعودي، وتفاصيل كل منتج في صفحته.",
    productsLoading: "جارٍ تحميل المنتجات…",
    productsEmpty: "لا توجد منتجات مرتبطة بهذه الخدمة حالياً.",
    productsError: "تعذر تحميل الكتالوج الآن.",
    startsAt: "يبدأ من",
    price: "السعر",
    monthly: "شهرياً",
    delivery: (days) => `التسليم خلال ${days} أيام عمل`,
    quote: "يُطلب بعرض سعر",
    details: "تفاصيل المنتج",
    allProducts: "الكتالوج كاملاً",
    enter: "ادخل مساحتك",
    enterGuest: "سجّل الدخول وافتح مساحتك",
    current: "أنت هنا",
    pageTitle: "ONESHOT HUB — مساحتك",
    pageIntro:
      "هذه صفحتك بعد الدخول: الفكرة كاملة، الخدمات، منتجاتنا، ثم غرفة قيادتك السريعة.",
    portalNote: "غرفة القيادة السريعة تظهر هنا بعد تسجيل الدخول.",
  },
  en: {
    kicker: "YOUR SPACE · ONESHOT HUB",
    title: "Your space: one account opens your business services.",
    lead: "OneShot Hub is the front door. From here you enter your digital headquarters and intelligent team, a specialist AI workspace, payment gateways, the brand studio and the performance lab. From the same space you order the OneShot services and products our teams deliver for you.",
    plainLabel: "In plain words:",
    plain:
      "Sign in once and find every tool for your company in one place: intelligent staff tracking tasks, organised payments, a ready brand identity and a catalog you can order from in a tap.",
    stepsTitle: "START IN 3 STEPS",
    steps: [
      "Create your account with your email and name your workspace",
      "Pick your service: team, brand or intelligence",
      "Order the right product from the catalog or start working with your team",
    ],
    trust: [
      "One account for every app",
      "An intelligent team that keeps your chats and tasks",
      "Hosted checkout with no card storage",
      "Published prices in Saudi riyals",
    ],
    servicesTitle: "The services of the OneShot ecosystem",
    servicesIntro:
      "Choose a service to see what it does for you in practice and which catalog products belong to it.",
    roles: {
      hub: "The door and the centre: unified sign-in, your light intelligent team and your orders.",
      workflow:
        "Your headquarters: intelligent staff, meetings, mail, research and tasks.",
      ai: "Specialist intelligence: research, analysis and deeper models when needed.",
      pay: "Payments: gateways, an encrypted vault and secure hosted checkout.",
      brand: "Identity: your logo, colours, assets and seasonal themes.",
      loader: "The lab: motion, loading interfaces and performance diagnostics.",
      media: "Content: a creator studio — AI director, clip factory, documentary studio and contract translator.",
    },
    productsTitle: "Related products and services",
    productsIntro:
      "From the live OneShot catalog. Prices in Saudi riyals; full details on each product page.",
    productsLoading: "Loading products…",
    productsEmpty: "No products are linked to this service yet.",
    productsError: "The catalog could not be loaded right now.",
    startsAt: "From",
    price: "Price",
    monthly: "Monthly",
    delivery: (days) => `Delivery in ${days} business days`,
    quote: "Quote on request",
    details: "Product details",
    allProducts: "Full catalog",
    enter: "Enter your space",
    enterGuest: "Sign in and open your space",
    current: "You are here",
    pageTitle: "ONESHOT HUB — Your space",
    pageIntro:
      "Your page after sign-in: the full idea, the services, our products, then your quick command room.",
    portalNote: "The quick command room appears here after you sign in.",
  },
  fr: {
    kicker: "YOUR SPACE · ONESHOT HUB",
    title: "Votre espace : un compte ouvre sept services pour votre entreprise.",
    lead: "OneShot Hub est la porte d'entrée. D'ici vous rejoignez votre siège numérique et votre équipe intelligente, un espace d'IA spécialisée, les passerelles de paiement, le studio de marque et le laboratoire de performance. Depuis le même espace, vous commandez les services et produits OneShot réalisés par nos équipes.",
    plainLabel: "En clair :",
    plain:
      "Une seule connexion et tous les outils de votre entreprise au même endroit : une équipe intelligente qui suit les tâches, des paiements organisés, une identité de marque prête et un catalogue à commander en un geste.",
    stepsTitle: "COMMENCEZ EN 3 ÉTAPES",
    steps: [
      "Créez votre compte avec votre e-mail et nommez votre espace",
      "Choisissez un des sept services : équipe, paiements, marque ou IA",
      "Commandez le bon produit du catalogue ou travaillez avec votre équipe",
    ],
    trust: [
      "Un compte pour toutes les applications",
      "Une équipe intelligente qui garde vos échanges et tâches",
      "Paiement hébergé sans stockage de carte",
      "Prix publiés en riyals saoudiens",
    ],
    servicesTitle: "Les sept services de l'écosystème OneShot",
    servicesIntro:
      "Choisissez un service pour voir ce qu'il vous apporte concrètement et les produits du catalogue qui s'y rattachent.",
    roles: {
      hub: "La porte et le centre : connexion unique, équipe intelligente légère et vos commandes.",
      workflow:
        "Votre siège : collaborateurs intelligents, réunions, e-mail, recherche et tâches.",
      ai: "IA spécialisée : recherche, analyse et modèles plus profonds au besoin.",
      pay: "Paiements : passerelles, coffre chiffré et paiement hébergé sécurisé.",
      brand: "Identité : logo, couleurs, ressources et thèmes saisonniers.",
      loader: "Le labo : animation, interfaces de chargement et diagnostics de performance.",
      media: "Contenu : un studio pour créateurs — réalisateur IA, fabrique de clips, documentaire et traducteur de contrats.",
    },
    productsTitle: "Produits et services liés",
    productsIntro:
      "Issus du catalogue OneShot. Prix en riyals saoudiens ; détails sur chaque fiche produit.",
    productsLoading: "Chargement des produits…",
    productsEmpty: "Aucun produit n'est encore lié à ce service.",
    productsError: "Le catalogue n'a pas pu être chargé.",
    startsAt: "À partir de",
    price: "Prix",
    monthly: "Par mois",
    delivery: (days) => `Livraison sous ${days} jours ouvrés`,
    quote: "Sur devis",
    details: "Détails du produit",
    allProducts: "Catalogue complet",
    enter: "Entrer dans votre espace",
    enterGuest: "Se connecter et ouvrir votre espace",
    current: "Vous êtes ici",
    pageTitle: "ONESHOT HUB — Votre espace",
    pageIntro:
      "Votre page après connexion : l'idée complète, les sept services, nos produits, puis votre espace de commande rapide.",
    portalNote: "L'espace de commande rapide apparaît ici après connexion.",
  },
  es: {
    kicker: "YOUR SPACE · ONESHOT HUB",
    title: "Tu espacio: una cuenta abre siete servicios para tu negocio.",
    lead: "OneShot Hub es la puerta. Desde aquí entras a tu sede digital y tu equipo inteligente, a un espacio de IA especializada, a las pasarelas de pago, al estudio de marca y al laboratorio de rendimiento. Desde el mismo espacio pides los servicios y productos OneShot que nuestros equipos realizan para ti.",
    plainLabel: "En pocas palabras:",
    plain:
      "Inicias sesión una vez y encuentras todas las herramientas de tu empresa en un lugar: personal inteligente que sigue las tareas, pagos ordenados, una identidad de marca lista y un catálogo para pedir con un toque.",
    stepsTitle: "EMPIEZA EN 3 PASOS",
    steps: [
      "Crea tu cuenta con tu correo y nombra tu espacio de trabajo",
      "Elige uno de los siete servicios: equipo, pagos, marca o inteligencia",
      "Pide el producto adecuado del catálogo o empieza a trabajar con tu equipo",
    ],
    trust: [
      "Una cuenta para todas las aplicaciones",
      "Un equipo inteligente que guarda tus chats y tareas",
      "Pago alojado sin almacenar tarjetas",
      "Precios publicados en riales saudíes",
    ],
    servicesTitle: "Los siete servicios del ecosistema OneShot",
    servicesIntro:
      "Elige un servicio para ver qué hace por ti en la práctica y qué productos del catálogo le pertenecen.",
    roles: {
      hub: "La puerta y el centro: acceso único, tu equipo inteligente ligero y tus pedidos.",
      workflow:
        "Tu sede: personal inteligente, reuniones, correo, investigación y tareas.",
      ai: "Inteligencia especializada: investigación, análisis y modelos más profundos cuando hace falta.",
      pay: "Pagos: pasarelas, bóveda cifrada y pago alojado seguro.",
      brand: "Identidad: tu logo, colores, recursos y temas de temporada.",
      loader: "El laboratorio: movimiento, interfaces de carga y diagnóstico de rendimiento.",
      media: "Contenido: un estudio para creadores — director de IA, fábrica de clips, documental y traductor de contratos.",
    },
    productsTitle: "Productos y servicios relacionados",
    productsIntro:
      "Del catálogo real de OneShot. Precios en riales saudíes; detalles en cada página de producto.",
    productsLoading: "Cargando productos…",
    productsEmpty: "Todavía no hay productos vinculados a este servicio.",
    productsError: "No se pudo cargar el catálogo ahora.",
    startsAt: "Desde",
    price: "Precio",
    monthly: "Mensual",
    delivery: (days) => `Entrega en ${days} días hábiles`,
    quote: "Bajo presupuesto",
    details: "Detalles del producto",
    allProducts: "Catálogo completo",
    enter: "Entra a tu espacio",
    enterGuest: "Inicia sesión y abre tu espacio",
    current: "Estás aquí",
    pageTitle: "ONESHOT HUB — Tu espacio",
    pageIntro:
      "Tu página tras iniciar sesión: la idea completa, los siete servicios, nuestros productos y luego tu centro de mando rápido.",
    portalNote: "El centro de mando rápido aparece aquí tras iniciar sesión.",
  },
  tr: {
    kicker: "YOUR SPACE · ONESHOT HUB",
    title: "Alanınız: tek hesap, işiniz için yedi hizmet.",
    lead: "OneShot Hub giriş kapısıdır. Buradan dijital merkezinize ve akıllı ekibinize, uzman yapay zekâ alanına, ödeme ağ geçitlerine, marka stüdyosuna ve performans laboratuvarına girersiniz. Aynı alandan, ekiplerimizin sizin için ürettiği OneShot hizmet ve ürünlerini sipariş edersiniz.",
    plainLabel: "Kısaca:",
    plain:
      "Bir kez giriş yapın, şirketinizin tüm araçlarını tek yerde bulun: görevleri izleyen akıllı çalışanlar, düzenli ödemeler, hazır bir marka kimliği ve tek dokunuşla sipariş verebileceğiniz bir katalog.",
    stepsTitle: "3 ADIMDA BAŞLAYIN",
    steps: [
      "E-postanızla hesap oluşturun ve çalışma alanınızı adlandırın",
      "Yedi hizmetten birini seçin: ekip, ödeme, marka veya yapay zekâ",
      "Katalogdan uygun ürünü sipariş edin veya ekibinizle çalışmaya başlayın",
    ],
    trust: [
      "Tüm uygulamalar için tek hesap",
      "Sohbet ve görevlerinizi saklayan akıllı ekip",
      "Kart saklamayan barındırılan ödeme",
      "Suudi riyali ile yayımlanmış fiyatlar",
    ],
    servicesTitle: "OneShot ekosisteminin yedi hizmeti",
    servicesIntro:
      "Bir hizmet seçin; size pratikte ne sağladığını ve katalogdaki hangi ürünlerin ona ait olduğunu görün.",
    roles: {
      hub: "Kapı ve merkez: tek giriş, hafif akıllı ekibiniz ve siparişleriniz.",
      workflow:
        "Merkeziniz: akıllı çalışanlar, toplantılar, e-posta, araştırma ve görevler.",
      ai: "Uzman zekâ: gerektiğinde araştırma, analiz ve daha derin modeller.",
      pay: "Ödemeler: ağ geçitleri, şifreli kasa ve güvenli barındırılan ödeme.",
      brand: "Kimlik: logonuz, renkleriniz, varlıklarınız ve mevsimsel temalar.",
      loader: "Laboratuvar: hareket, yükleme arayüzleri ve performans tanılama.",
      media: "İçerik: içerik üreticisi stüdyosu — yapay zekâ yönetmen, klip fabrikası, belgesel ve sözleşme çevirmeni.",
    },
    productsTitle: "İlgili ürün ve hizmetler",
    productsIntro:
      "Gerçek OneShot kataloğundan. Fiyatlar Suudi riyali; ayrıntılar her ürün sayfasında.",
    productsLoading: "Ürünler yükleniyor…",
    productsEmpty: "Bu hizmete bağlı ürün henüz yok.",
    productsError: "Katalog şu anda yüklenemedi.",
    startsAt: "Başlangıç",
    price: "Fiyat",
    monthly: "Aylık",
    delivery: (days) => `${days} iş gününde teslim`,
    quote: "Teklif ile",
    details: "Ürün ayrıntıları",
    allProducts: "Tüm katalog",
    enter: "Alanınıza girin",
    enterGuest: "Giriş yapın ve alanınızı açın",
    current: "Buradasınız",
    pageTitle: "ONESHOT HUB — Alanınız",
    pageIntro:
      "Girişten sonraki sayfanız: fikrin tamamı, yedi hizmet, ürünlerimiz ve ardından hızlı komuta odanız.",
    portalNote: "Hızlı komuta odası giriş yaptıktan sonra burada görünür.",
  },
  zh: {
    kicker: "YOUR SPACE · ONESHOT HUB",
    title: "你的空间：一个账户，打开面向业务的七项服务。",
    lead: "OneShot Hub 是入口。从这里进入你的数字总部与智能团队、专业 AI 工作区、支付网关、品牌工作室和性能实验室。在同一个空间里，你还可以订购由我们团队交付的 OneShot 服务与产品。",
    plainLabel: "简单来说：",
    plain:
      "登录一次，公司所有工具尽在一处：跟进任务的智能员工、井然有序的支付、现成的品牌形象，以及一键下单的目录。",
    stepsTitle: "三步开始",
    steps: [
      "用邮箱创建账户并为工作区命名",
      "从七项服务中选择：团队、支付、品牌或智能",
      "从目录订购合适的产品，或开始与团队协作",
    ],
    trust: [
      "一个账户通行所有应用",
      "智能团队保存你的对话与任务",
      "托管支付，不存储银行卡",
      "以沙特里亚尔公开标价",
    ],
    servicesTitle: "OneShot 生态系统的七项服务",
    servicesIntro: "选择一项服务，了解它为你带来的实际价值以及相关的目录产品。",
    roles: {
      hub: "入口与中心：统一登录、轻量智能团队和你的订单。",
      workflow: "你的总部：智能员工、会议、邮件、研究与任务。",
      ai: "专业智能：需要时提供研究、分析与更深层模型。",
      pay: "支付：网关、加密保险库与安全托管结账。",
      brand: "品牌：标志、色彩、素材与季节主题。",
      loader: "实验室：动效、加载界面与性能诊断。",
      media: "内容：创作者工作台 — AI 导演、片段工厂、纪录片工作台与合同翻译器。",
    },
    productsTitle: "相关产品与服务",
    productsIntro: "来自真实的 OneShot 目录。价格为沙特里亚尔，详情见各产品页。",
    productsLoading: "正在加载产品…",
    productsEmpty: "此服务暂无关联产品。",
    productsError: "目前无法加载目录。",
    startsAt: "起价",
    price: "价格",
    monthly: "每月",
    delivery: (days) => `${days} 个工作日内交付`,
    quote: "按需报价",
    details: "产品详情",
    allProducts: "完整目录",
    enter: "进入你的空间",
    enterGuest: "登录并打开你的空间",
    current: "你在这里",
    pageTitle: "ONESHOT HUB — 你的空间",
    pageIntro: "登录后的页面：完整理念、七项服务、我们的产品，然后是你的快速指挥室。",
    portalNote: "登录后，快速指挥室将显示在这里。",
  },
  hi: {
    kicker: "YOUR SPACE · ONESHOT HUB",
    title: "आपका स्पेस: एक खाता, आपके व्यवसाय के लिए सात सेवाएँ।",
    lead: "OneShot Hub प्रवेश द्वार है। यहाँ से आप अपने डिजिटल मुख्यालय और बुद्धिमान टीम, विशेषज्ञ AI वर्कस्पेस, भुगतान गेटवे, ब्रांड स्टूडियो और परफ़ॉर्मेंस लैब में जाते हैं। इसी स्पेस से आप वे OneShot सेवाएँ और उत्पाद ऑर्डर करते हैं जिन्हें हमारी टीमें आपके लिए पूरा करती हैं।",
    plainLabel: "सरल शब्दों में:",
    plain:
      "एक बार साइन इन करें और कंपनी के सभी टूल एक जगह पाएँ: कार्यों पर नज़र रखने वाले बुद्धिमान कर्मचारी, व्यवस्थित भुगतान, तैयार ब्रांड पहचान और एक टैप में ऑर्डर करने योग्य कैटलॉग।",
    stepsTitle: "3 चरणों में शुरू करें",
    steps: [
      "अपने ईमेल से खाता बनाएँ और वर्कस्पेस का नाम रखें",
      "सात सेवाओं में से चुनें: टीम, भुगतान, ब्रांड या इंटेलिजेंस",
      "कैटलॉग से सही उत्पाद ऑर्डर करें या अपनी टीम के साथ काम शुरू करें",
    ],
    trust: [
      "हर ऐप के लिए एक खाता",
      "बुद्धिमान टीम जो आपकी चैट और कार्य सहेजती है",
      "कार्ड संग्रह के बिना होस्टेड चेकआउट",
      "सऊदी रियाल में प्रकाशित मूल्य",
    ],
    servicesTitle: "OneShot इकोसिस्टम की सात सेवाएँ",
    servicesIntro:
      "कोई सेवा चुनें और देखें कि वह व्यवहार में आपके लिए क्या करती है और कैटलॉग के कौन से उत्पाद उससे जुड़े हैं।",
    roles: {
      hub: "द्वार और केंद्र: एकीकृत साइन-इन, आपकी हल्की बुद्धिमान टीम और आपके ऑर्डर।",
      workflow: "आपका मुख्यालय: बुद्धिमान कर्मचारी, बैठकें, मेल, शोध और कार्य।",
      ai: "विशेषज्ञ इंटेलिजेंस: ज़रूरत पड़ने पर शोध, विश्लेषण और गहरे मॉडल।",
      pay: "भुगतान: गेटवे, एन्क्रिप्टेड वॉल्ट और सुरक्षित होस्टेड चेकआउट।",
      brand: "पहचान: आपका लोगो, रंग, एसेट और मौसमी थीम।",
      loader: "लैब: मोशन, लोडिंग इंटरफ़ेस और परफ़ॉर्मेंस डायग्नोस्टिक्स।",
      media: "कंटेंट: क्रिएटर स्टूडियो — AI डायरेक्टर, क्लिप फ़ैक्ट्री, डॉक्युमेंट्री और कॉन्ट्रैक्ट अनुवादक।",
    },
    productsTitle: "संबंधित उत्पाद और सेवाएँ",
    productsIntro:
      "वास्तविक OneShot कैटलॉग से। मूल्य सऊदी रियाल में; पूरा विवरण हर उत्पाद पृष्ठ पर।",
    productsLoading: "उत्पाद लोड हो रहे हैं…",
    productsEmpty: "इस सेवा से अभी कोई उत्पाद जुड़ा नहीं है।",
    productsError: "कैटलॉग अभी लोड नहीं हो सका।",
    startsAt: "से शुरू",
    price: "मूल्य",
    monthly: "मासिक",
    delivery: (days) => `${days} कार्यदिवसों में डिलीवरी`,
    quote: "कोटेशन पर",
    details: "उत्पाद विवरण",
    allProducts: "पूरा कैटलॉग",
    enter: "अपने स्पेस में जाएँ",
    enterGuest: "साइन इन करें और स्पेस खोलें",
    current: "आप यहाँ हैं",
    pageTitle: "ONESHOT HUB — आपका स्पेस",
    pageIntro:
      "साइन इन के बाद आपका पृष्ठ: पूरा विचार, सात सेवाएँ, हमारे उत्पाद, फिर आपका त्वरित कमांड रूम।",
    portalNote: "साइन इन करने के बाद त्वरित कमांड रूम यहाँ दिखेगा।",
  },
  ur: {
    kicker: "YOUR SPACE · ONESHOT HUB",
    title: "آپ کی جگہ: ایک اکاؤنٹ، آپ کے کاروبار کے لیے سات خدمات۔",
    lead: "OneShot Hub دروازہ ہے۔ یہاں سے آپ اپنے ڈیجیٹل ہیڈکوارٹر اور ذہین ٹیم، ماہر AI ورک اسپیس، ادائیگی کے گیٹ ویز، برانڈ اسٹوڈیو اور کارکردگی لیب میں داخل ہوتے ہیں۔ اسی جگہ سے آپ وہ OneShot خدمات اور مصنوعات آرڈر کرتے ہیں جو ہماری ٹیمیں آپ کے لیے مکمل کرتی ہیں۔",
    plainLabel: "آسان الفاظ میں:",
    plain:
      "ایک بار سائن ان کریں اور کمپنی کے تمام ٹولز ایک جگہ پائیں: کاموں پر نظر رکھنے والے ذہین ملازم، منظم ادائیگیاں، تیار برانڈ شناخت اور ایک ٹیپ میں آرڈر ہونے والا کیٹلاگ۔",
    stepsTitle: "3 مراحل میں شروع کریں",
    steps: [
      "اپنے ای میل سے اکاؤنٹ بنائیں اور ورک اسپیس کا نام رکھیں",
      "سات خدمات میں سے چنیں: ٹیم، ادائیگی، برانڈ یا ذہانت",
      "کیٹلاگ سے مناسب پروڈکٹ آرڈر کریں یا اپنی ٹیم کے ساتھ کام شروع کریں",
    ],
    trust: [
      "ہر ایپ کے لیے ایک اکاؤنٹ",
      "ذہین ٹیم جو آپ کی گفتگو اور کام محفوظ رکھتی ہے",
      "کارڈ محفوظ کیے بغیر ہوسٹڈ چیک آؤٹ",
      "سعودی ریال میں شائع شدہ قیمتیں",
    ],
    servicesTitle: "OneShot ایکو سسٹم کی سات خدمات",
    servicesIntro:
      "کوئی خدمت چنیں اور دیکھیں کہ یہ عملی طور پر آپ کے لیے کیا کرتی ہے اور کیٹلاگ کی کون سی مصنوعات اس سے جڑی ہیں۔",
    roles: {
      hub: "دروازہ اور مرکز: یکجا سائن ان، آپ کی ہلکی ذہین ٹیم اور آپ کے آرڈر۔",
      workflow: "آپ کا ہیڈکوارٹر: ذہین ملازم، میٹنگز، میل، تحقیق اور کام۔",
      ai: "ماہر ذہانت: ضرورت پر تحقیق، تجزیہ اور گہرے ماڈل۔",
      pay: "ادائیگیاں: گیٹ ویز، خفیہ کردہ والٹ اور محفوظ ہوسٹڈ چیک آؤٹ۔",
      brand: "شناخت: آپ کا لوگو، رنگ، اثاثے اور موسمی تھیمز۔",
      loader: "لیب: حرکت، لوڈنگ انٹرفیس اور کارکردگی کی تشخیص۔",
      media: "مواد: کریئیٹر اسٹوڈیو — AI ڈائریکٹر، کلپ فیکٹری، دستاویزی اسٹوڈیو اور معاہدہ مترجم۔",
    },
    productsTitle: "متعلقہ مصنوعات اور خدمات",
    productsIntro:
      "اصل OneShot کیٹلاگ سے۔ قیمتیں سعودی ریال میں؛ مکمل تفصیل ہر پروڈکٹ صفحے پر۔",
    productsLoading: "مصنوعات لوڈ ہو رہی ہیں…",
    productsEmpty: "اس خدمت سے ابھی کوئی پروڈکٹ منسلک نہیں۔",
    productsError: "کیٹلاگ ابھی لوڈ نہیں ہو سکا۔",
    startsAt: "ابتدائی قیمت",
    price: "قیمت",
    monthly: "ماہانہ",
    delivery: (days) => `${days} کاروباری دنوں میں ترسیل`,
    quote: "کوٹیشن پر",
    details: "پروڈکٹ کی تفصیل",
    allProducts: "مکمل کیٹلاگ",
    enter: "اپنی جگہ میں داخل ہوں",
    enterGuest: "سائن ان کریں اور اپنی جگہ کھولیں",
    current: "آپ یہاں ہیں",
    pageTitle: "ONESHOT HUB — آپ کی جگہ",
    pageIntro:
      "سائن ان کے بعد آپ کا صفحہ: مکمل خیال، سات خدمات، ہماری مصنوعات، پھر آپ کا فوری کمانڈ روم۔",
    portalNote: "سائن ان کرنے کے بعد فوری کمانڈ روم یہاں ظاہر ہوگا۔",
  },
};
