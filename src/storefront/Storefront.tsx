import { Modal } from "../components/Modal";
import { MarketingComparison } from "../marketing/MarketingComparison";
import { MarketingMarket, MarketingModes } from "../marketing/MarketingIntro";
import { marketingCopy } from "../marketing/copy";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Blocks,
  Bot,
  BriefcaseBusiness,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  Copy,
  CreditCard,
  Download,
  FileText,
  Globe2,
  KeyRound,
  Layers3,
  LockKeyhole,
  Mail,
  Menu,
  MessageCircle,
  Palette,
  PhoneCall,
  Search,
  ShieldCheck,
  ShoppingBag,
  Target,
  Video,
  X,
  Zap,
} from "lucide-react";
import { appearanceLink, useAppearance } from "./i18n";
import { AppearanceControls } from "./Brand";
import { useStudioReveal } from "./useStudioReveal";
import {
  categories,
  useCatalog,
  cdnImage,
  cdnImageSet,
  type Product,
} from "./catalog";
import { getLocalizedProductContent } from "./catalog-en";
import { documents, type DocumentPage } from "./documents";
import { guides } from "./guides";

import "./storefront.css";

type Inquiry = {
  sku: string;
  title: string;
  amount: number;
  monthly?: boolean;
  startsAt?: boolean;
};
const categoryIcons = {
  ALL: Layers3,
  AUT: Zap,
  DIG: FileText,
  AI: Bot,
  WEB: Globe2,
  BRD: Palette,
  SOC: Target,
  MED: Video,
  MKT: Target,
};
function Logo() {
  const { tr } = useAppearance();
  return (
    <a
      className="store-logo"
      href={appearanceLink("/")}
      aria-label={`OneShot Hub · ${tr("الرئيسية", "Home")}`}
    >
      <img
        className="store-logo-emblem"
        src="/oneshot.svg"
        alt=""
        width="44"
        height="44"
      />
      <span dir="ltr">
        one<b>Shot</b>
        <small>Hub</small>
      </span>
    </a>
  );
}

