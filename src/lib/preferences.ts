import { isLanguage, type WorkforceLanguage } from "../../shared/workforce.ts";

export const LANGUAGE_KEY = "oneshot.lang";
export function storedLanguage(): WorkforceLanguage {
  const fromUrl = new URLSearchParams(location.search).get("lang");
  if (isLanguage(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    /* The preference cookie still works when storage is blocked. */
  }
  try {
    const cookie = document.cookie.match(
      /(?:^|;\s*)oneshot_lang=([a-z]{2})(?:;|$)/,
    )?.[1];
    if (isLanguage(cookie)) return cookie;
  } catch {
    /* Some embedded browsers also block cookies. */
  }
  return "ar";
}

export function persistLanguage(value: WorkforceLanguage) {
  try {
    localStorage.setItem(LANGUAGE_KEY, value);
  } catch {
    /* Optional storage. */
  }
  try {
    const shared = /(^|\.)1shotcam\.com$/.test(location.hostname);
    const secure = location.protocol === "https:" ? "; secure" : "";
    if (shared) document.cookie = `oneshot_lang=; path=/; max-age=0${secure}`;
    document.cookie = `oneshot_lang=${value}; path=/; max-age=31536000; samesite=lax${secure}${shared ? "; domain=1shotcam.com" : ""}`;
  } catch {
    /* The current page still uses the chosen language. */
  }
  document.documentElement.lang = value;
  document.documentElement.dir = ["ar", "ur"].includes(value) ? "rtl" : "ltr";
}
