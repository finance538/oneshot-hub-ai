import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.oneshotcam.ecosystem",
  appName: "OneShot",
  webDir: "native/shell",
  backgroundColor: "#101312",
  server: {
    // The hosted app remains on its first-party origin for Identity and checkout.
    // No sensitive requests originate from a capacitor:// or localhost origin.
    url: "https://www.1shotcam.com",
    cleartext: false,
    errorPath: "offline.html",
  },
  android: { allowMixedContent: false, backgroundColor: "#101312" },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#101312",
    preferredContentMode: "mobile",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: "#101312",
      showSpinner: false,
    },
    StatusBar: { style: "DARK", backgroundColor: "#101312" },
  },
};
export default config;
