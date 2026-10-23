import { lazy, Suspense, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "../components/Modal";
import { useAppearance } from "../storefront/i18n";
import { onOpenToolVault } from "./vault-events";
import "./tools.css";

const Vault = lazy(() => import("./Vault"));

/** Floating smart-dock button + Ctrl/⌘K. The vault chunk loads on open. */
export default function VaultLauncher() {
  const { tr, language } = useAppearance();
  const [open, setOpen] = useState(false);
  useEffect(() => onOpenToolVault(() => setOpen(true)), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const label = tr(
    "🔎 موسوعة وأدوات 1Shot الذكية (500+ أداة ودليل)",
    "🔎 1Shot smart tools & guides (500+)",
  );
  return (
    <>
      <button
        type="button"
        className="tools-fab"
        aria-haspopup="dialog"
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        <Search size={18} />
        <span>{tr("500+ أداة", "500+ tools")}</span>
      </button>
      {open ? (
        <Modal wide title={label} onClose={() => setOpen(false)}>
          <Suspense
            fallback={
              <p role="status">{tr("جارٍ تحميل الأدوات…", "Loading tools…")}</p>
            }
          >
            <Vault lang={language === "ar" ? "ar" : "en"} autoFocus />
          </Suspense>
          <p className="tools-vault-foot">
            <a href="/tools">
              {tr(
                "افتح الموسوعة كاملة في صفحة مستقلة",
                "Open the full directory page",
              )}
            </a>
          </p>
        </Modal>
      ) : null}
    </>
  );
}
