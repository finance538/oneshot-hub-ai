import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Camera,
  Sparkles,
  Volume2,
  VolumeX,
  RefreshCw,
} from "lucide-react";
import type { Product } from "../../shared/contracts";
import { api } from "../lib/api";
import { appearanceLink, useAppearance } from "../storefront/i18n";
import { cdnImage, cdnImageSet } from "../storefront/catalog";

export function usePublicCatalog() {
  const [products, setProducts] = useState<Product[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    void api<{ products: Product[] }>("/api/products", undefined, {
      quiet: true,
    })
      .then((result) => {
        if (alive) setProducts(result.products.filter((p) => p.active));
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);
  return { products, loading, error, retry: () => setAttempt((v) => v + 1) };
}
type Catalog = ReturnType<typeof usePublicCatalog>;
export function ProductPrice({ product }: { product: Product }) {
  const { language, tr } = useAppearance();
  const details = product.catalogDetails;
  return (
    <span className="lux-product-price">
      {details?.pricing.type === "starts_at" && (
        <small>{tr("يبدأ من ", "From ")}</small>
      )}
      <b>
        {new Intl.NumberFormat(language, {
          style: "currency",
          currency: product.currency,
          maximumFractionDigits: 2,
        }).format(product.priceCents / 100)}
      </b>
      {details?.pricing.billingCycle === "monthly" && (
        <small>{tr(" / شهرياً", " / month")}</small>
      )}
    </span>
  );
}
export function TraditionalCatalog({
  catalog,
  onEnter,
}: {
  catalog: Catalog;
  onEnter: () => void;
}) {
  const { tr, language } = useAppearance();
  const premium = catalog.products
    .filter(
      (p) =>
        p.catalogDetails?.sourceKind === "media" ||
        p.catalogDetails?.sourceKind === "ads",
    )
    .sort((a, b) => b.priceCents - a.priceCents);
  const [all, setAll] = useState(false);
  return (
    <section id="power" className="hub-wrap hub-section lux-catalog">
      <span id="section-media" className="lux-anchor" />
      <span id="section-google-ads" className="lux-anchor" />
      <div className="lux-section-heading">
        <div>
          <span className="hub-kicker">02 / CRAFT MEETS INTELLIGENCE</span>
          <h2>
            {tr(
              "حرفة تستحق. وذكاء يختصر.",
              "Craft worth investing in. Intelligence that saves time.",
            )}
          </h2>
        </div>
        <a className="hub-text-link" href={appearanceLink("/products")}>
          {tr("الكتالوج الكامل", "Complete catalog")}
          <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="lux-anchor-grid">
        <div className="lux-premium">
          <div className="lux-panel-heading">
            <Camera size={19} />
            <div>
              <h3>
                {tr("الإنتاج التقليدي الفاخر", "Premium studio production")}
              </h3>
              <p>
                {tr(
                  "خبرة بشرية، تصوير احترافي، وتنفيذ مخصص.",
                  "Human expertise, professional photography and bespoke production.",
                )}
              </p>
            </div>
          </div>
          {catalog.loading ? (
            <div className="lux-skeleton" role="status">
              {tr("تحميل الخدمات وأسعارها…", "Loading services and prices…")}
            </div>
          ) : catalog.error ? (
            <div className="lux-inline-state" role="status">
              <p>
                {tr(
                  "تعذّر جلب الكتالوج. لم نعرض أسعاراً بديلة.",
                  "The catalog could not be loaded.",
                )}
              </p>
              <button className="hub-button" onClick={catalog.retry}>
                <RefreshCw size={14} />
                {tr("إعادة المحاولة", "Retry")}
              </button>
            </div>
          ) : !premium.length ? (
            <p className="lux-inline-state">
              {tr(
                "تصفّح الكتالوج الكامل للخدمات المتاحة حالياً.",
                "Browse the complete catalog for current services.",
              )}
            </p>
          ) : (
            <div className="lux-product-list">
              {premium.slice(0, all ? premium.length : 3).map((product) => (
                <a
                  className="lux-product-row"
                  href={appearanceLink(
                    `/products/${encodeURIComponent(product.id)}`,
                  )}
                  key={product.id}
                >
                  {product.image && (
                    <img
                      src={cdnImage(product.image, 320)}
                      srcSet={cdnImageSet(product.image)}
                      sizes="76px"
                      alt=""
                      loading="lazy"
                      width="76"
                      height="76"
                    />
                  )}
                  <div>
                    <h4>
                      {language === "ar"
                        ? product.name
                        : product.catalogDetails?.nameEn || product.name}
                    </h4>
                    <ProductPrice product={product} />
                    <small>
                      {product.catalogDetails?.sourceKind === "catalog"
                        ? tr(
                            "وفق نطاق وعرض معتمد",
                            "Subject to an agreed scope",
                          )
                        : tr(
                            "تفاصيل الخدمة والطلب",
                            "Service details and ordering",
                          )}
                    </small>
                  </div>
                  <ArrowUpRight size={16} />
                </a>
              ))}
            </div>
          )}
          {premium.length > 3 && (
            <button
              className="hub-text-link"
              aria-expanded={all}
              onClick={() => setAll(!all)}
            >
              {tr(
                all ? "عرض أقل" : "عرض جميع خدمات الإنتاج",
                all ? "Show less" : "Show all production services",
              )}
            </button>
          )}
        </div>
        <div className="lux-digital">
          <span className="lux-pill">
            <Sparkles size={14} />
            {tr("مسار آخر للنمو", "Another way to grow")}
          </span>
          <h3>
            {tr(
              "ماذا لو أنجزت أعمالك اليومية بموظف ذكي؟",
              "What if your everyday work had an intelligent teammate?",
            )}
          </h3>
          <p>
            {tr(
              "قبل أن تخصص الآلاف لكل مهمة، اكتشف ما يمكن اختصاره بالذكاء الاصطناعي: أفكار المحتوى، المسودات، التخطيط، وتنظيم الأعمال المتكررة.",
              "Before committing thousands to each task, discover where AI can help: content ideas, drafts, planning and repetitive work.",
            )}
          </p>
          <div className="lux-digital-flow">
            <span>
              01 <b>{tr("اختر الدور", "Choose a role")}</b>
            </span>
            <span>
              02 <b>{tr("حدّد المطلوب", "Set the brief")}</b>
            </span>
            <span>
              03 <b>{tr("راجع المخرجات", "Review the work")}</b>
            </span>
          </div>
          <button className="hub-button hub-primary" onClick={onEnter}>
            {tr("اكتشف فريقك الذكي", "Discover your AI team")}
            <ArrowUpRight size={17} />
          </button>
          <a className="hub-text-link" href="#comparison">
            {tr("احسب الفرق وفق ميزانيتك", "Compare using your budget")}
            <ArrowUpRight size={14} />
          </a>
          <small>
            {tr(
              "التصوير الفعلي والتنفيذ الميداني يظلان خدمات مستقلة. تختلف المخرجات والنطاق والتكاليف بحسب المهمة والباقة.",
              "Physical photography and on-site production remain separate services. Deliverables, scope and costs depend on the task and package.",
            )}
          </small>
        </div>
      </div>
    </section>
  );
}

export function PackageGuide({
  catalog,
  onEnter,
}: {
  catalog: Catalog;
  onEnter: () => void;
}) {
  const { tr, language } = useAppearance();
  const [need, setNeed] = useState("AI"),
    [budget, setBudget] = useState(5000),
    [speaking, setSpeaking] = useState(false),
    [speechError, setSpeechError] = useState(false);
  const matches = useMemo(
    () =>
      catalog.products
        .filter(
          (p) =>
            p.category === need &&
            p.currency === "SAR" &&
            p.priceCents <= budget * 100,
        )
        .sort((a, b) => a.priceCents - b.priceCents)
        .slice(0, 2),
    [catalog.products, need, budget],
  );
  useEffect(() => {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    setSpeaking(false);
    return () => {
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    };
  }, [need, budget, language]);
  function speak() {
    if (!("speechSynthesis" in window)) {
      setSpeechError(true);
      return;
    }
    speechSynthesis.cancel();
    if (speaking) {
      setSpeaking(false);
      return;
    }
    const speech = new SpeechSynthesisUtterance(
      tr(
        "مرحباً بك في ون شوت. اختر احتياجك وميزانيتك لتتعرف على خيارات الكتالوج. ",
        "Welcome to OneShot. Choose your needs and budget to explore the catalog. ",
      ) +
        (matches[0]
          ? tr(
              `من الخيارات المطابقة: ${matches[0].name}. راجع النطاق والتفاصيل قبل الطلب.`,
              `One matching option is ${matches[0].catalogDetails?.nameEn || matches[0].name}. Review its scope before ordering.`,
            )
          : tr(
              "لا توجد باقة مطابقة حالياً. يمكنك التحدث مع فريقك الذكي.",
              "There is no matching package right now. You can talk to your AI team.",
            )),
    );
    speech.lang = language === "ar" ? "ar-SA" : "en-US";
    speech.rate = 0.9;
    speech.onend = () => setSpeaking(false);
    speech.onerror = (event) => {
      setSpeaking(false);
      if (event.error !== "interrupted" && event.error !== "canceled")
        setSpeechError(true);
    };
    setSpeechError(false);
    setSpeaking(true);
    speechSynthesis.speak(speech);
  }
  return (
    <section id="command" className="hub-wrap hub-section lux-guide">
      <div>
        <span className="hub-kicker">04 / A PERSONAL START</span>
        <h2>
          {tr("بداية تناسب طموحك.", "A beginning that fits your ambition.")}
        </h2>
        <p>
          {tr(
            "مرشد الباقات يطابق احتياجك وميزانيتك مع الكتالوج الحالي. ولخطة مخصصة، افتح محادثة مع فريقك الذكي.",
            "The package guide matches your needs and budget to the current catalog. Open a conversation with your AI team for a tailored plan.",
          )}
        </p>
        <button
          className="hub-button"
          onClick={speak}
          disabled={catalog.loading || catalog.error}
          aria-pressed={speaking}
        >
          {speaking ? <VolumeX size={17} /> : <Volume2 size={17} />}
          {tr(
            speaking ? "إيقاف الترحيب الصوتي" : "استمع إلى مرشدك",
            speaking ? "Stop voice guide" : "Listen to your guide",
          )}
        </button>
        {speechError && (
          <p role="status">
            {tr(
              "تعذّر تشغيل الصوت. الخيارات متاحة نصياً.",
              "Voice is unavailable. Options remain available as text.",
            )}
          </p>
        )}
      </div>
      <div className="lux-guide-form">
        <div className="lux-guide-fields">
          <label>
            {tr("ما الذي تطوّره؟", "What are you improving?")}
            <select value={need} onChange={(e) => setNeed(e.target.value)}>
              {[
                ["AI", tr("الذكاء الاصطناعي", "AI solutions")],
                ["AUT", tr("أتمتة الأعمال", "Automation")],
                ["BRD", tr("الهوية البصرية", "Brand identity")],
                ["MED", tr("المحتوى والإنتاج", "Content & production")],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {tr("الميزانية القصوى · SAR", "Maximum budget · SAR")}
            <input
              type="number"
              min="0"
              max="1000000"
              step="100"
              value={budget}
              onChange={(e) =>
                setBudget(
                  Math.max(0, Math.min(1000000, Number(e.target.value) || 0)),
                )
              }
            />
          </label>
        </div>
        <div className="lux-guide-options" aria-live="polite">
          {catalog.loading ? (
            <p role="status">{tr("تحميل الخيارات…", "Loading options…")}</p>
          ) : catalog.error ? (
            <button className="hub-text-link" onClick={catalog.retry}>
              {tr("تعذّر التحميل. أعد المحاولة", "Loading failed. Retry")}
            </button>
          ) : matches.length ? (
            matches.map((product) => (
              <a
                key={product.id}
                href={appearanceLink(
                  `/products/${encodeURIComponent(product.id)}`,
                )}
              >
                <div>
                  <small>
                    {tr("خيار مطابق للميزانية", "A matching option")}
                  </small>
                  <h3>
                    {language === "ar"
                      ? product.name
                      : product.catalogDetails?.nameEn || product.name}
                  </h3>
                  <ProductPrice product={product} />
                </div>
                <ArrowUpRight size={19} />
              </a>
            ))
          ) : (
            <p>
              {tr(
                "لا توجد خيارات مطابقة لهذه الميزانية. عدّلها أو اطلب خطة مخصصة.",
                "No options match this budget. Adjust it or request a tailored plan.",
              )}
            </p>
          )}
        </div>
        <small>
          {tr(
            "قد تكون الأسعار ابتدائية أو شهرية؛ راجع تفاصيل كل خدمة. الترحيب صوت متصفح، والاقتراحات مطابقة للكتالوج وليست استشارة آلية.",
            "Prices may be starting prices or monthly. Review each service. Voice uses browser speech; suggestions are catalog matches.",
          )}
        </small>
        <button className="hub-text-link" onClick={onEnter}>
          {tr("محادثة مع فريق AI", "Talk to your AI team")}
          <ArrowUpRight size={15} />
        </button>
      </div>
    </section>
  );
}
