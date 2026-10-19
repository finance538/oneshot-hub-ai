import { Capacitor } from "@capacitor/core";

/** Platform enhancements load only inside the signed iOS/Android shell. */
export async function connectNativeShell() {
  if (!Capacitor.isNativePlatform()) return;
  const [
    { App },
    { Browser },
    { Haptics, ImpactStyle },
    { Network },
    { StatusBar, Style },
  ] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/browser"),
    import("@capacitor/haptics"),
    import("@capacitor/network"),
    import("@capacitor/status-bar"),
  ]);
  document.documentElement.dataset.native = Capacitor.getPlatform();
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  if (Capacitor.getPlatform() === "android")
    await StatusBar.setBackgroundColor({ color: "#101211" }).catch(() => {});
  const state = await Network.getStatus();
  document.documentElement.dataset.network = state.connected
    ? "online"
    : "offline";
  await Network.addListener("networkStatusChange", (status) => {
    document.documentElement.dataset.network = status.connected
      ? "online"
      : "offline";
    window.dispatchEvent(new Event(status.connected ? "online" : "offline"));
  });
  await App.addListener("backButton", ({ canGoBack }) => {
    if (document.querySelector("dialog[open]")) {
      document
        .querySelector<HTMLDialogElement>("dialog[open]")
        ?.dispatchEvent(new Event("cancel", { cancelable: true }));
    } else if (canGoBack) history.back();
    else if (location.pathname !== "/") location.assign("/");
    else void App.minimizeApp();
  });
  await App.addListener("appUrlOpen", ({ url }) => {
    try {
      const next = new URL(url);
      if (
        next.origin === "https://www.1shotcam.com" &&
        !next.username &&
        !next.password &&
        ["/", "/hub", "/products"].includes(next.pathname)
      )
        location.assign(next.pathname);
    } catch {
      /* Ignore unsupported external links. */
    }
  });
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link) {
        if (event.target.closest("button.lux-button"))
          void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        return;
      }
      const destination = new URL(link.href, location.href);
      if (
        destination.protocol === "https:" &&
        destination.origin !== location.origin
      ) {
        event.preventDefault();
        void Browser.open({
          url: destination.href,
          toolbarColor: "#101211",
        }).catch(() => {
          location.assign(destination.href);
        });
      }
    },
    true,
  );
}
