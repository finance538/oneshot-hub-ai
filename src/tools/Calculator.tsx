import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Check,
  Copy,
  Download,
  Gauge,
  ImagePlus,
  RotateCcw,
} from "lucide-react";
import { engines, runEngine } from "../../shared/tools/engines";
import type {
  Bar,
  FieldDef,
  Format,
  Kpi,
  ToolPage,
  Values,
} from "../../shared/tools/types";

type Lang = "ar" | "en";

const units: Partial<Record<Format, [string, string]>> = {
  sar: [" ر.س", " SAR"],
  usd: [" $", " USD"],
  pct: ["%", "%"],
  x: ["x", "x"],
  ms: [" ms", " ms"],
  gb: [" GB", " GB"],
  w: [" W", " W"],
  fps: [" FPS", " FPS"],
  tps: [" رمز/ث", " tok/s"],
  kbps: [" Kbps", " Kbps"],
  hours: [" ساعة", " h"],
  m: [" م", " m"],
  sec: [" ث", " s"],
};

export function formatValue(
  value: number | string,
  format: Format,
  lang: Lang,
) {
  if (typeof value === "string") return value;
  const text = new Intl.NumberFormat(lang === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: Math.abs(value) < 10 ? 2 : 0,
  }).format(value);
  return text + (units[format]?.[lang === "ar" ? 0 : 1] ?? "");
}

export function CopyButton({ text, lang }: { text: string; lang: Lang }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="tools-copy"
      onClick={() =>
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
      {done
        ? lang === "ar"
          ? "تم النسخ"
          : "Copied"
        : lang === "ar"
          ? "نسخ"
          : "Copy"}
    </button>
  );
}

