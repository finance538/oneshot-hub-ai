import { Moon, Sun, Globe2 } from "lucide-react";
import { useAppearance, type Language } from "./i18n";
export function AppearanceControls() {
  const { language, theme, setLanguage, setTheme, tr } = useAppearance();
  return (
    <div className="appearance-controls">
      <label className="store-language">
        <Globe2 size={16} />
        <select
          aria-label={tr("اللغة", "Language")}
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
        >
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </label>
      <button
        className="store-icon"
        aria-label={tr("تبديل المظهر", "Switch theme")}
        aria-pressed={theme === "light"}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
}
