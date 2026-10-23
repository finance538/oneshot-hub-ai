import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isLanguage, type WorkforceLanguage } from "../../shared/workforce";
import {
  storedLanguage,
  persistLanguage,
  LANGUAGE_KEY,
} from "../lib/preferences";
export { storedLanguage, persistLanguage } from "../lib/preferences";
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
    history.replaceState(history.state, "", url);
  };
  useEffect(() => {
    persistLanguage(language);
    document.documentElement.dataset.theme = theme;
  }, [language, theme]);
  useEffect(() => {
    const restore = () => setLanguageState(storedLanguage());
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_KEY && isLanguage(event.newValue)) {
        update("lang", event.newValue);
        setLanguageState(event.newValue);
      }
    };
    window.addEventListener("popstate", restore);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("storage", sync);
    };
  }, []);
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
    "/#section-media": "/#comparison",
    "/#section-google-ads": "/#comparison",
    "/#section-ai-staff": "/#power",
  };
  const url = new URL(mapping[path] || path, location.origin);
  if (url.origin !== location.origin) return path;
  const current = new URLSearchParams(location.search);
  for (const key of ["lang", "theme"]) {
    const value = current.get(key);
    if (value) url.searchParams.set(key, value);
  }
  if (!url.searchParams.has("lang"))
    url.searchParams.set("lang", storedLanguage());
  return url.pathname + url.search + url.hash;
}
