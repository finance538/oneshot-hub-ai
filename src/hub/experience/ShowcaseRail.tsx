/**
 * ShowcaseRail — the "try it yourself" scroll gallery for OneShot Hub.
 *
 * Eight live canvases, each one a different rendering technique, all computed in the
 * browser with no libraries. They exist to prove capability: a visitor scrolling the
 * Hub sees what we can build, not a claim that we can build it.
 *
 * Performance contract:
 *  - only the panel inside (or near) the viewport is animated; everything else is parked
 *  - devicePixelRatio is capped, and coarse pointers get a lower cap
 *  - prefers-reduced-motion renders one static frame and stops
 *  - one shared rAF drives the visible panel; each canvas owns its own state
 */
import { useEffect, useRef, useState } from "react";
import { useAppearance } from "../../storefront/i18n";
import "./showcase.css";

type Scene =
  | "particles"
  | "shader"
  | "terrain"
  | "torus"
  | "fluid"
  | "flow"
  | "type"
  | "grid";

type Item = {
  id: string;
  scene: Scene;
  ar: { title: string; body: string };
  en: { title: string; body: string };
  tag: string;
};

const ITEMS: Item[] = [
  {
    id: "01",
    scene: "particles",
    ar: {
      title: "جزيئات تقرأ حركتك",
      body: "آلاف النقاط تُسحب نحو مؤشرك وتتوهّج كلما اقتربت — كل الحساب على كرت الرسوميات.",
    },
    en: {
      title: "Particles that read you",
      body: "Thousands of points pulled toward your cursor, brighter as they close in — all on the GPU.",
    },
    tag: "GLSL · POINTS",
  },
  {
    id: "02",
    scene: "shader",
    ar: {
      title: "سديـم ذهبي حيّ",
      body: "طبقات ضجيج مشوّهة المجال تولّد سديماً لا يتكرر، يتنفّس مع كل إطار.",
    },
    en: {
      title: "A living gold nebula",
      body: "Domain-warped noise layers build a nebula that never repeats and breathes every frame.",
    },
    tag: "FBM · DOMAIN WARP",
  },
  {
    id: "03",
    scene: "terrain",
    ar: {
      title: "أرض تتشكّل مع التمرير",
      body: "سطح ثلاثي الأبعاد يتموّج بموجة ضجيج، والكاميرا تنزل عليه كلما نزلت الصفحة.",
    },
    en: {
      title: "Terrain that forms as you scroll",
      body: "A 3D surface ripples on noise; the camera descends as the page scrolls.",
    },
    tag: "WEBGL · NOISE",
  },
  {
    id: "04",
    scene: "torus",
    ar: {
      title: "زجاج ينكسر الضوء",
      body: "حلقات متراكبة تحاكي انكسار الضوء على سطح معدني، بلا صور ولا فيديو.",
    },
    en: {
      title: "Glass that bends light",
      body: "Layered rings simulate refraction on a metal surface — no images, no video.",
    },
    tag: "REFRACTION",
  },
  {
    id: "05",
    scene: "fluid",
    ar: {
      title: "سائل يتفاعل مع إصبعك",
      body: "اسحب داخل اللوحة فيتحرك السائل ويختلط — محاكاة انسيابية على كرت الرسوميات.",
    },
    en: {
      title: "Fluid that follows your finger",
      body: "Drag inside the panel and the fluid swirls and mixes — a GPU flow simulation.",
    },
    tag: "FLUID SIM",
  },
  {
    id: "06",
    scene: "flow",
    ar: {
      title: "خطوط تُظهر المسار",
      body: "جزيئات تتبع حقل ضجيج فتبني خطوطاً ناعمة تكشف بنية الحركة نفسها.",
    },
    en: {
      title: "Lines that reveal the path",
      body: "Particles following a noise field trace soft lines that expose the motion itself.",
    },
    tag: "FLOW FIELD",
  },
  {
    id: "07",
    scene: "type",
    ar: {
      title: "طباعة تحمل الهوية",
      body: "كلمة تتبدّل حروفها بإيقاع محسوب — تايبوغرافيا حيّة بدل نص ساكن.",
    },
    en: {
      title: "Type that carries the brand",
      body: "A word swaps its glyphs on a measured beat — living typography, not static text.",
    },
    tag: "KINETIC TYPE",
  },
  {
    id: "08",
    scene: "grid",
    ar: {
      title: "شبكة تستجيب للمؤشر",
      body: "شبكة تتمايل كنَسيج عند مرور المؤشر، وتعود إلى استقامتها ببطء.",
    },
    en: {
      title: "A grid that answers the cursor",
      body: "A mesh bends like fabric under the cursor and settles back into line.",
    },
    tag: "DISPLACEMENT",
  },
];

