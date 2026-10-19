import { useEffect, useRef, useState } from "react";
import { hubOrigin } from "../../shared/ecosystem";
import { receiverApp, saveEcosystemSession } from "../lib/ecosystem-session";
import { isLanguage } from "../../shared/workforce";
const bytesToUrl = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const pendingKey = "oneshot.ecosystem.pkce.v1";
export default function SsoReceiver() {
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const app = receiverApp();
      if (!app)
        throw new Error("This origin is not a registered OneShot application.");
      if (location.pathname === "/sso/start") {
        const verifier = bytesToUrl(crypto.getRandomValues(new Uint8Array(32)));
        const state = bytesToUrl(crypto.getRandomValues(new Uint8Array(32)));
        const challenge = bytesToUrl(
          new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(verifier),
            ),
          ),
        );
        const lang = new URLSearchParams(location.search).get("lang");
        const language = isLanguage(lang) ? lang : "ar";
        sessionStorage.setItem(
          pendingKey,
          JSON.stringify({ verifier, state, language, createdAt: Date.now() }),
        );
        const destination = new URL("/sso/authorize", hubOrigin);
        destination.search = new URLSearchParams({
          appId: app.id,
          challenge,
          state,
          lang: language,
        }).toString();
        location.replace(destination.href);
        return;
      }
      const fragment = new URLSearchParams(location.hash.slice(1));
      history.replaceState(null, "", "/sso/callback");
      const pending = JSON.parse(sessionStorage.getItem(pendingKey) || "null");
      sessionStorage.removeItem(pendingKey);
      if (
        !pending ||
        pending.state !== fragment.get("state") ||
        Date.now() - pending.createdAt > 600000 ||
        !/^[A-Za-z0-9_-]{43}$/.test(fragment.get("code") || "")
      )
        throw new Error("Sign-in expired. Start again from this application.");
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
          "Could not complete sign-in. Return to Hub and try again.",
        );
      const result = await response.json();
      saveEcosystemSession(result);
      const next = new URL(
        app.id === "workflow" ? "/workforce" : "/",
        app.origin,
      );
      next.searchParams.set(
        "lang",
        isLanguage(pending.language) ? pending.language : "ar",
      );
      if (app.id === "pay") next.searchParams.set("module", "gateway");
      location.replace(next.href);
    })().catch((err) =>
      setError(err instanceof Error ? err.message : "Sign-in unavailable."),
    );
  }, []);
  return (
    <main style={{ padding: 32, maxWidth: 600, margin: "auto" }}>
      <img src="/oneshot.svg" width="48" height="48" alt="OneShot" />
      <h1>OneShot · Unified sign-in</h1>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <a href="/sso/start">Start again</a>
          <p>
            <a href={hubOrigin}>OneShot Hub</a>
          </p>
        </>
      ) : (
        <p role="status">Completing sign-in…</p>
      )}
    </main>
  );
}
