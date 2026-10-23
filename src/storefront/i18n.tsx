import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isLanguage, type WorkforceLanguage } from "../../shared/workforce";
export { languageNames, workforceLanguages } from "../../shared/workforce";
export type Language = WorkforceLanguage;
type Theme = "dark" | "light";
const Context = createContext<{
  language: Language;
  theme: Theme;
  outputLanguage: Language;
  setOutputLanguage: (v: Language) => void;
  setLanguage: (v: Language) => void;
  setTheme: (v: Theme) => void;
  tr: (ar: string, en: string) => string;
  number: (value: number) => string;
} | null>(null);
const LANGUAGE_KEY = "oneshot.lang";
/** URL first, then the saved choice (localStorage, then cookie), else Arabic. */
export function storedLanguage(): Language {
  const fromUrl = new URLSearchParams(location.search).get("lang");
  if (isLanguage(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // Storage can be unavailable in private modes; the cookie still applies.
  }
  const cookie = document.cookie.match(/(?:^|; )oneshot_lang=([a-z]{2})/)?.[1];
  return isLanguage(cookie) ? cookie : "ar";
}
export function persistLanguage(value: Language) {
  try {
    localStorage.setItem(LANGUAGE_KEY, value);
  } catch {
    // Ignore storage failures; the cookie below keeps the preference.
  }
  document.cookie = `oneshot_lang=${value}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
}
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const params = new URLSearchParams(location.search);
  const [language, setLanguageState] = useState<Language>(storedLanguage);
  const [outputLanguage, setOutputLanguage] = useState<Language>("ar");
  const [theme, setThemeState] = useState<Theme>(
    params.get("theme") === "light" ? "light" : "dark",
  );
  const update = (key: string, value: string) => {
    const url = new URL(location.href);
    url.searchParams.set(key, value);
    history.replaceState({}, "", url);
  };
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = ["ar", "ur"].includes(language)
      ? "rtl"
      : "ltr";
    document.documentElement.dataset.theme = theme;
    return () => {
      const saved = storedLanguage();
      document.documentElement.lang = saved;
      document.documentElement.dir = ["ar", "ur"].includes(saved) ? "rtl" : "ltr";
      delete document.documentElement.dataset.theme;
    };
  }, [language, theme]);
  return (
    <Context.Provider
      value={{
        language,
        theme,
        outputLanguage,
        setOutputLanguage,
        setLanguage: (v) => {
          update("lang", v);
          persistLanguage(v);
          setLanguageState(v);
        },
        setTheme: (v) => {
          update("theme", v);
          setThemeState(v);
        },
        tr: (ar, en) => (language === "ar" ? ar : en),
        number: (v) =>
          new Intl.NumberFormat(language === "zh" ? "zh-CN" : language).format(
            v,
          ),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAppearance() {
  const c = useContext(Context);
  if (!c) throw new Error("Appearance provider missing");
  return c;
}
export function appearanceLink(path: string) {
  const mapping: Record<string, string> = {
    "/dashboard": "/?module=gateway",
    "/sign-in": "/?module=ceo",
  };
  const url = new URL(mapping[path] || path, location.origin);
  if (url.origin !== location.origin) return path;
  if (url.pathname === "/" && !url.searchParams.has("module"))
    url.searchParams.set("module", "store");
  const current = new URLSearchParams(location.search);
  for (const key of ["lang", "theme"]) {
    const value = current.get(key);
    if (value) url.searchParams.set(key, value);
  }
  return url.pathname + url.search + url.hash;
}
