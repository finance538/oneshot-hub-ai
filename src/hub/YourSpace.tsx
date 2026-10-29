import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Command,
  CreditCard,
  Gauge,
  Layers3,
  Palette,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import {
  visibleApps,
  type EcosystemAppId,
  type EcosystemStatus,
} from "../../shared/ecosystem";
import type { Product } from "../../shared/contracts";
import type { SessionUser } from "../components/auth";
import { api } from "../lib/api";
import { appearanceLink, useAppearance } from "../storefront/i18n";
import { cdnImage, cdnImageSet } from "../storefront/catalog";
import { hubCopy } from "./copy";
import { spaceCopy } from "./spaceCopy";
import "./space.css";

/**
 * Catalog categories presented beside each service. This is presentation
 * configuration; the products themselves come from the database catalog.
 */
const spaceCatalog: Record<EcosystemAppId, string[]> = {
  hub: ["MKT", "DIG"],
  workflow: ["SOC"],
  ai: ["AI"],
  pay: ["AUT"],
  brand: ["BRD", "MED"],
  loader: ["WEB"],
  media: ["MED"],
  quran: [],
};
const serviceIcons: Record<EcosystemAppId, typeof Command> = {
  hub: Command,
  workflow: Layers3,
  ai: Bot,
  pay: CreditCard,
  brand: Palette,
  loader: Gauge,
  media: Clapperboard,
  quran: BookOpen,
};
const PRODUCT_LIMIT = 6;

interface SpaceProduct {
  sku: string;
  name: string;
  description: string;
  image: string | null;
  amount: number;
  currency: string;
  startsAt: boolean;
  monthly: boolean;
  days: number;
  quote: boolean;
  category: string;
  sortOrder: number;
}

