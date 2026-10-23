// Programmatic SEO tool matrix: pure data and math shared by the browser
// engine, the build-time pre-renderer, the API slug allowlist and tests.
// Nothing here touches the network, storage or secrets.

export type ClusterId =
  "ecommerce" | "google-ai" | "gaming" | "brand" | "workforce";

export type EngineId =
  // ecommerce
  | "gateway-fees"
  | "bnpl"
  | "margin"
  | "vat"
  | "conversion"
  // google-ai
  | "inbox"
  | "yt-rpm"
  | "yt-seo"
  | "sheets"
  | "gmail"
  | "prompt"
  // gaming
  | "fps"
  | "local-ai"
  | "psu"
  | "obs"
  | "refresh"
  | "mic-eq"
  // brand
  | "photo-cost"
  | "exposure"
  | "palette"
  | "resizer"
  | "roas"
  // workforce
  | "employee-roi";

export type Values = Record<string, number | string>;

export type FieldDef =
  | {
      key: string;
      kind: "number";
      ar: string;
      en: string;
      min: number;
      max: number;
      step: number;
      unit?: string;
    }
  | {
      key: string;
      kind: "select";
      ar: string;
      en: string;
      options: { value: string; ar: string; en: string }[];
    }
  | {
      key: string;
      kind: "text";
      ar: string;
      en: string;
      placeholder: string;
      maxLength: number;
    };

export type Format =
  | "sar"
  | "usd"
  | "num"
  | "pct"
  | "x"
  | "text"
  | "ms"
  | "gb"
  | "w"
  | "fps"
  | "tps"
  | "kbps"
  | "hours"
  | "mm"
  | "m"
  | "sec";

export interface Kpi {
  ar: string;
  en: string;
  value: number | string;
  format: Format;
  tone?: "good" | "warn" | "bad";
}

export interface Bar {
  ar: string;
  en: string;
  value: number;
  format: Format;
}

export interface TextBlock {
  ar: string;
  en: string;
  lines: string[];
}

export interface Swatch {
  name: string;
  hex: string;
  contrastOnDark: number;
  contrastOnLight: number;
}

export interface EngineResult {
  kpis: Kpi[];
  bars?: Bar[];
  blocks?: TextBlock[];
  swatches?: Swatch[];
  verdictAr?: string;
  verdictEn?: string;
  tone?: "good" | "warn" | "bad";
}

export interface Faq {
  qAr: string;
  aAr: string;
  qEn: string;
  aEn: string;
}

export interface ToolPage {
  slug: string;
  cluster: ClusterId;
  engine: EngineId;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  introAr: string;
  introEn: string;
  /** Reference guide paragraphs (the "20%" authority section). */
  guideAr: string[];
  guideEn: string[];
  keywords: string[];
  faq: Faq[];
  /** Comparison table: header row followed by body rows. */
  table: { headAr: string[]; headEn: string[]; rows: string[][] };
  defaults: Values;
  /** Fixed, non-editable entity facts used by the engine (e.g. game load). */
  params: Record<string, number | string>;
  related: string[];
}

export interface Cluster {
  id: ClusterId;
  app: "pay" | "ai" | "loader" | "brand" | "workflow";
  origin: string;
  emoji: string;
  nameAr: string;
  nameEn: string;
  blurbAr: string;
  blurbEn: string;
  ctaAr: string;
  ctaEn: string;
  /** Secondary destination for clusters that also funnel to the store. */
  secondary?: { href: string; ar: string; en: string };
  accent: string;
}
