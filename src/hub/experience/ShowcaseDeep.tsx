/**
 * ShowcaseDeep — the long-form second movement of the Hub homepage.
 *
 * Sections, in scroll order:
 *   01 Manifesto    — kinetic type that assembles letter by letter on scroll
 *   02 Capability    — a hex/particle field that resolves text from noise
 *   03 Pipeline      — a scroll-scrubbed timeline rail (progress, not decoration)
 *   04 Splat         — a pseudo-3D point cloud the pointer can orbit
 *   05 Systems       — live counters + a terminal typing a real request/response
 *   06 Close         — a soft gold horizon that answers the pointer
 *
 * Every section is a real renderer, not an image. Each one parks itself the moment it
 * leaves the viewport, so a long page stays cheap to scroll.
 */
import { useEffect, useRef, useState } from "react";
import { useAppearance } from "../../storefront/i18n";
import "./showcase-deep.css";

const DPR = () =>
  Math.min(
    typeof devicePixelRatio === "number" ? devicePixelRatio : 1,
    matchMedia("(pointer: coarse)").matches ? 1.2 : 1.75,
  );
const REDUCED = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Shared visibility gate: true while the element is within one viewport of the screen. */
function useOnScreen<T extends HTMLElement>(margin = "140px") {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => setOn(es.some((e) => e.isIntersecting)),
      { rootMargin: margin },
    );
    io.observe(el);
    // A section already inside the viewport at mount may never receive an entry, so read
    // the first state directly instead of waiting for the observer.
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    if (r.top < vh + 140 && r.bottom > -140) setOn(true);
    return () => io.disconnect();
  }, [margin]);
  return [ref, on] as const;
}

