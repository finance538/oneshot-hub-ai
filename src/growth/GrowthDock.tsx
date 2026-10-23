import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Copy,
  ImagePlus,
  Megaphone,
  Save,
  Trash2,
  Wallet,
  Check,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { Notice } from "../components/common";
import { useAppearance } from "../storefront/i18n";
import { api, RequestError } from "../lib/api";
import "./growth.css";

export type GrowthTab = "studio" | "roas" | "banners" | "saved";

interface AdsDraft {
  headlines?: string[];
  descriptions?: string[];
  keywords?: string[];
  negativeKeywords?: string[];
  audience?: { description?: string; targeting?: string[] };
  callToActions?: string[];
  [key: string]: unknown;
}

interface AdsResult {
  draft: AdsDraft;
  budgetPlan?: {
    budgetSar: number;
    avgOrderSar: number;
    plan: Record<
      string,
      {
        clicksLow: number;
        clicksHigh: number;
        ordersLow: number;
        ordersHigh: number;
        revenueLow: number;
        revenueHigh: number;
        roasLow: number;
        roasHigh: number;
      }
    >;
  };
  banners?: {
    platform: string;
    size: string;
    use: string;
    headline: string;
    cta: string;
    palette: string;
    safeArea: string;
  }[];
  ai?: boolean;
  note?: string;
}

const BANNER_TABLE: { platform: string; size: string; useAr: string }[] = [
  { platform: "Google", size: "300 × 250", useAr: "مستطيل متوسط — الأعلى أداءً" },
  { platform: "Google", size: "336 × 280", useAr: "مستطيل كبير للمقالات" },
  { platform: "Google", size: "728 × 90", useAr: "لوحة علوية للمواقع" },
  { platform: "Google", size: "300 × 600", useAr: "نصف صفحة جانبية" },
  { platform: "Google", size: "320 × 100", useAr: "بانر جوال كبير" },
  { platform: "Google", size: "320 × 50", useAr: "بانر جوال قياسي" },
  { platform: "Google", size: "970 × 250", useAr: "بيلبورد رئيسي" },
  { platform: "Snap", size: "1080 × 1920", useAr: "ملء الشاشة العمودي" },
  { platform: "TikTok", size: "1080 × 1920", useAr: "فيديو عمودي بملء الشاشة" },
  { platform: "TikTok", size: "1080 × 1080", useAr: "مربع للخلاصات" },
  { platform: "TikTok", size: "1080 × 1350", useAr: "عمودي 4:5" },
];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="growth-copy"
      aria-label={label}
      title={label}
      onClick={() => {
        const clip = navigator.clipboard;
        if (!clip) return;
        void clip.writeText(text).then(
          () => {
            setOk(true);
            setTimeout(() => setOk(false), 1500);
          },
          () => {},
        );
      }}
    >
      {ok ? <Check size={15} /> : <Copy size={15} />}
    </button>
  );
}