export default function YourSpace({
  user,
  status,
  appHref,
  onEnter,
}: {
  user: SessionUser | null;
  status: EcosystemStatus | null;
  appHref: (id: EcosystemAppId) => string;
  onEnter: () => void;
}) {
  const { language } = useAppearance();
  const c = hubCopy[language],
    s = spaceCopy[language];
  const [selected, setSelected] = useState<EcosystemAppId>("hub");
  const [rows, setRows] = useState<Product[] | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    void api<{ products: Product[] }>("/api/products", undefined, {
      quiet: true,
    })
      .then((value) => {
        if (!alive) return;
        setRows(value.products);
        setError(false);
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
  }, []);
  const products = useMemo<SpaceProduct[]>(
    () =>
      (rows || [])
        .filter((row) => row.active)
        .map((row) => {
          const details = row.catalogDetails;
          const english = details?.english;
          const arabic = language === "ar" || language === "ur";
          return {
            sku: row.id,
            name: arabic ? row.name : details?.nameEn || row.name,
            description: arabic
              ? row.description
              : english?.shortDescription ||
                details?.media?.descriptionEn ||
                row.description,
            image: row.image || details?.image || null,
            amount: row.priceCents / 100,
            currency: row.currency,
            startsAt: details?.pricing.type === "starts_at",
            monthly: details?.pricing.billingCycle === "monthly",
            days: details?.deliveryDays || details?.media?.days || 0,
            quote: !details || details.sourceKind === "catalog",
            category: row.category,
            sortOrder: details?.sortOrder ?? 999,
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [rows, language],
  );
  const visible = visibleApps;
  const index = visible.findIndex((app) => app.id === selected);
  const app = visible[index];
  const related = products
    .filter((item) => spaceCatalog[selected].includes(item.category))
    .slice(0, PRODUCT_LIMIT);
  const health = status?.apps.find((item) => item.id === selected);
  const money = (value: number, currency: string) =>
    new Intl.NumberFormat(language, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  function move(step: number) {
    const next = (index + step + visible.length) % visible.length;
    setSelected(visible[next].id);
    document.getElementById(`space-tab-${visible[next].id}`)?.focus();
  }
  const Icon = serviceIcons[selected];
  return (
    <section className="space" aria-label={s.title}>
      <div className="space-hero">
        <div className="space-copy">
          <span className="hub-kicker">{s.kicker}</span>
          <h2>{s.title}</h2>
          <p>{s.lead}</p>
          <div className="space-plain">
            <strong>{s.plainLabel}</strong> {s.plain}
          </div>
          <div className="space-trust">
            {s.trust.map((item) => (
              <span key={item}>
                <CheckCircle2 size={15} />
                {item}
              </span>
            ))}
          </div>
          <div className="hub-actions">
            <button className="hub-button hub-primary" onClick={onEnter}>
              {user ? s.enter : s.enterGuest}
              <ArrowUpRight size={17} />
            </button>
            <a className="hub-text-link" href={appearanceLink("/products")}>
              <ShoppingBag size={15} />
              {s.allProducts}
            </a>
          </div>
        </div>
        <aside className="space-steps">
          <span>{s.stepsTitle}</span>
          <ol>
            {s.steps.map((step, i) => (
              <li key={step}>
                <b>{i + 1}</b>
                {step}
              </li>
            ))}
          </ol>
          <div className="space-steps-foot">
            <ShieldCheck size={15} />
            {s.trust[2]}
          </div>
        </aside>
      </div>
      <div className="space-section-head">
        <h3>{s.servicesTitle}</h3>
        <p>{s.servicesIntro}</p>
      </div>
      <div className="space-shell">
        <nav
          className="space-side"
          role="tablist"
          aria-label={s.servicesTitle}
          aria-orientation="vertical"
        >
          <div className="space-brand" dir="ltr">
            <img src="/oneshot.svg" width="34" height="34" alt="" />
            <span>
              one<b>Shot</b>
              <small>HUB · YOUR SPACE</small>
            </span>
          </div>
          {visibleApps.map((item, i) => {
            const ItemIcon = serviceIcons[item.id];
            const itemHealth = status?.apps.find(
              (entry) => entry.id === item.id,
            );
            return (
              <button
                key={item.id}
                id={`space-tab-${item.id}`}
                role="tab"
                aria-selected={selected === item.id}
                aria-controls="space-panel"
                tabIndex={selected === item.id ? 0 : -1}
                style={{ "--season": item.color } as CSSProperties}
                onClick={() => setSelected(item.id)}
                onKeyDown={(event) => {
                  const keys: Record<string, number> = {
                    ArrowDown: 1,
                    ArrowRight: 1,
                    ArrowUp: -1,
                    ArrowLeft: -1,
                  };
                  if (event.key in keys) {
                    event.preventDefault();
                    move(keys[event.key]);
                  } else if (event.key === "Home" || event.key === "End") {
                    event.preventDefault();
                    move(event.key === "Home" ? -index : 5 - index);
                  }
                }}
              >
                <span className="space-num">{item.mark}</span>
                <ItemIcon size={18} />
                <span className="space-tab-text">
                  <strong dir="ltr">{item.name.replace("OneShot ", "")}</strong>
                  <small>{c.apps[i][0]}</small>
                </span>
                <i
                  className={`space-dot ${itemHealth?.status === "available" ? "is-available" : ""}`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
          <div className="space-side-note">
            <ShieldCheck size={18} />
            <span>{s.trust[1]}</span>
          </div>
        </nav>
        <div
          id="space-panel"
          role="tabpanel"
          aria-labelledby={`space-tab-${selected}`}
          tabIndex={0}
          className="space-panel"
          style={{ "--season": app.color } as CSSProperties}
        >
          <header className="space-panel-head">
            <span className="space-panel-icon">
              <Icon size={26} />
            </span>
            <div>
              <span className="hub-season">
                {app.mark} · {app.season}
              </span>
              <h3 dir="ltr">{app.name}</h3>
            </div>
            <small
              className={`hub-status ${health?.status === "available" ? "is-available" : ""}`}
            >
              <i />
              {selected === "hub"
                ? s.current
                : health?.sso
                  ? c.sso
                  : health?.status === "available"
                    ? c.available
                    : c.unverified}
            </small>
          </header>
          <p className="space-role">{s.roles[selected]}</p>
          <span className="hub-benefit-label">{c.benefit}</span>
          <h4>{c.apps[index][0]}</h4>
          <p>{c.apps[index][1]}</p>
          <div className="hub-app-features">
            {c.apps[index][2].split(" · ").map((feature) => (
              <span key={feature}>
                <Check size={12} />
                {feature}
              </span>
            ))}
          </div>
          <div className="space-panel-actions">
            {selected === "hub" ? (
              <button className="hub-button hub-primary" onClick={onEnter}>
                {user ? s.enter : s.enterGuest}
                <ArrowUpRight size={16} />
              </button>
            ) : (
              <a
                className="hub-button"
                href={appHref(selected)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.open}
                <ArrowUpRight size={16} />
              </a>
            )}
            <small dir="ltr">{new URL(app.origin).host}</small>
          </div>
          <div className="space-products">
            <div className="space-products-head">
              <ShoppingBag size={17} />
              <div>
                <h4>{s.productsTitle}</h4>
                <p>{s.productsIntro}</p>
              </div>
            </div>
            {loading ? (
              <p role="status" className="space-state">
                {s.productsLoading}
              </p>
            ) : error ? (
              <p role="alert" className="space-state hub-error">
                {s.productsError}
              </p>
            ) : related.length ? (
              <div className="space-grid">
                {related.map((item) => (
                  <article className="space-card" key={item.sku}>
                    <a
                      className="space-card-media"
                      href={appearanceLink(`/products/${item.sku}`)}
                      aria-label={item.name}
                      tabIndex={-1}
                    >
                      {item.image ? (
                        <img
                          src={cdnImage(item.image, 480)}
                          srcSet={cdnImageSet(item.image)}
                          sizes="(max-width: 760px) 90vw, 280px"
                          alt=""
                          loading="lazy"
                          width="480"
                          height="320"
                        />
                      ) : (
                        <span className="space-card-fallback">
                          <ShoppingBag size={28} />
                        </span>
                      )}
                      <small dir="ltr">{item.sku}</small>
                    </a>
                    <div className="space-card-body">
                      <h5>{item.name}</h5>
                      <p>{item.description}</p>
                      <span className="space-card-meta">
                        <Clock3 size={13} />
                        {item.monthly
                          ? s.monthly
                          : item.days
                            ? s.delivery(item.days)
                            : item.quote
                              ? s.quote
                              : s.price}
                      </span>
                      <div className="space-card-bottom">
                        <div>
                          <small>
                            {item.startsAt
                              ? s.startsAt
                              : item.monthly
                                ? s.monthly
                                : s.price}
                          </small>
                          <strong dir="ltr">
                            {money(item.amount, item.currency)}
                          </strong>
                        </div>
                        <a
                          className="hub-text-link"
                          href={appearanceLink(`/products/${item.sku}`)}
                        >
                          {s.details}
                          <ArrowUpRight size={14} />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="space-state">{s.productsEmpty}</p>
            )}
            <a
              className="hub-text-link space-all"
              href={appearanceLink("/products")}
            >
              {s.allProducts}
              <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
