import { CustomerJourney } from "../../commerce/Journey";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  ArrowDown,
  ArrowUpLeft,
  ArrowUpRight,
  AudioLines,
  Bot,
  Check,
  CirclePause,
  CirclePlay,
  Clapperboard,
  CreditCard,
  Fingerprint,
  Focus,
  Layers3,
  Leaf,
  Palette,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import type { EcosystemStatus } from "../../../shared/ecosystem";
import { ecosystemApps, visibleApps } from "../../../shared/ecosystem";
import type { SessionUser } from "../../components/auth";
import { useAppearance, appearanceLink } from "../../storefront/i18n";
import { hubCopy } from "../copy";
import { useAmbience } from "./useAmbience";
import { usePublicCatalog } from "./usePublicCatalog";
import SpatialScene from "./SpatialScene";
import ValueStudio from "./ValueStudio";
import InstallStudio from "./InstallStudio";
import "./experience.css";
const Concierge = lazy(() => import("./Concierge"));
const allIcons = [Layers3, Workflow, Bot, CreditCard, Palette, Zap, Clapperboard];
const allLabelsAr = [
  "مركز أعمالك",
  "فريقك ومسارات عملك",
  "مساحة الذكاء الاصطناعي",
  "مدفوعات أعمالك",
  "هويتك ومحتواك",
  "مختبر الاختبار",
  "استوديو المحتوى",
];
const allLabelsEn = [
  "Your command center",
  "Your team & workflows",
  "AI workspace",
  "Business payments",
  "Your brand & content",
  "Testing laboratory",
  "Content studio",
];
// Icons and captions are positional, so they are trimmed with the same predicate that hides an
// app: a hidden app leaves the list without shifting every icon after it.
const shown = (_: unknown, index: number) => !ecosystemApps[index].hidden;
const icons = allIcons.filter(shown);
const labelsAr = allLabelsAr.filter(shown);
const labelsEn = allLabelsEn.filter(shown);