const DPR = () =>
  Math.min(
    typeof devicePixelRatio === "number" ? devicePixelRatio : 1,
    matchMedia("(pointer: coarse)").matches ? 1.25 : 1.75,
  );

const REDUCED = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* Per-scene renderers: each returns a step(t, pointer) + dispose()    */
/* ------------------------------------------------------------------ */
type Ctx = {
  cv: HTMLCanvasElement;
  c: CanvasRenderingContext2D;
  gl?: WebGLRenderingContext | null;
  w: number;
  h: number;
  state: Record<string, unknown>;
};

function fit(ctx: Ctx) {
  const r = ctx.cv.getBoundingClientRect();
  const d = DPR();
  ctx.w = Math.max(1, Math.round(r.width));
  ctx.h = Math.max(1, Math.round(r.height));
  ctx.cv.width = Math.round(ctx.w * d);
  ctx.cv.height = Math.round(ctx.h * d);
  if (ctx.c) ctx.c.setTransform(d, 0, 0, d, 0, 0);
  if (ctx.gl) ctx.gl.viewport(0, 0, ctx.cv.width, ctx.cv.height);
}

const GOLD = [201, 174, 120];
const GOLD2 = [231, 197, 105];

function buildParticles(ctx: Ctx) {
  const n = Math.min(1400, Math.round((ctx.w * ctx.h) / 620));
  const pts = Array.from({ length: n }, () => ({
    a: Math.random() * Math.PI * 2,
    r: 0.16 + Math.random() * 0.9,
    s: 0.28 + Math.random() * 0.9,
    d: Math.random() * 6.28,
  }));
  ctx.state = { pts };
  const c = ctx.c;
  return {
    step(t: number, px: number, py: number) {
      c.clearRect(0, 0, ctx.w, ctx.h);
      const cx = ctx.w / 2 + (px - 0.5) * 26;
      const cy = ctx.h / 2 + (0.5 - py) * 26;
      for (const p of pts) {
        const ang = p.a + t * 0.16 * p.s;
        const rad = p.r * Math.min(ctx.w, ctx.h) * 0.46;
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad * 0.82;
        const depth = 0.5 + 0.5 * Math.cos(p.d + t * 0.5 * p.s);
        const a = 0.16 + depth * 0.72;
        const size = 0.7 + depth * 1.9;
        c.beginPath();
        c.arc(x, y, size, 0, 6.2832);
        c.fillStyle = `rgba(${GOLD2[0]},${GOLD2[1]},${GOLD2[2]},${a})`;
        c.fill();
        if (depth > 0.85) {
          c.beginPath();
          c.arc(x, y, size * 3.4, 0, 6.2832);
          c.fillStyle = `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${a * 0.10})`;
          c.fill();
        }
      }
    },
  };
}

