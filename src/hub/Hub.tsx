import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowUpRight,
  ArrowDown,
  Aperture,
  AudioLines,
  Bot,
  Check,
  Command,
  Download,
  ExternalLink,
  Fingerprint,
  Globe2,
  Grid2X2,
  Layers3,
  Menu,
  Monitor,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../components/auth";
import { Modal } from "../components/Modal";
import {
  AppearanceProvider,
  useAppearance,
  languageNames,
  workforceLanguages,
  appearanceLink,
  type Language,
} from "../storefront/i18n";
import { marketingCopy } from "../marketing/copy";
import { ecosystemApps, type EcosystemStatus } from "../../shared/ecosystem";
import { api } from "../lib/api";
import { hubCopy } from "./copy";
import { spaceCopy } from "./spaceCopy";
import "./hub.css";
const LitePortal = lazy(() => import("./LitePortal"));
const YourSpace = lazy(() => import("./YourSpace"));
const SsoAuthorize = lazy(() => import("./SsoAuthorize"));
type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export default function Hub() {
  return (
    <AppearanceProvider>
      <HubPage />
    </AppearanceProvider>
  );
}
function HubPage() {
  const auth = useAuth();
  const { language, setLanguage } = useAppearance();
  const c = hubCopy[language],
    s = spaceCopy[language],
    comparison = marketingCopy[language];
  // /hub is the ONESHOTHUB page: the full idea, the six services, the
  // catalog, then the signed-in command room. Sign-in always lands here.
  const spacePage = location.pathname === "/hub";
  const [menu, setMenu] = useState(false),
    [switcher, setSwitcher] = useState(false);
  const [pillar, setPillar] = useState(0),
    [deep, setDeep] = useState(false),
    [installHelp, setInstallHelp] = useState(false);
  const [status, setStatus] = useState<EcosystemStatus | null>(null);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(
    window.matchMedia("(display-mode: standalone)").matches,
  );
  const switchRef = useRef<HTMLButtonElement>(null);
  const navIds = ["overview", "power", "command", "comparison", "ecosystem"];
  useEffect(() => {
    let alive = true;
    const checkConnections = () => {
      if (document.hidden) return;
      void api<EcosystemStatus>("/api/ecosystem/status", undefined, {
        quiet: true,
      })
        .then((value) => {
          if (alive) setStatus(value);
        })
        .catch(() => {
          if (alive) setStatus(null);
        });
    };
    checkConnections();
    const healthTimer = setInterval(checkConnections, 60000);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstall(null);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/hub-sw.js").catch(() => {});
    return () => {
      alive = false;
      clearInterval(healthTimer);
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  useEffect(() => {
    document.title = spacePage
      ? s.pageTitle
      : `OneShot Hub — ${c.portal}`;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", spacePage ? s.lead : c.intro);
  }, [c, s, spacePage]);
  useEffect(() => {
    if (auth.user && spacePage && location.hash === "#command")
      requestAnimationFrame(() =>
        document.getElementById("command")?.scrollIntoView({ block: "start" }),
      );
  }, [auth.user?.id, spacePage]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (menu || switcher)) {
        setMenu(false);
        setSwitcher(false);
        switchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [menu, switcher]);
  function openSpace() {
    // Signed-in accounts always land on the ONESHOTHUB page. On that page
    // the button reaches the command room; elsewhere it navigates there.
    if (spacePage)
      requestAnimationFrame(() =>
        document.getElementById("command")?.scrollIntoView({ block: "start" }),
      );
    else location.assign(appearanceLink("/hub") + "#command");
  }
  function openPortal() {
    setMenu(false);
    setSwitcher(false);
    if (!auth.user) auth.openLogin(openSpace);
    else openSpace();
  }
  function appHref(id: string) {
    const app = ecosystemApps.find((item) => item.id === id)!;
    const url = new URL(
      status?.apps.find((item) => item.id === id)?.sso ? "/sso/start" : "/",
      app.origin,
    );
    url.searchParams.set("lang", language);
    return url.href;
  }
  const launcher = (compact = false) => (
    <div className={compact ? "hub-launchbar" : "hub-switcher-grid"}>
      {ecosystemApps.map((app) => {
        const health = status?.apps.find((item) => item.id === app.id);
        return (
          <div key={app.id} style={{ "--season": app.color } as CSSProperties}>
            {app.id === "hub" ? (
              <button onClick={openPortal}>
                <Aperture size={20} />
                <span>
                  {app.name}
                  <small>{app.season}</small>
                </span>
              </button>
            ) : (
              <a
                href={appHref(app.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Aperture size={20} />
                <span>
                  {app.name}
                  <small>{app.season}</small>
                </span>
                <ArrowUpRight size={14} />
              </a>
            )}
            <small
              className={`hub-status ${health?.status === "available" ? "is-available" : ""}`}
            >
              <i />
              {health?.sso
                ? c.sso
                : health?.status === "available"
                  ? c.available
                  : c.unverified}
            </small>
          </div>
        );
      })}
    </div>
  );
  const downloadActions = (
    <div className="hub-actions">
      {!installed && (
        <button
          className="hub-button"
          onClick={async () => {
            if (install) {
              try {
                await install.prompt();
                await install.userChoice;
              } catch {
                setInstallHelp(true);
              } finally {
                setInstall(null);
              }
            } else setInstallHelp(true);
          }}
        >
          <Download size={16} />
          {c.install}
        </button>
      )}
      {status?.apkUrl ? (
        <a
          className="hub-button"
          href={status.apkUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Smartphone size={16} />
          {c.apk}
        </a>
      ) : (
        <span className="hub-unavailable">
          <Smartphone size={15} />
          {c.apkPending}
        </span>
      )}
    </div>
  );
  const spaceShowcase = (
    <Suspense
      fallback={
        <div className="hub-skeleton" role="status">
          {c.loading}
        </div>
      }
    >
      <YourSpace
        user={auth.user}
        status={status}
        appHref={appHref}
        onEnter={openPortal}
      />
    </Suspense>
  );
  const commandRoom = (
    <section id="command" className="hub-wrap hub-section">
      <div className="hub-section-top">
        <div>
          <span className="hub-kicker">01 / LITE COMMAND</span>
          <h2>{c.portal}</h2>
          <p>{c.portalBody}</p>
        </div>
        <span className="hub-outline-label">
          <Zap size={14} /> LITE BY DESIGN
        </span>
      </div>
      {auth.user ? (
        <>
          <div className="hub-launchbar-wrap">{launcher(true)}</div>
          <Suspense
            fallback={
              <div className="hub-skeleton" role="status">
                {c.loading}
              </div>
            }
          >
            <LitePortal
              key={`${auth.user.id}:${auth.user.roles?.join(",")}`}
              user={auth.user}
              onDeep={() => setDeep(true)}
            />
          </Suspense>
        </>
      ) : (
        <div className="hub-command-preview">
          <div>
            <span className="hub-kicker">
              YOUR NEXT MOVE STARTS HERE
            </span>
            <h3>{c.chat}</h3>
            <p>{s.portalNote}</p>
            <button
              className="hub-button hub-primary"
              disabled={!auth.ready}
              onClick={openPortal}
            >
              <Fingerprint size={17} />
              {c.signIn}
            </button>
          </div>
          <div className="hub-command-outline" aria-hidden="true">
            <div>
              <span className="hub-avatar">
                <Bot size={23} />
              </span>
              <span>
                AI CEO<small>YOUR STRATEGIC PARTNER</small>
              </span>
              <AudioLines size={20} />
            </div>
            <div className="hub-sample-line" />
            <div className="hub-sample-line short" />
            <div className="hub-preview-input">
              <span>{c.prompt}</span>
              <ArrowUpRight size={18} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
  return (
    <div className="hub">
      <a className="hub-skip" href="#overview">
        {c.nav[0]}
      </a>
      <header className="hub-header">
        <a
          className="hub-logo"
          href={appearanceLink("/")}
          aria-label="OneShot Hub"
        >
          <img src="/oneshot.svg" width="30" height="30" alt="" />
          <span dir="ltr">
            one<b>Shot</b>
            <small>HUB</small>
          </span>
        </a>
        <nav className="hub-desktop-nav" aria-label={c.nav[0]}>
          {navIds.map((id, index) =>
            id === "command" ? (
              <button key={id} onClick={openPortal}>
                {c.nav[index]}
              </button>
            ) : (
              <a key={id} href={`#${id}`}>
                {c.nav[index]}
              </a>
            ),
          )}
        </nav>
        <div className="hub-controls">
          <button
            className="hub-icon"
            ref={switchRef}
            aria-label={c.explore}
            aria-expanded={switcher}
            aria-controls="hub-switcher"
            onClick={() => {
              setSwitcher(!switcher);
              setMenu(false);
            }}
          >
            <Grid2X2 size={18} />
          </button>
          <label className="hub-language">
            <Globe2 size={15} />
            <span className="sr-only">{c.settings}</span>
            <select
              aria-label={c.settings}
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              {workforceLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {languageNames[lang]}
                </option>
              ))}
            </select>
          </label>
          {auth.user ? (
            <>
              <button className="hub-account" onClick={openPortal}>
                <Command size={16} />
                <span>{c.portal}</span>
              </button>
              <div className="hub-user">{auth.control}</div>
            </>
          ) : (
            <button
              className="hub-account"
              disabled={!auth.ready}
              onClick={openPortal}
            >
              <Fingerprint size={17} />
              <span>{c.signIn}</span>
            </button>
          )}
          <button
            className="hub-icon hub-mobile-menu"
            aria-label={c.nav[0]}
            aria-expanded={menu}
            aria-controls="hub-mobile-nav"
            onClick={() => {
              setMenu(!menu);
              setSwitcher(false);
            }}
          >
            {menu ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </header>
      {switcher && (
        <div id="hub-switcher" className="hub-switcher">
          <div className="hub-panel-heading">
            <strong>{c.explore}</strong>
            <button
              className="hub-icon"
              onClick={() => {
                setSwitcher(false);
                switchRef.current?.focus();
              }}
              aria-label={c.close}
            >
              <X size={18} />
            </button>
          </div>
          {launcher()}
        </div>
      )}
      {menu && (
        <nav
          className="hub-mobile-nav"
          id="hub-mobile-nav"
          aria-label={c.nav[0]}
        >
          {navIds.map((id, i) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(event) => {
                setMenu(false);
                if (id === "command") {
                  event.preventDefault();
                  openPortal();
                }
              }}
            >
              {c.nav[i]}
              <ArrowUpRight size={16} />
            </a>
          ))}
        </nav>
      )}
      <main>
        {location.pathname === "/sso/authorize" ? (
          <Suspense fallback={<p role="status">{c.loading}</p>}>
            <SsoAuthorize
              user={auth.user}
              ready={auth.ready}
              onLogin={() => auth.openLogin()}
            />
          </Suspense>
        ) : spacePage ? (
          <>
            <section className="hub-wrap hub-section hub-space-page">
              <div className="hub-section-top">
                <div>
                  <span className="hub-kicker">ONESHOT HUB / YOUR SPACE</span>
                  <h2>{s.pageTitle}</h2>
                  <p>{s.pageIntro}</p>
                </div>
                <span className="hub-outline-label">
                  <Zap size={14} /> ONE ACCOUNT · SIX SERVICES
                </span>
              </div>
              {spaceShowcase}
            </section>
            {commandRoom}
          </>
        ) : (
          <>
            <section id="overview" className="hub-hero hub-wrap">
              <div className="hub-hero-copy">
                <div className="hub-eyebrow">
                  <span className="hub-solar-dot" />
                  {c.badge}
                </div>
                <h1>
                  {c.headline.split("\n").map((line, i) => (
                    <span key={line} className={i === 2 ? "hub-highlight" : ""}>
                      {line}
                    </span>
                  ))}
                </h1>
                <p>{c.intro}</p>
                <div className="hub-actions">
                  <button
                    className="hub-button hub-primary"
                    disabled={!auth.ready}
                    onClick={openPortal}
                  >
                    {auth.user ? c.portal : c.signIn}
                    <ArrowUpRight size={18} />
                  </button>
                  <a className="hub-text-link" href="#ecosystem">
                    {c.explore}
                    <ArrowDown size={16} />
                  </a>
                </div>
                <div className="hub-hero-note">
                  <Fingerprint size={15} />
                  <span>ONE ACCOUNT</span>
                  <i />
                  <span>SIX DESTINATIONS</span>
                  <i />
                  <span>YOUR BUSINESS</span>
                </div>
              </div>
              <div className="hub-orbit" aria-label={c.explore}>
                <div className="hub-orbit-label">
                  <span>THE ONESHOT ECOSYSTEM</span>
                  <span>01 — 06</span>
                </div>
                <div className="hub-orbit-lines" aria-hidden="true">
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
                <button
                  className="hub-orbit-core"
                  onClick={openPortal}
                  aria-label={c.portal}
                >
                  <img src="/oneshot.svg" width="84" height="84" alt="" />
                  <strong dir="ltr">oneShot</strong>
                  <small>YOUR COMMAND CENTER</small>
                </button>
                {ecosystemApps.slice(1).map((app, i) => (
                  <a
                    key={app.id}
                    href={appHref(app.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`hub-orbit-node hub-node-${i}`}
                    style={{ "--season": app.color } as CSSProperties}
                  >
                    <span>{app.mark}</span>
                    <strong>{app.name.replace("OneShot ", "")}</strong>
                    <ArrowUpRight size={13} />
                  </a>
                ))}
                <div className="hub-orbit-caption">
                  <Layers3 size={14} />
                  <span>LIGHT AT THE CENTER. LIMITLESS AT THE EDGES.</span>
                </div>
              </div>
            </section>
            <div className="hub-capability-strip">
              <div className="hub-wrap">
                {[Bot, Globe2, ShieldCheck, Layers3].map((Icon, i) => (
                  <span key={i}>
                    <Icon size={18} />
                    {c.pillars[i][0]}
                  </span>
                ))}
              </div>
            </div>
            <section id="command" className="hub-wrap hub-section">
              {spaceShowcase}
            </section>
            <section id="power" className="hub-wrap hub-section">
              <div className="hub-section-top">
                <div>
                  <span className="hub-kicker">02 / AI × BUSINESS</span>
                  <h2>{c.power}</h2>
                </div>
              </div>
              <div className="hub-power">
                <div
                  className="hub-pillar-tabs"
                  role="tablist"
                  aria-label={c.nav[1]}
                  aria-orientation="vertical"
                >
                  {c.pillars.map((p, i) => (
                    <button
                      id={`pillar-${i}`}
                      role="tab"
                      aria-selected={pillar === i}
                      aria-controls="pillar-panel"
                      tabIndex={pillar === i ? 0 : -1}
                      key={p[0]}
                      onClick={() => setPillar(i)}
                      onKeyDown={(event) => {
                        if (
                          ["ArrowDown", "ArrowUp", "Home", "End"].includes(
                            event.key,
                          )
                        ) {
                          event.preventDefault();
                          const next =
                            event.key === "Home"
                              ? 0
                              : event.key === "End"
                                ? 3
                                : (pillar +
                                    (event.key === "ArrowDown" ? 1 : 3)) %
                                  4;
                          setPillar(next);
                          document.getElementById(`pillar-${next}`)?.focus();
                        }
                      }}
                    >
                      <span>0{i + 1}</span>
                      {p[0]}
                      <ArrowUpRight size={18} />
                    </button>
                  ))}
                </div>
                <div
                  id="pillar-panel"
                  role="tabpanel"
                  aria-labelledby={`pillar-${pillar}`}
                  tabIndex={0}
                  className="hub-pillar-panel"
                >
                  <div className="hub-pillar-art" aria-hidden="true">
                    <span className="hub-art-axis" />
                    <div className="hub-art-chip">
                      {pillar === 0 ? (
                        <Bot />
                      ) : pillar === 1 ? (
                        <Sparkles />
                      ) : pillar === 2 ? (
                        <ShieldCheck />
                      ) : (
                        <Layers3 />
                      )}
                    </div>
                    <span className="hub-art-tag">
                      {
                        [
                          "CONTEXT → PLAN → REVIEW",
                          "INTELLIGENCE WITH INTENT",
                          "CONNECTED COMMERCE",
                          "ONE ECOSYSTEM. YOUR PACE.",
                        ][pillar]
                      }
                    </span>
                  </div>
                  <h3>{c.pillars[pillar][0]}</h3>
                  <p>{c.pillars[pillar][1]}</p>
                  <small>{c.pillars[pillar][2]}</small>
                  <a href="#ecosystem" className="hub-text-link">
                    {c.explore}
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </div>
            </section>
            <section
              id="comparison"
              className="hub-section hub-comparison-section"
            >
              <div className="hub-wrap">
                <span className="hub-kicker">03 / THE BIGGER PICTURE</span>
                <h2>{comparison.comparisonTitle}</h2>
                <p className="hub-muted">{comparison.comparisonNote}</p>
                <div
                  className="hub-comparison"
                  tabIndex={0}
                  role="region"
                  aria-label={comparison.comparisonTitle}
                >
                  <table>
                    <caption className="sr-only">
                      {comparison.comparisonTitle}
                    </caption>
                    <thead>
                      <tr>
                        {comparison.columns.map((title, i) => (
                          <th scope="col" key={title}>
                            {i === 3 ? "OneShot Ecosystem" : title}
                            {i === 3 && <small>{title}</small>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.cells.map((row, index) => (
                        <tr key={index}>
                          {row.map((cell, col) => (
                            <td key={col}>
                              <small>
                                {
                                  [
                                    comparison.cost,
                                    comparison.workflow,
                                    comparison.oversight,
                                  ][index]
                                }
                              </small>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
            <section className="hub-wrap hub-section">
              <div className="hub-deep">
                <div className="hub-deep-art" aria-hidden="true">
                  <Monitor size={58} />
                  <div>
                    <span />
                    <span />
                    <span />
                  </div>
                  <small>WORKFLOW / FULL EXPERIENCE</small>
                </div>
                <div>
                  <span className="hub-kicker">YOUR COMPANY, IN FULL VIEW</span>
                  <h2>{c.deepTitle}</h2>
                  <p>{c.deepBody}</p>
                  <button className="hub-button" onClick={() => setDeep(true)}>
                    {c.fullOffice}
                    <ArrowUpRight size={17} />
                  </button>
                </div>
              </div>
            </section>
            <section className="hub-wrap hub-native">
              <div>
                <span className="hub-kicker">04 / TAKE ONESHOT WITH YOU</span>
                <h2>{c.nativeTitle}</h2>
                <p>{c.nativeBody}</p>
                {downloadActions}
                <button
                  className="hub-text-link"
                  disabled={!auth.ready}
                  onClick={openPortal}
                >
                  <Fingerprint size={16} />
                  {c.native}
                </button>
              </div>
              <div className="hub-phone-art" aria-hidden="true">
                <div className="hub-phone">
                  <span />
                  <img src="/oneshot.svg" width="50" height="50" alt="" />
                  <strong>oneShot</strong>
                  <small>
                    YOUR BUSINESS.
                    <br />
                    WITH YOU.
                  </small>
                  <div className="hub-phone-dock">
                    <Command size={16} />
                    <AudioLines size={16} />
                    <Grid2X2 size={16} />
                  </div>
                </div>
              </div>
            </section>
            <section id="ecosystem" className="hub-wrap hub-section">
              <div className="hub-section-top">
                <div>
                  <span className="hub-kicker">
                    05 / THE COMPLETE ECOSYSTEM
                  </span>
                  <h2>{c.appsTitle}</h2>
                  <p>{c.appsIntro}</p>
                </div>
                <span className="hub-giant-number" aria-hidden="true">
                  06
                </span>
              </div>
              <div className="hub-apps">
                {ecosystemApps.map((app, index) => (
                  <article
                    key={app.id}
                    className="hub-app-card"
                    style={{ "--season": app.color } as CSSProperties}
                  >
                    <div className="hub-app-top">
                      <span className="hub-app-symbol">
                        <Aperture size={26} />
                      </span>
                      <span className="hub-season">{app.season}</span>
                      <span className="hub-app-number">{app.mark}</span>
                    </div>
                    <h3 dir="ltr">{app.name}</h3>
                    <h4>{c.apps[index][0]}</h4>
                    <small className="hub-status">
                      <i />
                      {status?.apps.find((item) => item.id === app.id)?.sso
                        ? c.sso
                        : status?.apps.find((item) => item.id === app.id)
                              ?.status === "available"
                          ? c.available
                          : c.unverified}
                    </small>
                    <span className="hub-benefit-label">{c.benefit}</span>
                    <p>{c.apps[index][1]}</p>
                    <div className="hub-app-features">
                      {c.apps[index][2].split(" · ").map((feature) => (
                        <span key={feature}>
                          <Check size={12} />
                          {feature}
                        </span>
                      ))}
                    </div>
                    <div className="hub-app-bottom">
                      {app.id === "hub" ? (
                        <button className="hub-text-link" onClick={openPortal}>
                          {c.portal}
                          <ArrowUpRight size={16} />
                        </button>
                      ) : (
                        <a
                          href={appHref(app.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hub-text-link"
                        >
                          {c.open}
                          <ArrowUpRight size={16} />
                        </a>
                      )}
                      <small dir="ltr">{new URL(app.origin).host}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="hub-footer hub-wrap">
        <a className="hub-logo" href={appearanceLink("/")}>
          <img src="/oneshot.svg" width="26" height="26" alt="" />
          <span dir="ltr">
            one<b>Shot</b>
            <small>HUB</small>
          </span>
        </a>
        <span>© {new Date().getFullYear()} OneShot</span>
        <nav>
          {[
            ["/products", c.catalog],
            ["/privacy", c.privacy],
            ["/terms", c.terms],
            ["/support", c.support],
          ].map(([href, label]) => (
            <a key={href} href={appearanceLink(href)}>
              {label}
            </a>
          ))}
        </nav>
      </footer>
      {deep && (
        <Modal title={c.deepTitle} onClose={() => setDeep(false)}>
          <div className="hub-dialog">
            <p>{c.deepBody}</p>
            <a
              className="hub-button hub-primary"
              href={appHref("workflow")}
              target="_blank"
              rel="noopener noreferrer"
            >
              {c.fullOffice}
              <ExternalLink size={16} />
            </a>
            <a className="hub-text-link" href={appearanceLink("/workforce")}>
              {c.localOffice}
              <ArrowUpRight size={16} />
            </a>
            {downloadActions}
          </div>
        </Modal>
      )}
      {installHelp && (
        <Modal title={c.install} onClose={() => setInstallHelp(false)}>
          <p>{c.installHelp}</p>
        </Modal>
      )}
      {auth.dialog}
    </div>
  );
}