/** Progress 0..1 of an element through the viewport. */
function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = r.height + vh * 0.7;
      const seen = vh * 0.85 - r.top;
      setP(Math.min(1, Math.max(0, seen / total)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return [ref, p] as const;
}

/* ================================================================= */
/* 01 · Manifesto — line-by-line reveal with a gradient wash          */
/* ================================================================= */
export function Manifesto() {
  const { tr } = useAppearance();
  const [ref, p] = useScrollProgress<HTMLDivElement>();
  const lines = tr(
    "لا نبيع صفحات.||نبني أدوات تُستعمل.||كل ما تراه هنا يعمل الآن،||داخل متصفحك، بلا صور جاهزة.",
    "We don't sell pages.||We build tools that get used.||Everything here runs right now,||in your browser, without stock images.",
  ).split("||");

  return (
    <section className="deep-manifesto" ref={ref}>
      <div className="deep-manifesto-inner">
        <span className="lux-eyebrow">03 / MANIFESTO</span>
        <h2>
          {lines.map((line, i) => {
            const start = i / lines.length;
            const local = Math.min(1, Math.max(0, (p - start) * lines.length * 1.9));
            return (
              <span key={i} className="deep-line">
                <em style={{ opacity: 0.06 + local * 0.94, transform: `translateY(${(1 - local) * 22}px)` }}>
                  {line}
                </em>
              </span>
            );
          })}
        </h2>
        <div className="deep-manifesto-rule" style={{ transform: `scaleX(${p})` }} />
      </div>
    </section>
  );
}

/* ================================================================= */
/* 02 · Capability — particles that resolve into a word               */
/* ================================================================= */
export function ParticleType() {
  const { tr } = useAppearance();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hostRef, on] = useOnScreen<HTMLDivElement>("200px");

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const c = cv.getContext("2d");
    if (!c) return;

    let W = 1,
      H = 1;
    const fit = () => {
      const r = cv.getBoundingClientRect();
      const d = DPR();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      cv.width = Math.round(W * d);
      cv.height = Math.round(H * d);
      c.setTransform(d, 0, 0, d, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv);

    // Sample the word once into a target cloud.
    const word = tr("جودة", "CRAFT");
    const off = document.createElement("canvas");
    off.width = Math.max(2, Math.round(W));
    off.height = Math.max(2, Math.round(H));
    const oc = off.getContext("2d");
    const targets: { x: number; y: number }[] = [];
    if (oc) {
      oc.fillStyle = "#000";
      oc.fillRect(0, 0, off.width, off.height);
      oc.fillStyle = "#fff";
      oc.textAlign = "center";
      oc.textBaseline = "middle";
      oc.font = `800 ${Math.round(Math.min(W / 4.2, H * 0.62))}px Cairo, 'Noto Kufi Arabic', sans-serif`;
      oc.fillText(word, off.width / 2, off.height / 2);
      const data = oc.getImageData(0, 0, off.width, off.height).data;
      const gap = Math.max(3, Math.round(Math.min(W, H) / 120));
      for (let y = 0; y < off.height; y += gap) {
        for (let x = 0; x < off.width; x += gap) {
          if (data[(y * off.width + x) * 4] > 128) targets.push({ x, y });
        }
      }
    }

    const N = Math.min(targets.length, matchMedia("(pointer: coarse)").matches ? 1400 : 3200);
    const pts = Array.from({ length: N }, (_, i) => {
      const t = targets[i] ?? { x: Math.random() * W, y: Math.random() * H };
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: 0,
        vy: 0,
        tx: t.x,
        ty: t.y,
        s: 0.5 + Math.random() * 1.4,
      };
    });

    const pointer = { x: -999, y: -999 };
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const onLeave = () => {
      pointer.x = -999;
      pointer.y = -999;
    };
    cv.addEventListener("pointermove", onMove, { passive: true });
    cv.addEventListener("pointerleave", onLeave, { passive: true });

    const reduced = REDUCED();
    let alive = true;
    const t0 = performance.now();

    const tick = () => {
      if (!alive) return;
      if (on) {
        const t = reduced ? 4 : (performance.now() - t0) / 1000;
        c.clearRect(0, 0, W, H);
        // settle factor: particles converge on the glyph as the visitor stays
        const settle = Math.min(1, 0.16 + t * 0.16);
        for (const p of pts) {
          const dx = p.tx - p.x;
          const dy = p.ty - p.y;
          p.vx += dx * 0.0022 * settle;
          p.vy += dy * 0.0022 * settle;
          // pointer repulsion keeps the field feeling alive
          const px = p.x - pointer.x;
          const py = p.y - pointer.y;
          const d2 = px * px + py * py;
          if (d2 < 14000) {
            const f = (1 - d2 / 14000) * 5.2;
            const dl = Math.sqrt(d2) || 1;
            p.vx += (px / dl) * f;
            p.vy += (py / dl) * f;
          }
          p.vx *= 0.90;
          p.vy *= 0.90;
          p.x += p.vx;
          p.y += p.vy;
          const near = d2 < 6000 ? 0.85 : 0.26;
          c.fillStyle = `rgba(201,174,120,${near})`;
          c.fillRect(p.x, p.y, p.s, p.s);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => {
      alive = false;
      ro.disconnect();
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerleave", onLeave);
    };
  }, [on, tr]);

  return (
    <section className="deep-type" ref={hostRef}>
      <div className="deep-type-head">
        <span className="lux-eyebrow">04 / PRECISION</span>
        <h2>{tr("الجودة تُرى قبل أن تُقرأ", "Quality is seen before it is read")}</h2>
        <p>
          {tr(
            "حرّك مؤشرك داخل اللوحة: آلاف النقاط تتجمّع في حروف، وتهرب من يدك ثم تعود.",
            "Move your cursor inside the panel: thousands of points assemble into letters, scatter from your hand, then return.",
          )}
        </p>
      </div>
      <div className="deep-type-stage">
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>
    </section>
  );
}

/* ================================================================= */
/* 03 · Pipeline — a scroll-scrubbed timeline                          */
/* ================================================================= */
const STEPS = [
  {
    ar: ["فكرة", "نرسم المسار والقرار قبل أي سطر كود."],
    en: ["Idea", "We map the path and the decision before a line of code."],
    tag: "DISCOVERY",
  },
  {
    ar: ["تصميم", "هوية وألوان وخطوط من كِت العلامة نفسه."],
    en: ["Design", "Identity, colour and type straight from the brand kit."],
    tag: "IDENTITY",
  },
  {
    ar: ["بناء", "كود يعمل اليوم، لا نموذج يشرح الفكرة."],
    en: ["Build", "Code that works today, not a mock that explains it."],
    tag: "ENGINEERING",
  },
  {
    ar: ["اختبار", "على الجوال أولاً، ثم على الشبكة البطيئة."],
    en: ["Test", "On a phone first, then on a slow network."],
    tag: "QUALITY",
  },
  {
    ar: ["إطلاق", "معاينة تراها بعينك قبل أي نشر."],
    en: ["Launch", "A preview you approve with your own eyes."],
    tag: "DELIVERY",
  },
];

export function Pipeline() {
  const { tr } = useAppearance();
  const [ref, p] = useScrollProgress<HTMLDivElement>();
  const active = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));

  return (
    <section className="deep-pipe" ref={ref}>
      <div className="deep-pipe-head">
        <span className="lux-eyebrow">05 / HOW IT ACTUALLY GOES</span>
        <h2>{tr("من الفكرة إلى الإطلاق", "From idea to launch")}</h2>
      </div>
      <div className="deep-pipe-track">
        <div className="deep-pipe-rail">
          <i style={{ transform: `scaleX(${p})` }} />
        </div>
        <div className="deep-pipe-steps">
          {STEPS.map((s, i) => {
            const title = tr(s.ar[0], s.en[0]);
            const body = tr(s.ar[1], s.en[1]);
            const done = i <= active;
            return (
              <article
                key={s.tag}
                className={`deep-pipe-step ${done ? "is-on" : ""} ${i === active ? "is-now" : ""}`}
              >
                <span className="deep-pipe-dot" />
                <span className="deep-pipe-tag">{s.tag}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ================================================================= */
/* 04 · Splat — an orbitable point cloud (Gaussian-splat aesthetic)   */
/* ================================================================= */
export function SplatCloud() {
  const { tr } = useAppearance();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hostRef, on] = useOnScreen<HTMLDivElement>("220px");

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const c = cv.getContext("2d");
    if (!c) return;
    let W = 1,
      H = 1;
    const fit = () => {
      const r = cv.getBoundingClientRect();
      const d = DPR();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      cv.width = Math.round(W * d);
      cv.height = Math.round(H * d);
      c.setTransform(d, 0, 0, d, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv);

    // A structured cloud: two counter-rotating shells, so it reads as a scanned object
    // rather than random dust.
    const n = matchMedia("(pointer: coarse)").matches ? 900 : 2100;
    const pts = Array.from({ length: n }, (_, i) => {
      const shell = i % 2 === 0;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const r = shell ? 0.72 + Math.random() * 0.2 : 0.4 + Math.random() * 0.16;
      return {
        x: r * Math.sin(ph) * Math.cos(th),
        y: r * Math.cos(ph) * 0.82,
        z: r * Math.sin(ph) * Math.sin(th),
        s: shell ? 1.6 : 1.05,
        hue: shell ? 1 : 0,
      };
    });

    let rot = 0;
    let drag = 0;
    let dragging = false;
    let lastX = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      cv.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      drag += (e.clientX - lastX) * 0.006;
      lastX = e.clientX;
    };
    const onUp = () => {
      dragging = false;
    };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove, { passive: true });
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);

    const reduced = REDUCED();
    let alive = true;
    const tick = () => {
      if (!alive) return;
      if (on) {
        if (!reduced && !dragging) rot += 0.0022;
        const a = rot + drag;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        c.clearRect(0, 0, W, H);
        const cx = W / 2;
        const cy = H / 2;
        const scale = Math.min(W, H) * 0.42;
        // painter's sort on z so near points cover far ones
        const proj = pts.map((p) => {
          const x = p.x * cos - p.z * sin;
          const z = p.x * sin + p.z * cos;
          const persp = 1 / (1.55 - z * 0.85);
          return {
            x: cx + x * scale * persp,
            y: cy + p.y * scale * persp,
            r: p.s * persp * (1.5 + z * 0.5),
            z,
            hue: p.hue,
          };
        });
        proj.sort((m, o) => m.z - o.z);
        for (const q of proj) {
          const a2 = 0.10 + Math.max(0, (q.z + 1) / 2) * 0.55;
          c.beginPath();
          c.arc(q.x, q.y, q.r, 0, 6.2832);
          c.fillStyle =
            q.hue === 1
              ? `rgba(201,174,120,${a2})`
              : `rgba(231,197,105,${a2 * 0.75})`;
          c.fill();
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => {
      alive = false;
      ro.disconnect();
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
    };
  }, [on]);

  return (
    <section className="deep-splat" ref={hostRef}>
      <div className="deep-splat-stage">
        <canvas ref={canvasRef} aria-hidden="true" />
        <span className="deep-splat-hint">{tr("اسحب لتدوير المجسّم", "Drag to orbit")}</span>
      </div>
      <div className="deep-splat-copy">
        <span className="lux-eyebrow">06 / PHOTOGRAMMETRY</span>
        <h2>{tr("صوّر شيئاً، وشاهده من كل زاوية", "Photograph a thing, then walk around it")}</h2>
        <p>
          {tr(
            "هذا سحابة نقاط ثلاثية الأبعاد — نفس التقنية التي تحوّل صور الهاتف إلى مجسّم واقعي يمكن تدويره في المتصفح، بلا تطبيق ولا تحميل.",
            "This is a 3D point cloud — the same technique that turns phone photos into a photoreal model you can orbit in the browser, with no app and no download.",
          )}
        </p>
        <ul className="deep-splat-list">
          <li>{tr("منتج يتدحرج أمام العميل", "A product the customer rotates")}</li>
          <li>{tr("مساحة معمارية تُزار قبل بنائها", "A space visited before it is built")}</li>
          <li>{tr("قطعة أثرية تُحفظ وتُعرض", "An artifact preserved and shown")}</li>
        </ul>
      </div>
    </section>
  );
}

/* ================================================================= */
/* 05 · Systems — live counters + terminal typing                      */
/* ================================================================= */
const STATS = [
  { v: 8, ar: "وحدات مترابطة", en: "CONNECTED MODULES" },
  { v: 0, ar: "صورة جاهزة في هذه الصفحة", en: "STOCK IMAGES ON THIS PAGE" },
  { v: 60, ar: "إطاراً في الثانية", en: "FRAMES PER SECOND" },
  { v: 7, ar: "أيام جلسة واحدة", en: "DAYS PER SESSION" },
];

const SCRIPT = [
  { t: "POST /api/payments", k: "req" },
  { t: '  "amount": 249.00, "currency": "SAR"', k: "dim" },
  { t: '  "route": "auto", "idempotency": "…a91c"', k: "dim" },
  { t: "→ gateway selected: primary  (fee 1.8%)", k: "ok" },
  { t: "→ authorized in 412ms", k: "ok" },
  { t: "200  { status: \"captured\" }", k: "done" },
];

export function Systems() {
  const { tr } = useAppearance();
  const [hostRef, on] = useOnScreen<HTMLDivElement>("200px");
  const [counts, setCounts] = useState(STATS.map(() => 0));
  const [typed, setTyped] = useState<string[]>([]);

  useEffect(() => {
    if (!on) return;
    // counters
    const ids: number[] = [];
    STATS.forEach((s, i) => {
      if (s.v === 0) {
        setCounts((prev) => {
          const next = [...prev];
          next[i] = 0;
          return next;
        });
        return;
      }
      let n = 0;
      const step = () => {
        n = Math.min(s.v, n + Math.max(1, Math.ceil(s.v / 26)));
        setCounts((prev) => {
          const next = [...prev];
          next[i] = n;
          return next;
        });
        if (n < s.v) ids[i] = window.setTimeout(step, 34);
      };
      step();
    });

    // terminal typing
    let line = 0;
    let ch = 0;
    let timer = 0;
    const type = () => {
      if (line >= SCRIPT.length) return;
      const target = SCRIPT[line].t;
      ch += 1;
      setTyped((prev) => {
        const next = [...prev];
        next[line] = target.slice(0, ch);
        return next;
      });
      if (ch >= target.length) {
        line += 1;
        ch = 0;
        timer = window.setTimeout(type, 240);
      } else {
        timer = window.setTimeout(type, 16);
      }
    };
    timer = window.setTimeout(type, 420);

    return () => {
      ids.forEach((id) => id && clearTimeout(id));
      clearTimeout(timer);
    };
  }, [on]);

  return (
    <section className="deep-systems" ref={hostRef}>
      <div className="deep-systems-head">
        <span className="lux-eyebrow">07 / UNDER THE HOOD</span>
        <h2>{tr("ما يجري فعلاً خلف الواجهة", "What actually runs behind the surface")}</h2>
      </div>
      <div className="deep-systems-grid">
        <div className="deep-stats">
          {STATS.map((s, i) => (
            <div key={s.en} className="deep-stat">
              <b>{counts[i]}</b>
              <span>{tr(s.ar, s.en)}</span>
            </div>
          ))}
        </div>
        <div className="deep-term">
          <div className="deep-term-bar">
            <i /><i /><i />
            <span>oneshot · api</span>
          </div>
          <pre>
            {SCRIPT.map((l, i) => (
              <div key={i} className={`deep-term-line k-${l.k}`}>
                {typed[i] ?? ""}
                {i === typed.length - 1 && (typed[i]?.length ?? 0) > 0 ? (
                  <span className="deep-caret" />
                ) : null}
              </div>
            ))}
          </pre>
          <div className="deep-term-foot">
            {tr("هذا شكل الطلب الحقيقي لمنصة الدفع", "This is the real request shape for the payment platform")}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================= */
/* 06 · Close — a gold horizon that answers the pointer                */
/* ================================================================= */
export function HorizonClose({ onEnter }: { onEnter?: () => void }) {
  const { tr } = useAppearance();
  const [hostRef, on] = useOnScreen<HTMLDivElement>("240px");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const c = cv.getContext("2d");
    if (!c) return;
    let W = 1,
      H = 1;
    const fit = () => {
      const r = cv.getBoundingClientRect();
      const d = DPR();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      cv.width = Math.round(W * d);
      cv.height = Math.round(H * d);
      c.setTransform(d, 0, 0, d, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv);

    const ptr = { x: 0.5, y: 0.5 };
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      ptr.x = (e.clientX - r.left) / r.width;
      ptr.y = (e.clientY - r.top) / r.height;
    };
    cv.addEventListener("pointermove", onMove, { passive: true });

    const reduced = REDUCED();
    let alive = true;
    const t0 = performance.now();
    const tick = () => {
      if (!alive) return;
      if (on) {
        const t = reduced ? 6 : (performance.now() - t0) / 1000;
        c.clearRect(0, 0, W, H);
        const horizon = H * (0.62 + (ptr.y - 0.5) * 0.06);
        const glowX = W * (0.5 + (ptr.x - 0.5) * 0.22);
        const g = c.createRadialGradient(glowX, horizon, 0, glowX, horizon, W * 0.72);
        g.addColorStop(0, "rgba(231,197,105,0.30)");
        g.addColorStop(0.35, "rgba(201,174,120,0.12)");
        g.addColorStop(1, "rgba(11,12,14,0)");
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);

        // horizon lines, denser toward the edge
        for (let i = 0; i < 26; i++) {
          const k = i / 26;
          const y = horizon + Math.pow(k, 1.9) * (H - horizon);
          const a = 0.06 + k * 0.24;
          c.beginPath();
          for (let x = 0; x <= W; x += 12) {
            const wob =
              Math.sin(x * 0.006 + t * 0.7 + i * 0.5) * (2 + k * 9) +
              Math.sin(x * 0.013 - t * 1.1) * (1 + k * 4);
            x === 0 ? c.moveTo(x, y + wob) : c.lineTo(x, y + wob);
          }
          c.strokeStyle = `rgba(201,174,120,${a})`;
          c.lineWidth = i < 6 ? 0.7 : 1;
          c.stroke();
        }
        // the sun line
        c.beginPath();
        c.moveTo(0, horizon);
        c.lineTo(W, horizon);
        c.strokeStyle = "rgba(231,197,105,0.85)";
        c.lineWidth = 1.4;
        c.stroke();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => {
      alive = false;
      ro.disconnect();
      cv.removeEventListener("pointermove", onMove);
    };
  }, [on]);

  return (
    <section className="deep-close" ref={hostRef}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="deep-close-copy">
        <span className="lux-eyebrow">08 / YOUR MOVE</span>
        <h2>
          {tr("رأيت ما نستطيع بناءه.", "You have seen what we can build.")}
          <br />
          <em>{tr("الخطوة التالية أن نبنيه لك.", "The next step is building it for you.")}</em>
        </h2>
        <div className="deep-close-actions">
          <button className="lux-button lux-button-gold" onClick={onEnter}>
            {tr("ادخل منظومتك", "Enter your workspace")}
          </button>
          <a className="lux-text-button" href="#showcase">
            {tr("أعد مشاهدة العرض", "Replay the showcase")}
          </a>
        </div>
      </div>
    </section>
  );
}