function buildShader(ctx: Ctx) {
  const gl = ctx.cv.getContext("webgl", { antialias: false, alpha: true });
  ctx.gl = gl;
  if (!gl) return buildParticles(ctx);
  const vs = `attribute vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`;
  const fs = `precision highp float;
  uniform vec2 R; uniform float T; uniform vec2 M;
  float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<4;i++){ v+=a*n(p); p*=2.03; a*=.5; } return v; }
  void main(){
    vec2 p=(gl_FragCoord.xy-.5*R)/R.y;
    float t=T*.08;
    vec2 q=vec2(fbm(p*1.7+t), fbm(p*1.7+vec2(4.1,2.7)-t));
    vec2 r=vec2(fbm(p*2.3+3.1*q+vec2(1.3,7.9)+t*1.2), fbm(p*2.3+3.1*q+vec2(6.7,2.1)-t*1.2));
    float f=fbm(p*2.1+2.4*r);
    float pd=length(p-(M-.5)*vec2(R.x/R.y,1.));
    float g=exp(-pd*2.6)*.5;
    vec3 bg=vec3(.043,.047,.055);
    vec3 gold=vec3(.788,.682,.470), gold2=vec3(.906,.773,.412);
    vec3 col=mix(bg, vec3(.08,.09,.105), smoothstep(0.,.9,f));
    col+=mix(gold,gold2,r.y)*smoothstep(.40,.94,f+.2*r.x)*.42;
    col+=gold*g*(.55+.9*r.x);
    gl_FragColor=vec4(col,1.);
  }`;
  const mk = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const v = mk(gl.VERTEX_SHADER, vs);
  const f = mk(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return buildParticles(ctx);
  const pr = gl.createProgram()!;
  gl.attachShader(pr, v);
  gl.attachShader(pr, f);
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return buildParticles(ctx);
  gl.useProgram(pr);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const loc = gl.getAttribLocation(pr, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pr, "R");
  const uT = gl.getUniformLocation(pr, "T");
  const uM = gl.getUniformLocation(pr, "M");
  return {
    step(t: number, px: number, py: number) {
      gl.viewport(0, 0, ctx.cv.width, ctx.cv.height);
      gl.uniform2f(uR, ctx.cv.width, ctx.cv.height);
      gl.uniform1f(uT, t);
      gl.uniform2f(uM, px, py);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

function buildTerrain(ctx: Ctx) {
  const c = ctx.c;
  const COLS = 34;
  const ROWS = 22;
  return {
    step(t: number, px: number) {
      c.clearRect(0, 0, ctx.w, ctx.h);
      const horizon = ctx.h * 0.42;
      const tilt = (px - 0.5) * 40;
      for (let z = 0; z < ROWS; z++) {
        const zp = z / ROWS;
        const y = horizon + Math.pow(zp, 2.2) * (ctx.h - horizon - 6);
        const scale = 0.25 + zp * 1.05;
        c.beginPath();
        for (let x = 0; x <= COLS; x++) {
          const xp = x / COLS;
          const wave =
            Math.sin(xp * 7 + t * 0.9 + zp * 5) * 7 * scale +
            Math.sin(xp * 13 - t * 1.3 + zp * 9) * 4 * scale +
            Math.cos(zp * 8 + t * 0.6) * 5 * scale;
          const sx = xp * (ctx.w + 80) - 40 + tilt * zp;
          const sy = y - wave - zp * 8;
          x === 0 ? c.moveTo(sx, sy) : c.lineTo(sx, sy);
        }
        c.strokeStyle = `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${0.06 + zp * 0.34})`;
        c.lineWidth = 0.7 + zp * 0.9;
        c.stroke();
      }
    },
  };
}

function buildTorus(ctx: Ctx) {
  const c = ctx.c;
  return {
    step(t: number) {
      c.clearRect(0, 0, ctx.w, ctx.h);
      const cx = ctx.w / 2;
      const cy = ctx.h / 2;
      const R = Math.min(ctx.w, ctx.h) * 0.30;
      for (let k = 16; k > 0; k--) {
        const s = 1 + k * 0.048;
        const phase = t * 0.42 + k * 0.11;
        c.beginPath();
        c.ellipse(cx, cy, R * s, R * 0.44 * s, phase * 0.6, 0, 6.2832);
        c.strokeStyle = `rgba(${GOLD2[0]},${GOLD2[1]},${GOLD2[2]},${0.26 / k + 0.015})`;
        c.lineWidth = 1.05;
        c.stroke();
      }
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
      g.addColorStop(0, `rgba(${GOLD2[0]},${GOLD2[1]},${GOLD2[2]},0.16)`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, ctx.w, ctx.h);
    },
  };
}

function buildFluid(ctx: Ctx) {
  const c = ctx.c;
  const pts = Array.from({ length: 60 }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.0016,
    vy: (Math.random() - 0.5) * 0.0016,
  }));
  c.fillStyle = "#0d0f11";
  c.fillRect(0, 0, ctx.w, ctx.h);
  return {
    step(t: number, px: number, py: number, down: boolean) {
      c.fillStyle = "rgba(13,15,17,0.10)";
      c.fillRect(0, 0, ctx.w, ctx.h);
      c.globalCompositeOperation = "lighter";
      for (const p of pts) {
        const dx = p.x - px;
        const dy = p.y - py;
        const d2 = dx * dx + dy * dy + 0.0012;
        const force = (down ? 0.00013 : 0.00005) / d2;
        p.vx += Math.sin(dy * 22 + t) * force;
        p.vy -= Math.cos(dx * 22 + t) * force;
        p.vx += (Math.random() - 0.5) * 0.00012;
        p.vy += (Math.random() - 0.5) * 0.00012;
        p.vx *= 0.982;
        p.vy *= 0.982;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
          p.x = 0.3 + Math.random() * 0.4;
          p.y = 0.3 + Math.random() * 0.4;
        }
        const sx = p.x * ctx.w;
        const sy = p.y * ctx.h;
        const sp = Math.hypot(p.vx, p.vy) * 900;
        const a = Math.min(0.55, 0.05 + sp * 0.5);
        c.beginPath();
        c.moveTo(sx, sy);
        c.lineTo(sx - p.vx * 260, sy - p.vy * 260);
        c.strokeStyle = `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${a})`;
        c.lineWidth = 1.1;
        c.stroke();
      }
      c.globalCompositeOperation = "source-over";
    },
  };
}

function buildFlow(ctx: Ctx) {
  const c = ctx.c;
  const n = 120;
  const pts = Array.from({ length: n }, () => ({
    x: Math.random(),
    y: Math.random(),
  }));
  return {
    step(t: number) {
      c.fillStyle = "rgba(11,12,14,0.055)";
      c.fillRect(0, 0, ctx.w, ctx.h);
      for (const p of pts) {
        const a =
          Math.sin(p.x * 6.2 + t * 0.5) * Math.cos(p.y * 5.4 - t * 0.7) *
          Math.PI * 2;
        const nx = p.x + Math.cos(a) * 0.0032;
        const ny = p.y + Math.sin(a) * 0.0032;
        c.beginPath();
        c.moveTo(p.x * ctx.w, p.y * ctx.h);
        c.lineTo(nx * ctx.w, ny * ctx.h);
        c.strokeStyle = `rgba(${GOLD2[0]},${GOLD2[1]},${GOLD2[2]},0.22)`;
        c.lineWidth = 0.9;
        c.stroke();
        p.x = nx;
        p.y = ny;
        if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
          p.x = Math.random();
          p.y = Math.random();
        }
      }
    },
  };
}

