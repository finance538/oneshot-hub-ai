import { useState } from "react";
import type { SessionUser } from "../components/auth";
import { ecosystemApps } from "../../shared/ecosystem";
import { api } from "../lib/api";
import { useAppearance } from "../storefront/i18n";
import { hubCopy } from "./copy";
export default function SsoAuthorize({
  user,
  ready,
  onLogin,
}: {
  user: SessionUser | null;
  ready: boolean;
  onLogin: () => void;
}) {
  const { language, tr } = useAppearance(),
    c = hubCopy[language];
  const params = new URLSearchParams(location.search);
  const app = ecosystemApps.find(
    (item) => item.id === params.get("appId") && item.id !== "hub",
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const valid =
    app &&
    /^[A-Za-z0-9_-]{43}$/.test(params.get("state") || "") &&
    /^[A-Za-z0-9_-]{43}$/.test(params.get("challenge") || "");
  return (
    <section className="hub-wrap hub-section">
      <span className="hub-kicker">ONESHOT / UNIFIED SIGN-IN</span>
      <h1>{c.signIn}</h1>
      {!valid ? (
        <p role="alert">
          {tr(
            "طلب الدخول غير صالح. ارجع إلى التطبيق وابدأ مجدداً.",
            "Invalid sign-in request. Return to the application and start again.",
          )}
        </p>
      ) : (
        <div className="hub-task-panel">
          <h2>{app.name}</h2>
          <p dir="ltr">{app.origin}</p>
          <p>{user?.name || user?.email}</p>
          {error && (
            <p role="alert" className="hub-error">
              {error}
            </p>
          )}
          <button
            className="hub-button hub-primary"
            disabled={!ready || busy}
            onClick={async () => {
              if (!user) {
                onLogin();
                return;
              }
              setBusy(true);
              setError("");
              try {
                const result = await api<{ destination: string }>(
                  "/api/ecosystem/sso/grant",
                  {
                    appId: app.id,
                    challenge: params.get("challenge"),
                    state: params.get("state"),
                  },
                  { quiet: true },
                );
                const target = new URL(result.destination);
                if (
                  target.origin !== app.origin ||
                  target.pathname !== "/sso/callback"
                )
                  throw new Error("Invalid application destination.");
                location.replace(target.href);
              } catch (err) {
                setError((err as Error).message);
                setBusy(false);
              }
            }}
          >
            {busy ? c.loading : user ? `${c.open} · ${app.name}` : c.signIn}
          </button>
        </div>
      )}
    </section>
  );
}
