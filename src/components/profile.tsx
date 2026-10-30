import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Modal, Notice, Busy } from "./common";
import { api } from "../lib/api";
import { useAppearance } from "../storefront/i18n";
import { countries, countryByCode, defaultCountry } from "../../shared/countries";

interface Profile {
  displayName: string;
  country: string;
  phone: string;
  city: string;
  language: string;
  about: string;
}

// The profile is one record for every oneShot site, stored by ai.1shotcam.com
// and reached through this hub's /api/profile route.
function nationalNumber(profile: Profile) {
  const country = countryByCode(profile.country);
  return country && profile.phone.startsWith(`+${country.dial}`)
    ? `0${profile.phone.slice(country.dial.length + 1)}`
    : profile.phone;
}

function profileError(error: unknown, tr: (ar: string, en: string) => string) {
  const code = (error as { code?: string })?.code;
  if (code === "invalid_phone")
    return tr("أدخل رقم جوال صحيحاً للدولة المختارة.", "Enter a valid mobile number for the selected country.");
  if (code === "country_required")
    return tr("اختر دولتك قبل إضافة رقم الجوال.", "Choose your country before adding a phone number.");
  if (code === "invalid_country") return tr("اختر دولة من القائمة.", "Choose a country from the list.");
  return error instanceof Error && error.message
    ? error.message
    : tr("تعذّر تحميل الملف الشخصي. أعد المحاولة.", "The profile could not be loaded. Please retry.");
}

export function ProfileDialog({ onClose }: { onClose: () => void }) {
  const { tr, language } = useAppearance();
  const [profile, setProfile] = useState<Profile | null>(null),
    [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    api<{ profile: Profile; email: string }>("/api/profile")
      .then((data) => {
        if (!alive.current) return;
        setProfile(data.profile);
        setEmail(data.email);
      })
      .catch((e) => alive.current && setError(profileError(e, tr)));
    return () => {
      alive.current = false;
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const result = await api<{ profile: Profile }>("/api/profile", data, { method: "PUT" });
      if (!alive.current) return;
      setProfile(result.profile);
      setSaved(true);
    } catch (e) {
      if (alive.current) setError(profileError(e, tr));
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const ar = language !== "en";
  return (
    <Modal title={tr("ملفي الشخصي", "My profile")} onClose={onClose}>
      {!profile ? (
        error ? <Notice>{error}</Notice> : <Busy />
      ) : (
        <form className="profile-form" onSubmit={(e) => void submit(e)} onChange={() => setSaved(false)}>
          <p className="muted">
            {tr(
              "ملف واحد لكل مواقع oneShot. أي تعديل هنا يظهر في كل الخدمات.",
              "One profile for every oneShot site. Changes here appear across all services.",
            )}
          </p>
          <label>
            {tr("البريد الإلكتروني", "Email")}
            <input value={email} readOnly dir="ltr" />
          </label>
          <label>
            {tr("اسمك", "Your name")}
            <input name="displayName" defaultValue={profile.displayName} maxLength={100} autoComplete="name" required />
          </label>
          <div className="profile-row">
            <label>
              {tr("الدولة", "Country")}
              <select name="country" defaultValue={profile.country || defaultCountry} autoComplete="country">
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {ar ? c.ar : c.en} (+{c.dial})
                  </option>
                ))}
              </select>
            </label>
            <label>
              {tr("رقم الجوال", "Mobile number")}
              <input type="tel" name="phone" inputMode="tel" defaultValue={nationalNumber(profile)} maxLength={20} dir="ltr" placeholder="05xxxxxxxx" autoComplete="tel-national" />
            </label>
          </div>
          <div className="profile-row">
            <label>
              {tr("المدينة", "City")}
              <input name="city" defaultValue={profile.city} maxLength={80} autoComplete="address-level2" />
            </label>
            <label>
              {tr("لغة الردود", "Reply language")}
              <select name="language" defaultValue={profile.language || (ar ? "ar" : "en")}>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
          <label>
            {tr("نبذة عنك (اختياري)", "About you (optional)")}
            <textarea name="about" defaultValue={profile.about} maxLength={600} rows={3} />
          </label>
          {error && <Notice>{error}</Notice>}
          {saved && (
            <Notice success>
              <Check size={14} /> {tr("تم حفظ ملفك.", "Profile saved.")}
            </Notice>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? tr("جارٍ الحفظ…", "Saving…") : tr("حفظ الملف", "Save profile")}
          </button>
        </form>
      )}
    </Modal>
  );
}
