import { lazy, Suspense } from "react";
import Hub from "./hub/Hub";
import { appRoute } from "./lib/routes";
import { appearanceLink, useAppearance } from "./storefront/i18n";
import BusinessFooter from "./hub/experience/BusinessFooter";
const LegacyWorkspace = lazy(() => import("./App"));
const SsoReceiver = lazy(() => import("./hub/SsoReceiver"));
const ToolsApp = lazy(() => import("./tools/ToolsApp"));
export default function Root() {
  const { tr } = useAppearance();
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path !== location.pathname)
    history.replaceState(
      history.state,
      "",
      path + location.search + location.hash,
    );
  if (path === "/dashboard") {
    location.replace(appearanceLink("/?module=gateway") + location.hash);
    return null;
  }
  const route = appRoute(new URL(location.href));
  if (route === "receiver")
    return (
      <Suspense fallback={<p role="status">OneShot…</p>}>
        <SsoReceiver />
      </Suspense>
    );
  // Programmatic SEO tools, their /solutions aliases and the owner radar.
  if (route === "tools")
    return (
      <Suspense fallback={<p role="status">OneShot…</p>}>
        <ToolsApp />
      </Suspense>
    );
  const standaloneWorkflow = location.hostname === "workflow.1shotcam.com";
  if (standaloneWorkflow && path === "/") {
    const next = new URL(location.href);
    next.pathname = "/workforce";
    location.replace(next.href);
    return null;
  }
  // The flagship shell never imports office renderers or gateway engines.
  // Existing catalog, legal, payment and headquarters routes retain their APIs.
  if (route === "hub") return <Hub />;
  if (route === "missing")
    return (
      <>
        <main className="fatal-error">
          <h1>404 · {tr("الصفحة غير موجودة", "Page not found")}</h1>
          <p>
            {tr(
              "تحقق من الرابط أو انتقل إلى الرئيسية.",
              "Check the address or return home.",
            )}
          </p>
          <a className="button primary" href={appearanceLink("/")}>
            {tr("الصفحة الرئيسية", "Home")}
          </a>
        </main>
        <BusinessFooter />
      </>
    );
  return (
    <Suspense fallback={<p role="status">OneShot…</p>}>
      <LegacyWorkspace />
    </Suspense>
  );
}
