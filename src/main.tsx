import React, { Component, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import Root from "./Root";
import { AppearanceProvider } from "./storefront/i18n";
import "./design-tokens.css";
import "./styles.css";
// Platform plugins and their bridge are absent from the browser path.
if (
  (
    window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor?.isNativePlatform?.()
) {
  void import("./lib/native-shell")
    .then(({ connectNativeShell }) => connectNativeShell())
    .catch(() => {});
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="fatal-error">
        <img src="/brand/oneshot.svg" width="60" alt="oneShot" />
        <h1>
          {document.documentElement.lang === "ar"
            ? "تعذّر عرض مساحة العمل"
            : "Unable to display the workspace"}
        </h1>
        <p>
          {document.documentElement.lang === "ar"
            ? "أعد تحميل الصفحة للمتابعة."
            : "Reload the page to continue."}
        </p>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          {document.documentElement.lang === "ar" ? "إعادة التحميل" : "Reload"}
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <AppearanceProvider>
      <Root />
    </AppearanceProvider>
  </ErrorBoundary>,
);
