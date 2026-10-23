import { clearApiSession } from "../lib/api";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { getUser, onAuthChange } from "@netlify/identity";
import { FileText, Leaf, Megaphone, Search, Sparkles, Zap } from "lucide-react";
import { Modal } from "./Modal";
import { appearanceLink, useAppearance } from "../storefront/i18n";
import { requestQuote } from "../commerce/events";
import { openToolVault } from "../tools/vault-events";
import { saveAuthReturn } from "../lib/auth-session";
import { dockVisible } from "../../shared/smart-dock";
import "./smart-dock.css";
const GrowthDock = lazy(() => import("../growth/GrowthDock"));
const VaultLauncher = lazy(() => import("../tools/VaultLauncher"));
const Concierge = lazy(() => import("../hub/experience/Concierge"));

export default function GlobalControls() {
  const { tr } = useAppearance();
  const [open, setOpen] = useState(false),
    [advisor, setAdvisor] = useState(false),
    [calm, setCalm] = useState(false);
  const [signature, setSignature] = useState("guest"),
    [admin, setAdmin] = useState(false);
  const [visible, setVisible] = useState(false);
  const fab = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let alive = true,
      revision = 0;
    let current = "";
    const update = (user: Awaited<ReturnType<typeof getUser>>) => {
      if (!alive) return;
      const next = `${user?.id || "guest"}:${user?.roles?.join(",") || ""}`;
      if (current && current !== next) clearApiSession();
      current = next;
      setSignature(next);
      setAdmin(!!user?.roles?.includes("admin"));
    };
    void getUser()
      .then((user) => {
        if (!revision) update(user);
      })
      .catch(() => {});
    const stop = onAuthChange((_event, user) => {
      revision++;
      update(user);
    });
    return () => {
      alive = false;
      stop();
    };
  }, []);
  useEffect(() => {
    const handler = () => setAdvisor(true);
    const toggleCalm = () => setCalm((value) => !value);
    window.addEventListener("oneshot:advisor", handler);
    window.addEventListener("oneshot:toggle-calm", toggleCalm);
    return () => {
      window.removeEventListener("oneshot:advisor", handler);
      window.removeEventListener("oneshot:toggle-calm", toggleCalm);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.calm = String(calm);
    window.dispatchEvent(new CustomEvent("oneshot:calm", { detail: calm }));
  }, [calm]);
  useEffect(() => {
    let frame = 0;
    function inspect() {
      frame = 0;
      const width = window.innerWidth;
      const active = document.activeElement;
      const editing =
        active instanceof HTMLElement &&
        (active.matches("input,textarea,select") || active.isContentEditable);
      // The slot is reserved in page padding; on-screen controls win if they cross it.
      const box = fab.current?.getBoundingClientRect();
      const dock =
        box && box.width
          ? box
          : {
              left: 16,
              right: 72,
              top: window.innerHeight - 80,
              bottom: window.innerHeight - 24,
            };
      const obstacles = Array.from(
        document.querySelectorAll(
          "form button, form input, form textarea, [data-bottom-nav], .hq-dock, .chat-composer, .wf-composer",
        ),
      )
        .filter((node) => !node.closest(".smart-dock-menu"))
        .map((node) => node.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0);
      setVisible(
        dockVisible({
          width,
          modal: !!document.querySelector("dialog[open]"),
          editing,
          keyboard:
            !!window.visualViewport &&
            window.visualViewport.height < window.innerHeight - 120,
          obstacles,
          dock,
        }),
      );
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(inspect);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    inspect();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, []);
  function run(action: () => void) {
    setOpen(false);
    requestAnimationFrame(action);
  }
  function login() {
    saveAuthReturn(location.pathname + location.search);
    location.assign(appearanceLink("/sign-in"));
  }
  return (
    <>
      <Suspense fallback={null}>
        <GrowthDock key={signature} onLogin={login} admin={admin} />
        <VaultLauncher />
      </Suspense>
      <button
        type="button"
        ref={fab}
        className="smart-dock-trigger"
        data-visible={visible}
        tabIndex={visible ? 0 : -1}
        aria-hidden={!visible}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="smart-dock-actions"
        aria-label={tr("زر التحكم السريع", "Quick controls")}
        onClick={() => setOpen(true)}
      >
        <Zap size={22} />
        <span className="sr-only">
          {tr("زر التحكم السريع", "Quick controls")}
        </span>
      </button>
      {open && (
        <Modal
          className="smart-dock-dialog"
          title={tr("زر التحكم السريع", "Quick controls")}
          onClose={() => setOpen(false)}
        >
          <nav
            id="smart-dock-actions"
            className="smart-dock-menu"
            aria-label={tr("أدواتك في مكان واحد", "Your tools in one place")}
          >
            <button onClick={() => run(() => requestQuote())}>
              <FileText size={20} />
              {tr("طلب عرض سعر", "Request a quote")}
            </button>
            <button
              onClick={() =>
                run(() =>
                  window.dispatchEvent(new Event("oneshot:open-growth")),
                )
              }
            >
              <Megaphone size={20} />
              {tr("استوديو النمو", "Growth Studio")}
            </button>
            <button
              onClick={() =>
                run(() => {
                  setAdvisor(true);
                })
              }
            >
              <Sparkles size={20} />
              {tr("المرشد الذكي", "AI advisor")}
            </button>
            <button
              onClick={() =>
                run(() => {
                  if (!openToolVault())
                    location.assign(appearanceLink("/tools"));
                })
              }
            >
              <Search size={20} />
              {tr("الأدوات والأدلة · 500", "Tools & guides · 500")}
            </button>
            <button
              aria-pressed={calm}
              onClick={() => run(() => setCalm((v) => !v))}
            >
              <Leaf size={20} />
              {calm
                ? tr("إيقاف وضع الهدوء", "Turn calm mode off")
                : tr("وضع الهدوء", "Calm mode")}
            </button>
            {admin && (
              <a
                className="button subtle"
                href={appearanceLink("/?module=ceo&panel=quotes")}
              >
                {tr("متابعة العملاء والإعدادات", "Customer desk & settings")}
              </a>
            )}
          </nav>
        </Modal>
      )}
      {advisor && (
        <Suspense fallback={<p role="status">OneShot…</p>}>
          <Concierge onClose={() => setAdvisor(false)} />
        </Suspense>
      )}
    </>
  );
}
