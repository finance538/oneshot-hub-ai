import { Capacitor } from "@capacitor/core";

export async function initializeNativeShell() {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.dataset.native = Capacitor.getPlatform();
  const [
    { App },
    { Browser },
    { Haptics, ImpactStyle },
    { StatusBar, Style },
    { SplashScreen },
  ] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/browser"),
    import("@capacitor/haptics"),
    import("@capacitor/status-bar"),
    import("@capacitor/splash-screen"),
  ]);
  await Promise.allSettled([
    StatusBar.setStyle({ style: Style.Dark }),
    SplashScreen.hide(),
  ]);
  document.addEventListener("click", (event) => {
    const target =
      event.target instanceof Element ? event.target.closest("a") : null;
    if (!target || event.defaultPrevented) return;
    const url = new URL(target.href, location.href);
    if (url.protocol === "https:" && url.origin !== location.origin) {
      event.preventDefault();
      // Keep hosted payments and ecosystem handoffs in an OS browser surface.
      void Browser.open({ url: url.href, toolbarColor: "#101312" }).catch(
        () => {
          window.open(url.href, "_blank", "noopener,noreferrer");
        },
      );
    }
  });
  document.addEventListener("click", (event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest(".hub-primary")
        : null;
    if (target && !(target instanceof HTMLButtonElement && target.disabled))
      void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  });
  await App.addListener("backButton", ({ canGoBack }) => {
    // Dialogs retain their normal dismissal controls; never bypass payment state.
    const dialog = document.querySelector<HTMLDialogElement>("dialog[open]");
    if (dialog) {
      dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
      return;
    }
    if (canGoBack) history.back();
    else void App.minimizeApp();
  });
}