function buildType(ctx: Ctx, word: string) {
  const c = ctx.c;
  const glyphs = word.split("");
  return {
    step(t: number) {
      c.clearRect(0, 0, ctx.w, ctx.h);
      const step_ = Math.floor(t * 3.4) % glyphs.length;
      const size = Math.min(ctx.w / Math.max(glyphs.length, 4) * 1.15, ctx.h * 0.5);
      c.textAlign = "center";
      c.textBaseline = "middle";
      glyphs.forEach((g, i) => {
        const active = i === step_;
        const k = active ? 1 : 0.34;
        const wob =
          Math.sin(t * 2.2 + i * 0.9) * (active ? 7 : 2.4);
        c.font = `${active ? 800 : 600} ${size}px 'Cairo', sans-serif`;
        c.fillStyle = active
          ? `rgba(${GOLD2[0]},${GOLD2[1]},${GOLD2[2]},0.95)`
          : `rgba(243,240,233,${k * 0.5})`;
        c.save();
        c.translate(
          ctx.w / 2 + (i - (glyphs.length - 1) / 2) * size * 0.62,
          ctx.h / 2 + wob,
        );
        c.rotate(active ? Math.sin(t * 1.6) * 0.06 : 0);
        c.fillText(g, 0, 0);
        c.restore();
      });
    },
  };
}

function buildGrid(ctx: Ctx) {
  const c = ctx.c;
  return {
    step(t: number, px: number, py: number) {
      c.clearRect(0, 0, ctx.w, ctx.h);
      const gap = 30;
      for (let y = gap; y < ctx.h; y += gap) {
        for (let x = gap; x < ctx.w; x += gap) {
          const dx = x / ctx.w - px;
          const dy = y / ctx.h - (1 - py);
          const d = Math.hypot(dx, dy);
          const push = Math.max(0, 1 - d * 3.4);
          const ox = -dx * push * 26 + Math.sin(t * 1.1 + x * 0.02) * 2;
          const oy = -dy * push * 26 + Math.cos(t * 1.3 + y * 0.02) * 2;
          const r = 1.1 + push * 2.6;
          c.beginPath();
          c.arc(x + ox, y + oy, r, 0, 6.2832);
          c.fillStyle = `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${0.08 + push * 0.55})`;
          c.fill();
        }
      }
    },
  };
}

function makeScene(ctx: Ctx, scene: Scene, word: string) {
  switch (scene) {
    case "particles":
      return buildParticles(ctx);
    case "shader":
      return buildShader(ctx);
    case "terrain":
      return buildTerrain(ctx);
    case "torus":
      return buildTorus(ctx);
    case "fluid":
      return buildFluid(ctx);
    case "flow":
      return buildFlow(ctx);
    case "type":
      return buildType(ctx, word);
    case "grid":
      return buildGrid(ctx);
  }
}

