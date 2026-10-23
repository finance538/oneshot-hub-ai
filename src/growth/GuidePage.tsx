import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  Circle,
  Clock3,
  Sparkles,
  Table2,
} from "lucide-react";
import { appearanceLink, useAppearance } from "../storefront/i18n";
import { guideBySlug, guides, type Guide } from "../storefront/guides";
import "../growth/growth.css";

export function openGrowthStudio() {
  window.dispatchEvent(new CustomEvent("oneshot:open-growth"));
}

function useGuideSeo(guide: Guide | null, isIndex: boolean) {
  const { language } = useAppearance();
  const title = useMemo(() => {
    const t = isIndex
      ? language === "ar"
        ? "دليل التجار الذكي"
        : "Smart Merchant Guide"
      : guide
        ? language === "ar"
          ? guide.titleAr
          : guide.titleEn
        : "";
    return t ? `${t} | OneShot Hub` : "OneShot Hub";
  }, [guide, isIndex, language]);
  useEffect(() => {
    document.title = title;
    const desc = isIndex
      ? "دليل التجار الذكي: أدلة عملية في ربط بوابات الدفع، أتمتة المتاجر، موظفي AI، والتصوير التجاري — مع حاسبات تفاعلية."
      : guide
        ? language === "ar"
          ? guide.descriptionAr
          : guide.descriptionEn
        : "";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", desc);
    const canonical = document.querySelector('link[rel="canonical"]');
    const href = `https://www.1shotcam.com${window.location.pathname}`;
    if (canonical) canonical.setAttribute("href", href);
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.guideSeo = "true";
    const items = isIndex
      ? guides.map((g) => ({
          "@type": "Article",
          headline: g.titleAr,
          description: g.descriptionAr,
          inLanguage: "ar",
          url: `https://www.1shotcam.com/guides/${g.slug}`,
        }))
      : guide
        ? [
            {
              "@type": "Article",
              headline: guide.titleAr,
              description: guide.descriptionAr,
              inLanguage: "ar",
              url: `https://www.1shotcam.com/guides/${guide.slug}`,
            },
          ]
        : [];
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "دليل التجار الذكي",
      itemListElement: items,
    });
    document.head.appendChild(script);
    return () => {
      document
        .querySelectorAll('script[data-guide-seo="true"]')
        .forEach((n) => n.remove());
    };
  }, [title, guide, isIndex, language]);
}