function Field({
  field,
  value,
  fallback,
  onChange,
  lang,
}: {
  field: FieldDef;
  value: number | string;
  fallback: number | string;
  onChange: (v: number | string) => void;
  lang: Lang;
}) {
  const label = lang === "ar" ? field.ar : field.en;
  const id = `tool-field-${field.key}`;
  if (field.kind === "select")
    return (
      <label className="tools-field" htmlFor={id}>
        <span>{label}</span>
        <select
          id={id}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {lang === "ar" ? o.ar : o.en}
            </option>
          ))}
        </select>
      </label>
    );
  if (field.kind === "text")
    return (
      <label className="tools-field" htmlFor={id}>
        <span>{label}</span>
        <input
          id={id}
          value={String(value)}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  // Sliders cover a practical range around the default; the number box
  // still accepts the full allowed range.
  const base = Number(fallback) || field.min;
  const sliderMax = Math.min(
    field.max,
    Math.max(base * 3, field.min + field.step * 20),
  );
  const n = Number(value);
  return (
    <div className="tools-field">
      <label htmlFor={id}>
        <span>
          {label}
          {field.unit ? <small dir="ltr"> ({field.unit})</small> : null}
        </span>
      </label>
      <div className="tools-number">
        <input
          type="range"
          aria-label={label}
          min={field.min}
          max={sliderMax}
          step={field.step}
          value={Math.min(Number.isFinite(n) ? n : base, sliderMax)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          step={field.step}
          value={Number.isFinite(n) ? n : ""}
          onChange={(e) => {
            const next =
              e.target.value === "" ? field.min : Number(e.target.value);
            onChange(Math.min(Math.max(next, field.min), field.max));
          }}
        />
      </div>
    </div>
  );
}

function Kpis({ kpis, lang }: { kpis: Kpi[]; lang: Lang }) {
  const toneLabel = {
    good: ["✓ جيد", "✓ Good"],
    warn: ["! انتبه", "! Watch"],
    bad: ["✕ ضعيف", "✕ Weak"],
  };
  return (
    <dl className="tools-kpis" aria-live="polite">
      {kpis.map((k) => (
        <div key={k.en} className={k.tone ? `is-${k.tone}` : ""}>
          <dt>{lang === "ar" ? k.ar : k.en}</dt>
          <dd dir="auto">{formatValue(k.value, k.format, lang)}</dd>
          {k.tone ? (
            <small>{toneLabel[k.tone][lang === "ar" ? 0 : 1]}</small>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

/** Single-series horizontal bars: magnitude is length, the title names it. */
function Bars({
  bars,
  title,
  lang,
  highlight,
}: {
  bars: Bar[];
  title: string;
  lang: Lang;
  highlight: string;
}) {
  const max = Math.max(...bars.map((b) => Math.abs(b.value)), 1);
  return (
    <figure className="tools-chart">
      <figcaption>{title}</figcaption>
      <ul>
        {bars.map((b) => {
          const label = lang === "ar" ? b.ar : b.en;
          const value = formatValue(b.value, b.format, lang);
          const active = highlight.includes(b.ar) || highlight.includes(b.en);
          return (
            <li
              key={b.en}
              className={active ? "is-active" : ""}
              title={`${label}: ${value}`}
            >
              <span className="tools-chart-label">{label}</span>
              <span className="tools-chart-track">
                <span
                  className={`tools-chart-bar${b.value < 0 ? " is-negative" : ""}`}
                  style={{
                    inlineSize: `${Math.max((Math.abs(b.value) / max) * 100, 1.5)}%`,
                  }}
                />
              </span>
              <span className="tools-chart-value" dir="ltr">
                {value}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

function RefreshTester({
  lang,
  onMeasured,
}: {
  lang: Lang;
  onMeasured: (hz: number) => void;
}) {
  const [running, setRunning] = useState(false);
  const [hz, setHz] = useState<number | null>(null);
  const dot = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let raf = 0;
    const start = performance.now();
    const deltas: number[] = [];
    let last = start;
    const tick = (now: number) => {
      deltas.push(now - last);
      last = now;
      frame++;
      if (dot.current)
        dot.current.style.insetInlineStart = `${((now - start) / 8) % 100}%`;
      if (now - start < 2500) raf = requestAnimationFrame(tick);
      else {
        const sorted = deltas.slice(5).sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] || 16.7;
        const measured = Math.round(1000 / median);
        setHz(measured);
        onMeasured(measured);
        setRunning(false);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, onMeasured]);
  return (
    <div className="tools-widget">
      <div className="tools-refresh-track" aria-hidden="true">
        <span ref={dot} />
      </div>
      <button
        type="button"
        className="tools-secondary"
        disabled={running}
        onClick={() => setRunning(true)}
      >
        <Gauge size={16} />
        {running
          ? lang === "ar"
            ? "جارٍ القياس…"
            : "Measuring…"
          : lang === "ar"
            ? "قِس معدل تحديث شاشتك الآن"
            : "Measure my refresh rate"}
      </button>
      {hz ? (
        <p role="status">
          {lang === "ar"
            ? `يقيس متصفحك نحو ${hz}Hz — استُخدمت القيمة في الحاسبة.`
            : `Your browser measures about ${hz}Hz — applied to the calculator.`}
        </p>
      ) : null}
    </div>
  );
}

function Resizer({
  page,
  values,
  lang,
}: {
  page: ToolPage;
  values: Values;
  lang: Lang;
}) {
  const sizes = useMemo(
    () =>
      JSON.parse(String(page.params.sizes)) as {
        name: string;
        w: number;
        h: number;
      }[],
    [page],
  );
  const [outputs, setOutputs] = useState<
    { name: string; url: string; w: number; h: number }[]
  >([]);
  const [error, setError] = useState("");
  useEffect(
    () => () => outputs.forEach((o) => URL.revokeObjectURL(o.url)),
    [outputs],
  );
  async function handle(file: File) {
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const type = String(values.format || "image/jpeg");
      const quality = Number(values.quality || 88) / 100;
      const made = await Promise.all(
        sizes.map(
          (s) =>
            new Promise<{ name: string; url: string; w: number; h: number }>(
              (resolve, reject) => {
                const canvas = document.createElement("canvas");
                canvas.width = s.w;
                canvas.height = s.h;
                const ctx = canvas.getContext("2d")!;
                const cover = values.fit !== "contain";
                const scale = cover
                  ? Math.max(s.w / bitmap.width, s.h / bitmap.height)
                  : Math.min(s.w / bitmap.width, s.h / bitmap.height);
                const w = bitmap.width * scale,
                  h = bitmap.height * scale;
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, s.w, s.h);
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(bitmap, (s.w - w) / 2, (s.h - h) / 2, w, h);
                canvas.toBlob(
                  (blob) =>
                    blob
                      ? resolve({ ...s, url: URL.createObjectURL(blob) })
                      : reject(new Error("blob")),
                  type,
                  quality,
                );
              },
            ),
        ),
      );
      bitmap.close();
      setOutputs(made);
    } catch {
      setError(
        lang === "ar"
          ? "تعذّرت قراءة الصورة. جرّب JPEG أو PNG."
          : "Could not read the image. Try JPEG or PNG.",
      );
    }
  }
  const ext = String(values.format || "image/jpeg").split("/")[1];
  return (
    <div className="tools-widget">
      <label className="tools-upload">
        <ImagePlus size={18} />
        {lang === "ar"
          ? "اختر صورة من جهازك (لا تُرفع لأي خادم)"
          : "Choose an image (never uploaded)"}
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            e.target.files?.[0] && void handle(e.target.files[0])
          }
        />
      </label>
      {error ? (
        <p role="alert" className="tools-error">
          {error}
        </p>
      ) : null}
      {outputs.length ? (
        <ul className="tools-resized">
          {outputs.map((o) => (
            <li key={o.name}>
              <img
                src={o.url}
                alt={o.name}
                style={{ aspectRatio: `${o.w} / ${o.h}` }}
              />
              <span dir="ltr">
                {o.name} · {o.w}×{o.h}
              </span>
              <a
                className="tools-copy"
                href={o.url}
                download={`${page.slug}-${o.w}x${o.h}.${ext}`}
              >
                <Download size={14} />
                {lang === "ar" ? "تنزيل" : "Download"}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function Calculator({
  page,
  lang,
  locked,
  onUse,
  lockedNotice,
}: {
  page: ToolPage;
  lang: Lang;
  locked: boolean;
  onUse: () => void;
  lockedNotice: ReactNode;
}) {
  const engine = engines[page.engine];
  const fields = useMemo(() => engine.fields(page), [engine, page]);
  const [values, setValues] = useState<Values>(() => ({ ...page.defaults }));
  const used = useRef(false);
  const set = (key: string, v: number | string) => {
    if (!used.current) {
      used.current = true;
      onUse();
    }
    setValues((prev) => ({ ...prev, [key]: v }));
  };
  const result = useMemo(
    () => runEngine(page, values, lang),
    [page, values, lang],
  );
  const chartTitle = lang === "ar" ? "المقارنة المرئية" : "Visual comparison";
  const onMeasured = useCallback(
    (hz: number) => setValues((prev) => ({ ...prev, hz })),
    [],
  );

  return (
    <section
      className="tools-calculator"
      aria-label={lang === "ar" ? "الأداة التفاعلية" : "Interactive tool"}
    >
      <div className="tools-inputs">
        <div className="tools-inputs-head">
          <h2>{lang === "ar" ? "مدخلاتك" : "Your inputs"}</h2>
          <button
            type="button"
            className="tools-ghost"
            onClick={() => setValues({ ...page.defaults })}
          >
            <RotateCcw size={14} />
            {lang === "ar" ? "القيم الافتراضية" : "Reset"}
          </button>
        </div>
        {fields.map((f) => (
          <Field
            key={f.key}
            field={f}
            lang={lang}
            value={values[f.key] ?? ""}
            fallback={page.defaults[f.key] ?? ""}
            onChange={(v) => set(f.key, v)}
          />
        ))}
        {engine.widget === "refresh" ? (
          <RefreshTester lang={lang} onMeasured={onMeasured} />
        ) : null}
      </div>
      <div className="tools-results">
        <h2>{lang === "ar" ? "النتيجة الفورية" : "Live result"}</h2>
        <Kpis kpis={result.kpis} lang={lang} />
        {result.verdictAr ? (
          <p
            className={`tools-verdict${result.tone ? ` is-${result.tone}` : ""}`}
          >
            {lang === "ar" ? result.verdictAr : result.verdictEn}
          </p>
        ) : null}
        {result.swatches ? (
          <ul className="tools-swatches">
            {result.swatches.map((s) => (
              <li key={s.name}>
                <span className="tools-swatch" style={{ background: s.hex }} />
                <strong>{s.name}</strong>
                <code dir="ltr">{s.hex}</code>
                <small dir="ltr">
                  {s.contrastOnDark}:1 dark · {s.contrastOnLight}:1 light
                </small>
                <CopyButton text={s.hex} lang={lang} />
              </li>
            ))}
          </ul>
        ) : null}
        {engine.widget === "resizer" ? (
          <Resizer page={page} values={values} lang={lang} />
        ) : null}
        <div className={locked ? "tools-advanced is-locked" : "tools-advanced"}>
          {locked ? lockedNotice : null}
          <div aria-hidden={locked || undefined} inert={locked || undefined}>
            {result.bars?.length ? (
              <Bars
                bars={result.bars}
                title={chartTitle}
                lang={lang}
                highlight={`${page.titleAr} ${page.titleEn}`}
              />
            ) : null}
            {result.blocks?.map((b) => {
              const text = b.lines.join("\n");
              return (
                <section key={b.en} className="tools-block">
                  <header>
                    <h3>{lang === "ar" ? b.ar : b.en}</h3>
                    <CopyButton text={text} lang={lang} />
                  </header>
                  <pre dir="auto">{text}</pre>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