/* ------------------------------------------------------------------ */
/* One panel                                                           */
/* ------------------------------------------------------------------ */
function Panel({ item }: { item: Item }) {
  const { tr } = useAppearance();
  const cvRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cv = cvRef.current;
    const host = hostRef.current;
    if (!cv || !host) return;
    const c = cv.getContext("2d");
    if (!c) return;

    const ctx: Ctx = { cv, c, w: 1, h: 1, state: {} };
    fit(ctx);
    const scene = makeScene(
      ctx,
      item.scene,
      tr("ONE", "ONE"),
    );

    const pointer = { x: 0.5, y: 0.5, down: false };
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / r.width;
      pointer.y = (e.clientY - r.top) / r.height;
    };
    const onDown = () => (pointer.down = true);
    const onUp = () => (pointer.down = false);
    cv.addEventListener("pointermove", onMove, { passive: true });
    cv.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    let visible = false;
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
      },
      { rootMargin: "120px" },
    );
    io.observe(host);

    const ro = new ResizeObserver(() => fit(ctx));
    ro.observe(cv);

    const reduced = REDUCED();
    const t0 = performance.now();
    let stopped = false;

    // One shared ticker per panel, gated on visibility — parked panels cost nothing.
    const tick = () => {
      if (stopped) return;
      if (visible) {
        const t = reduced ? 6 : (performance.now() - t0) / 1000;
        scene.step(t, pointer.x, pointer.y, pointer.down);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => {
      stopped = true;
      io.disconnect();
      ro.disconnect();
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [item.scene, tr]);

  return (
    <article ref={hostRef} className="show-panel">
      <canvas ref={cvRef} aria-hidden="true" />
      <div className="show-panel-text">
        <span className="show-panel-mark">{item.id}</span>
        <span className="show-panel-tag">{item.tag}</span>
        <h3>{tr(item.ar.title, item.en.title)}</h3>
        <p>{tr(item.ar.body, item.en.body)}</p>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* The rail                                                            */
/* ------------------------------------------------------------------ */
export default function ShowcaseRail() {
  const { tr } = useAppearance();
  const railRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);

  // Horizontal drag + wheel → the rail is explorable, not a static grid.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let down = false;
    let startX = 0;
    let startLeft = 0;
    const onDown = (e: PointerEvent) => {
      down = true;
      startX = e.clientX;
      startLeft = rail.scrollLeft;
      rail.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      rail.scrollLeft = startLeft - (e.clientX - startX) * 1.4;
    };
    const onUp = () => (down = false);
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        rail.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    rail.addEventListener("pointerdown", onDown);
    rail.addEventListener("pointermove", onMove);
    rail.addEventListener("pointerup", onUp);
    rail.addEventListener("pointercancel", onUp);
    rail.addEventListener("wheel", onWheel, { passive: false });
    const ro = new ResizeObserver(() =>
      setNarrow(window.innerWidth < 760),
    );
    ro.observe(document.body);
    setNarrow(window.innerWidth < 760);
    return () => {
      rail.removeEventListener("pointerdown", onDown);
      rail.removeEventListener("pointermove", onMove);
      rail.removeEventListener("pointerup", onUp);
      rail.removeEventListener("pointercancel", onUp);
      rail.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
  }, []);

  return (
    <section className="show-section" id="showcase">
      <div className="show-head">
        <span className="lux-eyebrow">02 / PROOF, NOT PROMISES</span>
        <h2>{tr("جرّبها بنفسك", "Try it yourself")}</h2>
        <p>
          {tr(
            "ثماني تقنيات بصرية تعمل الآن في متصفحك — كل واحدة كُتبت من الصفر بلا مكتبات رسوميات. اسحب أفقياً، ولمس اللوحة يتفاعل معك.",
            "Eight visual techniques running in your browser right now — each written from scratch with no graphics libraries. Drag sideways; the panels answer your pointer.",
          )}
        </p>
      </div>
      <div
        ref={railRef}
        className={`show-rail ${narrow ? "is-narrow" : ""}`}
        role="list"
      >
        {ITEMS.map((item) => (
          <Panel key={item.id} item={item} />
        ))}
      </div>
      <div className="show-hint" aria-hidden="true">
        <span>{tr("اسحب", "DRAG")}</span>
        <i />
        <span>{tr("أو مرّر أفقياً", "OR SCROLL")}</span>
      </div>
    </section>
  );
}
