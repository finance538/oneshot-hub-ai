import React, { Component, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import Root from "./Root";
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
        <h1>تعذّر عرض مساحة العمل</h1>
        <p>أعد تحميل الصفحة للمتابعة.</p>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          إعادة التحميل
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <Root />
  </ErrorBoundary>,
);