export default function Storefront({
  signedIn,
  authReady,
  onWorkforce,
  onLogin,
  onOrders,
  accountControl,
}: {
  signedIn: boolean;
  authReady: boolean;
  onWorkforce: () => void;
  onLogin: () => void;
  onOrders: () => void;
  accountControl: ReactNode;
}) {
  const records = useCatalog();
  const mediaPackages = records.flatMap((p) => (p.media ? [p.media] : []));
  const googleAdsPackage = records.find((p) => p.sourceKind === "ads");
  const { language, tr, number } = useAppearance();
  const ar = language === "ar";
  const [menu, setMenu] = useState(false);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  useStudioReveal(path);

  const documentKey = path.slice(1) as DocumentPage;
  const documentPage = Object.prototype.hasOwnProperty.call(
    documents,
    documentKey,
  )
    ? documents[documentKey]
    : null;
  const product = path.startsWith("/products/")
    ? records.find((item) => item.sku === path.split("/")[2])
    : null;
  const title = documentPage
    ? tr(documentPage.titleAr, documentPage.titleEn)
    : path.startsWith("/products/")
      ? product
        ? `${tr(product.nameAr, product.nameEn)} (${product.sku})`
        : tr("المنتج غير موجود", "Product Not Found")
      : path === "/products"
        ? tr(
            "كتالوج المنتجات والخدمات الرقمية",
            "Products & Digital Services Catalog",
          )
        : path === "/"
          ? marketingCopy[language].headline
          : tr(
              "التصوير والتسويق والتصميم والتكاملات الرقمية",
              "Photography, Marketing, Design & Business Integrations",
            );
  useEffect(() => {
    document.title = `${title} | OneShot Hub`;
  }, [title]);

  const nav = [
    { href: "/workforce", ar: "موظفو AI", en: "AI Workforce", Icon: Bot },
    { href: "/", ar: "الرئيسية", en: "Home", Icon: Camera },
    {
      href: "/products",
      ar: "كتالوج الخدمات",
      en: "Services Catalog",
      Icon: ShoppingBag,
    },

    {
      href: "/#section-media",
      ar: "التصوير والإنتاج",
      en: "Media & Production",
      Icon: Video,
    },
    {
      href: "/#section-ai-staff",
      ar: "تخصصات AI",
      en: "AI Workforce",
      Icon: Bot,
    },
    {
      href: "/api-integration",
      ar: "حلول الربط",
      en: "Integrations",
      Icon: Code2,
    },
    {
      href: "/#section-contact",
      ar: "تواصل معنا",
      en: "Contact",
      Icon: PhoneCall,
    },
  ];
  return (
    <div className="storefront">
      <a className="store-skip" href="#store-main">
        {tr("انتقل إلى المحتوى", "Skip to content")}
      </a>
      <header className="store-header">
        <div className="store-header-inner">
          <Logo />
          <nav
            className="store-desktop-nav"
            aria-label={tr("القائمة الرئيسية", "Main navigation")}
          >
            {["/", "/products", "/workforce", "/#section-contact"].map(
              (href) => {
                const item = nav.find((entry) => entry.href === href)!;
                const active =
                  href === "/products" ? path.startsWith(href) : path === href;
                return (
                  <a
                    key={href}
                    href={appearanceLink(href)}
                    aria-current={active ? "page" : undefined}
                  >
                    {tr(item.ar, item.en)}
                  </a>
                );
              },
            )}
          </nav>
          <div className="store-header-actions">
            <button
              className="store-icon"
              onClick={onOrders}
              aria-label={tr("طلباتي", "My orders")}
              title={tr("طلباتي", "My orders")}
            >
              <ShoppingBag size={17} />
            </button>
            <button
              className="store-icon"
              aria-label={tr("القائمة والحساب", "Menu & account")}
              aria-haspopup="dialog"
              onClick={() => setMenu(true)}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>
      {menu && (
        <Modal
          title={tr("القائمة والحساب", "Menu & account")}
          onClose={() => setMenu(false)}
          drawer
        >
          <nav
            className="store-drawer-nav"
            aria-label={tr("روابط الموقع", "Site navigation")}
          >
            {nav.map(({ href, ar: labelAr, en, Icon }) => (
              <a
                key={href}
                href={appearanceLink(href)}
                aria-current={path === href ? "page" : undefined}
                onClick={() => setMenu(false)}
              >
                <Icon size={16} />
                {tr(labelAr, en)}
              </a>
            ))}
          </nav>
          <div className="store-drawer-tools">
            <AppearanceControls />
            <div
              onClick={(event) => {
                if (
                  event.target instanceof Element &&
                  event.target.closest("button")
                )
                  setMenu(false);
              }}
            >
              {accountControl}
            </div>
          </div>
          <nav
            className="store-workspaces"
            aria-label={tr("مساحات ونشوت", "OneShot workspaces")}
          >
            <span className="store-workspaces-label">ONESHOT /</span>
            <div className="store-workspace-links">
              {[
                {
                  module: "store",
                  ar: "المتجر",
                  en: "Store",
                  Icon: ShoppingBag,
                },
                {
                  module: "gateway",
                  ar: "بوابات الدفع",
                  en: "Payments",
                  Icon: CreditCard,
                },
                {
                  module: "ceo",
                  ar: "المكتب التنفيذي",
                  en: "Executive",
                  Icon: BriefcaseBusiness,
                },
                {
                  module: "vault",
                  ar: "الخزنة",
                  en: "Vault",
                  Icon: LockKeyhole,
                },
              ].map(({ module, ar: labelAr, en, Icon }) => (
                <a
                  key={module}
                  href={appearanceLink(`/?module=${module}`)}
                  className={module === "store" ? "active" : ""}
                  aria-current={module === "store" ? "true" : undefined}
                >
                  <Icon size={16} />
                  {tr(labelAr, en)}
                </a>
              ))}
            </div>
          </nav>
        </Modal>
      )}

      <main className="store-main" id="store-main">
        {documentPage ? (
          <article className="store-document">
            <a className="store-back" href={appearanceLink("/")}>
              <ArrowRight size={17} />
              {tr("العودة إلى الموقع", "Back to website")}
            </a>
            <div className="store-document-body">
              <div className="store-document-title">
                <span className="store-feature-icon">
                  <FileText size={26} />
                </span>
                <div>
                  <span className="store-kicker">
                    OneShot Photography · 1shotcam.com
                  </span>
                  <h1>{title}</h1>
                </div>
              </div>
              {(ar ? documentPage.bodyAr : documentPage.bodyEn).map(
                (paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ),
              )}
              {documentKey === "api-integration" && (
                <a className="store-button" href={appearanceLink("/dashboard")}>
                  {tr("فتح مساحة البوابات", "Open gateway workspace")}
                </a>
              )}
              {["support", "accounts"].includes(documentKey) && (
                <div className="store-actions">
                  <a
                    className="store-button"
                    href="mailto:support@1shotcam.com"
                  >
                    <Mail size={16} />
                    support@1shotcam.com
                  </a>
                  <a
                    className="store-button secondary"
                    href="mailto:finance@1shotcam.com"
                  >
                    finance@1shotcam.com
                  </a>
                </div>
              )}
            </div>
          </article>
        ) : path.startsWith("/products/") ? (
          product ? (
            <ProductDetails product={product} onOrder={setInquiry} />
          ) : (
            <div className="store-empty">
              <Search size={38} />
              <h1>{tr("المنتج غير موجود", "Product not found")}</h1>
              <a className="store-button" href={appearanceLink("/products")}>
                {tr("تصفح الكتالوج", "Browse the catalog")}
              </a>
            </div>
          )
        ) : path !== "/" && path !== "/products" ? (
          <div className="store-empty">
            <h1>{tr("الصفحة غير موجودة", "Page not found")}</h1>
            <a href={appearanceLink("/")}>
              {tr("العودة للرئيسية", "Back home")}
            </a>
          </div>
        ) : path === "/products" ? (
          <Catalog onOrder={setInquiry} />
        ) : (
          <>
            <section className="store-hero" id="section-hero">
              <div className="store-hero-copy">
                <span className="store-pill">
                  <Globe2 size={16} />
                  {marketingCopy[language].badge}
                </span>
                <h1>{marketingCopy[language].headline}</h1>
                <p>{marketingCopy[language].intro}</p>
                <MarketingMarket />
                <div className="store-actions">
                  <a
                    className="store-button secondary"
                    href={appearanceLink("/workforce")}
                  >
                    <ShoppingBag size={18} />
                    {marketingCopy[language].team}
                    <ArrowLeft size={16} />
                  </a>
                  <button
                    type="button"
                    className="store-button store-workforce-entry"
                    onClick={onWorkforce}
                    disabled={!authReady}
                  >
                    <KeyRound size={18} aria-hidden="true" />
                    <span>
                      {signedIn
                        ? marketingCopy[language].enterHeadquarters
                        : marketingCopy[language].signInHeadquarters}
                    </span>
                    {signedIn && <ArrowLeft size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <MarketingModes />
            </section>
            <div id="section-workforce">
              <MarketingComparison />
            </div>
            <ol
              className="store-journey"
              aria-label={tr("خطوات طلب الخدمة", "How to request a service")}
            >
              {[
                [
                  "اختر خدمتك",
                  "Choose your service",
                  "تصفح الأعمال والحلول",
                  "Explore services and solutions",
                ],
                [
                  "راجع التفاصيل",
                  "Review the details",
                  "النطاق والسعر ووقت التسليم",
                  "Scope, price and delivery",
                ],
                [
                  "تواصل مع الفريق",
                  "Talk to our team",
                  "نؤكد معك تفاصيل التنفيذ",
                  "Confirm your project brief",
                ],
              ].map(([labelAr, labelEn, textAr, textEn], index) => (
                <li key={labelEn}>
                  <b dir="ltr">0{index + 1}</b>
                  <span>
                    <strong>{tr(labelAr, labelEn)}</strong>
                    <small>{tr(textAr, textEn)}</small>
                  </span>
                </li>
              ))}
            </ol>

            <Catalog onOrder={setInquiry} preview />

            <section className="store-section" id="section-media">
              <div className="store-section-heading">
                <div>
                  <span className="store-kicker">
                    <Camera size={16} />
                    {tr(
                      "استوديو ونشوت للإنتاج المرئي",
                      "ONESHOT CREATIVE PRODUCTION STUDIO",
                    )}
                  </span>
                  <h2>
                    {tr(
                      "خدمات الميديا، الفيديو، والتصاميم الإبداعية",
                      "Media, Video & Creative Design",
                    )}
                  </h2>
                  <p>
                    {tr(
                      "جلسات تصوير سينمائي، محتوى بصري وتصاميم إبداعية تبرز هوية علامتك التجارية.",
                      "Cinematic photography, visual content and creative design that bring your brand into focus.",
                    )}
                  </p>
                </div>
                <a className="store-button secondary" href="#section-contact">
                  {tr("حجز باقة تصوير", "Book a Shoot")}
                  <ArrowLeft size={16} />
                </a>
              </div>
              <div className="store-media-grid">
                {mediaPackages.map((item) => (
                  <article className="store-media-card" key={item.sku}>
                    <div className="store-media-image">
                      <img
                        src={cdnImage(`/images/${item.image}.jpg`)}
                        srcSet={cdnImageSet(`/images/${item.image}.jpg`)}
                        sizes="(max-width: 580px) calc(100vw - 32px), (max-width: 1200px) 46vw, 290px"
                        alt={tr(item.nameAr, item.nameEn)}
                        loading="lazy"
                        width="800"
                        height="540"
                      />
                      <span className="store-image-badge">
                        {tr(item.badgeAr, item.badgeEn)}
                      </span>
                    </div>
                    <div className="store-media-content">
                      <small className="store-sku" dir="ltr">
                        SKU: {item.sku}
                      </small>
                      <h3>{tr(item.nameAr, item.nameEn)}</h3>
                      <p>{tr(item.descriptionAr, item.descriptionEn)}</p>
                      <span className="store-delivery">
                        <Clock3 size={14} />
                        {item.days
                          ? tr(
                              `التسليم خلال ${item.days} أيام عمل`,
                              `Delivery in ${item.days} business days`,
                            )
                          : tr("اشتراك شهري متجدد", "Monthly retainer")}
                      </span>
                      <div className="store-card-bottom">
                        <div>
                          <small>
                            {tr(
                              item.days ? "السعر" : "شهرياً",
                              item.days ? "Price" : "Monthly",
                            )}
                          </small>
                          <strong>
                            {number(item.price)} <span>{tr("ر.س", "SAR")}</span>
                          </strong>
                        </div>
                        <button
                          className="store-button compact secondary"
                          onClick={() =>
                            setInquiry({
                              sku: item.sku,
                              title: tr(item.nameAr, item.nameEn),
                              amount: item.price,
                              monthly: !item.days,
                            })
                          }
                        >
                          {tr("طلب الخدمة", "Request Service")}
                          <ArrowLeft size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="store-section" id="section-ai-staff">
              <div className="store-section-heading">
                <div>
                  <span className="store-kicker">
                    <Bot size={16} />
                    {tr(
                      "سوق كوادر الـ AI • AI Staff Marketplace",
                      "AI WORKFORCE & AUTONOMOUS AGENTS",
                    )}
                  </span>
                  <h2>
                    {tr(
                      "تخصصات AI تساعد فريقك على التخطيط والتحليل",
                      "AI specializations for planning and analysis",
                    )}
                  </h2>
                  <p>
                    {tr(
                      "فريق استشاري للتخطيط والمحتوى وخدمة العملاء، تحت إشرافك.",
                      "An advisory team for planning, content and customer care, with your oversight.",
                    )}
                  </p>
                </div>
                <a
                  className="store-button secondary"
                  href={appearanceLink("/sign-in")}
                >
                  {tr("دخول لتوظيف موظفي الـ AI", "Hire AI Staff in Workspace")}
                  <ArrowLeft size={16} />
                </a>
              </div>
              <div className="store-media-grid">
                {[
                  {
                    titleAr: "مدير العمليات والربط المالي (Operations AI)",
                    titleEn: "Operations & Payment Routing AI",
                    descAr:
                      "يساعد في قراءة تقارير العمليات وتحليل مؤشرات الدفع المتاحة في المنظومة.",
                    descEn:
                      "Helps interpret operations reports and available payment metrics.",
                    tagAr: "العمليات والمالية",
                    tagEn: "Operations",
                    icon: Zap,
                  },
                  {
                    titleAr: "أخصائي التسويق الرقمي وإعلانات جوجل (Growth AI)",
                    titleEn: "Google Ads & Marketing AI",
                    descAr:
                      "يقترح خطط الحملات ومؤشرات قياس الأداء؛ تنفيذ الحملات يتم عبر الفريق وحساباتك الإعلانية.",
                    descEn:
                      "Suggests campaign plans and performance indicators; your team executes campaigns through your advertising accounts.",
                    tagAr: "التسويق والنمو",
                    tagEn: "Marketing",
                    icon: Target,
                  },
                  {
                    titleAr:
                      "حارس مكافحة الاحتيال وفاحص الـ BINs (Risk Guard AI)",
                    titleEn: "Fraud Prevention & BIN Intel AI",
                    descAr:
                      "يشرح مؤشرات المخاطر والحماية دون جمع أرقام البطاقات أو ضمان قبول المعاملات.",
                    descEn:
                      "Explains risk and protection indicators without collecting card numbers or guaranteeing approvals.",
                    tagAr: "الأمان والحماية",
                    tagEn: "Security",
                    icon: ShieldCheck,
                  },
                  {
                    titleAr:
                      "مستشار خدمة العملاء والدعم الفوري (Customer Care AI)",
                    titleEn: "Instant Customer Experience AI",
                    descAr:
                      "يساعد في صياغة إجابات العملاء وشرح الخدمات داخل مقر شركتك الرقمي.",
                    descEn:
                      "Helps draft customer replies and explain services in your digital headquarters.",
                    tagAr: "الدعم المباشر",
                    tagEn: "Support",
                    icon: Bot,
                  },
                ].map((item, idx) => {
                  const ItemIcon = item.icon;
                  return (
                    <article
                      className="store-media-card store-ai-card"
                      key={idx}
                    >
                      <div className="store-ai-card-heading">
                        <span className="store-feature-icon">
                          <ItemIcon size={22} />
                        </span>
                        <span className="store-image-badge">
                          {tr(item.tagAr, item.tagEn)}
                        </span>
                      </div>
                      <h3>{tr(item.titleAr, item.titleEn)}</h3>
                      <p>{tr(item.descAr, item.descEn)}</p>
                      <a
                        className="store-button secondary compact"
                        href={appearanceLink("/workforce")}
                      >
                        {tr(
                          "استكشف موظفي AI في مقر شركتك",
                          "Explore AI employees in your headquarters",
                        )}
                        <ArrowLeft size={14} />
                      </a>
                    </article>
                  );
                })}
              </div>
            </section>

            {googleAdsPackage && (
              <section
                className="store-marketing store-section"
                id="section-google-ads"
              >
                <div>
                  <span className="store-kicker">
                    <Target size={17} />
                    {tr(
                      "رصيد إعلانات جوجل • Digital Marketing",
                      "GOOGLE ADS CREDIT • DIGITAL MARKETING",
                    )}
                  </span>
                  <h2>
                    {tr(
                      "ضاعف مبيعات متجرك مع رصيد إعلانات جوجل الموثوق",
                      "Grow Your Store with Google Ads",
                    )}
                  </h2>
                  <p>
                    {tr(
                      "تسويق وإدارة حملات مع ضبط أكواد التتبع والتحويل (Conversion API & Google Tag Manager) لقياس العائد الاستثماري في السوق السعودي والخليجي.",
                      "Campaign management and conversion tracking with Conversion API and Google Tag Manager for the Saudi and Gulf markets.",
                    )}
                  </p>
                  <div className="store-marketing-features">
                    {[
                      [
                        ShieldCheck,
                        "إعداد الحسابات الإعلانية",
                        "Advertising Account Setup",
                        "تهيئة حسابك الإعلاني وفق متطلبات نشاطك.",
                        "Set up your advertising account for your business.",
                      ],
                      [
                        Target,
                        "حملات Performance Max و Search",
                        "Performance Max & Search",
                        "وصول إلى عملائك عبر البحث واليوتيوب وشبكة العرض.",
                        "Reach customers on search, YouTube and the display network.",
                      ],
                      [
                        Code2,
                        "ربط التحويلات المتقدم",
                        "Advanced Conversion Tracking",
                        "تتبع عمليات الشراء لقياس تكلفة الاكتساب.",
                        "Track purchases and measure acquisition costs.",
                      ],
                      [
                        CreditCard,
                        "باقات بالريال السعودي",
                        "Packages in Saudi Riyals",
                        "اختر باقتك وراجع نطاق الخدمة مع فريقنا.",
                        "Choose a package and confirm the scope with our team.",
                      ],
                    ].map(([Icon, nameAr, nameEn, textAr, textEn]) => {
                      const FeatureIcon = Icon as typeof Target;
                      return (
                        <div key={String(nameEn)}>
                          <span className="store-feature-icon">
                            <FeatureIcon size={20} />
                          </span>
                          <div>
                            <h3>{tr(String(nameAr), String(nameEn))}</h3>
                            <p>{tr(String(textAr), String(textEn))}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <article className="store-ads-card">
                  <span className="store-pill">
                    {tr(
                      "باقة شحن الرصيد الأكثر طلباً",
                      "FEATURED ADVERTISING PACKAGE",
                    )}
                  </span>
                  <div className="store-google-mark" aria-hidden="true">
                    G<span>Ads</span>
                  </div>
                  <h3>
                    {tr(
                      "باقة نمو إعلانات جوجل الماسية",
                      "Google Ads Diamond Growth Package",
                    )}
                  </h3>
                  <dl>
                    <div>
                      <dt>
                        {tr("الرصيد الإعلاني الفعلي", "Advertising credit")}
                      </dt>
                      <dd>5,000 SAR</dd>
                    </div>
                    <div>
                      <dt>
                        {tr(
                          "تهيئة التتبع و Google Tag",
                          "Tracking & Google Tag setup",
                        )}
                      </dt>
                      <dd>{tr("مشمولة", "Included")}</dd>
                    </div>
                    <div>
                      <dt>
                        {tr("جلسة استشارة استراتيجية", "Strategy consultation")}
                      </dt>
                      <dd>
                        {tr("ساعة كاملة مع خبير", "One hour with an expert")}
                      </dd>
                    </div>
                  </dl>
                  <div className="store-ads-price">
                    <small>
                      {tr("سعر الباقة المنشور", "Published package price")}
                    </small>
                    <strong>
                      {number(googleAdsPackage.pricing.amount)} <span>SAR</span>
                    </strong>
                  </div>
                  <button
                    className="store-button"
                    onClick={() =>
                      setInquiry({
                        sku: googleAdsPackage.sku,
                        title: tr(
                          "باقة نمو إعلانات جوجل الماسية",
                          "Google Ads Diamond Growth Package",
                        ),
                        amount: googleAdsPackage.pricing.amount,
                      })
                    }
                  >
                    {tr("طلب باقة جوجل آدز", "Request Google Ads Package")}
                    <ArrowLeft size={16} />
                  </button>
                  <p>
                    {tr(
                      "يتوفر أيضاً شحن مخصص بمبالغ تبدأ من 1,000 ر.س حتى 100,000 ر.س عبر التواصل المباشر.",
                      "Custom advertising budgets from SAR 1,000 to SAR 100,000 are available through our team.",
                    )}
                  </p>
                </article>
              </section>
            )}

            <IntegrationSection />

            <section
              className="store-contact store-section"
              id="section-contact"
            >
              <div>
                <span className="store-kicker">
                  {tr("بيانات التواصل الرسمي", "OFFICIAL CONTACT CHANNELS")}
                </span>
                <h2>
                  {tr(
                    "تواصل معنا مباشرة، فريقنا في خدمتك",
                    "Let’s Talk. Our Team Is Here for You.",
                  )}
                </h2>
                <p>
                  {tr(
                    "سواء كنت ترغب في حجز جلسة تصوير ميديا، شحن رصيد جوجل آدز، أو ربط متجرك ببوابات الدفع — تواصل مع فريقنا لمناقشة طلبك.",
                    "Book a shoot, discuss your advertising campaign or connect your store to a payment gateway. Talk to our team about your project.",
                  )}
                </p>
                <div className="store-contact-details">
                  <div>
                    <MessageCircle size={20} />
                    <div>
                      <small>{tr("واتساب الدعم", "WhatsApp Support")}</small>
                      <a
                        href="https://wa.me/966501234567"
                        target="_blank"
                        rel="noreferrer"
                        dir="ltr"
                      >
                        +966 50 123 4567
                      </a>
                    </div>
                  </div>
                  <div>
                    <Mail size={20} />
                    <div>
                      <small>{tr("البريد الإلكتروني", "Email")}</small>
                      <a href="mailto:support@1shotcam.com">
                        support@1shotcam.com
                      </a>
                    </div>
                  </div>
                  <div>
                    <Globe2 size={20} />
                    <div>
                      <small>
                        {tr(
                          "المملكة العربية السعودية",
                          "Kingdom of Saudi Arabia",
                        )}
                      </small>
                      <span>
                        {tr(
                          "مؤسسة يحيى أحمد يحيى الهوساوي للتصوير الفوتوغرافي",
                          "Yahya Ahmed Yahya Alhawsawi Photography Establishment",
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="store-contact-card">
                <MessageCircle size={35} />
                <h3>
                  {tr(
                    "بدء فوري أو طلب عرض سعر مخصص",
                    "Start a Project or Request a Quote",
                  )}
                </h3>
                <p>
                  {tr(
                    "تواصل عبر الواتساب مع فريقنا، أو سجّل دخولك لإدارة حسابك.",
                    "Contact our team on WhatsApp, or sign in to manage your account.",
                  )}
                </p>
                <a
                  className="store-button whatsapp"
                  href="https://wa.me/966501234567"
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={17} />
                  {tr("مراسلة عبر واتساب", "Message on WhatsApp")}
                </a>
                <button className="store-button secondary" onClick={onLogin}>
                  <KeyRound size={17} />
                  {tr(
                    "دخول بوابة التجار والعملاء",
                    "Merchant & Client Sign In",
                  )}
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="store-footer">
        <div className="store-footer-inner">
          <div className="store-footer-columns">
            <div>
              <Logo />
              <p>
                {tr(
                  "خدمات التصوير الفوتوغرافي والإنتاج المرئي والتسويق الرقمي والتصميم، مع حلول رقمية مساندة للأفراد والمنشآت.",
                  "Photography, visual production, digital marketing and design, supported by modern digital business solutions.",
                )}
              </p>
              <small className="store-kicker" dir="ltr">
                1shotcam.com → OneShot Hub
              </small>
            </div>
            <div>
              <h3>{tr("خدماتنا", "Our Services")}</h3>
              {[
                ["التصوير الفوتوغرافي", "Photography"],
                ["الإنتاج المرئي والمحتوى", "Visual Production & Content"],
                ["التسويق الرقمي والإعلانات", "Digital Marketing"],
                ["التصميم والهوية البصرية", "Design & Brand Identity"],
              ].map(([arabic, english], index) => (
                <a
                  key={english}
                  href={appearanceLink(
                    index === 2 ? "/#section-google-ads" : "/#section-media",
                  )}
                >
                  {tr(arabic, english)}
                </a>
              ))}
              <a href={appearanceLink("/products")}>
                {tr("حلول الأعمال الرقمية", "Digital Business Solutions")}
              </a>
            </div>
            <div>
              <h3>{tr("دليل التجار الذكي", "Smart Merchant Guide")}</h3>
              {guides.map((guide) => (
                <a
                  key={guide.slug}
                  href={appearanceLink(`/guides/${guide.slug}`)}
                >
                  {tr(guide.titleAr, guide.titleEn)}
                </a>
              ))}
            </div>
            <div>
              <h3>{tr("المنشأة", "Business Information")}</h3>
              <p>OneShot Photography</p>
              <p>
                {tr(
                  "مؤسسة يحيى أحمد يحيى الهوساوي للتصوير الفوتوغرافي",
                  "Yahya Ahmed Yahya Alhawsawi Photography Establishment",
                )}
              </p>
              <p>1shotcam.com</p>
              <p>{tr("المملكة العربية السعودية", "Kingdom of Saudi Arabia")}</p>
            </div>
            <div>
              <h3>{tr("التواصل والاعتماد", "Contact & Brand")}</h3>
              <a className="store-accent" href="mailto:finance@1shotcam.com">
                finance@1shotcam.com
              </a>
              <a href="mailto:support@1shotcam.com">support@1shotcam.com</a>
              <a href={appearanceLink("/dashboard")}>
                {tr("مساحة التاجر", "Merchant Workspace")}
              </a>
              <a href={appearanceLink("/products")}>
                {tr("كتالوج المنتجات والخدمات", "Products & Services")}
              </a>
            </div>
          </div>
          <nav
            className="store-footer-policies"
            aria-label={tr(
              "معلومات الشركة والسياسات",
              "Company information and policies",
            )}
          >
            {Object.entries(documents).map(([key, value]) => (
              <a key={key} href={appearanceLink(`/${key}`)}>
                {tr(value.titleAr, value.titleEn)}
              </a>
            ))}
          </nav>
          <div className="store-footer-bottom">
            <span>
              <ShieldCheck size={15} />© 2026 OneShot Brand System.{" "}
              {tr(
                "جميع الحقوق محفوظة لـ 1shotcam.com",
                "All rights reserved to 1shotcam.com",
              )}
            </span>
            <span>Photography · Marketing · Design</span>
          </div>
        </div>
      </footer>
      {inquiry && (
        <InquiryDialog inquiry={inquiry} onClose={() => setInquiry(null)} />
      )}
    </div>
  );
}

function Catalog({
  onOrder,
  preview = false,
}: {
  onOrder: (item: Inquiry) => void;
  preview?: boolean;
}) {
  const records = useCatalog();
  const products = useMemo(
    () => records.filter((p) => p.sourceKind === "catalog"),
    [records],
  );
  const { tr, number, language } = useAppearance();
  const initialCategory = new URLSearchParams(window.location.search).get(
    "category",
  );
  const [category, setCategory] = useState(
    categories.some((item) => item.id === initialCategory)
      ? initialCategory!
      : "ALL",
  );
  const [search, setSearch] = useState("");
  const pageSize = preview ? 6 : 12;
  const [limit, setLimit] = useState(pageSize);
  const filtered = useMemo(
    () =>
      products.filter(
        (item) =>
          (category === "ALL" || item.categoryId === category) &&
          `${item.nameAr} ${item.nameEn} ${tr(item.nameAr, item.nameEn)} ${item.sku} ${getLocalizedProductContent(item, language === "ar").shortDescription}`
            .toLocaleLowerCase()
            .includes(search.trim().toLocaleLowerCase()),
      ),
    [category, search, language, products],
  );
  function reset() {
    setCategory("ALL");
    setSearch("");
    setLimit(pageSize);
  }
  return (
    <section className="store-catalog store-section" id="section-catalog">
      <div className="store-section-heading">
        <div>
          <span className="store-kicker">
            <ShoppingBag size={16} />
            {tr("كتالوج ونشوت الشامل 2026", "THE ONESHOT CATALOG 2026")}
          </span>
          <h2>
            {tr(
              "كتالوج المنتجات والخدمات الرقمية",
              "Products & Digital Services",
            )}
          </h2>
          <p>
            {tr(
              "تصفح كافة الخدمات والحلول المتاحة مع أسعارها الرسمية بالريال السعودي ومواصفات التنفيذ والتسليم.",
              "Explore our services, published prices in Saudi Riyals, deliverables and timelines.",
            )}
          </p>
        </div>
        <label className="store-search">
          <Search size={18} />
          <span className="store-sr-only">
            {tr("ابحث عن منتج أو خدمة", "Search products or services")}
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLimit(pageSize);
            }}
            placeholder={tr(
              "ابحث بالاسم أو رمز المنتج...",
              "Search by name or SKU...",
            )}
          />
        </label>
      </div>
      <div className="store-catalog-layout">
        <aside
          className="store-categories"
          aria-label={tr("تصنيفات المنتجات", "Product categories")}
        >
          {categories.map((item) => {
            const Icon =
              categoryIcons[item.id as keyof typeof categoryIcons] || Layers3;
            const count =
              item.id === "ALL"
                ? products.length
                : products.filter((product) => product.categoryId === item.id)
                    .length;
            return (
              <button
                key={item.id}
                aria-pressed={category === item.id}
                className={category === item.id ? "active" : ""}
                onClick={() => {
                  setCategory(item.id);
                  setLimit(pageSize);
                }}
              >
                <Icon size={17} />
                <span>{tr(item.nameAr, item.nameEn)}</span>
                <small>{count}</small>
              </button>
            );
          })}
        </aside>
        <div>
          <div className="store-product-grid">
            {filtered.slice(0, limit).map((item) => (
              <article className="store-product-card" key={item.sku}>
                <a
                  className="store-product-media"
                  href={appearanceLink(`/products/${item.sku}`)}
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  <img
                    src={cdnImage(item.image)}
                    srcSet={cdnImageSet(item.image)}
                    sizes="(max-width: 580px) calc(100vw - 72px), (max-width: 760px) 42vw, (max-width: 1200px) 32vw, 290px"
                    alt=""
                    width={1280}
                    height={800}
                    loading="lazy"
                    decoding="async"
                  />
                </a>
                <div className="store-product-meta">
                  <span className="store-sku">{item.sku}</span>
                  <span>
                    <Clock3 size={12} />
                    {item.deliveryDays} {tr("أيام عمل", "business days")}
                  </span>
                </div>
                <h3>
                  <a href={appearanceLink(`/products/${item.sku}`)}>
                    {tr(item.nameAr, item.nameEn)}
                  </a>
                </h3>
                <p dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
                  {
                    getLocalizedProductContent(item, language === "ar")
                      .shortDescription
                  }
                </p>
                {!preview && (
                  <ul dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
                    {getLocalizedProductContent(item, language === "ar")
                      .deliverables.slice(0, 2)
                      .map((text) => (
                        <li key={text}>
                          <CheckCircle2 size={13} />
                          {text}
                        </li>
                      ))}
                  </ul>
                )}
                <div className="store-product-price">
                  <small>
                    {item.pricing.billingCycle === "monthly"
                      ? tr("شهرياً", "Monthly")
                      : item.pricing.type === "starts_at"
                        ? tr("يبدأ من", "Starting at")
                        : tr("سعر ثابت", "Fixed price")}
                  </small>
                  <strong>
                    {number(item.pricing.amount)} <span>SAR</span>
                  </strong>
                </div>
                <div className="store-product-actions">
                  <a
                    className="store-button secondary compact"
                    href={appearanceLink(`/products/${item.sku}`)}
                  >
                    {tr("التفاصيل", "Details")}
                  </a>
                  <button
                    className="store-button compact secondary"
                    disabled={item.status !== "ready_to_sell"}
                    onClick={() =>
                      onOrder({
                        sku: item.sku,
                        title: tr(item.nameAr, item.nameEn),
                        amount: item.pricing.amount,
                        monthly: item.pricing.billingCycle === "monthly",
                        startsAt: item.pricing.type === "starts_at",
                      })
                    }
                  >
                    {item.status === "ready_to_sell"
                      ? tr("طلب الخدمة", "Request")
                      : tr("قيد الإعداد والاختبار", "In preparation")}
                    <ArrowLeft size={13} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!filtered.length && (
            <div className="store-empty">
              <Search size={35} />
              <h3>{tr("لا توجد منتجات مطابقة", "No matching products")}</h3>
              <p>
                {tr(
                  "جرّب البحث باسم آخر أو اختر تصنيفاً مختلفاً.",
                  "Try another search or choose a different category.",
                )}
              </p>
              <button className="store-button secondary" onClick={reset}>
                {tr("عرض جميع المنتجات", "Show all products")}
              </button>
            </div>
          )}
          <div className="store-catalog-status">
            <p role="status">
              {tr(
                "يتم عرض {shown} منتج من {total} نتيجة — إجمالي {catalog} منتج بالكتالوج.",
                "Showing {shown} of {total} results · {catalog} products in the catalog.",
              )
                .replace("{shown}", String(Math.min(limit, filtered.length)))
                .replace("{total}", String(filtered.length))
                .replace("{catalog}", String(products.length))}
            </p>
            {preview && (
              <a
                className="store-button secondary"
                href={appearanceLink("/products")}
              >
                {tr("تصفح الكتالوج الكامل", "Browse the full catalog")}
                <ArrowLeft size={16} />
              </a>
            )}
            {limit < filtered.length && (
              <button
                className="store-button secondary"
                onClick={() => setLimit((value) => value + 12)}
              >
                {tr("عرض المزيد من المنتجات", "Load more products")}
                <ChevronDown size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductDetails({
  product,
  onOrder,
}: {
  product: Product;
  onOrder: (item: Inquiry) => void;
}) {
  const { tr, number, language } = useAppearance();
  const copy = getLocalizedProductContent(product, language === "ar");
  const title = tr(product.nameAr, product.nameEn);
  const [downloadError, setDownloadError] = useState(false);
  function download() {
    try {
      const description = [
        title,
        product.sku,
        `${number(product.pricing.amount)} SAR (${product.pricing.type}; ${product.pricing.billingCycle})`,
        `${product.deliveryDays} ${tr("أيام عمل", "business days")}`,
        "",
        copy.detailedDescription,
        "",
        tr("المخرجات", "Deliverables"),
        ...copy.deliverables.map((text) => `- ${text}`),
        "",
        tr("الاستثناءات", "Exclusions"),
        ...copy.exclusions.map((text) => `- ${text}`),
        "",
        `${tr("جولات التعديل", "Revisions")}: ${product.revisions.count}`,
        copy.revisionsScope,
        "",
        "OneShot Photography · support@1shotcam.com",
      ].join("\n");
      const url = URL.createObjectURL(
        new Blob(["\ufeff" + description], {
          type: "text/plain;charset=utf-8",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${product.sku}-service-brief.txt`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError(true);
    }
  }
  return (
    <article className="store-product-detail">
      <a className="store-back" href={appearanceLink("/products")}>
        <ArrowRight size={17} />
        {tr("العودة إلى الكتالوج", "Back to catalog")}
      </a>
      <div className="store-detail-layout">
        <div className="store-document-body">
          <figure className="store-detail-media">
            <img
              src={cdnImage(product.image, 1280)}
              alt={title}
              width={1280}
              height={800}
              decoding="async"
            />
          </figure>
          <span className="store-kicker">{product.sku} · ONESHOT 2026</span>
          <h1>{title}</h1>
          <p
            className="store-detail-subcategory"
            dir={language === "ar" ? "rtl" : "ltr"}
            lang={language}
          >
            {copy.subCategory}
          </p>
          <h2>{tr("الوصف والنطاق", "Overview & Scope")}</h2>
          <p dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
            {copy.detailedDescription}
          </p>
          <h2>
            {tr("المخرجات الدقيقة المشمولة في السعر", "Included Deliverables")}
          </h2>
          <ul
            className="store-deliverable-list"
            dir={language === "ar" ? "rtl" : "ltr"}
            lang={language}
          >
            {copy.deliverables.map((text) => (
              <li key={text}>
                <CheckCircle2 size={17} />
                {text}
              </li>
            ))}
          </ul>
          <h2>{tr("ما لا يشمله السعر", "Scope Exclusions")}</h2>
          <ul
            className="store-exclusions"
            dir={language === "ar" ? "rtl" : "ltr"}
            lang={language}
          >
            {copy.exclusions.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          <h2>
            {tr("جولات التعديل", "Revisions")}: {product.revisions.count}
          </h2>
          <p dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
            {copy.revisionsScope}
          </p>
          <button className="store-button secondary" onClick={download}>
            <Download size={16} />
            {tr("تحميل وصف الخدمة", "Download Service Brief")}
          </button>
          {downloadError && (
            <p role="alert">
              {tr(
                "تعذر التحميل. يمكنك نسخ وصف الخدمة من هذه الصفحة.",
                "Download failed. You can copy the service description from this page.",
              )}
            </p>
          )}
        </div>
        <aside className="store-detail-order">
          <span className="store-kicker">
            {tr("السعر المنشور", "PUBLISHED PRICE")}
          </span>
          <strong>
            {number(product.pricing.amount)} <span>SAR</span>
          </strong>
          <p>
            {product.pricing.type === "starts_at"
              ? tr(
                  "السعر يبدأ من المبلغ الموضح",
                  "Prices start at the amount shown",
                )
              : tr("سعر ثابت", "Fixed price")}
            {product.pricing.billingCycle === "monthly"
              ? tr(" · شهرياً", " · monthly")
              : ""}
          </p>
          <div className="store-delivery">
            <Clock3 size={17} />
            {product.deliveryDays} {tr("أيام عمل", "business days")}
          </div>
          <button
            className="store-button"
            disabled={product.status !== "ready_to_sell"}
            onClick={() =>
              onOrder({
                sku: product.sku,
                title,
                amount: product.pricing.amount,
                monthly: product.pricing.billingCycle === "monthly",
                startsAt: product.pricing.type === "starts_at",
              })
            }
          >
            {product.status === "ready_to_sell"
              ? tr("اطلب هذه الخدمة", "Request This Service")
              : tr("قيد الإعداد والاختبار", "In preparation and testing")}
            <ArrowLeft size={16} />
          </button>
          <p>
            {tr(
              "تواصل مع الفريق لتأكيد النطاق والتسليم واستلام رابط الدفع الخاص بطلبك.",
              "Contact our team to confirm the scope, delivery and receive a payment link for your order.",
            )}
          </p>
          <a href={appearanceLink("/refund")}>
            {tr("سياسة الاسترجاع والاسترداد", "Refund & Return Policy")}
          </a>
        </aside>
      </div>
    </article>
  );
}

function IntegrationSection() {
  const { tr } = useAppearance();
  const [tab, setTab] = useState<"HTML" | "REACT" | "JAVASCRIPT">("HTML");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const examples = {
    HTML: `<!-- Use the payment URL from your merchant workspace. -->\n<a href="YOUR_PAYMENT_LINK">\n  Pay securely with oneShot\n</a>`,
    REACT: `function PayButton({ paymentUrl }) {\n  return (\n    <a href={paymentUrl}>\n      Pay securely with oneShot\n    </a>\n  );\n}`,
    JAVASCRIPT: `// Copy the payment URL from your merchant workspace.\nfunction openCheckout(paymentUrl) {\n  window.location.assign(paymentUrl);\n}`,
  };
  async function copy() {
    try {
      await navigator.clipboard.writeText(examples[tab]);
      setCopied(true);
      setError("");
    } catch {
      setError(
        tr(
          "تعذر النسخ. حدد الكود وانسخه يدوياً.",
          "Copy failed. Select the code to copy it manually.",
        ),
      );
    }
  }
  return (
    <section className="store-integration store-section" id="section-api">
      <div>
        <span className="store-kicker">
          <Code2 size={17} />
          {tr(
            "منظومة ونشوت للدفع الموحد • Unified API Platform",
            "ONESHOT UNIFIED PAYMENT API",
          )}
        </span>
        <h2>
          {tr(
            "بوابات الدفع في مساحة إدارة واحدة",
            "Payment gateways in one workspace",
          )}
        </h2>
        <p>
          {tr(
            "تجمع مساحة الإدارة إعدادات بواباتك وسجل الطلبات. يتطلب التشغيل إعداد مفاتيح التاجر والتحقق من اتصال الخادم وإشعارات الدفع.",
            "The workspace brings together gateway settings and order history. Operation requires configured merchant credentials, a verified server connection and authenticated payment callbacks.",
          )}
        </p>
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            margin: "20px 0",
          }}
        >
          <a className="store-button" href={appearanceLink("/api-integration")}>
            <FileText size={16} />
            {tr(
              "صفحة تفاصيل ومزايا ربط الـ API",
              "Full API Integration Details",
            )}
          </a>
          <a
            className="store-button secondary"
            href={appearanceLink("/dashboard")}
          >
            <KeyRound size={16} />
            {tr("دخول مساحة التاجر والداشبورد", "Open Merchant Dashboard")}
          </a>
        </div>
        <div className="store-integration-features">
          {[
            [
              Layers3,
              "1. داشبورد احترافي موحد",
              "1. Executive Unified Dashboard",
              "شاشة إدارية تعرض الطلبات ومؤشرات التشغيل المتاحة في قاعدة بيانات المنظومة.",
              "An administrative workspace for orders and operational metrics available in the application database.",
            ],
            [
              ShieldCheck,
              "2. منع الفواتير الملخبطة والعشوائية",
              "2. Zero Chaotic or Duplicate Invoices",
              "تتبع الطلبات بمعرّفات فريدة ومفاتيح منع التكرار، مع تأكيد المبلغ من الخادم.",
              "Tracks orders with unique references and idempotency keys, using server-authoritative amounts.",
            ],
            [
              Blocks,
              "3. ربط جميع البوابات بمرونة",
              "3. Telr, PayTabs, Mada & Apple Pay",
              "إعداد مستقل لكل بوابة وبيئة. المسارات المتاحة فعلياً تعتمد على المزود وتكامل الخادم الحالي.",
              "Separate settings for each gateway and environment. Supported flows depend on the provider and existing core integration.",
            ],
            [
              Zap,
              "4. إتمام الدفع الآمن",
              "4. Secure provider checkout",
              "إتمام الدفع عبر صفحات المزود الرسمية بعد تأكيد الطلب. توفر وسائل الدفع يعتمد على إعداد البوابة.",
              "Checkout uses official provider pages after order confirmation. Available payment methods depend on gateway configuration.",
            ],
          ].map(([Icon, titleAr, titleEn, textAr, textEn]) => {
            const FeatureIcon = Icon as typeof Layers3;
            return (
              <div key={String(titleEn)}>
                <FeatureIcon size={21} />
                <div>
                  <h3>{tr(String(titleAr), String(titleEn))}</h3>
                  <p>{tr(String(textAr), String(textEn))}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="store-code-panel">
        <div className="store-code-heading">
          <span />
          <span />
          <span />
          <strong>
            OneShot · {tr("ربط روابط الدفع", "Payment Link Integration")}
          </strong>
        </div>
        <div className="store-code-tabs">
          {(Object.keys(examples) as (keyof typeof examples)[]).map((key) => (
            <button
              key={key}
              aria-pressed={tab === key}
              className={tab === key ? "active" : ""}
              onClick={() => {
                setTab(key);
                setCopied(false);
                setError("");
              }}
            >
              {key}
            </button>
          ))}
          <button className="store-copy-code" onClick={() => void copy()}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? tr("تم النسخ", "Copied") : tr("نسخ الكود", "Copy")}
          </button>
        </div>
        <pre dir="ltr">
          <code>{examples[tab]}</code>
        </pre>
        {error && <p role="alert">{error}</p>}
        <p>
          {tr(
            "بعد إصدار رابط دفع موثوق من المزود، يمكن استخدامه في الأمثلة التالية. إنشاء الرابط يعتمد على إعداد التكامل.",
            "Once your provider issues a trusted payment link, use it in these examples. Link creation depends on integration configuration.",
          )}
        </p>
        <a href={appearanceLink("/dashboard")}>
          {tr("الدخول إلى منصة المدفوعات", "Sign in to the Payment Platform")}
          <ArrowLeft size={16} />
        </a>
      </div>
    </section>
  );
}

function InquiryDialog({
  inquiry,
  onClose,
}: {
  inquiry: Inquiry;
  onClose: () => void;
}) {
  const { tr, number } = useAppearance();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  const message =
    tr(
      "مرحباً ونشوت، أرغب في طلب الخدمة: {title}\nرمز الخدمة: {sku}\nالسعر المنشور: {price} SAR\nيرجى تأكيد نطاق الخدمة والتسليم.",
      "Hello oneShot, I would like to request: {title}\nSKU: {sku}\nPublished price: {price} SAR\nPlease confirm the scope and delivery.",
    )
      .replace("{title}", inquiry.title)
      .replace("{sku}", inquiry.sku)
      .replace(
        "{price}",
        (inquiry.startsAt ? tr("يبدأ من ", "From ") : "") +
          number(inquiry.amount),
      ) + (inquiry.monthly ? tr(" / شهرياً", " / month") : "");
  return (
    <dialog
      className="store-inquiry"
      ref={ref}
      aria-labelledby="store-inquiry-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="store-inquiry-inner">
        <div className="store-inquiry-heading">
          <span className="store-kicker">ONESHOT · {inquiry.sku}</span>
          <button
            className="store-icon"
            aria-label={tr("إغلاق", "Close")}
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>
        <span className="store-feature-icon">
          <ShoppingBag size={25} />
        </span>
        <h2 id="store-inquiry-title">{inquiry.title}</h2>
        <strong className="store-inquiry-price">
          {inquiry.startsAt && tr("يبدأ من ", "From ")}
          {number(inquiry.amount)}{" "}
          <span>SAR{inquiry.monthly ? tr(" / شهرياً", " / month") : ""}</span>
        </strong>
        <p>
          {tr(
            "تواصل مع فريقنا لتأكيد نطاق الخدمة وموعد التسليم واستلام رابط دفع خاص بطلبك. يتضمن طلب التواصل اسم الخدمة ورمزها وسعرها المنشور.",
            "Contact our team to confirm the scope and delivery, and receive a payment link for your order. Your message includes the service, SKU and published price.",
          )}
        </p>
        <a
          className="store-button whatsapp"
          href={`https://wa.me/966501234567?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={17} />
          {tr("طلب عبر واتساب", "Request on WhatsApp")}
        </a>
        <a
          className="store-button secondary"
          href={`mailto:support@1shotcam.com?subject=${encodeURIComponent(`OneShot · ${inquiry.sku} · ${inquiry.title}`)}&body=${encodeURIComponent(message)}`}
        >
          <Mail size={17} />
          {tr("طلب عبر البريد الإلكتروني", "Request by Email")}
        </a>
        <small>
          {tr(
            "لم يتم إنشاء طلب أو خصم أي مبلغ بعد.",
            "No order has been placed and no payment has been taken.",
          )}
        </small>
      </div>
    </dialog>
  );
}
