import type { Language } from "../storefront/i18n";

type AppCopy = [string, string, string];
interface HubCopy {
  badge: string;
  headline: string;
  intro: string;
  signIn: string;
  explore: string;
  nav: [string, string, string, string, string];
  power: string;
  pillars: [AppCopy, AppCopy, AppCopy, AppCopy];
  appsTitle: string;
  appsIntro: string;
  apps: [
    AppCopy,
    AppCopy,
    AppCopy,
    AppCopy,
    AppCopy,
    AppCopy,
    AppCopy,
  ];
  benefit: string;
  open: string;
  native: string;
  install: string;
  apk: string;
  apkPending: string;
  installHelp: string;
  nativeTitle: string;
  nativeBody: string;
  deepTitle: string;
  deepBody: string;
  fullOffice: string;
  localOffice: string;
  loading: string;
  retry: string;
  unverified: string;
  available: string;
  sso: string;
  portal: string;
  portalBody: string;
  chat: string;
  tasks: string;
  approvals: string;
  empty: string;
  create: string;
  company: string;
  send: string;
  prompt: string;
  attach: string;
  attachNote: string;
  refresh: string;
  review: string;
  approve: string;
  close: string;
  settings: string;
  privacy: string;
  terms: string;
  support: string;
  orders: string;
  catalog: string;
}
export const hubCopy: Record<Language, HubCopy> = {
  ar: {
    badge: "منظومة للأعمال السعودية والعربية · بذكاء تطبيقي",
    headline: "شركتك الرقمية.\nفريقك الذكي.\nفي مكان واحد.",
    intro:
      "لا تشترك في أداة منفصلة. اجمع التخطيط مع مديرك التنفيذي، البحث والبريد، الدفع والهوية في منظومة واحدة. ابدأ بخفة، وتوسّع بقدر طموحك.",
    signIn: "الدخول الموحد والبدء",
    explore: "استكشف التطبيقات",
    nav: [
      "الرئيسية",
      "ذكاء يخدم أعمالك",
      "لوحة القيادة",
      "لماذا OneShot؟",
      "التطبيقات",
    ],
    power: "من فكرة في المحادثة، إلى خطوة في أعمالك.",
    pillars: [
      [
        "فريق يفهم سياقك",
        "خطط مع المدير التنفيذي وتعاون مع مختصي المحتوى والتحليل. اربط البريد والبحث، وراجع الرسائل قبل إرسالها.",
        "المدير التنفيذي · البريد · البحث",
      ],
      [
        "الذكاء المناسب للمهمة",
        "إجابات سريعة، تحليل وبرمجة، وبحث أعمق. استكشف منصة AI؛ درجات Tier 1 / 2 / 3 / X وأدوات Hermes تعتمد على توافرها في التطبيق المستقل.",
        "Tier 1 / 2 / 3 / X",
      ],
      [
        "تجارتك أكثر اتصالاً",
        "ادخل مساحة الدفع وخزنة الربط. Stripe متاح في التنفيذ الحالي بعد إعداد التاجر؛ بقية بوابات الدفع والمتاجر تحتاج تكاملاً مفعّلاً.",
        "Salla · Zid · Shopify · Stripe · Tap · Moyasar · Tabby · Tamara",
      ],
      [
        "خفة الآن. عمق حين تحتاجه.",
        "اكتب لفريقك من Hub، وراجع مهامك ثم افتح Workflow للمقر والاجتماعات والأدوات المتخصصة. سياق عمل واحد، ومساحة تناسب كل مهمة.",
        "Lite Hub → Dedicated Apps",
      ],
    ],
    appsTitle: "وجهات مترابطة. طموح واحد.",
    appsIntro:
      "منظومة OneShot المتكاملة — لكل مهمة مساحتها، ولك أنت مركز القيادة.",
    apps: [
      [
        "البوابة وغرفة القيادة السريعة",
        "تحدث مع فريقك، راجع المهام وافتح تطبيقاتك من واجهة واحدة خفيفة.",
        "محادثات محفوظة · صوت · مهام واعتمادات",
      ],
      [
        "مقر شركتك الرقمي",
        "ادخل المكتب التفاعلي، اجتمع بفريقك وافتح مساحات عمل الموظفين. أدوات البريد والبحث تعمل وفق اتصالاتك وصلاحياتك.",
        "مقر 2.5D · اجتماعات · شاشات الموظفين",
      ],
      [
        "مساحة الذكاء المتخصص",
        "وجهتك للبحث والتحليل وأدوات الذكاء المتقدمة. تحقق من الدرجات وأدوات Hermes المتاحة داخل التطبيق قبل الاستخدام.",
        "بحث · تحليل · درجات ذكاء متخصصة",
      ],
      [
        "بوابات الدفع وخزنة الربط",
        "اجمع إعدادات الدفع وبيانات الربط في مساحة محمية. توافر كل مزود يعتمد على تفعيل التكامل وإعداد حساب التاجر.",
        "بوابات · خزنة مشفرة · دفع مستضاف",
      ],
      [
        "الهوية وكسوة المواسم",
        "مساحة مستقلة لتصميم هوية علامتك وأصولها وثيماتها. أدوات التوليد والتصدير تعتمد على الإصدار المتاح هناك.",
        "هوية بصرية · أصول · ثيمات موسمية",
      ],
      [
        "مختبر الحركة والأداء",
        "افتح المختبر لمراجعة الحركة وتجربة واجهات التحميل والأداء وفق الأدوات المتاحة في التطبيق.",
        "حركة · تشخيص · تجربة الواجهات",
      ],
      [
        "استوديو المحتوى للمبدعين",
        "من فكرة في رأسك إلى محتوى جاهز للنشر: مخرج ذكاء اصطناعي يعلّمك الكادر والإضاءة، ومصنع مقاطع ليوتيوب وشورتس وتيك توك، واستوديو وثائقي، ومترجم عقود — مع مساعد يعرف أسلوبك من أول يوم.",
        "يوتيوب · تيك توك · ريلز",
      ],
    ],
    benefit: "الفائدة العملية لك",
    open: "افتح تطبيق الويب",
    native: "الدخول عبر الأجهزة",
    install: "تثبيت تطبيق الويب",
    apk: "تنزيل Android APK",
    apkPending: "نسخة Android لم تُنشر بعد",
    installHelp:
      "من قائمة المتصفح اختر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية. يتطلب التثبيت متصفحاً متوافقاً واتصال HTTPS.",
    nativeTitle: "مساحة أكبر لأفكارك.",
    nativeBody:
      "استخدم Hub من متصفحك أو ثبّته على جهازك. للمقر التفاعلي والأدوات المتخصصة، انتقل إلى التطبيق المستقل. خصائص النسخة الأصلية تعتمد على إصدارها المنشور.",
    deepTitle: "افتح أبواب شركتك الرقمية.",
    deepBody:
      "المقر التفاعلي وشاشات الموظفين والاجتماعات لها مساحتها في OneShot Workflow. انتقل إلى التجربة الكاملة، واحتفظ بخفة Hub لمهامك اليومية.",
    fullOffice: "افتح OneShot Workflow",
    localOffice: "المقر الحالي /workforce",
    loading: "جارٍ التحميل…",
    retry: "حاول مجدداً",
    unverified: "الاتصال غير متحقق",
    available: "استجاب التطبيق",
    sso: "الدخول الموحد متاح",
    portal: "غرفة القيادة السريعة",
    portalBody: "فريقك ومهامك وموافقاتك. دون تحميل المكتب التفاعلي.",
    chat: "محادثة الموظفين",
    tasks: "المهام الأخيرة",
    approvals: "مراجعة البريد",
    empty: "لا توجد سجلات بعد.",
    create: "أنشئ مساحة العمل",
    company: "اسم شركتك",
    send: "إرسال",
    prompt: "ما الخطوة التالية في أعمالك؟",
    attach: "إرفاق ملف أو صورة",
    attachNote:
      "PDF، صورة أو نص حتى 1 MB. يُستخرج السياق للمراجعة قبل الإرسال؛ لا يُحفظ الملف الأصلي.",
    refresh: "تحديث",
    review: "مراجعة",
    approve: "اعتماد الرسالة وإرسالها",
    close: "إغلاق",
    settings: "الصوت واللغة",
    privacy: "الخصوصية",
    terms: "الشروط",
    support: "الدعم",
    orders: "طلباتي",
    catalog: "كتالوج الخدمات",
  },
  en: {
    badge: "For global founders · AI workforce & business, together",
    headline: "Your digital company.\nYour intelligent team.\nOne place.",
    intro:
      "Go beyond another subscription. Bring executive planning, research, email, payments and brand identity into one ecosystem. Start light. Grow with purpose.",
    signIn: "Sign in & get started",
    explore: "Explore all apps",
    nav: [
      "Overview",
      "AI business power",
      "Lite command hub",
      "Why OneShot",
      "The apps",
    ],
    power: "From a conversation to your next business move.",
    pillars: [
      [
        "A team with your context",
        "Plan with your advisory CEO and content or analysis specialists. Connect research and email, and review messages before sending.",
        "CEO · Email · Research",
      ],
      [
        "Intelligence for the task",
        "Quick answers, coding, analysis and deeper research. Explore AI; Tier 1 / 2 / 3 / X and Hermes tools depend on availability in the dedicated app.",
        "Tier 1 / 2 / 3 / X",
      ],
      [
        "Bring commerce together",
        "Open the payment workspace and integration vault. Stripe checkout is implemented with merchant setup; other gateways and stores require enabled integrations.",
        "Salla · Zid · Shopify · Stripe · Tap · Moyasar · Tabby · Tamara",
      ],
      [
        "Light now. Deep when needed.",
        "Chat in Hub, review your tasks, then open Workflow for headquarters, meetings and specialist tools. One work context, a space for every task.",
        "Lite Hub → Dedicated Apps",
      ],
    ],
    appsTitle: "Seven destinations. One ambition.",
    appsIntro:
      "The complete OneShot ecosystem. Every task has a home. You have command.",
    apps: [
      [
        "Your gateway & quick command room",
        "Talk to your team, review tasks and reach your applications from one lightweight interface.",
        "Saved chat · Voice · Tasks & approvals",
      ],
      [
        "Your interactive digital headquarters",
        "Enter the office, meet your team and open employee workspaces. Mail and research tools follow your connections and permissions.",
        "2.5D headquarters · Meetings · Employee screens",
      ],
      [
        "A dedicated intelligence workspace",
        "A destination for research, analysis and advanced AI tools. Check available tiers and Hermes capabilities inside the standalone app.",
        "Research · Analysis · Specialist intelligence",
      ],
      [
        "Payment gateways & integration vault",
        "Keep payment configuration and integration credentials in a protected workspace. Provider availability depends on adapters and merchant setup.",
        "Gateways · Encrypted vault · Hosted checkout",
      ],
      [
        "Your identity & seasonal wardrobe",
        "A dedicated space for brand identity, assets and seasonal themes. Generation and export tools depend on its available release.",
        "Visual identity · Assets · Seasonal themes",
      ],
      [
        "Motion & performance laboratory",
        "Open the lab to explore motion, loading interfaces and performance with the tools available in that application.",
        "Motion · Diagnostics · Interface experiments",
      ],
      [
        "The creator content studio",
        "From an idea in your head to publishable content: an AI director that teaches framing and lighting, a clip factory for YouTube, Shorts and TikTok, a documentary studio and a contract translator — with an assistant that knows your style from day one.",
        "YouTube · TikTok · Reels",
      ],
    ],
    benefit: "What it does for you",
    open: "Open web app",
    native: "Sign in across devices",
    install: "Install web app",
    apk: "Download Android APK",
    apkPending: "Android release not yet published",
    installHelp:
      "Choose Install app or Add to Home Screen in your browser menu. Installation requires a supported browser and HTTPS.",
    nativeTitle: "More room for your ideas.",
    nativeBody:
      "Use Hub in your browser or install it on your device. Open the dedicated apps for immersive headquarters and specialist tools. Native capabilities depend on the published release.",
    deepTitle: "Step inside your digital company.",
    deepBody:
      "Interactive headquarters, employee screens and meetings have their own space in OneShot Workflow. Open the full experience and keep Hub light for everyday work.",
    fullOffice: "Open OneShot Workflow",
    localOffice: "Current headquarters /workforce",
    loading: "Loading…",
    retry: "Try again",
    unverified: "Connection unverified",
    available: "App responded",
    sso: "SSO available",
    portal: "Lite command portal",
    portalBody: "Your team, tasks and approvals. No office renderer to load.",
    chat: "Employee chat",
    tasks: "Recent tasks",
    approvals: "Review email",
    empty: "No records yet.",
    create: "Create workspace",
    company: "Company name",
    send: "Send",
    prompt: "What’s your next business move?",
    attach: "Attach a file or image",
    attachNote:
      "PDF, image or text up to 1 MB. Extracted context is reviewed before sending; the original file is not retained.",
    refresh: "Refresh",
    review: "Review",
    approve: "Approve & send this email",
    close: "Close",
    settings: "Voice & language",
    privacy: "Privacy",
    terms: "Terms",
    support: "Support",
    orders: "My orders",
    catalog: "Service catalog",
  },
  fr: {
    badge: "Pour les entrepreneurs francophones · IA et entreprise réunies",
    headline:
      "Votre entreprise numérique.\nVotre équipe intelligente.\nUn seul espace.",
    intro:
      "Allez au-delà des abonnements séparés. Réunissez conseil stratégique, recherche, e-mail, paiements et identité de marque. Commencez simplement, développez votre activité.",
    signIn: "Se connecter et commencer",
    explore: "Découvrir les sept applications",
    nav: [
      "Accueil",
      "L’IA pour votre activité",
      "Espace de commande",
      "Pourquoi OneShot",
      "Les sept applications",
    ],
    power: "D’une conversation à votre prochaine décision.",
    pillars: [
      [
        "Une équipe qui connaît votre contexte",
        "Planifiez avec votre CEO conseil et vos spécialistes. Connectez la recherche et les e-mails ; validez les messages avant envoi.",
        "CEO · E-mail · Recherche",
      ],
      [
        "L’intelligence adaptée à la tâche",
        "Réponses rapides, code, analyse et recherche. Les niveaux Tier 1 / 2 / 3 / X et Hermes dépendent de leur disponibilité dans l’application AI.",
        "Tier 1 / 2 / 3 / X",
      ],
      [
        "Connectez votre commerce",
        "Un espace de paiement et un coffre d’intégration. Stripe nécessite la configuration du marchand ; les autres intégrations doivent être activées.",
        "Salla · Zid · Shopify · Stripe · Tap · Moyasar · Tabby · Tamara",
      ],
      [
        "Léger au quotidien, immersif au besoin",
        "Discutez dans Hub, consultez vos tâches et ouvrez Workflow pour le siège, les réunions et les outils spécialisés.",
        "Lite Hub → Applications dédiées",
      ],
    ],
    appsTitle: "Sept destinations. Une ambition.",
    appsIntro:
      "L’écosystème OneShot complet. Un espace pour chaque tâche, un centre de commande pour vous.",
    apps: [
      [
        "Votre portail et espace de commande",
        "Échangez avec votre équipe et consultez vos tâches dans une interface légère.",
        "Conversations · Voix · Validations",
      ],
      [
        "Votre siège numérique interactif",
        "Entrez au bureau, réunissez votre équipe et ouvrez ses espaces de travail selon vos connexions et autorisations.",
        "Siège 2.5D · Réunions · Écrans",
      ],
      [
        "Un espace d’intelligence spécialisé",
        "Recherche, analyse et outils avancés. Vérifiez les niveaux et fonctions Hermes proposés dans l’application.",
        "Recherche · Analyse · Intelligence",
      ],
      [
        "Paiements et coffre d’intégration",
        "Centralisez vos configurations de paiement. Chaque prestataire nécessite un connecteur et un compte marchand configurés.",
        "Passerelles · Coffre chiffré · Paiement hébergé",
      ],
      [
        "Identité et thèmes saisonniers",
        "Un espace dédié à votre marque et ses ressources ; génération et export selon la version disponible.",
        "Identité · Ressources · Thèmes",
      ],
      [
        "Laboratoire de mouvement et performance",
        "Explorez les animations, interfaces de chargement et outils de diagnostic disponibles.",
        "Animation · Diagnostic · Interfaces",
      ],
      [
        "Le studio de contenu pour créateurs",
        "D'une idée en tête à un contenu prêt à publier : un réalisateur IA qui enseigne le cadre et la lumière, une fabrique de clips pour YouTube, Shorts et TikTok, un studio documentaire et un traducteur de contrats — avec un assistant qui connaît votre style dès le premier jour.",
        "YouTube · TikTok · Reels",
      ],
    ],
    benefit: "Votre bénéfice concret",
    open: "Ouvrir l’application",
    native: "Connexion sur vos appareils",
    install: "Installer l’application web",
    apk: "Télécharger l’APK Android",
    apkPending: "Version Android pas encore publiée",
    installHelp:
      "Choisissez Installer ou Ajouter à l’écran d’accueil dans le menu du navigateur. Un navigateur compatible et HTTPS sont nécessaires.",
    nativeTitle: "Plus d’espace pour vos idées.",
    nativeBody:
      "Utilisez Hub dans le navigateur ou installez-le. Les applications dédiées accueillent le siège immersif et les outils spécialisés. Les fonctions natives dépendent de la version publiée.",
    deepTitle: "Entrez dans votre entreprise numérique.",
    deepBody:
      "Le siège interactif, les écrans et les réunions vous attendent dans Workflow. Gardez Hub léger pour le quotidien.",
    fullOffice: "Ouvrir OneShot Workflow",
    localOffice: "Siège actuel /workforce",
    loading: "Chargement…",
    retry: "Réessayer",
    unverified: "Connexion non vérifiée",
    available: "Application joignable",
    sso: "SSO disponible",
    portal: "Espace de commande léger",
    portalBody:
      "Équipe, tâches et validations sans charger le bureau interactif.",
    chat: "Discussion avec l’équipe",
    tasks: "Tâches récentes",
    approvals: "Vérifier les e-mails",
    empty: "Aucun enregistrement.",
    create: "Créer l’espace",
    company: "Nom de l’entreprise",
    send: "Envoyer",
    prompt: "Quelle est votre prochaine étape ?",
    attach: "Joindre un fichier ou une image",
    attachNote:
      "PDF, image ou texte de 1 Mo maximum. Vérifiez le contexte extrait avant envoi ; l’original n’est pas conservé.",
    refresh: "Actualiser",
    review: "Vérifier",
    approve: "Valider et envoyer cet e-mail",
    close: "Fermer",
    settings: "Voix et langue",
    privacy: "Confidentialité",
    terms: "Conditions",
    support: "Assistance",
    orders: "Mes commandes",
    catalog: "Catalogue de services",
  },
  es: {
    badge: "Para negocios hispanohablantes · IA y empresa conectadas",
    headline: "Tu empresa digital.\nTu equipo inteligente.\nUn solo lugar.",
    intro:
      "Ve más allá de otra suscripción. Reúne planificación, investigación, correo, pagos e identidad de marca. Empieza con agilidad y crece con propósito.",
    signIn: "Acceder y empezar",
    explore: "Explorar las siete aplicaciones",
    nav: [
      "Inicio",
      "IA para tu negocio",
      "Centro de mando",
      "Por qué OneShot",
      "Las siete aplicaciones",
    ],
    power: "De una conversación a tu siguiente paso.",
    pillars: [
      [
        "Un equipo con tu contexto",
        "Planifica con tu CEO asesor y especialistas. Conecta investigación y correo; revisa los mensajes antes de enviarlos.",
        "CEO · Correo · Investigación",
      ],
      [
        "Inteligencia para cada tarea",
        "Respuestas, código, análisis e investigación. Los niveles Tier 1 / 2 / 3 / X y Hermes dependen de su disponibilidad en AI.",
        "Tier 1 / 2 / 3 / X",
      ],
      [
        "Conecta tu comercio",
        "Abre pagos y la bóveda de integraciones. Stripe requiere configurar el comercio; las demás integraciones deben estar habilitadas.",
        "Salla · Zid · Shopify · Stripe · Tap · Moyasar · Tabby · Tamara",
      ],
      [
        "Ligero hoy, profundo cuando quieras",
        "Chatea en Hub, revisa tareas y abre Workflow para la sede, reuniones y herramientas especializadas.",
        "Lite Hub → Aplicaciones dedicadas",
      ],
    ],
    appsTitle: "Siete destinos. Una ambición.",
    appsIntro:
      "Todo el ecosistema OneShot. Cada tarea tiene su espacio y tú tienes el control.",
    apps: [
      [
        "Portal y centro de mando",
        "Habla con tu equipo y revisa tareas desde una interfaz ligera.",
        "Chat guardado · Voz · Aprobaciones",
      ],
      [
        "Tu sede digital interactiva",
        "Entra en la oficina, reúne al equipo y abre sus espacios según tus conexiones y permisos.",
        "Sede 2.5D · Reuniones · Pantallas",
      ],
      [
        "Inteligencia especializada",
        "Investigación, análisis y herramientas avanzadas. Consulta los niveles y funciones Hermes disponibles.",
        "Investigación · Análisis · Inteligencia",
      ],
      [
        "Pagos y bóveda de integraciones",
        "Centraliza la configuración de pagos. Cada proveedor requiere un adaptador y una cuenta comercial configurados.",
        "Pasarelas · Bóveda cifrada · Pago alojado",
      ],
      [
        "Identidad y temas estacionales",
        "Un espacio para tu marca y recursos; generación y exportación según la versión disponible.",
        "Identidad · Recursos · Temas",
      ],
      [
        "Laboratorio de movimiento y rendimiento",
        "Explora animaciones, interfaces de carga y herramientas de diagnóstico disponibles.",
        "Movimiento · Diagnóstico · Interfaces",
      ],
      [
        "El estudio de contenido para creadores",
        "De una idea en tu cabeza a contenido listo para publicar: un director de IA que enseña encuadre e iluminación, una fábrica de clips para YouTube, Shorts y TikTok, un estudio documental y un traductor de contratos, con un asistente que conoce tu estilo desde el primer día.",
        "YouTube · TikTok · Reels",
      ],
    ],
    benefit: "Tu beneficio práctico",
    open: "Abrir aplicación web",
    native: "Acceder desde otros dispositivos",
    install: "Instalar aplicación web",
    apk: "Descargar APK Android",
    apkPending: "La versión Android aún no está publicada",
    installHelp:
      "Elige Instalar o Añadir a pantalla de inicio en tu navegador. Requiere un navegador compatible y HTTPS.",
    nativeTitle: "Más espacio para tus ideas.",
    nativeBody:
      "Usa Hub en el navegador o instálalo. Abre las aplicaciones dedicadas para la sede y las herramientas especializadas. Las funciones nativas dependen de la versión publicada.",
    deepTitle: "Entra en tu empresa digital.",
    deepBody:
      "La sede interactiva, las pantallas y las reuniones tienen su espacio en Workflow. Mantén Hub ligero para cada día.",
    fullOffice: "Abrir OneShot Workflow",
    localOffice: "Sede actual /workforce",
    loading: "Cargando…",
    retry: "Reintentar",
    unverified: "Conexión sin verificar",
    available: "La aplicación respondió",
    sso: "SSO disponible",
    portal: "Centro de mando ligero",
    portalBody: "Equipo, tareas y aprobaciones sin cargar la oficina.",
    chat: "Chat con empleados",
    tasks: "Tareas recientes",
    approvals: "Revisar correo",
    empty: "Aún no hay registros.",
    create: "Crear espacio",
    company: "Nombre de empresa",
    send: "Enviar",
    prompt: "¿Cuál es tu siguiente paso?",
    attach: "Adjuntar archivo o imagen",
    attachNote:
      "PDF, imagen o texto de hasta 1 MB. Revisa el contexto extraído antes de enviar; no se conserva el original.",
    refresh: "Actualizar",
    review: "Revisar",
    approve: "Aprobar y enviar este correo",
    close: "Cerrar",
    settings: "Voz e idioma",
    privacy: "Privacidad",
    terms: "Condiciones",
    support: "Ayuda",
    orders: "Mis pedidos",
    catalog: "Catálogo de servicios",
  },
  tr: {
    badge: "Türkiye ve Türkçe e-ticaret için · Yapay zekâ ve iş bir arada",
    headline: "Dijital şirketiniz.\nAkıllı ekibiniz.\nTek bir yerde.",
    intro:
      "Bir abonelikten fazlası. Strateji, araştırma, e-posta, ödeme ve marka kimliğini bir ekosistemde birleştirin. Hafif başlayın, hedefinizle büyüyün.",
    signIn: "Giriş yap ve başla",
    explore: "Yedi uygulamayı keşfet",
    nav: [
      "Genel bakış",
      "İş için yapay zekâ",
      "Hızlı komuta",
      "Neden OneShot",
      "Yedi uygulama",
    ],
    power: "Bir sohbetten sonraki iş adımınıza.",
    pillars: [
      [
        "Bağlamınızı bilen ekip",
        "Danışman CEO ve uzmanlarla planlayın. Araştırma ve e-postayı bağlayın; göndermeden önce mesajları onaylayın.",
        "CEO · E-posta · Araştırma",
      ],
      [
        "Göreve uygun zekâ",
        "Hızlı yanıt, kod, analiz ve araştırma. Tier 1 / 2 / 3 / X ve Hermes araçları AI uygulamasındaki kullanılabilirliğe bağlıdır.",
        "Tier 1 / 2 / 3 / X",
      ],
      [
        "Ticaretinizi birleştirin",
        "Ödeme ve entegrasyon kasasını açın. Stripe satıcı kurulumu gerektirir; diğer entegrasyonların etkinleştirilmesi gerekir.",
        "Salla · Zid · Shopify · Stripe · Tap · Moyasar · Tabby · Tamara",
      ],
      [
        "Şimdi hafif, gerektiğinde derin",
        "Hub’da sohbet edin, görevleri inceleyin; merkez, toplantı ve uzman araçları için Workflow’u açın.",
        "Lite Hub → Özel uygulamalar",
      ],
    ],
    appsTitle: "Yedi hedef. Tek vizyon.",
    appsIntro:
      "OneShot ekosistemi. Her görevin bir alanı, sizin bir komuta merkeziniz var.",
    apps: [
      [
        "Geçidiniz ve hızlı komuta odanız",
        "Hafif bir arayüzde ekibinizle konuşun ve görevleri inceleyin.",
        "Kayıtlı sohbet · Ses · Onaylar",
      ],
      [
        "Etkileşimli dijital merkeziniz",
        "Ofise girin, ekibinizle buluşun ve bağlantılarınıza, izinlerinize uygun çalışma alanlarını açın.",
        "2.5D merkez · Toplantılar · Ekranlar",
      ],
      [
        "Uzman zekâ çalışma alanı",
        "Araştırma, analiz ve gelişmiş araçlar. Mevcut seviyeleri ve Hermes özelliklerini uygulamada kontrol edin.",
        "Araştırma · Analiz · Zekâ",
      ],
      [
        "Ödemeler ve entegrasyon kasası",
        "Ödeme ayarlarını merkezileştirin. Her sağlayıcı etkin bağdaştırıcı ve satıcı kurulumu gerektirir.",
        "Ağ geçitleri · Şifreli kasa · Ödeme",
      ],
      [
        "Kimlik ve mevsimsel temalar",
        "Marka ve varlıklarınıza özel alan; üretim ve dışa aktarma mevcut sürüme bağlıdır.",
        "Kimlik · Varlıklar · Temalar",
      ],
      [
        "Hareket ve performans laboratuvarı",
        "Mevcut animasyon, yükleme arayüzü ve tanılama araçlarını keşfedin.",
        "Hareket · Tanılama · Arayüzler",
      ],
      [
        "İçerik üreticisi stüdyosu",
        "Aklınızdaki fikirden yayına hazır içeriğe: kadraj ve ışığı öğreten bir yapay zekâ yönetmeni, YouTube, Shorts ve TikTok için klip fabrikası, belgesel stüdyosu ve sözleşme çevirmeni — üslubunuzu ilk günden bilen bir asistanla.",
        "YouTube · TikTok · Reels",
      ],
    ],
    benefit: "Size sağladığı fayda",
    open: "Web uygulamasını aç",
    native: "Cihazlar arasında giriş",
    install: "Web uygulamasını yükle",
    apk: "Android APK indir",
    apkPending: "Android sürümü henüz yayımlanmadı",
    installHelp:
      "Tarayıcı menüsünden Uygulamayı yükle veya Ana ekrana ekle seçeneğini kullanın. Desteklenen tarayıcı ve HTTPS gerekir.",
    nativeTitle: "Fikirlerinize daha fazla alan.",
    nativeBody:
      "Hub’ı tarayıcıda kullanın veya yükleyin. Merkez ve uzman araçları için özel uygulamaları açın. Yerel özellikler yayımlanan sürüme bağlıdır.",
    deepTitle: "Dijital şirketinize adım atın.",
    deepBody:
      "Etkileşimli merkez, çalışan ekranları ve toplantılar Workflow’da. Günlük işleriniz için Hub hafif kalsın.",
    fullOffice: "OneShot Workflow’u aç",
    localOffice: "Mevcut merkez /workforce",
    loading: "Yükleniyor…",
    retry: "Tekrar dene",
    unverified: "Bağlantı doğrulanmadı",
    available: "Uygulama yanıt verdi",
    sso: "SSO kullanılabilir",
    portal: "Hafif komuta portalı",
    portalBody: "Ofis yüklemeden ekip, görevler ve onaylar.",
    chat: "Çalışan sohbeti",
    tasks: "Son görevler",
    approvals: "E-postayı incele",
    empty: "Henüz kayıt yok.",
    create: "Çalışma alanı oluştur",
    company: "Şirket adı",
    send: "Gönder",
    prompt: "Sıradaki iş adımınız nedir?",
    attach: "Dosya veya resim ekle",
    attachNote:
      "En fazla 1 MB PDF, resim veya metin. Çıkarılan bağlamı göndermeden önce inceleyin; özgün dosya saklanmaz.",
    refresh: "Yenile",
    review: "İncele",
    approve: "Bu e-postayı onayla ve gönder",
    close: "Kapat",
    settings: "Ses ve dil",
    privacy: "Gizlilik",
    terms: "Koşullar",
    support: "Destek",
    orders: "Siparişlerim",
    catalog: "Hizmet kataloğu",
  },
  zh: {
    badge: "面向中文创业者 · 连接人工智能与业务",
    headline: "你的数字公司。\n你的智能团队。\n尽在一处。",
    intro:
      "不再只是订阅另一款工具。将战略规划、研究、邮件、支付和品牌身份融入一个生态系统。轻松起步，稳步成长。",
    signIn: "登录并开始",
    explore: "探索七款应用",
    nav: [
      "概览",
      "商业人工智能",
      "轻量指挥中心",
      "为什么选择 OneShot",
      "七款应用",
    ],
    power: "从一次对话，到下一步业务行动。",
    pillars: [
      [
        "了解你的团队",
        "与顾问型 CEO 和专业员工规划业务。连接研究与邮件，发送前审核内容。",
        "CEO · 邮件 · 研究",
      ],
      [
        "适合任务的智能",
        "快速回答、编程、分析与深入研究。Tier 1 / 2 / 3 / X 和 Hermes 工具取决于独立 AI 应用中的可用功能。",
        "Tier 1 / 2 / 3 / X",
      ],
      [
        "连接你的商业",
        "打开支付工作区与集成保险库。Stripe 需要商户配置；其他支付和商店集成需要启用相应适配器。",
        "Salla · Zid · Shopify · Stripe · Tap · Moyasar · Tabby · Tamara",
      ],
      [
        "日常轻量，需要时深入",
        "在 Hub 中聊天和查看任务，在 Workflow 中打开总部、会议与专业工具。",
        "Lite Hub → 独立应用",
      ],
    ],
    appsTitle: "七个目的地。一个愿景。",
    appsIntro: "完整的 OneShot 生态系统。每项任务都有专属空间，由你掌控。",
    apps: [
      [
        "入口与快速指挥中心",
        "通过轻量界面与团队交流、查看任务并访问应用。",
        "保存的对话 · 语音 · 审批",
      ],
      [
        "互动数字总部",
        "进入办公室、召开会议并打开员工工作区。邮件和研究工具遵循你的连接和权限。",
        "2.5D 总部 · 会议 · 员工屏幕",
      ],
      [
        "专业智能工作区",
        "研究、分析和高级工具的独立空间。请在应用内确认可用等级与 Hermes 功能。",
        "研究 · 分析 · 专业智能",
      ],
      [
        "支付与集成保险库",
        "集中管理支付配置。各服务商需配置适配器与商户账户。",
        "网关 · 加密保险库 · 托管支付",
      ],
      [
        "品牌身份与季节主题",
        "品牌和素材的专属空间；生成与导出功能取决于可用版本。",
        "视觉身份 · 素材 · 主题",
      ],
      [
        "动效与性能实验室",
        "探索应用内可用的动效、加载界面与诊断工具。",
        "动效 · 诊断 · 界面体验",
      ],
      [
        "创作者内容工作台",
        "从脑海里的想法到可直接发布的内容：教你取景与灯光的 AI 导演、面向 YouTube、Shorts 与 TikTok 的片段工厂、纪录片工作台与合同翻译器，还有从第一天就了解你风格的助手。",
        "YouTube · TikTok · Reels",
      ],
    ],
    benefit: "为你带来的价值",
    open: "打开网页应用",
    native: "跨设备登录",
    install: "安装网页应用",
    apk: "下载 Android APK",
    apkPending: "Android 版本尚未发布",
    installHelp:
      "在浏览器菜单中选择安装应用或添加到主屏幕。需要兼容浏览器与 HTTPS。",
    nativeTitle: "给创意更多空间。",
    nativeBody:
      "在浏览器中使用 Hub 或将其安装到设备。沉浸式总部和专业工具位于独立应用中，原生功能取决于发布版本。",
    deepTitle: "走进你的数字公司。",
    deepBody:
      "互动总部、员工屏幕和会议拥有专属的 Workflow 空间，让 Hub 保持轻便。",
    fullOffice: "打开 OneShot Workflow",
    localOffice: "当前总部 /workforce",
    loading: "加载中…",
    retry: "重试",
    unverified: "连接未经验证",
    available: "应用已响应",
    sso: "支持单点登录",
    portal: "轻量指挥中心",
    portalBody: "团队、任务和审批，无需加载互动办公室。",
    chat: "员工对话",
    tasks: "最近任务",
    approvals: "审核邮件",
    empty: "暂无记录。",
    create: "创建工作区",
    company: "公司名称",
    send: "发送",
    prompt: "下一步业务计划是什么？",
    attach: "附加文件或图片",
    attachNote:
      "支持最大 1 MB 的 PDF、图片或文本。发送前审核提取的内容；不保存原文件。",
    refresh: "刷新",
    review: "审核",
    approve: "批准并发送此邮件",
    close: "关闭",
    settings: "语音与语言",
    privacy: "隐私",
    terms: "条款",
    support: "支持",
    orders: "我的订单",
    catalog: "服务目录",
  },
  hi: {
    badge: "हिंदी में कारोबार के लिए · AI और व्यवसाय साथ-साथ",
    headline: "आपकी डिजिटल कंपनी।\nआपकी बुद्धिमान टीम।\nएक ही जगह।",
    intro:
      "एक और सदस्यता से आगे बढ़ें। रणनीति, शोध, ईमेल, भुगतान और ब्रांड पहचान को एक इकोसिस्टम में जोड़ें। सरल शुरुआत करें, अपने लक्ष्य के साथ बढ़ें।",
    signIn: "साइन इन करके शुरू करें",
    explore: "सात ऐप देखें",
    nav: [
      "परिचय",
      "व्यवसाय के लिए AI",
      "त्वरित कमांड",
      "OneShot क्यों",
      "सात ऐप",
    ],
    power: "एक बातचीत से व्यवसाय के अगले कदम तक।",
    pillars: [
      [
        "आपका संदर्भ समझने वाली टीम",
        "सलाहकार CEO और विशेषज्ञों के साथ योजना बनाएं। शोध और ईमेल जोड़ें; भेजने से पहले संदेश की समीक्षा करें।",
        "CEO · ईमेल · शोध",
      ],
      [
        "काम के अनुसार बुद्धिमत्ता",
        "तेज़ उत्तर, कोड, विश्लेषण और शोध। Tier 1 / 2 / 3 / X और Hermes उपकरण अलग AI ऐप में उपलब्धता पर निर्भर हैं।",
        "Tier 1 / 2 / 3 / X",
      ],
      [
        "व्यापार को जोड़ें",
        "भुगतान और इंटीग्रेशन वॉल्ट खोलें। Stripe के लिए व्यापारी सेटअप चाहिए; अन्य इंटीग्रेशन सक्रिय होने चाहिए।",
        "Salla · Zid · Shopify · Stripe · Tap · Moyasar · Tabby · Tamara",
      ],
      [
        "अभी हल्का, ज़रूरत पर विस्तृत",
        "Hub में चैट और कार्य देखें। मुख्यालय, बैठकों और विशेष उपकरणों के लिए Workflow खोलें।",
        "Lite Hub → समर्पित ऐप",
      ],
    ],
    appsTitle: "सात मंज़िलें। एक लक्ष्य।",
    appsIntro: "पूरा OneShot इकोसिस्टम। हर काम के लिए जगह, नियंत्रण आपके पास।",
    apps: [
      [
        "आपका प्रवेश और कमांड केंद्र",
        "हल्के इंटरफ़ेस से टीम से बात करें और कार्य देखें।",
        "सहेजी चैट · आवाज़ · स्वीकृतियाँ",
      ],
      [
        "आपका इंटरैक्टिव डिजिटल मुख्यालय",
        "ऑफ़िस में जाएं, टीम से मिलें और अपने कनेक्शन व अनुमतियों के अनुसार कार्यक्षेत्र खोलें।",
        "2.5D मुख्यालय · बैठकें · स्क्रीन",
      ],
      [
        "विशेष बुद्धिमत्ता कार्यक्षेत्र",
        "शोध, विश्लेषण और उन्नत उपकरण। ऐप में उपलब्ध स्तरों और Hermes सुविधाओं की जाँच करें।",
        "शोध · विश्लेषण · बुद्धिमत्ता",
      ],
      [
        "भुगतान और इंटीग्रेशन वॉल्ट",
        "भुगतान सेटिंग एक जगह रखें। हर प्रदाता को सक्रिय एडाप्टर और व्यापारी सेटअप चाहिए।",
        "गेटवे · एन्क्रिप्टेड वॉल्ट · होस्टेड भुगतान",
      ],
      [
        "पहचान और मौसमी थीम",
        "ब्रांड और संसाधनों के लिए स्थान; निर्माण और निर्यात उपलब्ध संस्करण पर निर्भर हैं।",
        "पहचान · संसाधन · थीम",
      ],
      [
        "मोशन और प्रदर्शन प्रयोगशाला",
        "ऐप में उपलब्ध एनीमेशन, लोडिंग इंटरफ़ेस और निदान उपकरण खोजें।",
        "मोशन · निदान · इंटरफ़ेस",
      ],
      [
        "क्रिएटर कंटेंट स्टूडियो",
        "दिमाग़ में मौजूद आइडिया से पब्लिश करने योग्य कंटेंट तक: फ़्रेमिंग और लाइटिंग सिखाने वाला AI डायरेक्टर, YouTube, Shorts और TikTok के लिए क्लिप फ़ैक्ट्री, डॉक्युमेंट्री स्टूडियो और कॉन्ट्रैक्ट अनुवादक — साथ में ऐसा सहायक जो पहले दिन से आपकी शैली जानता है।",
        "YouTube · TikTok · Reels",
      ],
    ],
    benefit: "आपको व्यावहारिक लाभ",
    open: "वेब ऐप खोलें",
    native: "अन्य उपकरणों पर साइन इन",
    install: "वेब ऐप इंस्टॉल करें",
    apk: "Android APK डाउनलोड करें",
    apkPending: "Android संस्करण अभी प्रकाशित नहीं हुआ",
    installHelp:
      "ब्राउज़र मेनू में ऐप इंस्टॉल करें या होम स्क्रीन पर जोड़ें चुनें। समर्थित ब्राउज़र और HTTPS आवश्यक हैं।",
    nativeTitle: "आपके विचारों के लिए अधिक जगह।",
    nativeBody:
      "Hub ब्राउज़र में चलाएं या इंस्टॉल करें। मुख्यालय और विशेष उपकरणों के लिए अलग ऐप खोलें। मूल ऐप की सुविधाएँ प्रकाशित संस्करण पर निर्भर हैं।",
    deepTitle: "अपनी डिजिटल कंपनी में प्रवेश करें।",
    deepBody:
      "इंटरैक्टिव मुख्यालय, कर्मचारी स्क्रीन और बैठकों के लिए Workflow खोलें। रोज़ के काम के लिए Hub हल्का रखें।",
    fullOffice: "OneShot Workflow खोलें",
    localOffice: "वर्तमान मुख्यालय /workforce",
    loading: "लोड हो रहा है…",
    retry: "फिर प्रयास करें",
    unverified: "कनेक्शन सत्यापित नहीं",
    available: "ऐप ने उत्तर दिया",
    sso: "SSO उपलब्ध",
    portal: "हल्का कमांड पोर्टल",
    portalBody: "ऑफ़िस लोड किए बिना टीम, कार्य और स्वीकृतियाँ।",
    chat: "कर्मचारी चैट",
    tasks: "हाल के कार्य",
    approvals: "ईमेल की समीक्षा",
    empty: "अभी कोई रिकॉर्ड नहीं।",
    create: "कार्यक्षेत्र बनाएं",
    company: "कंपनी का नाम",
    send: "भेजें",
    prompt: "आपके व्यवसाय का अगला कदम क्या है?",
    attach: "फ़ाइल या चित्र जोड़ें",
    attachNote:
      "1 MB तक PDF, चित्र या पाठ। भेजने से पहले निकाले गए संदर्भ की समीक्षा करें; मूल फ़ाइल नहीं रखी जाती।",
    refresh: "ताज़ा करें",
    review: "समीक्षा",
    approve: "यह ईमेल स्वीकृत करके भेजें",
    close: "बंद करें",
    settings: "आवाज़ और भाषा",
    privacy: "गोपनीयता",
    terms: "शर्तें",
    support: "सहायता",
    orders: "मेरे ऑर्डर",
    catalog: "सेवा सूची",
  },
  ur: {
    badge: "اردو کاروبار کے لیے · مصنوعی ذہانت اور کاروبار یکجا",
    headline: "آپ کی ڈیجیٹل کمپنی۔\nآپ کی ذہین ٹیم۔\nایک ہی جگہ۔",
    intro:
      "ایک اور رکنیت سے آگے بڑھیں۔ منصوبہ بندی، تحقیق، ای میل، ادائیگی اور برانڈ کی شناخت ایک نظام میں لائیں۔ آسان آغاز کریں، اپنے مقصد کے ساتھ بڑھیں۔",
    signIn: "سائن ان کریں اور شروع کریں",
    explore: "سات ایپس دریافت کریں",
    nav: ["تعارف", "کاروباری ذہانت", "فوری کمانڈ", "OneShot کیوں", "سات ایپس"],
    power: "ایک گفتگو سے کاروبار کے اگلے قدم تک۔",
    pillars: [
      [
        "آپ کا سیاق جاننے والی ٹیم",
        "مشاورتی CEO اور ماہرین کے ساتھ منصوبہ بنائیں۔ تحقیق اور ای میل مربوط کریں؛ بھیجنے سے پہلے پیغام کا جائزہ لیں۔",
        "CEO · ای میل · تحقیق",
      ],
      [
        "کام کے مطابق ذہانت",
        "تیز جواب، کوڈ، تجزیہ اور تحقیق۔ Tier 1 / 2 / 3 / X اور Hermes الگ AI ایپ میں دستیابی پر منحصر ہیں۔",
        "Tier 1 / 2 / 3 / X",
      ],
      [
        "تجارت کو یکجا کریں",
        "ادائیگی اور انضمام کی تجوری کھولیں۔ Stripe کے لیے تاجر کی ترتیب ضروری ہے؛ دیگر انضمام فعال ہونے چاہئیں۔",
        "Salla · Zid · Shopify · Stripe · Tap · Moyasar · Tabby · Tamara",
      ],
      [
        "ابھی ہلکا، ضرورت پر وسیع",
        "Hub میں گفتگو اور کام دیکھیں۔ دفتر، اجلاس اور خاص اوزار کے لیے Workflow کھولیں۔",
        "Lite Hub → مخصوص ایپس",
      ],
    ],
    appsTitle: "سات منزلیں۔ ایک مقصد۔",
    appsIntro: "مکمل OneShot نظام۔ ہر کام کی اپنی جگہ، اختیار آپ کے پاس۔",
    apps: [
      [
        "آپ کا دروازہ اور کمانڈ مرکز",
        "ہلکے انٹرفیس سے ٹیم سے بات کریں اور کام دیکھیں۔",
        "محفوظ گفتگو · آواز · منظوری",
      ],
      [
        "آپ کا تعاملی ڈیجیٹل دفتر",
        "دفتر میں جائیں، ٹیم سے ملیں اور اپنے رابطوں اور اجازتوں کے مطابق کام کی جگہیں کھولیں۔",
        "2.5D دفتر · اجلاس · سکرینیں",
      ],
      [
        "خصوصی ذہانت کی جگہ",
        "تحقیق، تجزیہ اور جدید اوزار۔ ایپ میں دستیاب درجات اور Hermes صلاحیتیں دیکھیں۔",
        "تحقیق · تجزیہ · ذہانت",
      ],
      [
        "ادائیگی اور انضمام کی تجوری",
        "ادائیگی کی ترتیب یکجا رکھیں۔ ہر فراہم کنندہ کے لیے فعال اڈاپٹر اور تاجر کی ترتیب ضروری ہے۔",
        "گیٹ وے · خفیہ تجوری · میزبانی شدہ ادائیگی",
      ],
      [
        "شناخت اور موسمی تھیم",
        "برانڈ اور اثاثوں کی جگہ؛ تخلیق اور برآمد دستیاب نسخے پر منحصر ہیں۔",
        "شناخت · اثاثے · تھیم",
      ],
      [
        "حرکت اور کارکردگی کی لیب",
        "ایپ میں دستیاب حرکت، لوڈنگ انٹرفیس اور تشخیصی اوزار دیکھیں۔",
        "حرکت · تشخیص · انٹرفیس",
      ],
      [
        "کریئیٹر کانٹینٹ اسٹوڈیو",
        "ذہن میں موجود آئیڈیا سے اشاعت کے قابل مواد تک: فریمنگ اور لائٹنگ سکھانے والا AI ڈائریکٹر، YouTube، Shorts اور TikTok کے لیے کلپ فیکٹری، دستاویزی اسٹوڈیو اور معاہدہ مترجم — ساتھ ایسا معاون جو پہلے دن سے آپ کا انداز جانتا ہے۔",
        "YouTube · TikTok · Reels",
      ],
    ],
    benefit: "آپ کا عملی فائدہ",
    open: "ویب ایپ کھولیں",
    native: "دوسرے آلات پر سائن ان",
    install: "ویب ایپ نصب کریں",
    apk: "Android APK ڈاؤن لوڈ",
    apkPending: "Android نسخہ ابھی شائع نہیں ہوا",
    installHelp:
      "براؤزر کے مینو میں ایپ نصب کریں یا ہوم سکرین پر شامل کریں منتخب کریں۔ موافق براؤزر اور HTTPS ضروری ہیں۔",
    nativeTitle: "آپ کے خیالات کے لیے مزید جگہ۔",
    nativeBody:
      "Hub براؤزر میں استعمال یا نصب کریں۔ دفتر اور خاص اوزار کے لیے الگ ایپس کھولیں۔ مقامی صلاحیتیں شائع شدہ نسخے پر منحصر ہیں۔",
    deepTitle: "اپنی ڈیجیٹل کمپنی میں آئیں۔",
    deepBody:
      "تعاملی دفتر، ملازمین کی سکرینیں اور اجلاس Workflow میں ہیں۔ روزمرہ کام کے لیے Hub ہلکا رکھیں۔",
    fullOffice: "OneShot Workflow کھولیں",
    localOffice: "موجودہ دفتر /workforce",
    loading: "لوڈ ہو رہا ہے…",
    retry: "دوبارہ کوشش",
    unverified: "رابطہ غیر مصدقہ",
    available: "ایپ نے جواب دیا",
    sso: "SSO دستیاب",
    portal: "ہلکا کمانڈ پورٹل",
    portalBody: "دفتر لوڈ کیے بغیر ٹیم، کام اور منظوری۔",
    chat: "ملازمین سے گفتگو",
    tasks: "حالیہ کام",
    approvals: "ای میل کا جائزہ",
    empty: "ابھی کوئی ریکارڈ نہیں۔",
    create: "کام کی جگہ بنائیں",
    company: "کمپنی کا نام",
    send: "بھیجیں",
    prompt: "آپ کے کاروبار کا اگلا قدم کیا ہے؟",
    attach: "فائل یا تصویر منسلک کریں",
    attachNote:
      "1 MB تک PDF، تصویر یا متن۔ بھیجنے سے پہلے اخذ کردہ سیاق دیکھیں؛ اصل فائل محفوظ نہیں ہوتی۔",
    refresh: "تازہ کریں",
    review: "جائزہ",
    approve: "یہ ای میل منظور کرکے بھیجیں",
    close: "بند کریں",
    settings: "آواز اور زبان",
    privacy: "رازداری",
    terms: "شرائط",
    support: "مدد",
    orders: "میرے آرڈرز",
    catalog: "خدمات کی فہرست",
  },
};
