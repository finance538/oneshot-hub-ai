import { useState } from "react";
import { Megaphone, Copy, Check, Calculator, X } from "lucide-react";
import { Modal } from "../../components/Modal";
import { callBackendApi } from "../../lib/api";
import { useAppearance } from "../../storefront/i18n";
import {
  businessLabels,
  calculateBudget,
  generateCampaign,
  type AdPlatform,
  type BusinessKind,
  type CampaignOutput,
} from "../../../shared/growth";
import "./growth.css";

const platforms: { id: AdPlatform; ar: string; en: string }[] = [
  { id: "google", ar: "Google Ads", en: "Google Ads" },
  { id: "snap", ar: "Snapchat", en: "Snapchat" },
  { id: "tiktok", ar: "TikTok", en: "TikTok" },
];
const kinds: BusinessKind[] = ["store", "photography", "restaurant", "services", "fashion"];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="growth-copy"
      aria-label={label}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        });
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
      {done ? "✓" : label}
    </button>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  const all = items.join("\n");
  return (
    <section className="growth-section">
      <header>
        <h4>{title}</h4>
        <CopyButton text={all} label="نسخ الكل" />
      </header>
      <ul>
        {items.map((item, i) => (
          <li key={i}>
            <span>{item}</span>
            <CopyButton text={item} label="نسخ" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * On-demand growth dock: a single floating button that opens the Ads Studio
 * in a modal. Nothing is added to the home page itself (anti-clutter rule).
 */
export default function GrowthDock() {
  const { tr, language } = useAppearance();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"ads" | "budget" | "sizes">("ads");
  const [platform, setPlatform] = useState<AdPlatform>("google");
  const [businessName, setBusinessName] = useState("");
  const [businessKind, setBusinessKind] = useState<BusinessKind>("store");
  const [offer, setOffer] = useState("");
  const [city, setCity] = useState("");
  const [result, setResult] = useState<CampaignOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [daily, setDaily] = useState("100");
  const [days, setDays] = useState("30");
  const [aov, setAov] = useState("250");
  const [rate, setRate] = useState("2.5");

  const lang = language === "ar" ? "ar" : "en";
  async function generate() {
    setLoading(true);
    setError("");
    const input = {
      platform,
      businessName: businessName.trim() || (lang === "ar" ? "نشاطك التجاري" : "Your business"),
      businessKind,
      offer: offer.trim() || (lang === "ar" ? "عرض الافتتاح" : "Opening offer"),
      city: city.trim() || (lang === "ar" ? "الرياض" : "Riyadh"),
      language: lang as "ar" | "en",
    };
    try {
      const r = await callBackendApi<{ campaign: CampaignOutput }>(
        ["/api/growth/campaign"],
        input,
        { quiet: true },
      );
      setResult(r.campaign);
    } catch {
      // Offline-safe: the shared engine runs locally with identical output.
      try {
        setResult(generateCampaign(input));
      } catch (e) {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }

  const budget = calculateBudget({
    dailyBudget: Number(daily) || 0,
    days: Number(days) || 0,
    avgOrderValue: Number(aov) || 0,
    conversionRate: Number(rate) || 0,
    currency: "SAR",
  });

  return (
    <>
      <button
        type="button"
        className="growth-fab"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={tr("استوديو الإعلانات والنمو", "Ads & growth studio")}
        title={tr("استوديو الإعلانات والنمو", "Ads & growth studio")}
      >
        <Megaphone size={20} />
        <span>{tr("استوديو النمو", "Growth")}</span>
      </button>
      {open && (
        <Modal wide title={tr("استوديو صناعة الحملات الإعلانية", "Ad campaign studio")} onClose={() => setOpen(false)}>
          <div className="growth-dock">
            <nav className="growth-tabs" aria-label={tr("أقسام الاستوديو", "Studio sections")}>
              {(
                [
                  ["ads", tr("صانع الحملات", "Campaigns")],
                  ["budget", tr("حاسبة الميزانية و ROAS", "Budget & ROAS")],
                  ["sizes", tr("مقاسات البنرات", "Banner sizes")],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={tab === id}
                  className={tab === id ? "is-active" : ""}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>

            {tab === "ads" && (
              <div className="growth-pane">
                <div className="growth-platforms" role="group" aria-label="المنصة">
                  {platforms.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={platform === p.id}
                      className={platform === p.id ? "is-active" : ""}
                      onClick={() => setPlatform(p.id)}
                    >
                      {language === "ar" ? p.ar : p.en}
                    </button>
                  ))}
                </div>
                <div className="growth-form">
                  <label>
                    {tr("اسم النشاط", "Business name")}
                    <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder={tr("مثال: مقهى ريف", "e.g. Reef Café")} maxLength={80} />
                  </label>
                  <label>
                    {tr("نوع النشاط", "Business type")}
                    <select value={businessKind} onChange={(e) => setBusinessKind(e.target.value as BusinessKind)}>
                      {kinds.map((k) => (
                        <option key={k} value={k}>{tr(businessLabels[k].ar, businessLabels[k].en)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {tr("العرض", "Offer")}
                    <input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder={tr("مثال: خصم 20% أول طلب", "e.g. 20% off first order")} maxLength={80} />
                  </label>
                  <label>
                    {tr("المدينة", "City")}
                    <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={tr("مثال: الرياض", "e.g. Riyadh")} maxLength={60} />
                  </label>
                </div>
                <button type="button" className="growth-generate" disabled={loading} onClick={generate}>
                  {loading ? tr("جارٍ التوليد…", "Generating…") : tr("ولّد الحملة جاهزة للنسخ", "Generate copy-ready campaign")}
                </button>
                {error && <p className="growth-error" role="alert">{error}</p>}
                {result && (
                  <div className="growth-results">
                    <Section title={tr("العناوين الخاطفة (انسخ والصق)", "Headlines (copy & paste)")} items={result.headlines} />
                    <Section title={tr("الوصف", "Descriptions")} items={result.descriptions} />
                    <Section title={tr("الكلمات المفتاحية الأعلى تحويلاً", "High-intent keywords")} items={result.keywords} />
                    <Section title={tr("كلمات مستبعدة (توفير الميزانية)", "Negative keywords")} items={result.negativeKeywords} />
                    <Section title={tr("استهداف الجمهور", "Audience targeting")} items={result.audience} />
                    <Section title={tr("ملاحظات الإطلاق", "Launch notes")} items={result.notes} />
                  </div>
                )}
              </div>
            )}

            {tab === "budget" && (
              <div className="growth-pane">
                <p className="growth-hint">
                  <Calculator size={15} />
                  {tr("معادلة شفافة: النقرات = الإنفاق ÷ متوسط النقرة، ثم الطلبات والإيراد و ROAS خطوة بخطوة.", "Transparent math: clicks = spend ÷ avg CPC, then orders, revenue and ROAS step by step.")}
                </p>
                <div className="growth-form">
                  <label>{tr("الميزانية اليومية (ر.س)", "Daily budget (SAR)")}<input inputMode="decimal" value={daily} onChange={(e) => setDaily(e.target.value)} /></label>
                  <label>{tr("المدة (يوم)", "Days")}<input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} /></label>
                  <label>{tr("متوسط قيمة الطلب (ر.س)", "Avg order value (SAR)")}<input inputMode="decimal" value={aov} onChange={(e) => setAov(e.target.value)} /></label>
                  <label>{tr("معدل التحويل %", "Conversion rate %")}<input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /></label>
                </div>
                <dl className="growth-kpis">
                  <div><dt>{tr("إجمالي الإنفاق", "Total spend")}</dt><dd>{budget.totalSpend.toLocaleString("ar-SA")} ر.س</dd></div>
                  <div><dt>{tr("النقرات المتوقعة", "Expected clicks")}</dt><dd>{budget.expectedClicks.toLocaleString("ar-SA")}</dd></div>
                  <div><dt>{tr("الطلبات المتوقعة", "Expected orders")}</dt><dd>{budget.expectedOrders}</dd></div>
                  <div><dt>{tr("الإيراد المتوقع", "Expected revenue")}</dt><dd>{budget.expectedRevenue.toLocaleString("ar-SA")} ر.س</dd></div>
                  <div><dt>ROAS</dt><dd dir="ltr">{budget.roas}x</dd></div>
                </dl>
                <p className={`growth-verdict is-${budget.verdict}`}>
                  {budget.verdict === "scale"
                    ? tr("الحكم: قابل للتوسع — ضاعف الميزانية تدريجياً وراقب ROAS أسبوعياً.", "Verdict: scalable — raise budget gradually and watch ROAS weekly.")
                    : budget.verdict === "watch"
                      ? tr("الحكم: واعد بحذر — حسّن صفحة الهبوط قبل رفع الميزانية.", "Verdict: promising — improve the landing page before scaling.")
                      : tr("الحكم: يحتاج إصلاحاً — ارفع متوسط الطلب أو معدل التحويل أولاً.", "Verdict: fix first — lift order value or conversion rate.")}
                </p>
              </div>
            )}

            {tab === "sizes" && (
              <div className="growth-pane">
                <table className="growth-table">
                  <thead>
                    <tr>
                      <th>{tr("المنصة", "Platform")}</th>
                      <th>{tr("المقاس", "Size")}</th>
                      <th>{tr("الاستخدام", "Use")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result?.bannerSizes ?? []).length ? result!.bannerSizes.map((b, i) => (
                      <tr key={i}><td>{b.platform}</td><td dir="ltr">{b.size}</td><td>{b.use}</td></tr>
                    )) : (
                      <>
                        <tr><td>Google Display</td><td dir="ltr">300 × 250</td><td>{tr("مستطيل متوسط داخل المحتوى", "Medium rectangle in content")}</td></tr>
                        <tr><td>Google Display</td><td dir="ltr">728 × 90</td><td>{tr("لوحة علوية للمواقع", "Leaderboard")}</td></tr>
                        <tr><td>Snapchat</td><td dir="ltr">1080 × 1920</td><td>{tr("إعلان ستوري عمودي", "Vertical story ad")}</td></tr>
                        <tr><td>TikTok</td><td dir="ltr">1080 × 1920</td><td>{tr("فيديو عمودي 9:16", "Vertical 9:16 video")}</td></tr>
                      </>
                    )}
                  </tbody>
                </table>
                <p className="growth-hint">
                  {tr("ولّد حملة أولاً لعرض مقاسات منصتك المحددة هنا.", "Generate a campaign first to show your platform's exact sizes here.")}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

export function GrowthClose({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="إغلاق">
      <X size={16} />
    </button>
  );
}
