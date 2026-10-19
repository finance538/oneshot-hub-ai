import { useEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import {
  ArrowDown,
  ArrowUpRight,
  Aperture,
  Bot,
  CreditCard,
  Gauge,
  Layers3,
  Palette,
  Sparkles,
} from "lucide-react";
import {
  ecosystemApps,
  type EcosystemAppId,
  type EcosystemStatus,
} from "../../shared/ecosystem";
import { useAppearance, appearanceLink } from "../storefront/i18n";
import { hubCopy } from "../hub/copy";
import SpatialScene from "./SpatialScene";
import SensoryControls from "./SensoryControls";
import ROICalculator from "./ROICalculator";
import {
  PackageGuide,
  TraditionalCatalog,
  usePublicCatalog,
} from "./CatalogExperience";
import AppCenter from "./AppCenter";
import "./luxury.css";

const icons = {
  hub: Aperture,
  workflow: Layers3,
  ai: Bot,
  pay: CreditCard,
  brand: Palette,
  loader: Gauge,
};
export default function LuxuryHome({
  onEnter,
  ready,
  userId,
  appHref,
  status,
  downloadActions,
  installed,
  onSignIn,
}: {
  onEnter: () => void;
  ready: boolean;
  userId?: string;
  appHref: (id: EcosystemAppId) => string;
  status: EcosystemStatus | null;
  downloadActions: ReactNode;
  installed: boolean;
  onSignIn: () => void;
}) {
  const { tr, language } = useAppearance();
  const c = hubCopy[language];
  const [zen, setZen] = useState(false);
  const energy = useRef<() => number>(() => 0),
    root = useRef<HTMLDivElement>(null);
  const catalog = usePublicCatalog();
  useEffect(() => {
    const context = gsap.context(() => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".lux-hero-copy > *", {
        y: 18,
        opacity: 0,
        duration: 0.9,
        stagger: 0.09,
        ease: "power2.out",
        clearProps: "all",
      });
      gsap.from(".lux-spatial", {
        opacity: 0,
        scale: 0.97,
        duration: 1.4,
        ease: "power2.out",
        clearProps: "all",
      });
    }, root);
    return () => context.revert();
  }, []);
  return (
    <div ref={root} className={`lux-home ${zen ? "lux-zen" : ""}`}>
      <section id="overview" className="lux-hero hub-wrap">
        <div className="lux-hero-copy">
          <span className="lux-overline">
            <span />
            {tr(
              "منظومة واحدة. إمكانيات أوسع.",
              "ONE ECOSYSTEM. A WIDER HORIZON.",
            )}
          </span>
          <h1>
            {tr("أعمالك،", "Your business,")}
            <br />
            {tr("ببُعدٍ", "in a new")} <em>{tr("آخر.", "dimension.")}</em>
          </h1>
          <p>
            {tr(
              "من إبداع اللقطة إلى ذكاء المنظومة. مساحة تجمع فريقك الذكي، علامتك، ومدفوعاتك — لتمنح أفكارك وقتاً أكبر للحياة.",
              "From the craft of a photograph to the intelligence of an ecosystem. Your AI team, brand and payments, connected — giving your ideas more room to come to life.",
            )}
          </p>
          <div className="hub-actions">
            <button
              className="hub-button hub-primary"
              disabled={!ready}
              onClick={onEnter}
            >
              {tr(
                userId ? "ادخل مساحتك" : "ابدأ من هنا",
                userId ? "Enter your space" : "Make your first move",
              )}
              <ArrowUpRight size={18} />
            </button>
            <a className="hub-text-link" href="#ecosystem">
              {tr("اكتشف المنظومة", "Explore the ecosystem")}
              <ArrowDown size={16} />
            </a>
          </div>
          <div className="lux-hero-signature">
            <span>
              01 <small>HUB</small>
            </span>
            <i />
            <span>
              05 <small>{tr("وجهات متصلة", "DESTINATIONS")}</small>
            </span>
            <a href={appearanceLink("/products")}>
              {tr("وإرث من الإبداع", "AND A LEGACY OF CRAFT")}
              <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
        <SpatialScene appHref={appHref} energy={energy} />
      </section>
      <div className="lux-atmosphere hub-wrap">
        <SensoryControls zen={zen} setZen={setZen} energy={energy} />
        <span className="lux-atmosphere-note">
          {tr(
            "مساحة أقل ضجيجاً. تركيز أكثر.",
            "LESS NOISE. MORE ROOM TO THINK.",
          )}
        </span>
      </div>
      <section id="ecosystem" className="hub-wrap hub-section lux-ecosystem">
        <div className="lux-section-heading">
          <div>
            <span className="hub-kicker">01 / CONNECTED POSSIBILITIES</span>
            <h2>
              {tr(
                "كل ما يلزم فكرتك. في مدارها.",
                "Everything your idea needs. In its orbit.",
              )}
            </h2>
          </div>
          <p>
            {tr(
              "اختر وجهتك. واحتفظ بالصورة الكاملة.",
              "Choose a destination. Keep the bigger picture.",
            )}
          </p>
        </div>
        <div className="lux-app-grid">
          {ecosystemApps.slice(1).map((app, i) => {
            const Icon = icons[app.id],
              health = status?.apps.find((item) => item.id === app.id);
            return (
              <article key={app.id} className={`lux-app lux-app-${app.id}`}>
                <div className="lux-app-heading">
                  <span className="lux-app-icon">
                    <Icon size={23} strokeWidth={1.4} />
                  </span>
                  <span dir="ltr">
                    {app.name.replace(" Test", "")}
                    <small>{new URL(app.origin).hostname}</small>
                  </span>
                  <span className="lux-app-index">{app.mark}</span>
                </div>
                <h3>{c.apps[i + 1][0]}</h3>
                <p>{c.apps[i + 1][1]}</p>
                <div className="lux-app-bottom">
                  <small
                    className={
                      health?.status === "available" ? "lux-verified" : ""
                    }
                  >
                    <i />
                    {health?.sso
                      ? c.sso
                      : health?.status === "available"
                        ? c.available
                        : c.unverified}
                  </small>
                  <a
                    href={appHref(app.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lux-app-open"
                    aria-label={`${c.open} ${app.name}`}
                  >
                    <span>{c.open}</span>
                    <ArrowUpRight size={19} />
                  </a>
                </div>
                {i === 0 && (
                  <span className="lux-workflow-art" aria-hidden="true">
                    <Layers3 strokeWidth={0.7} />
                    <i />
                    <i />
                  </span>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <TraditionalCatalog catalog={catalog} onEnter={onEnter} />
      <div className="lux-manifesto hub-wrap">
        <Sparkles size={22} strokeWidth={1.3} />
        <p>
          {tr("امنح التفاصيل للذكاء.", "Give intelligence the details.")}
          <br />
          <span>
            {tr("واحتفظ لنفسك بالرؤية.", "Keep the vision for yourself.")}
          </span>
        </p>
        <span className="hub-kicker">THE ONESHOT PHILOSOPHY</span>
      </div>
      <ROICalculator onEnter={onEnter} />
      <PackageGuide catalog={catalog} onEnter={onEnter} />
      <AppCenter
        downloadActions={downloadActions}
        status={status}
        installed={installed}
        userId={userId}
        onSignIn={onSignIn}
      />
    </div>
  );
}