function RoasMini() {
  const { tr, number } = useAppearance();
  const [budget, setBudget] = useState(3000);
  const [order, setOrder] = useState(250);
  const plan = useMemo(() => {
    // Indicative Google Search assumptions, always labeled as estimates.
    const clicks = Math.round(budget / 1.6);
    const orders = Math.round(clicks * 0.025);
    const revenue = orders * order;
    return { clicks, orders, revenue, roas: Math.round((revenue / budget) * 100) / 100 };
  }, [budget, order]);
  return (
    <div className="growth-widget" role="group" aria-label={tr("حاسبة العائد", "ROAS calculator")}>
      <h4>
        <Calculator size={17} /> {tr("حاسبة العائد التقديرية", "Estimated return calculator")}
      </h4>
      <div className="growth-widget-grid">
        <label>
          {tr("الميزانية الشهرية (ر.س)", "Monthly budget (SAR)")}
          <input
            type="number"
            min={100}
            max={1000000}
            value={budget}
            onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label>
          {tr("متوسط قيمة الطلب (ر.س)", "Average order value (SAR)")}
          <input
            type="number"
            min={10}
            max={1000000}
            value={order}
            onChange={(e) => setOrder(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
      </div>
      <dl className="growth-result">
        <div>
          <dt>{tr("نقرات متوقعة", "Expected clicks")}</dt>
          <dd dir="ltr">{number(plan.clicks)}</dd>
        </div>
        <div>
          <dt>{tr("طلبات متوقعة", "Expected orders")}</dt>
          <dd dir="ltr">{number(plan.orders)}</dd>
        </div>
        <div>
          <dt>{tr("إيراد متوقع (ر.س)", "Expected revenue (SAR)")}</dt>
          <dd dir="ltr">{number(plan.revenue)}</dd>
        </div>
        <div>
          <dt>ROAS</dt>
          <dd dir="ltr">{plan.roas}x</dd>
        </div>
      </dl>
      <p className="growth-fineprint">
        {tr(
          "تقدير استرشادي بافتراضات معلنة (نقرة 1.6 ر.س، تحويل 2.5%) — ليس ضماناً للنتائج.",
          "Indicative estimate with stated assumptions (SAR 1.6 CPC, 2.5% conversion) — not a guarantee.",
        )}
      </p>
    </div>
  );
}

function AutomationTime() {
  const { tr, number } = useAppearance();
  const [orders, setOrders] = useState(20);
  const [minutes, setMinutes] = useState(8);
  const saved = useMemo(
    () => Math.round(((orders * minutes * 30) / 60) * 10) / 10,
    [orders, minutes],
  );
  return (
    <div className="growth-widget" role="group" aria-label={tr("حاسبة التوفير", "Savings calculator")}>
      <h4>
        <Clock3 size={17} /> {tr("كم ساعة تستعيد شهرياً؟", "How many hours do you reclaim?")}
      </h4>
      <div className="growth-widget-grid">
        <label>
          {tr("طلبات يومياً", "Orders per day")}
          <input
            type="number"
            min={1}
            max={10000}
            value={orders}
            onChange={(e) => setOrders(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label>
          {tr("دقائق يدوية لكل طلب", "Manual minutes per order")}
          <input
            type="number"
            min={1}
            max={600}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
      </div>
      <p className="growth-big-result">
        {tr("تستعيد نحو", "You reclaim about")}{" "}
        <strong dir="ltr">{number(saved)}</strong> {tr("ساعة شهرياً", "hours monthly")}
      </p>
    </div>
  );
}

const PHOTO_ITEMS_AR = [
  "تنظيف المنتج وإزالة الأتربة والبصمات",
  "تجهيز العبوة الأصلية والإكسسوارات",
  "اختيار قطعة بلا عيوب مصنعية للتصوير",
  "تحديد 3 منافسين لمراجعة صورهم قبل الجلسة",
  "تجهيز قائمة الزوايا المطلوبة كتابةً",
  "تأكيد المقاسات المطلوبة للحملات القادمة",
];
const PHOTO_ITEMS_EN = [
  "Clean the product of dust and fingerprints",
  "Prepare original packaging and accessories",
  "Pick a flawless unit for the shoot",
  "Shortlist 3 competitors to review their shots",
  "Write down the angles you need",
  "Confirm sizes needed for upcoming campaigns",
];

function PhotoChecklist() {
  const { tr, language } = useAppearance();
  const items = language === "ar" ? PHOTO_ITEMS_AR : PHOTO_ITEMS_EN;
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));
  const count = done.filter(Boolean).length;
  return (
    <div className="growth-widget" role="group" aria-label={tr("قائمة التحقق", "Checklist")}>
      <h4>
        <CheckCircle2 size={17} />{" "}
        {tr("جاهزية منتجك", "Your readiness")} — {count}/{items.length}
      </h4>
      <ul className="growth-checklist">
        {items.map((item, i) => (
          <li key={item}>
            <button
              type="button"
              aria-pressed={done[i]}
              onClick={() =>
                setDone((d) => d.map((v, j) => (j === i ? !v : v)))
              }
            >
              {done[i] ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              <span>{item}</span>
            </button>
          </li>
        ))}
      </ul>
      {count === items.length && (
        <p className="growth-big-result">
          {tr("ممتاز — منتجك جاهز للحجز", "Excellent — ready to book")}
        </p>
      )}
    </div>
  );
}

export default function GuidePage({ slug }: { slug?: string }) {
  const { tr, language } = useAppearance();
  const ar = language === "ar";
  const guide = slug ? guideBySlug(slug) : null;
  useGuideSeo(guide, !slug);

  if (slug && !guide)
    return (
      <div className="store-empty">
        <h1>{tr("الدليل غير موجود", "Guide not found")}</h1>
        <a className="store-button" href={appearanceLink("/guides")}>
          {tr("عودة إلى دليل التجار", "Back to the merchant guide")}
        </a>
      </div>
    );

  if (!guide)
    return (
      <article className="store-document growth-guide">
        <a className="store-back" href={appearanceLink("/")}>
          <ArrowRight size={17} />
          {tr("العودة إلى الموقع", "Back to website")}
        </a>
        <div className="store-document-body">
          <span className="store-kicker">
            <BookOpenCheck size={16} /> SMART MERCHANT GUIDE
          </span>
          <h1>{tr("دليل التجار الذكي", "Smart Merchant Guide")}</h1>
          <p>
            {tr(
              "أدلة عملية مركزة للتاجر السعودي: اختر دليلك وابدأ — كل دليل يحمل حاسبة أو جدولاً تفاعلياً يختصر عليك القرار.",
              "Focused, practical guides for Saudi merchants — each with an interactive calculator or table that shortens your decision.",
            )}
          </p>
          <div className="growth-guide-index">
            {guides.map((g) => (
              <a
                key={g.slug}
                className="growth-guide-card"
                href={appearanceLink(`/guides/${g.slug}`)}
              >
                <h2>{ar ? g.titleAr : g.titleEn}</h2>
                <p>{ar ? g.descriptionAr : g.descriptionEn}</p>
                <small>
                  {tr("زمن القراءة", "Reading time")}: {g.readingMinutes}{" "}
                  {tr("دقائق", "min")}
                </small>
              </a>
            ))}
          </div>
        </div>
      </article>
    );

  return (
    <article className="store-document growth-guide">
      <nav
        className="growth-crumbs"
        aria-label={tr("مسار التنقل", "Breadcrumb")}
      >
        <a href={appearanceLink("/")}>{tr("الرئيسية", "Home")}</a>
        <span aria-hidden="true">/</span>
        <a href={appearanceLink("/guides")}>{tr("دليل التجار الذكي", "Smart Merchant Guide")}</a>
      </nav>
      <div className="store-document-body">
        <span className="store-kicker">
          <BookOpenCheck size={16} /> SMART MERCHANT GUIDE · {guide.readingMinutes} MIN
        </span>
        <h1>{ar ? guide.titleAr : guide.titleEn}</h1>
        <p className="growth-lead">{ar ? guide.descriptionAr : guide.descriptionEn}</p>
        {guide.sections.map((s, i) => (
          <section key={i} className="growth-section">
            <h2>{ar ? s.headingAr : s.headingEn}</h2>
            {(ar ? s.bodyAr : s.bodyEn).map((p) => (
              <p key={p}>{p}</p>
            ))}
            {((ar ? s.bulletsAr : s.bulletsEn) || []).length > 0 && (
              <ul className="growth-bullets">
                {(ar ? s.bulletsAr : s.bulletsEn)!.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
            {s.table && (
              <div className="growth-table-wrap" role="region" aria-label={ar ? s.headingAr : s.headingEn} tabIndex={0}>
                <table className="growth-table">
                  <thead>
                    <tr>
                      {(ar ? s.table.headAr : s.table.headEn).map((h) => (
                        <th key={h} scope="col">
                          <Table2 size={13} /> {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(ar ? s.table.rowsAr : s.table.rowsEn).map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) => (
                          <td key={k}>{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.widget === "roas-mini" && <RoasMini />}
            {s.widget === "automation-time" && <AutomationTime />}
            {s.widget === "photo-checklist" && <PhotoChecklist />}
          </section>
        ))}
        <div className="growth-cta">
          <Sparkles size={20} />
          <div>
            <strong>{tr("جاهز تطلق حملتك؟", "Ready to launch your campaign?")}</strong>
            <p>
              {tr(
                "استوديو الإعلانات يكتب لك العناوين والوصف والكلمات المفتاحية ويحسب ميزانيتك — من نافذة واحدة.",
                "The ads studio writes your headlines, descriptions and keywords and plans your budget — from one window.",
              )}
            </p>
          </div>
          <button type="button" className="store-button" onClick={openGrowthStudio}>
            {tr("افتح استوديو الإعلانات", "Open the ads studio")}
          </button>
        </div>
        <nav className="growth-related" aria-label={tr("أدلة ذات صلة", "Related guides")}>
          {guides
            .filter((g) => g.slug !== guide.slug)
            .map((g) => (
              <a key={g.slug} href={appearanceLink(`/guides/${g.slug}`)}>
                {ar ? g.titleAr : g.titleEn}
              </a>
            ))}
        </nav>
      </div>
    </article>
  );
}