function Studio({ onLogin }: { onLogin: () => void }) {
  const { tr, number } = useAppearance();
  const [business, setBusiness] = useState("");
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [platform, setPlatform] = useState("google");
  const [budget, setBudget] = useState(3000);
  const [avgOrder, setAvgOrder] = useState(250);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AdsResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [bannerImg, setBannerImg] = useState("");
  const [bannerLoading, setBannerLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const r = await api<AdsResult>("/api/growth/ads-generate", {
        business,
        product,
        audience,
        platform,
        budgetSar: budget,
        avgOrderSar: avgOrder,
        goal,
      });
      setResult(r);
    } catch (e) {
      if (e instanceof RequestError && e.status === 401) {
        onLogin();
        setError(tr("سجّل الدخول أولاً لحفظ حملاتك", "Sign in first to save campaigns"));
      } else setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!result) return;
    setError("");
    try {
      await api("/api/growth/campaigns", {
        platform,
        businessName: business,
        product,
        draft: result.draft,
      });
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function makeBanner() {
    if (!result?.banners?.[0]) return;
    setBannerLoading(true);
    setError("");
    try {
      const r = await api<{ image: string }>("/api/growth/banner-image", {
        brief: `${business} — ${product}. ${result.banners[0].headline}. ${result.banners[0].size}`,
      });
      setBannerImg(r.image);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBannerLoading(false);
    }
  }

  const draft = result?.draft;
  return (
    <div className="growth-studio">
      <div className="growth-form">
        <label>
          {tr("اسم النشاط", "Business name")}
          <input value={business} onChange={(e) => setBusiness(e.target.value)} placeholder={tr("مثال: متجر لمسة", "e.g. Lamsa Store")} maxLength={120} />
        </label>
        <label>
          {tr("المنتج أو الخدمة", "Product or service")}
          <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder={tr("مثال: عطور شرقية", "e.g. Oriental perfumes")} maxLength={200} />
        </label>
        <label>
          {tr("الجمهور (اختياري)", "Audience (optional)")}
          <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder={tr("مثال: نساء 25-40 في الرياض", "e.g. Women 25-40 in Riyadh")} maxLength={300} />
        </label>
        <div className="growth-form-row">
          <label>
            {tr("المنصة", "Platform")}
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="google">Google Ads</option>
              <option value="snap">Snapchat</option>
              <option value="tiktok">TikTok</option>
              <option value="all">{tr("الكل", "All")}</option>
            </select>
          </label>
          <label>
            {tr("الميزانية (ر.س)", "Budget (SAR)")}
            <input type="number" min={100} max={1000000} value={budget} onChange={(e) => setBudget(Number(e.target.value) || 0)} />
          </label>
          <label>
            {tr("متوسط الطلب (ر.س)", "Avg. order (SAR)")}
            <input type="number" min={10} max={1000000} value={avgOrder} onChange={(e) => setAvgOrder(Number(e.target.value) || 0)} />
          </label>
        </div>
        <label>
          {tr("هدف الحملة (اختياري)", "Campaign goal (optional)")}
          <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={tr("مثال: إطلاق فرع جديد", "e.g. New branch launch")} maxLength={200} />
        </label>
        <button type="button" className="store-button" disabled={loading || !business.trim() || !product.trim()} onClick={generate}>
          <Megaphone size={17} /> {loading ? tr("جارٍ التوليد…", "Generating…") : tr("ولّد الحملة", "Generate campaign")}
        </button>
      </div>
      {error && <Notice>{error}</Notice>}
      {result && draft && (
        <div className="growth-result-blocks">
          {!result.ai && (
            <Notice>
              {tr("تعذّر الاتصال بالذكاء الاصطناعي — هذه نسخة جاهزة من القوالب الذكية.", "AI unreachable — showing a smart template draft.")}
            </Notice>
          )}
          <section>
            <h4>{tr("العناوين — انسخ والصق", "Headlines — copy & paste")} <CopyButton text={(draft.headlines || []).join("\n")} label={tr("نسخ العناوين", "Copy headlines")} /></h4>
            <ul className="growth-lines">{(draft.headlines || []).map((h) => <li key={h}>{h}</li>)}</ul>
          </section>
          <section>
            <h4>{tr("الوصف", "Descriptions")} <CopyButton text={(draft.descriptions || []).join("\n")} label={tr("نسخ الوصف", "Copy descriptions")} /></h4>
            <ul className="growth-lines">{(draft.descriptions || []).map((d) => <li key={d}>{d}</li>)}</ul>
          </section>
          <section>
            <h4>{tr("الكلمات المفتاحية", "Keywords")} <CopyButton text={(draft.keywords || []).join("\n")} label={tr("نسخ الكلمات", "Copy keywords")} /></h4>
            <p className="growth-tags">{(draft.keywords || []).join("، ")}</p>
            {!!draft.negativeKeywords?.length && (
              <p className="growth-fineprint">{tr("مستبعدة", "Excluded")}: {(draft.negativeKeywords || []).join("، ")}</p>
            )}
          </section>
          {draft.audience && (
            <section>
              <h4>{tr("استهداف الجمهور", "Audience targeting")}</h4>
              <p>{draft.audience.description}</p>
              <ul className="growth-lines">{(draft.audience.targeting || []).map((t) => <li key={t}>{t}</li>)}</ul>
            </section>
          )}
          {result.budgetPlan && (
            <section>
              <h4>{tr("الميزانية والعائد المتوقع", "Budget & expected return")}</h4>
              <div className="growth-table-wrap" role="region" aria-label={tr("الميزانية والعائد", "Budget and return")} tabIndex={0}>
                <table className="growth-table">
                  <thead>
                    <tr>
                      <th scope="col">{tr("المنصة", "Platform")}</th>
                      <th scope="col">{tr("النقرات", "Clicks")}</th>
                      <th scope="col">{tr("الطلبات", "Orders")}</th>
                      <th scope="col">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.budgetPlan.plan).map(([p, v]) => (
                      <tr key={p}>
                        <td dir="ltr">{p}</td>
                        <td dir="ltr">{number(v.clicksLow)}–{number(v.clicksHigh)}</td>
                        <td dir="ltr">{number(v.ordersLow)}–{number(v.ordersHigh)}</td>
                        <td dir="ltr">{v.roasLow}x–{v.roasHigh}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="growth-fineprint">{tr("تقديرات استرشادية — ليست ضماناً للنتائج.", "Indicative estimates — not guarantees.")}</p>
            </section>
          )}
          {!!result.banners?.length && (
            <section>
              <h4>{tr("مواصفات البنرات", "Banner specs")}</h4>
              <ul className="growth-lines">
                {result.banners.slice(0, 6).map((b) => (
                  <li key={`${b.platform}-${b.size}-${b.use}`}>
                    <strong dir="ltr">{b.platform} · {b.size}</strong> — {b.use}
                  </li>
                ))}
              </ul>
              <div className="growth-actions">
                <button type="button" className="store-button secondary compact" disabled={bannerLoading} onClick={makeBanner}>
                  <ImagePlus size={15} /> {bannerLoading ? tr("جارٍ التوليد…", "Generating…") : tr("ولّد صورة البانر", "Generate banner image")}
                </button>
              </div>
              {bannerImg && <img className="growth-banner-img" src={bannerImg} alt={tr("بانر الحملة المولّد", "Generated campaign banner")} />}
            </section>
          )}
          <div className="growth-actions">
            <button type="button" className="store-button secondary" onClick={save} disabled={saved}>
              <Save size={16} /> {saved ? tr("تم الحفظ", "Saved") : tr("احفظ الحملة", "Save campaign")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoasTab() {
  const { tr, number } = useAppearance();
  const [budget, setBudget] = useState(3000);
  const [order, setOrder] = useState(250);
  const rows = useMemoRows(budget, order);
  return (
    <div>
      <div className="growth-widget-grid">
        <label>
          {tr("الميزانية (ر.س)", "Budget (SAR)")}
          <input type="number" min={100} max={1000000} value={budget} onChange={(e) => setBudget(Number(e.target.value) || 0)} />
        </label>
        <label>
          {tr("متوسط الطلب (ر.س)", "Avg. order (SAR)")}
          <input type="number" min={10} max={1000000} value={order} onChange={(e) => setOrder(Number(e.target.value) || 0)} />
        </label>
      </div>
      <div className="growth-table-wrap" role="region" aria-label="ROAS" tabIndex={0}>
        <table className="growth-table">
          <thead>
            <tr>
              <th scope="col">{tr("المنصة", "Platform")}</th>
              <th scope="col">{tr("النقرات", "Clicks")}</th>
              <th scope="col">{tr("الإيراد (ر.س)", "Revenue (SAR)")}</th>
              <th scope="col">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.p}>
                <td dir="ltr">{r.p}</td>
                <td dir="ltr">{number(r.clicksLow)}–{number(r.clicksHigh)}</td>
                <td dir="ltr">{number(r.revLow)}–{number(r.revHigh)}</td>
                <td dir="ltr">{r.roasLow}x–{r.roasHigh}x</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="growth-fineprint">{tr("تقديرات استرشادية بافتراضات سوقية معلنة — ليست ضماناً.", "Indicative market-based estimates — not guarantees.")}</p>
    </div>
  );
}

function useMemoRows(budget: number, order: number) {
  return useMemo(() => {
    const a: Record<string, [number, number, number, number]> = {
      google: [0.8, 2.5, 0.015, 0.04],
      snap: [0.5, 1.8, 0.008, 0.025],
      tiktok: [0.4, 1.5, 0.008, 0.03],
    };
    return Object.entries(a).map(([p, [cpcL, cpcH, cvL, cvH]]) => {
      const clicksHigh = Math.round(budget / cpcL);
      const clicksLow = Math.round(budget / cpcH);
      const oL = Math.round(clicksLow * cvL);
      const oH = Math.round(clicksHigh * cvH);
      const revLow = oL * order;
      const revHigh = oH * order;
      return {
        p,
        clicksLow,
        clicksHigh,
        revLow,
        revHigh,
        roasLow: Math.round((revLow / Math.max(budget, 1)) * 100) / 100,
        roasHigh: Math.round((revHigh / Math.max(budget, 1)) * 100) / 100,
      };
    });
  }, [budget, order]);
}

function BannersTab() {
  const { tr } = useAppearance();
  const all = BANNER_TABLE.map((b) => `${b.platform} ${b.size}`).join("\n");
  return (
    <div>
      <h4 className="growth-row-head">
        {tr("مقاسات جميع المنصات", "All platform sizes")}
        <CopyButton text={all} label={tr("نسخ المقاسات", "Copy sizes")} />
      </h4>
      <div className="growth-table-wrap" role="region" aria-label={tr("مقاسات البنرات", "Banner sizes")} tabIndex={0}>
        <table className="growth-table">
          <thead>
            <tr>
              <th scope="col">{tr("المنصة", "Platform")}</th>
              <th scope="col">{tr("المقاس (بكسل)", "Size (px)")}</th>
              <th scope="col">{tr("الاستخدام", "Usage")}</th>
            </tr>
          </thead>
          <tbody>
            {BANNER_TABLE.map((b, i) => (
              <tr key={i}>
                <td dir="ltr">{b.platform}</td>
                <td dir="ltr">{b.size}</td>
                <td>{b.useAr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="growth-fineprint">
        {tr("هوية مقترحة: خلفية فحمية #101211، لمسة برتقالية، نص أبيض — والنص داخل 80% من المساحة.", "Suggested identity: charcoal #101211, orange accent, white text — keep copy within 80% of the area.")}
      </p>
    </div>
  );
}

function SavedTab({ refreshKey }: { refreshKey: number }) {
  const { tr } = useAppearance();
  const [items, setItems] = useState<{ id: string; platform: string; businessName: string; product: string; createdAt: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await api<{ campaigns: typeof items }>("/api/growth/campaigns");
      setItems(r.campaigns);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, refreshKey]);
  return (
    <div>
      {loading && <p role="status">{tr("جارٍ التحميل…", "Loading…")}</p>}
      {error && <Notice>{error}</Notice>}
      {!loading && !items.length && !error && <p>{tr("لا حملات محفوظة بعد — ولّد حملتك الأولى من تبويب الاستوديو.", "No saved campaigns yet — generate your first from the studio tab.")}</p>}
      <ul className="growth-saved">
        {items.map((c) => (
          <li key={c.id}>
            <div>
              <strong>{c.product || c.businessName}</strong>
              <small dir="ltr">{c.platform} · {new Date(c.createdAt).toLocaleDateString("ar-SA")}</small>
            </div>
            <button
              type="button"
              className="growth-copy"
              aria-label={tr("حذف الحملة", "Delete campaign")}
              onClick={() => {
                void api(`/api/growth/campaigns/${c.id}`, undefined, { method: "DELETE" })
                  .then(load)
                  .catch((e: Error) => setError(e.message));
              }}
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function GrowthDock({ onLogin }: { onLogin: () => void }) {
  const { tr } = useAppearance();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<GrowthTab>("studio");
  const [savedTick, setSavedTick] = useState(0);
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("oneshot:open-growth", handler);
    return () => window.removeEventListener("oneshot:open-growth", handler);
  }, []);
  return (
    <>
      <button type="button" className="growth-dock" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={tr("استوديو النمو والإعلانات", "Growth & ads studio")}>
        <Megaphone size={20} />
        <span>{tr("استوديو النمو", "Growth Studio")}</span>
      </button>
      {open && (
        <Modal title={tr("استوديو النمو والإعلانات", "Growth & ads studio")} onClose={() => setOpen(false)} wide>
          <div className="growth-tabs" role="tablist" aria-label={tr("أدوات النمو", "Growth tools")}>
            {(
              [
                ["studio", tr("صناعة الحملات", "Campaign builder"), Megaphone],
                ["roas", tr("حاسبة الميزانية", "Budget calculator"), Wallet],
                ["banners", tr("مقاسات البنرات", "Banner sizes"), BadgeDollarSign],
                ["saved", tr("حملاتي", "My campaigns"), Save],
              ] as [GrowthTab, string, typeof Megaphone][]
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? "active" : ""}
                onClick={() => {
                  setTab(id);
                  if (id === "saved") setSavedTick((t) => t + 1);
                }}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          <Suspense fallback={<p role="status">{tr("جارٍ التحميل…", "Loading…")}</p>}>
            {tab === "studio" && <Studio onLogin={onLogin} />}
            {tab === "roas" && <RoasTab />}
            {tab === "banners" && <BannersTab />}
            {tab === "saved" && <SavedTab refreshKey={savedTick} />}
          </Suspense>
        </Modal>
      )}
    </>
  );
}
