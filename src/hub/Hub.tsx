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
  Aperture,
  AudioLines,
  Bot,
  Command,
  Download,
  ExternalLink,
  Fingerprint,
  Globe2,
  Grid2X2,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../components/auth";
import { Modal } from "../components/Modal";
import {
  useAppearance,
  languageNames,
  workforceLanguages,
  appearanceLink,
  type Language,
} from "../storefront/i18n";
import Experience from "./experience/Experience";
import BusinessFooter from "./experience/BusinessFooter";
import { ecosystemApps, type EcosystemStatus } from "../../shared/ecosystem";
import { api } from "../lib/api";
import { hubCopy } from "./copy";
import { spaceCopy } from "./spaceCopy";
import "./hub.css";
const LitePortal = lazy(() => import("./LitePortal"));
const YourSpace = lazy(() => import("./YourSpace"));
const SsoAuthorize = lazy(() => import("./SsoAuthorize"));
export default function Hub() {
  return <HubPage />;
}
function HubPage() {
  const auth = useAuth();
  const { language, setLanguage } = useAppearance();
  const c = hubCopy[language],
    s = spaceCopy[language];
  // /hub is the ONESHOTHUB page: the full idea, the six services, the
  // catalog, then the signed-in command room. Sign-in always lands here.
  const spacePage = location.pathname === "/hub";
  const [menu, setMenu] = useState(false),
    [switcher, setSwitcher] = useState(false);
  const [deep, setDeep] = useState(false);
  const [status, setStatus] = useState<EcosystemStatus | null>(null);
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
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/hub-sw.js").catch(() => {});
    return () => {
      alive = false;
      clearInterval(healthTimer);
    };
  }, []);
  useEffect(() => {
    document.title = spacePage
      ? s.pageTitle
      : language === "ar"
        ? "OneShot — أعمالك، ببُعدٍ آخر"
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
  useEffect(() => {
    if (location.pathname !== "/sign-in" || !auth.ready) return;
    if (auth.user) location.replace(appearanceLink("/hub") + "#command");
    else auth.openLogin(openSpace);
  }, [auth.ready, auth.user?.id]);
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
    <a className="hub-button" href={appearanceLink("/") + "#install"}>
      <Download size={16} />
      {c.install}
    </a>
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
            <span className="hub-kicker">YOUR NEXT MOVE STARTS HERE</span>
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
    <div className="hub hub-luxury">
      <a className="hub-skip" href={spacePage ? "#command" : "#overview"}>
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
              <a
                key={id}
                href={spacePage ? `${appearanceLink("/")}#${id}` : `#${id}`}
              >
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
              href={spacePage ? `${appearanceLink("/")}#${id}` : `#${id}`}
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
          <Experience
            status={status}
            appHref={appHref}
            onEnter={openPortal}
            ready={auth.ready}
            user={auth.user}
          />
        )}
      </main>
      <div id="section-contact">
        <BusinessFooter />
      </div>
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
      {auth.dialog}
    </div>
  );
}
