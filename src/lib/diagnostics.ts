import { diagnosticArea, type DiagnosticCode } from "../../shared/commerce";
// Ephemeral throttle only. All retained diagnostics are stored in Netlify Database.
let nextReport = 0;
export function reportClientDiagnostic(code: DiagnosticCode, path = "") {
  if (Date.now() < nextReport || path.includes("/diagnostics/")) return;
  nextReport = Date.now() + 10000;
  void fetch("/api/diagnostics/client", {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, area: diagnosticArea(path) }),
    signal: AbortSignal.timeout(5000),
    keepalive: true,
  }).catch(() => {});
}
export function installDiagnostics() {
  // No exception objects are read, serialized or forwarded.
  window.addEventListener("error", () =>
    reportClientDiagnostic("CLIENT_ERROR"),
  );
  window.addEventListener("unhandledrejection", () =>
    reportClientDiagnostic("CLIENT_REJECTION"),
  );
}
