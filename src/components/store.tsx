import { useState } from "react";
import {
  ArrowUpLeft,
  ArrowLeft,
  Camera,
  Cloud,
  ScanLine,
  Search,
  ShoppingBag,
  Sparkles,
  Box,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Product } from "../../shared/contracts";
import { imageUrl, money } from "../lib/api";
import { Modal, Notice, Busy } from "./common";
export function Store({
  products,
  loading,
  error,
  onRetry,
  onBuy,
  busy,
  onStudio,
}: {
  products: Product[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onBuy: (p: Product) => void;
  busy: boolean;
  onStudio: () => void;
}) {
  const [category, setCategory] = useState("all"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("featured"),
    [selected, setSelected] = useState<Product | null>(null);
  const filtered = products
    .filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (p.name + " " + p.description)
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.priceCents - b.priceCents
        : sort === "high"
          ? b.priceCents - a.priceCents
          : a.id === "oneshot-pro-4k"
            ? -1
            : b.id === "oneshot-pro-4k"
              ? 1
              : b.priceCents - a.priceCents,
    );
  return (
    <div className="store-view">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="orange-dot" /> منظومة واحدة. إمكانيات بلا حدود.
          </div>
          <h1>
            كل أدواتك.
            <br />
            <span>في لقطة واحدة.</span>
          </h1>
          <p>
            من أول فكرة إلى آخر لقطة. معدات احترافية، مدفوعات ذكية، وذكاء
            اصطناعي يعمل معك.
          </p>
          <div className="hero-actions">
            <button
              className="button primary"
              onClick={() =>
                document
                  .getElementById("catalog")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              اكتشف المنتجات <ArrowLeft size={18} />
            </button>
            <button className="button ghost" onClick={onStudio}>
              <Sparkles size={16} /> افتح استوديو AI
            </button>
          </div>
          <div className="hero-foot">
            <ShieldCheck size={14} />
            <span>دفع آمن</span>
            <i />
            <span>تجربة متكاملة</span>
            <i />
            <span>إبداع بلا حدود</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-art-label">
            <span>ONESHOT PRO</span>
            <small>DESIGNED FOR CREATORS</small>
          </div>
          <img
            src={imageUrl("camera", 900)}
            alt="تصوّر تصميم كاميرا OneShot Pro السوداء بعدسة محاطة بحلقة برتقالية"
            fetchPriority="high"
          />
          <div className="camera-spec">
            <span>
              4K <small>ULTRA HD</small>
            </span>
            <span>
              AI <small>AUTO TRACKING</small>
            </span>
            <ArrowUpLeft size={21} />
          </div>
        </div>
      </section>
      <div className="capability-strip">
        <div>
          <Camera size={20} />
          <span>
            صُممت لصنّاع المحتوى<small>من المعدات إلى الاستوديو</small>
          </span>
        </div>
        <div>
          <ShieldCheck size={20} />
          <span>
            ٧ بوابات دفع<small>مساحة إدارة موحدة</small>
          </span>
        </div>
        <div>
          <Sparkles size={20} />
          <span>
            ذكاء اصطناعي بين يديك<small>Google Gemini & Ollama</small>
          </span>
        </div>
      </div>
      <section id="catalog" className="catalog">
        <div className="catalog-heading">
          <div>
            <span className="eyebrow">THE ONESHOT COLLECTION</span>
            <h2>
              جهّز فكرتك القادمة
              <span className="count-badge">
                {loading ? "—" : products.length.toString().padStart(2, "0")}
              </span>
            </h2>
          </div>
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="ابحث عن منتج"
              placeholder="ابحث عن منتج..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="مسح البحث" onClick={() => setQuery("")}>
                <X size={14} />
              </button>
            )}
          </label>
        </div>
        <div className="catalog-toolbar">
          <div className="filter-tabs">
            {[
              ["all", "كل المنتجات"],
              ["cameras", "الكاميرات"],
              ["studio", "معدات الاستوديو"],
              ["digital", "الخدمات الرقمية"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={category === id ? "active" : ""}
                onClick={() => setCategory(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="sort-control">
            <SlidersHorizontal size={15} />
            <select
              aria-label="ترتيب المنتجات"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="featured">المميزة أولاً</option>
              <option value="low">الأقل سعراً</option>
              <option value="high">الأعلى سعراً</option>
            </select>
          </label>
        </div>
        {error ? (
          <div className="catalog-error">
            <Notice>{error}</Notice>
            <button className="button subtle" onClick={onRetry}>
              إعادة تحميل الكتالوج
            </button>
          </div>
        ) : loading ? (
          <div className="product-grid">
            {[0, 1, 2, 3].map((i) => (
              <div className="product-skeleton" key={i}>
                <div />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="empty-state">
            <Search size={30} />
            <h3>لا توجد منتجات مطابقة</h3>
            <p>جرّب كلمة أخرى أو اختر كل المنتجات.</p>
            <button
              className="button subtle"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
            >
              عرض كل المنتجات
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {filtered.map((p) => (
              <article
                className={`product-card ${p.image ? "physical" : "digital"}`}
                key={p.id}
              >
                <button
                  className="product-visual"
                  onClick={() => setSelected(p)}
                  aria-label={`تفاصيل ${p.name}`}
                >
                  <span
                    className={`product-badge ${p.category === "cameras" ? "orange" : ""}`}
                  >
                    {p.badge}
                  </span>
                  {p.image ? (
                    <img
                      src={imageUrl(p.image)}
                      alt={p.name + " — صورة توضيحية"}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className={`digital-art ${p.id === "oneshot-cloud-ai" ? "cloud" : "payment"}`}
                    >
                      {p.id === "oneshot-cloud-ai" ? (
                        <Cloud size={64} strokeWidth={1} />
                      ) : (
                        <ScanLine size={58} strokeWidth={1} />
                      )}
                      <span>
                        {p.id === "oneshot-cloud-ai"
                          ? "ONESHOT CLOUD"
                          : "SECURE CHECKOUT"}
                      </span>
                    </div>
                  )}
                  <span className="detail-arrow">
                    <ArrowUpLeft size={18} />
                  </span>
                </button>
                <div className="product-info">
                  <div className="product-type">
                    {p.category === "cameras"
                      ? "SMART CAMERA"
                      : p.category === "studio"
                        ? "CREATOR ESSENTIALS"
                        : p.id === "oneshot-cloud-ai"
                          ? "CLOUD MEMBERSHIP"
                          : "GATEWAY VERIFICATION"}
                  </div>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <div className="product-bottom">
                    <div className="price" dir="ltr">
                      {money(p.priceCents, p.currency)}
                      <small>
                        {p.id === "oneshot-cloud-ai" ? "/ month" : "USD"}
                      </small>
                    </div>
                    <button
                      className="button purchase"
                      disabled={busy}
                      onClick={() => onBuy(p)}
                    >
                      {busy ? <Busy /> : <ShoppingBag size={16} />} شراء ودفع
                      فوري
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <div className="store-bottom-note">
        <Box size={16} /> معداتك، أدواتك، وأفكارك. كلها تتصل هنا.
        <span dir="ltr">ONE ECOSYSTEM. EVERY POSSIBILITY.</span>
      </div>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          {selected.image && (
            <img
              className="detail-image"
              src={imageUrl(selected.image, 900)}
              alt={selected.name}
            />
          )}
          <span className="eyebrow">{selected.badge}</span>
          <p>{selected.description}</p>
          <p className="muted">
            {selected.image ? "صور تصوّرية للمنتج." : "خدمة رقمية من oneShot."}{" "}
            السعر بالدولار الأمريكي.
          </p>
          <div className="modal-purchase">
            <strong dir="ltr">{money(selected.priceCents)}</strong>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => {
                onBuy(selected);
                setSelected(null);
              }}
            >
              شراء ودفع فوري <ShoppingBag size={17} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
