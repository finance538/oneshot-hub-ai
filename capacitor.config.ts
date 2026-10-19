import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.oneshotcam.ecosystem",
  appName: "OneShot",
  webDir: "native-shell",
  server: {
    // Hosted origin preserves same-origin Identity cookies and protected APIs.
    url: "https://www.1shotcam.com",
    cleartext: false,
    allowNavigation: ["www.1shotcam.com"],
    errorPath: "offline.html",
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
    backgroundColor: "#101211",
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#101211",
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    StatusBar: { backgroundColor: "#101211", overlaysWebView: false },
  },
};
export default config;
