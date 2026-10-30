// Countries offered at sign-up and in the profile. GCC first, then the Arab world,
// then the markets oneShot customers most often sell to. ISO 3166-1 alpha-2 codes.
export interface Country { code: string; ar: string; en: string; dial: string; flag: string }

export const countries: Country[] = [
  { code: 'SA', ar: 'السعودية', en: 'Saudi Arabia', dial: '966', flag: '🇸🇦' },
  { code: 'AE', ar: 'الإمارات', en: 'United Arab Emirates', dial: '971', flag: '🇦🇪' },
  { code: 'KW', ar: 'الكويت', en: 'Kuwait', dial: '965', flag: '🇰🇼' },
  { code: 'QA', ar: 'قطر', en: 'Qatar', dial: '974', flag: '🇶🇦' },
  { code: 'BH', ar: 'البحرين', en: 'Bahrain', dial: '973', flag: '🇧🇭' },
  { code: 'OM', ar: 'عُمان', en: 'Oman', dial: '968', flag: '🇴🇲' },
  { code: 'EG', ar: 'مصر', en: 'Egypt', dial: '20', flag: '🇪🇬' },
  { code: 'JO', ar: 'الأردن', en: 'Jordan', dial: '962', flag: '🇯🇴' },
  { code: 'IQ', ar: 'العراق', en: 'Iraq', dial: '964', flag: '🇮🇶' },
  { code: 'YE', ar: 'اليمن', en: 'Yemen', dial: '967', flag: '🇾🇪' },
  { code: 'SY', ar: 'سوريا', en: 'Syria', dial: '963', flag: '🇸🇾' },
  { code: 'LB', ar: 'لبنان', en: 'Lebanon', dial: '961', flag: '🇱🇧' },
  { code: 'PS', ar: 'فلسطين', en: 'Palestine', dial: '970', flag: '🇵🇸' },
  { code: 'SD', ar: 'السودان', en: 'Sudan', dial: '249', flag: '🇸🇩' },
  { code: 'LY', ar: 'ليبيا', en: 'Libya', dial: '218', flag: '🇱🇾' },
  { code: 'TN', ar: 'تونس', en: 'Tunisia', dial: '216', flag: '🇹🇳' },
  { code: 'DZ', ar: 'الجزائر', en: 'Algeria', dial: '213', flag: '🇩🇿' },
  { code: 'MA', ar: 'المغرب', en: 'Morocco', dial: '212', flag: '🇲🇦' },
  { code: 'MR', ar: 'موريتانيا', en: 'Mauritania', dial: '222', flag: '🇲🇷' },
  { code: 'SO', ar: 'الصومال', en: 'Somalia', dial: '252', flag: '🇸🇴' },
  { code: 'DJ', ar: 'جيبوتي', en: 'Djibouti', dial: '253', flag: '🇩🇯' },
  { code: 'KM', ar: 'جزر القمر', en: 'Comoros', dial: '269', flag: '🇰🇲' },
  { code: 'TR', ar: 'تركيا', en: 'Turkey', dial: '90', flag: '🇹🇷' },
  { code: 'PK', ar: 'باكستان', en: 'Pakistan', dial: '92', flag: '🇵🇰' },
  { code: 'IN', ar: 'الهند', en: 'India', dial: '91', flag: '🇮🇳' },
  { code: 'GB', ar: 'المملكة المتحدة', en: 'United Kingdom', dial: '44', flag: '🇬🇧' },
  { code: 'US', ar: 'الولايات المتحدة', en: 'United States', dial: '1', flag: '🇺🇸' },
  { code: 'CA', ar: 'كندا', en: 'Canada', dial: '1', flag: '🇨🇦' },
  { code: 'DE', ar: 'ألمانيا', en: 'Germany', dial: '49', flag: '🇩🇪' },
  { code: 'FR', ar: 'فرنسا', en: 'France', dial: '33', flag: '🇫🇷' },
];

export const defaultCountry = 'SA';

export function countryByCode(code: unknown): Country | undefined {
  return typeof code === 'string' ? countries.find(c => c.code === code.toUpperCase()) : undefined;
}

/**
 * Normalises a national or international number to E.164 for the given country.
 * Accepts Arabic-Indic digits, spaces, dashes, a leading 0, 00 or +. Returns null when invalid.
 */
export function normalizePhone(country: string, input: string): string | null {
  const found = countryByCode(country);
  if (!found || typeof input !== 'string') return null;
  const digits = input
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s\-().]/g, '');
  if (!/^\+?\d+$/.test(digits)) return null;
  let national = digits;
  if (national.startsWith('+')) national = national.slice(1);
  else if (national.startsWith('00')) national = national.slice(2);
  else national = found.dial + national.replace(/^0+/, '');
  if (!national.startsWith(found.dial)) return null;
  const local = national.slice(found.dial.length).replace(/^0+/, '');
  if (local.length < 6 || local.length > 12) return null;
  return `+${found.dial}${local}`;
}
