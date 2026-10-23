import { lazy, Suspense } from "react";
import Hub from "./hub/Hub";
const LegacyWorkspace = lazy(() => import("./App"));
const SsoReceiver = lazy(() => import("./hub/SsoReceiver"));
const ToolsApp = lazy(() => import("./tools/ToolsApp"));
export default function Root() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(location.search);
  const module = params.get("module");
  if (["/sso/start", "/sso/callback"].includes(path))
    return (
      <Suspense fallback={<p role="status">OneShot…</p>}>
        <SsoReceiver />
      </Suspense>
    );
  // Programmatic SEO tools, their /solutions aliases and the owner radar.
  if (/^\/(tools|solutions)(\/|$)/.test(path) || path === "/admin/radar")
    return (
      <Suspense fallback={<p role="status">OneShot…</p>}>
        <ToolsApp />
      </Suspense>
    );
  const standalonePay = location.hostname === "pay.1shotcam.com";
  const standaloneWorkflow = location.hostname === "workflow.1shotcam.com";
  if (standaloneWorkflow && path === "/") {
    const next = new URL(location.href);
    next.pathname = "/workforce";
    location.replace(next.href);
    return null;
  }
  // The flagship shell never imports office renderers or gateway engines.
  // Existing catalog, legal, payment and headquarters routes retain their APIs.
  if (
    (!standalonePay &&
      !params.has("order") &&
      path === "/" &&
      !["gateway", "vault", "ceo"].includes(module || "")) ||
    [
      "/hub",
      "/sso/authorize",
      "/studio",
      "/ai-studio",
      "/brand-studio",
      "/sign-in",
    ].includes(path)
  )
    return <Hub />;
  return (
    <Suspense fallback={<p role="status">OneShot…</p>}>
      <LegacyWorkspace />
    </Suspense>
  );
}