export default function Experience({
  status,
  appHref,
  onEnter,
  ready,
  user,
}: {
  status: EcosystemStatus | null;
  appHref: (id: string) => string;
  onEnter: () => void;
  ready: boolean;
  user: SessionUser | null;
}) {
  const { tr, language } = useAppearance();
  const c = hubCopy[language];
  const Arrow = language === "ar" ? ArrowUpLeft : ArrowUpRight;
  const root = useRef<HTMLDivElement>(null);
  const [zen, setZen] = useState(false),
    [paused, setPaused] = useState(false),
    [concierge, setConcierge] = useState(false);
  const [active, setActive] = useState(1);
  useEffect(() => {
    const handler = (event: Event) =>
      setZen(!!(event as CustomEvent<boolean>).detail);
    setZen(document.documentElement.dataset.calm === "true");
    window.addEventListener("oneshot:calm", handler);
    return () => window.removeEventListener("oneshot:calm", handler);
  }, []);
  const [focusEnd, setFocusEnd] = useState<number | null>(null),
    [remaining, setRemaining] = useState(0),
    [completed, setCompleted] = useState(false);
  const ambience = useAmbience();
  const catalog = usePublicCatalog();
  useEffect(() => {
    const hub = root.current?.closest(".hub");
    hub?.setAttribute("data-zen", String(zen));
    return () => hub?.removeAttribute("data-zen");
  }, [zen]);
  useEffect(() => {
    if (!focusEnd) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((focusEnd - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) {
        setFocusEnd(null);
        setCompleted(true);
        ambience.stop();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [focusEnd]);
  useEffect(() => {
    if (!root.current) return;
    const motion = gsap.matchMedia();
    motion.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".lux-hero-copy > *",
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.95,
            stagger: 0.09,
            ease: "power3.out",
            clearProps: "all",
          },
        );
      }, root);
      const observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            gsap.fromTo(
              entry.target,
              { y: 24, opacity: 0.35 },
              {
                y: 0,
                opacity: 1,
                duration: 0.85,
                ease: "power2.out",
                clearProps: "all",
              },
            );
            observer.unobserve(entry.target);
          }),
        { threshold: 0.08 },
      );
      root.current
        ?.querySelectorAll("[data-reveal]")
        .forEach((el) => observer.observe(el));
      return () => {
        observer.disconnect();
        ctx.revert();
        root.current
          ?.querySelectorAll("[data-reveal]")
          .forEach((el) => gsap.killTweensOf(el));
      };
    });
    return () => motion.revert();
  }, []);
  return (
    <div className="lux-experience" ref={root}>
      <section id="overview" className="lux-hero lux-wrap">
        <div className="lux-hero-copy">
          <span className="lux-eyebrow">
            <i className="lux-tiny-diamond" />
            {tr(
              "منظومة واحدة. احتمالات أوسع.",
              "ONE ECOSYSTEM. MORE POSSIBILITIES.",
            )}
          </span>
          <h1>
            {tr("أعمالك،", "Your business,")}
            <br />
            {tr("ببُعدٍ", "in a new")} <em>{tr("آخر.", "dimension.")}</em>
          </h1>
          <p>
            {tr(
              "من عدسة تلتقط قصتك، إلى ذكاء يصنع خطوتك القادمة. التصوير، الهوية، الذكاء الاصطناعي والأتمتة… في منظومة واحدة تنمو معك.",
              "From the lens that captures your story to the intelligence behind your next move. Photography, branding, AI and automation, connected in one ecosystem.",
            )}
          </p>
          <div className="lux-hero-actions">
            <a
              className="lux-button lux-button-gold"
              href={appearanceLink("/products")}
            >
              {tr("اختر الخدمة أو الباقة", "Choose a service or package")}
              <Arrow size={18} />
            </a>
            <a className="lux-text-button" href="#ecosystem">
              {tr("استكشف المنظومة", "Explore the ecosystem")}
              <ArrowDown size={16} />
            </a>
          </div>
          <div className="lux-hero-footnote">
            <Fingerprint size={17} />
            <span>{tr("حساب واحد", "ONE ACCOUNT")}</span>
            <i />
            <span>{tr("وجهات مترابطة", "CONNECTED DESTINATIONS")}</span>
          </div>
        </div>
        <div className="lux-spatial">
          <div className="lux-scene-caption">
            <span>THE ONESHOT UNIVERSE</span>
            <span>01 — 07</span>
          </div>
          <SpatialScene energy={ambience.energy} calm={zen} paused={paused} />
          <div className="lux-scene-center" aria-hidden="true">
            <img src="/oneshot.svg" width="38" height="38" alt="" />
            <span>
              one<b>Shot</b>
            </span>
            <small>ECOSYSTEM</small>
          </div>
          <nav
            className="lux-scene-links"
            aria-label={tr("وجهات المنظومة", "Ecosystem destinations")}
          >
            {visibleApps.slice(1).map((app, i) => {
              const Icon = icons[i + 1];
              return (
                <a
                  key={app.id}
                  className={`lux-node lux-node-${i}`}
                  href={appHref(app.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="lux-node-icon">
                    <Icon size={18} />
                  </span>
                  <span>
                    <small>{app.mark} / ONESHOT</small>
                    <strong>
                      {app.name.replace("OneShot ", "").replace(" Test", "")}
                    </strong>
                  </span>
                  <ArrowUpRight size={12} />
                </a>
              );
            })}
          </nav>
          <div className="lux-scene-bottom">
            <span>
              <i />
              {tr("مساحة تتحرك معك", "A SPACE THAT MOVES WITH YOU")}
            </span>
            <button
              onClick={() => setPaused(!paused)}
              aria-pressed={paused}
              aria-label={
                paused
                  ? tr("تشغيل المشهد الثلاثي الأبعاد", "Enable 3D scene")
                  : tr("عرض المشهد الثابت", "Use static scene")
              }
            >
              {paused ? <CirclePlay size={17} /> : <CirclePause size={17} />}
            </button>
          </div>
        </div>
      </section>
      <div className="lux-wrap">
        <CustomerJourney />
      </div>
      <div className="lux-sensory lux-wrap">
        <div>
          <Leaf size={18} />
          <span>
            {tr("تقنية أكثر. ضجيج أقل.", "MORE INTELLIGENCE. LESS NOISE.")}
          </span>
        </div>
        <div className="lux-sensory-controls">
          <button
            aria-pressed={zen}
            onClick={() =>
              window.dispatchEvent(new Event("oneshot:toggle-calm"))
            }
          >
            <span
              className={`lux-toggle ${zen ? "is-on" : ""}`}
              aria-hidden="true"
            />
            {tr("وضع الاسترخاء", "Zen mode")}
          </button>
          <button
            aria-pressed={ambience.playing}
            onClick={() => void ambience.toggle()}
          >
            <AudioLines size={16} />
            {ambience.playing
              ? tr("إيقاف الأجواء الصوتية", "Sound off")
              : tr("أجواء صوتية", "Ambient sound")}
          </button>
          <button
            onClick={() => {
              ambience.stop();
              setConcierge(true);
            }}
          >
            <Sparkles size={16} />
            {tr("مرشدك الذكي", "Your concierge")}
          </button>
        </div>
      </div>
      {(zen || ambience.playing || ambience.error || focusEnd || completed) && (
        <div className="lux-focus-tools lux-wrap">
          <label htmlFor="ambient-volume">
            {tr("مستوى الصوت", "Sound level")}
            <input
              id="ambient-volume"
              type="range"
              min="0"
              max="60"
              value={ambience.volume}
              onChange={(e) => ambience.setVolume(+e.target.value)}
            />
          </label>
          <button
            className="lux-text-button"
            onClick={() => {
              setCompleted(false);
              if (focusEnd) setFocusEnd(null);
              else {
                setRemaining(1500);
                setFocusEnd(Date.now() + 25 * 60000);
              }
            }}
          >
            <Focus size={16} />
            {focusEnd
              ? tr("إنهاء جلسة التركيز", "End focus session")
              : tr("جلسة تركيز · 25 دقيقة", "Focus session · 25 min")}
          </button>
          <span role="timer" aria-label={tr("الوقت المتبقي", "Time remaining")}>
            {focusEnd
              ? `${Math.floor(remaining / 60)
                  .toString()
                  .padStart(
                    2,
                    "0",
                  )}:${(remaining % 60).toString().padStart(2, "0")}`
              : ""}
          </span>
          <span role="status">
            {ambience.error
              ? tr(
                  "الصوت غير متاح في هذا المتصفح.",
                  "Sound is unavailable in this browser.",
                )
              : completed
                ? tr(
                    "اكتملت جلسة التركيز. خذ استراحة قصيرة.",
                    "Focus session complete. Take a short break.",
                  )
                : tr(
                    "أصوات اختيارية هادئة، دون ادعاءات علاجية.",
                    "Optional gentle tones, with no therapeutic claims.",
                  )}
          </span>
        </div>
      )}
      <section id="ecosystem" className="lux-wrap lux-section lux-destinations">
        <div className="lux-section-heading" data-reveal>
          <div>
            <span className="lux-eyebrow">01 / CONNECTED BY DESIGN</span>
            <h2>
              {tr(
                "كل ما تحتاجه.\nيدور حول أعمالك.",
                "Everything you need.\nBuilt around your business.",
              )}
            </h2>
          </div>
          <p>
            {tr(
              "ست منصات متخصصة ومركز قيادة واحد. اختر وجهتك، وابدأ من حيث يحتاج عملك.",
              "Six specialist platforms and one command center. Choose a destination and start where your business needs you.",
            )}
          </p>
        </div>
        <div className="lux-app-layout" data-reveal>
          <div
            className="lux-app-tabs"
            role="tablist"
            aria-label={c.explore}
            aria-orientation="vertical"
          >
            {visibleApps.map((app, i) => {
              const Icon = icons[i];
              return (
                <button
                  key={app.id}
                  id={`destination-${i}`}
                  role="tab"
                  aria-selected={active === i}
                  aria-controls="lux-app-panel"
                  tabIndex={active === i ? 0 : -1}
                  onClick={() => setActive(i)}
                  onKeyDown={(e) => {
                    if (
                      !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)
                    )
                      return;
                    e.preventDefault();
                    const next =
                      e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? visibleApps.length - 1
                          : (active + (e.key === "ArrowDown" ? 1 : -1) + visibleApps.length) %
                            visibleApps.length;
                    setActive(next);
                    document.getElementById(`destination-${next}`)?.focus();
                  }}
                >
                  <span className="lux-app-tab-number">{app.mark}</span>
                  <Icon size={20} />
                  <span>
                    <strong dir="ltr">{app.name.replace(" Test", "")}</strong>
                    <small>{tr(labelsAr[i], labelsEn[i])}</small>
                  </span>
                  <Arrow size={17} />
                </button>
              );
            })}
          </div>
          <article
            id="lux-app-panel"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby={`destination-${active}`}
            className="lux-app-panel"
          >
            <span className="lux-eyebrow">
              ONESHOT / {visibleApps[active].id.toUpperCase()}
            </span>
            <div className="lux-app-art" aria-hidden="true">
              <div />
              <div />
              <div />
              {(() => {
                const Icon = icons[active];
                return <Icon size={52} strokeWidth={1} />;
              })()}
              <span>{visibleApps[active].mark}</span>
            </div>
            <h3>{c.apps[active][0]}</h3>
            <p>{c.apps[active][1]}</p>
            <div className="lux-app-features">
              {c.apps[active][2]
                .split(" · ")
                .slice(0, 3)
                .map((text) => (
                  <span key={text}>
                    <Check size={13} />
                    {text}
                  </span>
                ))}
            </div>
            <div className="lux-app-panel-bottom">
              {active === 0 ? (
                <button
                  className="lux-button"
                  disabled={!ready}
                  onClick={onEnter}
                >
                  {tr("افتح مركز القيادة", "Open command center")}
                  <Arrow size={16} />
                </button>
              ) : (
                <a
                  className="lux-button"
                  href={appHref(visibleApps[active].id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tr("انتقل إلى المنصة", "Open platform")}
                  <Arrow size={16} />
                </a>
              )}
              <small>
                {status?.apps.find((a) => a.id === visibleApps[active].id)
                  ?.status === "available" ? (
                  <>
                    <i className="lux-verified-dot" />
                    {c.available}
                  </>
                ) : (
                  c.unverified
                )}
              </small>
            </div>
          </article>
        </div>
      </section>
      <ValueStudio
        {...catalog}
        retry={() => void catalog.reload()}
        onConcierge={() => {
          ambience.stop();
          setConcierge(true);
        }}
      />
      <section id="power" className="lux-wrap lux-section">
        <div id="command" className="lux-command" data-reveal>
          <div>
            <span className="lux-eyebrow">04 / YOUR NEXT CHAPTER</span>
            <h2>
              {tr(
                "فكّر بطموحك.\nوابدأ بخطوة واحدة.",
                "Think about your ambition.\nStart with a single step.",
              )}
            </h2>
            <p>
              {tr(
                "تحدث إلى فريقك الذكي، رتّب مهامك، وراجع المخرجات في مساحة عملك. القرار دائماً لك.",
                "Talk to your intelligent team, organize tasks and review the results in your workspace. You stay in charge.",
              )}
            </p>
            <button
              className="lux-button lux-button-gold"
              disabled={!ready}
              onClick={onEnter}
            >
              <Fingerprint size={17} />
              {user
                ? tr("افتح مساحة عملك", "Open your workspace")
                : tr("ابدأ بحسابك", "Start with your account")}
              <Arrow size={17} />
            </button>
          </div>
          <div className="lux-command-emblem" aria-hidden="true">
            <span />
            <span />
            <img src="/oneshot.svg" width="90" height="90" alt="" />
            <small>YOUR VISION. IN FOCUS.</small>
          </div>
        </div>
      </section>
      <InstallStudio status={status} user={user} onLogin={onEnter} />
      <div className="lux-closing lux-wrap">
        <span>ONE SHOT. A WORLD OF POSSIBILITIES.</span>
        <a href={appearanceLink("/products")}>
          {tr(
            "حكايتنا بدأت بصورة. والقادم أكبر.",
            "Our story began with a photograph. There is more ahead.",
          )}
          <Arrow size={17} />
        </a>
      </div>
      {concierge && (
        <Suspense
          fallback={
            <div className="lux-loading-toast" role="status">
              {tr("تحميل المرشد…", "Loading concierge…")}
            </div>
          }
        >
          <Concierge onClose={() => setConcierge(false)} />
        </Suspense>
      )}
    </div>
  );
}
