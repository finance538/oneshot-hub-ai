import { useMemo, useState } from "react";
import {
  ArrowUpLeft,
  ArrowUpRight,
  Camera,
  Clock3,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { Product } from "../../../shared/contracts";
import { appearanceLink, useAppearance } from "../../storefront/i18n";
import { cdnImage, cdnImageSet } from "../../storefront/catalog";

export default function ValueStudio({
  products,
  loading,
  error,
  retry,
  onConcierge,
}: {
  products: Product[];
  loading: boolean;
  error: boolean;
  retry: () => void;
  onConcierge: () => void;
}) {
  const { tr, language, number } = useAppearance();
  const Arrow = language === "ar" ? ArrowUpLeft : ArrowUpRight;
  const originals = useMemo(
    () =>
      products
        .filter(
          (p) =>
            p.catalogDetails &&
            ["media", "ads"].includes(p.catalogDetails.sourceKind),
        )
        .sort(
          (a, b) =>
            (a.catalogDetails?.sortOrder || 0) -
            (b.catalogDetails?.sortOrder || 0),
        ),
    [products],
  );
  const [selected, setSelected] = useState("");
  const chosen = originals.find((p) => p.id === selected) || originals[0];
  const details = chosen?.catalogDetails;
  const [hours, setHours] = useState(32),
    [hourly, setHourly] = useState(125),
    [automation, setAutomation] = useState(60);
  const [cost, setCost] = useState(490),
    [setup, setSetup] = useState(0);
  const savedHours = (hours * automation) / 100;
  const gross = savedHours * hourly;
  const net = gross - cost;
  const annual = net * 12 - setup;
  const currency = (value: number, code = "SAR") =>
    new Intl.NumberFormat(language, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  return (
    <>
      <section id="comparison" className="lux-value lux-wrap lux-section">
        <span id="section-media" className="lux-anchor" />
        <span id="section-google-ads" className="lux-anchor" />
        <div className="lux-section-heading" data-reveal>
          <div>
            <span className="lux-eyebrow">02 / A DIFFERENT PERSPECTIVE</span>
            <h2>
              {tr(
                "حِرفة تستحق.\nوذكاء يختصر.",
                "Craft worth investing in.\nIntelligence that saves time.",
              )}
            </h2>
          </div>
          <p>
            {tr(
              "للصورة التي لا تتكرر، فريق إنتاج محترف. وللعمل الذي يتكرر كل يوم، مساحة أوسع للذكاء والأتمتة.",
              "A professional crew for moments that matter. Intelligent automation for the work you repeat every day.",
            )}
          </p>
        </div>
        <div className="lux-value-grid" data-reveal>
          <article className="lux-traditional">
            <div className="lux-photo">
              <img
                src={cdnImage(details?.image || "/images/photography.jpg", 800)}
                srcSet={cdnImageSet(
                  details?.image || "/images/photography.jpg",
                )}
                sizes="(max-width: 760px) 100vw, 46vw"
                loading="lazy"
                alt={tr(
                  "خدمات التصوير والإنتاج الاحترافية",
                  "Professional photography and production",
                )}
              />
              <span>
                <Camera size={15} />
                {tr("الإنتاج التقليدي الفاخر", "SIGNATURE PRODUCTION")}
              </span>
            </div>
            <div className="lux-traditional-copy">
              {loading ? (
                <div className="lux-skeleton" role="status">
                  {tr("تحميل خدمات الإنتاج…", "Loading production services…")}
                </div>
              ) : error ? (
                <div role="alert">
                  <p>
                    {tr(
                      "تعذّر تحميل الأسعار الحالية.",
                      "Current prices could not be loaded.",
                    )}
                  </p>
                  <button className="lux-text-button" onClick={retry}>
                    {tr("إعادة المحاولة", "Try again")}
                  </button>
                </div>
              ) : !chosen ? (
                <p>
                  {tr(
                    "تصفح الكتالوج للاطلاع على الخدمات المتاحة.",
                    "Visit the catalog for available services.",
                  )}
                </p>
              ) : (
                <>
                  <label className="lux-field">
                    {tr("اختر خدمة من الكتالوج", "Choose a catalog service")}
                    <select
                      value={chosen.id}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      {originals.map((p) => (
                        <option key={p.id} value={p.id}>
                          {tr(
                            p.catalogDetails!.nameAr,
                            p.catalogDetails!.nameEn,
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="lux-catalog-price">
                    <strong>
                      {currency(
                        details!.pricing.amount,
                        details!.pricing.currency,
                      )}
                    </strong>
                    <span>
                      {details!.pricing.type === "starts_at"
                        ? tr("يبدأ من", "Starting at")
                        : details!.pricing.billingCycle === "monthly"
                          ? tr("شهرياً", "Per month")
                          : tr("السعر المدرج", "Listed price")}
                    </span>
                  </div>
                  <p>
                    {language === "ar"
                      ? details!.publicContent.shortDescription
                      : details!.media?.descriptionEn ||
                        details!.english?.shortDescription ||
                        details!.nameEn}
                  </p>
                  <a
                    className="lux-text-button"
                    href={appearanceLink(`/products/${details!.sku}`)}
                  >
                    {tr("تفاصيل الخدمة ونطاقها", "Service details & scope")}
                    <Arrow size={16} />
                  </a>
                </>
              )}
            </div>
          </article>
          <article className="lux-intelligence">
            <span className="lux-eyebrow">
              <Sparkles size={15} /> INTELLIGENCE, ON YOUR TERMS
            </span>
            <h3>
              {tr(
                "لماذا تدفع الآلاف\nلكل مهمة متكررة؟",
                "Why spend thousands\non every repetitive task?",
              )}
            </h3>
            <p>
              {tr(
                "وظّف مساعداً ذكياً، نظّم المحتوى، واربط خطوات عملك. احتفظ بالإنتاج الاحترافي حين تحتاجه، ودع الأتمتة تخفف تكلفة الأعمال اليومية.",
                "Bring in an AI assistant, organize content and connect your workflow. Keep professional production where it matters, and automate routine work.",
              )}
            </p>
            <div className="lux-process">
              <span>
                01 <b>{tr("حدّد احتياجك", "Define your need")}</b>
              </span>
              <span>
                02 <b>{tr("اختر فريقك", "Choose your team")}</b>
              </span>
              <span>
                03 <b>{tr("راجع النتائج", "Review the output")}</b>
              </span>
            </div>
            <button
              className="lux-button lux-button-gold"
              onClick={onConcierge}
            >
              {tr("اكتشف الحل المناسب لي", "Find my starting point")}
              <Arrow size={17} />
            </button>
            <small>
              {tr(
                "النطاق والتكلفة مختلفان؛ الذكاء الاصطناعي لا يعوّض جلسة تصوير ميدانية. أسعار الكتالوج وشروطه هي المرجع.",
                "Scopes and costs differ. AI does not replace an on-location shoot. Catalog pricing and terms remain authoritative.",
              )}
            </small>
          </article>
        </div>
        <a className="lux-catalog-link" href={appearanceLink("/products")}>
          {tr(
            "جميع منتجاتنا وخدماتنا، في الكتالوج الكامل",
            "Explore every product and service in the full catalog",
          )}
          <Arrow size={17} />
        </a>
      </section>
      <section id="roi" className="lux-roi lux-wrap lux-section">
        <div className="lux-section-heading" data-reveal>
          <div>
            <span className="lux-eyebrow">03 / MAKE ROOM FOR WHAT MATTERS</span>
            <h2>
              {tr(
                "وقتك أثمن.\nاحسب الفرق بنفسك.",
                "Your time matters.\nCalculate the difference.",
              )}
            </h2>
          </div>
          <p>
            {tr(
              "حاسبة تقديرية مباشرة. عدّل افتراضاتك لتعرف متى تصبح الأتمتة استثماراً مناسباً لك.",
              "An interactive estimate. Adjust your assumptions to see when automation makes financial sense.",
            )}
          </p>
        </div>
        <div className="lux-roi-grid" data-reveal>
          <div className="lux-roi-controls">
            <span className="lux-eyebrow">
              <SlidersHorizontal size={15} />
              {tr("افتراضاتك الشهرية", "YOUR MONTHLY ASSUMPTIONS")}
            </span>
            <label className="lux-range" htmlFor="roi-hours">
              <span>
                {tr("ساعات العمل المتكرر", "Repetitive work")}
                <output>
                  {number(hours)} {tr("ساعة", "hours")}
                </output>
              </span>
              <input
                id="roi-hours"
                type="range"
                min="0"
                max="240"
                step="1"
                value={hours}
                onChange={(e) => setHours(+e.target.value)}
              />
            </label>
            <label className="lux-range" htmlFor="roi-auto">
              <span>
                {tr("الجزء الممكن أتمتته", "Work you expect to automate")}
                <output>{number(automation)}%</output>
              </span>
              <input
                id="roi-auto"
                type="range"
                min="0"
                max="100"
                step="5"
                value={automation}
                onChange={(e) => setAutomation(+e.target.value)}
              />
            </label>
            <div className="lux-number-fields">
              {[
                {
                  id: "hourly",
                  label: tr("قيمة الساعة · ر.س", "Hourly value · SAR"),
                  value: hourly,
                  set: setHourly,
                },
                {
                  id: "cost",
                  label: tr("تكلفة الحل / شهر · ر.س", "Solution / month · SAR"),
                  value: cost,
                  set: setCost,
                },
                {
                  id: "setup",
                  label: tr("تكلفة التأسيس · ر.س", "One-time setup · SAR"),
                  value: setup,
                  set: setSetup,
                },
              ].map((field) => (
                <label
                  className="lux-field"
                  key={field.id}
                  htmlFor={`roi-${field.id}`}
                >
                  {field.label}
                  <input
                    id={`roi-${field.id}`}
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    value={field.value}
                    onChange={(e) =>
                      field.set(
                        Math.min(
                          1000000,
                          Math.max(0, Number(e.target.value) || 0),
                        ),
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <p className="lux-fineprint">
              {tr(
                "الأرقام الافتراضية أمثلة للحساب وليست أسعار باقات. الوقت والتكلفة والجودة تعتمد على نطاق العمل والمراجعة البشرية.",
                "Default figures are illustrative inputs, not plan prices. Time, cost and quality depend on scope and human review.",
              )}
            </p>
          </div>
          <div className="lux-roi-result" aria-live="polite" aria-atomic="true">
            <span className="lux-eyebrow">
              {tr("صافي القيمة المقدّرة / شهر", "ESTIMATED NET VALUE / MONTH")}
            </span>
            <div className={`lux-saving ${net < 0 ? "is-negative" : ""}`}>
              <strong dir="ltr">{number(Math.round(net))}</strong>
              <span>{tr("ريال سعودي", "SAR")}</span>
            </div>
            <div className="lux-roi-time">
              <Clock3 size={18} />
              <strong>{number(Math.round(savedHours * 10) / 10)}</strong>
              {tr("ساعة تستعيدها شهرياً", "hours reclaimed each month")}
            </div>
            <div className="lux-roi-bars" aria-hidden="true">
              <i />
              <i style={{ transform: `scaleX(${1 - automation / 100})` }} />
            </div>
            <dl>
              <div>
                <dt>
                  {tr("قيمة الوقت قبل التكلفة", "Time value before cost")}
                </dt>
                <dd>{currency(gross)}</dd>
              </div>
              <div>
                <dt>
                  {tr(
                    "صافي السنة الأولى بعد التأسيس",
                    "First-year net after setup",
                  )}
                </dt>
                <dd>{currency(annual)}</dd>
              </div>
              <div>
                <dt>{tr("استرداد تكلفة التأسيس", "Setup payback")}</dt>
                <dd>
                  {setup === 0
                    ? tr("دون تكلفة تأسيس", "No setup cost")
                    : net > 0
                      ? `${number(Math.ceil(setup / net))} ${tr("شهر", "months")}`
                      : tr(
                          "غير متحقق بهذه المدخلات",
                          "Not reached at these inputs",
                        )}
                </dd>
              </div>
            </dl>
            <small>
              {tr(
                "صافي القيمة = الساعات × نسبة الأتمتة × قيمة الساعة − تكلفة الحل. تقدير غير مضمون، وليس وفراً نقدياً محققاً.",
                "Net value = hours × automation share × hourly value − solution cost. An estimate, not guaranteed or realized cash savings.",
              )}
            </small>
          </div>
        </div>
      </section>
    </>
  );
}
