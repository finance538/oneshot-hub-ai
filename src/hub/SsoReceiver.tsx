import { useEffect, useRef, useState } from "react";
import { hubOrigin } from "../../shared/ecosystem";
import {
  receiverApp,
  saveEcosystemSession,
  ecosystemUser,
  googleLoginUrl,
} from "../lib/ecosystem-session";
import { isLanguage } from "../../shared/workforce";
import { useAppearance, appearanceLink } from "../storefront/i18n";
import { safeReturnPath } from "../lib/routes";
const pendingKey = "oneshot.ecosystem.pkce.v1";
export default function SsoReceiver() {
  const { tr } = useAppearance();
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const app = receiverApp();
      if (!app)
        throw new Error(
          tr(
            "هذا النطاق غير مسجّل كتطبيق دخول موحد.",
            "This origin is not a registered OneShot application.",
          ),
        );
      if (location.pathname === "/sso/start") {
        const returnTo =
          safeReturnPath(
            new URLSearchParams(location.search).get("returnTo"),
            app.origin,
          ) ||
          (app.id === "workflow"
            ? "/workforce"
            : app.id === "pay"
              ? "/?module=gateway"
              : "/");
        const destination = new URL(returnTo, app.origin).href;
        if (await ecosystemUser()) location.replace(destination);
        else location.replace(googleLoginUrl(destination));
        return;
      }
      const fragment = new URLSearchParams(location.hash.slice(1));
      history.replaceState(null, "", "/sso/callback");
      const pending = JSON.parse(sessionStorage.getItem(pendingKey) || "null");
      sessionStorage.removeItem(pendingKey);
      if (
        !pending ||
        !Number.isFinite(pending.createdAt) ||
        pending.createdAt > Date.now() ||
        pending.state !== fragment.get("state") ||
        Date.now() - pending.createdAt > 600000 ||
        !/^[A-Za-z0-9_-]{43}$/.test(fragment.get("code") || "")
      )
        throw new Error(
          tr(
            "انتهت صلاحية رابط الدخول. ابدأ مجدداً من التطبيق.",
            "Sign-in expired. Start again from this application.",
          ),
        );
      const response = await fetch(`${hubOrigin}/api/ecosystem/sso/redeem`, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: app.id,
          verifier: pending.verifier,
          code: fragment.get("code"),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/json")
      )
        throw new Error(
          tr(
            "تعذّر إكمال الدخول. ارجع إلى Hub وحاول مجدداً.",
            "Could not complete sign-in. Return to Hub and try again.",
          ),
        );
      const result = await response.json();
      saveEcosystemSession(result);
      const next = new URL(
        safeReturnPath(pending.returnTo, app.origin) ||
          (app.id === "workflow" ? "/workforce" : "/"),
        app.origin,
      );
      next.searchParams.set(
        "lang",
        isLanguage(pending.language) ? pending.language : "ar",
      );
      if (app.id === "pay" && !pending.returnTo)
        next.searchParams.set("module", "gateway");
      location.replace(next.href);
    })().catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : tr("الدخول غير متاح حالياً.", "Sign-in unavailable."),
      ),
    );
  }, []);
  return (
    <main style={{ padding: 32, maxWidth: 600, margin: "auto" }}>
      <img src="/oneshot.svg" width="48" height="48" alt="OneShot" />
      <h1>{tr("OneShot · الدخول الموحد", "OneShot · Unified sign-in")}</h1>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <a href={appearanceLink("/sso/start")}>
            {tr("المحاولة مجدداً", "Start again")}
          </a>
          <p>
            <a href={hubOrigin}>OneShot Hub</a>
          </p>
        </>
      ) : (
        <p role="status">{tr("جارٍ إكمال الدخول…", "Completing sign-in…")}</p>
      )}
    </main>
  );
}
