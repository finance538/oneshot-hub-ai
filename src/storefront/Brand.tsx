import { Moon, Sun, Globe2 } from "lucide-react";
import {
  useAppearance,
  languageNames,
  workforceLanguages,
  type Language,
} from "./i18n";

const appearanceCopy = {
  ar: { language: "اللغة", theme: "تبديل المظهر" },
  en: { language: "Language", theme: "Switch theme" },
  fr: { language: "Langue", theme: "Changer d’apparence" },
  tr: { language: "Dil", theme: "Görünümü değiştir" },
  es: { language: "Idioma", theme: "Cambiar apariencia" },
  zh: { language: "语言", theme: "切换主题" },
  hi: { language: "भाषा", theme: "थीम बदलें" },
  ur: { language: "زبان", theme: "تھیم بدلیں" },
} satisfies Record<Language, { language: string; theme: string }>;

export function AppearanceControls() {
  const { language, theme, setLanguage, setTheme } = useAppearance();
  const copy = appearanceCopy[language];
  return (
    <div className="appearance-controls">
      <label className="store-language">
        <Globe2 size={16} aria-hidden="true" />
        <select
          aria-label={copy.language}
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
        >
          {workforceLanguages.map((code) => (
            <option key={code} value={code}>
              {languageNames[code]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="store-icon"
        aria-label={copy.theme}
        aria-pressed={theme === "light"}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
}
