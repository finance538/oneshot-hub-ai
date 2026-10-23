// Build-time pre-rendering for the 500 tool pages. After Vite writes
// dist/index.html, each page gets its own static HTML with unique metadata,
// canonical URL, JSON-LD and crawlable content (including the calculator's
// default results). The React app then mounts over it in the browser.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";
import { toolPages } from "../shared/tools/catalog.ts";
import {
  clusterById,
  clusters,
  SITE,
  toolPath,
} from "../shared/tools/clusters.ts";
import { runEngine } from "../shared/tools/engines.ts";
import {
  hubJsonLd,
  hubMeta,
  relatedPages,
  toolJsonLd,
} from "../shared/tools/seo.ts";
import type { Cluster, Kpi, ToolPage } from "../shared/tools/types.ts";

const esc = (value: unknown) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
// JSON inside <script> must not be able to close the tag.
const ld = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

const formatKpi = (k: Kpi) => {
  const v =
    typeof k.value === "number" ? k.value.toLocaleString("en-US") : k.value;
  const unit: Record<string, string> = {
    sar: " SAR",
    usd: " USD",
    pct: "%",
    x: "x",
    ms: " ms",
    gb: " GB",
    w: " W",
    fps: " FPS",
    tps: " tok/s",
    kbps: " Kbps",
    hours: " h",
    m: " m",
    sec: " s",
  };
  return `${v}${unit[k.format] ?? ""}`;
};

interface Meta {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  jsonLd: unknown[];
  body: string;
}

function applyMeta(template: string, meta: Meta) {
  const url = SITE + meta.path;
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/\s*<link rel="canonical"[^>]*>/g, "")
    .replace(
      /\s*<meta\s+property="og:(?:url|title|description)"[\s\S]*?\/>/g,
      "",
    )
    .replace(/\s*<meta\s+name="(?:description|keywords)"[\s\S]*?\/>/g, "");
  const head = [
    `<meta name="description" content="${esc(meta.description)}" />`,
    meta.keywords?.length
      ? `<meta name="keywords" content="${esc(meta.keywords.join(", "))}" />`
      : "",
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    ...meta.jsonLd.map(ld),
  ]
    .filter(Boolean)
    .join("\n    ");
  html = html.replace("</head>", `    ${head}\n  </head>`);
  return html.replace(
    '<div id="root"></div>',
    `<div id="root">${meta.body}</div>`,
  );
}

const shell = (inner: string) =>
  `<div class="tool-static" dir="rtl" lang="ar"><header class="tool-static-head"><a href="/">OneShot · 1shotcam.com</a> · <a href="/tools">موسوعة وأدوات 1Shot الذكية</a></header>${inner}<footer class="tool-static-foot"><p>مؤسسة يحيى أحمد يحيى الهوساوي للتصوير الفوتوغرافي — المملكة العربية السعودية · finance@1shotcam.com · support@1shotcam.com</p></footer></div>`;

export function renderToolHtml(template: string, page: ToolPage) {
  const cluster = clusterById[page.cluster];
  const path = toolPath(page.cluster, page.slug);
  const result = runEngine(page, {}, "ar");
  const related = relatedPages(page);
  const body = shell(
    `<nav aria-label="مسار التنقل"><a href="/">الرئيسية</a> › <a href="/tools">الأدوات</a> › <a href="/tools/${cluster.id}">${esc(cluster.nameAr)}</a></nav>` +
      `<article><h1>${esc(page.titleAr)}</h1><p>${esc(page.introAr)}</p>` +
      `<section><h2>النتيجة بالقيم الافتراضية</h2><ul>${result.kpis.map((k) => `<li>${esc(k.ar)}: <strong>${esc(formatKpi(k))}</strong></li>`).join("")}</ul>${result.verdictAr ? `<p>${esc(result.verdictAr)}</p>` : ""}<noscript><p>فعّل JavaScript لتشغيل الحاسبة التفاعلية؛ تعمل بالكامل داخل متصفحك.</p></noscript></section>` +
      `<p><a href="${esc(cluster.origin)}">${esc(cluster.ctaAr)}</a></p>` +
      `<section><h2>جدول المقارنة</h2><table><thead><tr>${page.table.headAr.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${page.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></section>` +
      `<section><h2>الدليل المرجعي</h2>${page.guideAr.map((g) => `<p>${esc(g)}</p>`).join("")}</section>` +
      `<section><h2>الأسئلة الشائعة</h2>${page.faq.map((f) => `<details><summary>${esc(f.qAr)}</summary><p>${esc(f.aAr)}</p></details>`).join("")}</section>` +
      `<section lang="en" dir="ltr"><h2>${esc(page.titleEn)}</h2><p>${esc(page.introEn)}</p>${page.guideEn.map((g) => `<p>${esc(g)}</p>`).join("")}</section>` +
      `<section><h2>أدوات ذات صلة</h2><ul>${related.map((r) => `<li><a href="${toolPath(r.cluster, r.slug)}">${esc(r.titleAr)}</a></li>`).join("")}</ul></section></article>`,
  );
  return applyMeta(template, {
    title: `${page.titleAr} | ${page.titleEn} — 1Shot`,
    description: page.descriptionAr,
    path,
    keywords: page.keywords,
    body,
    jsonLd: toolJsonLd(page),
  });
}

export function renderHubHtml(template: string, cluster?: Cluster) {
  const list = cluster
    ? toolPages.filter((p) => p.cluster === cluster.id)
    : toolPages;
  const { title, description, path } = hubMeta(cluster);
  const groups = (cluster ? [cluster] : clusters)
    .map(
      (c) =>
        `<section><h2><a href="/tools/${c.id}">${esc(c.emoji)} ${esc(c.nameAr)}</a></h2><p>${esc(c.blurbAr)}</p><ul>${list
          .filter((p) => p.cluster === c.id)
          .map(
            (p) =>
              `<li><a href="${toolPath(p.cluster, p.slug)}">${esc(p.titleAr)}</a></li>`,
          )
          .join("")}</ul></section>`,
    )
    .join("");
  return applyMeta(template, {
    title,
    description,
    path,
    body: shell(`<h1>${esc(title)}</h1><p>${esc(description)}</p>${groups}`),
    jsonLd: hubJsonLd(cluster, list),
  });
}

export function buildSitemap(
  baseXml: string,
  lastmod = new Date().toISOString().slice(0, 10),
) {
  const existing = (baseXml.match(/<url>[\s\S]*?<\/url>/g) ?? []).filter(
    (u) => !/<loc>[^<]*\/tools(?:[/<])/.test(u),
  );
  const entry = (path: string, priority: string, freq = "monthly") =>
    `<url><loc>${SITE}${path}</loc><lastmod>${lastmod}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`;
  const tools = [
    entry("/tools", "0.9", "weekly"),
    ...clusters.map((c) => entry(`/tools/${c.id}`, "0.8", "weekly")),
    ...toolPages.map((p) => entry(toolPath(p.cluster, p.slug), "0.7")),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${[...existing, ...tools].join("\n  ")}\n</urlset>\n`;
}

export function solutionRedirects() {
  return [
    "/solutions /tools 301",
    ...toolPages.map(
      (p) => `/solutions/${p.slug} ${toolPath(p.cluster, p.slug)} 301`,
    ),
  ].join("\n");
}

function write(file: string, content: string) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

export function toolsPrerender(): Plugin {
  let outDir = "dist";
  let root = process.cwd();
  return {
    name: "oneshot-tools-prerender",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = join(config.root, config.build.outDir);
    },
    closeBundle() {
      const indexFile = join(outDir, "index.html");
      if (!existsSync(indexFile)) return;
      const template = readFileSync(indexFile, "utf8");
      write(join(outDir, "tools.html"), renderHubHtml(template));
      for (const c of clusters)
        write(
          join(outDir, "tools", `${c.id}.html`),
          renderHubHtml(template, c),
        );
      for (const p of toolPages)
        write(
          join(outDir, "tools", p.cluster, `${p.slug}.html`),
          renderToolHtml(template, p),
        );
      const baseSitemap = join(root, "public", "sitemap.xml");
      write(
        join(outDir, "sitemap.xml"),
        buildSitemap(
          existsSync(baseSitemap) ? readFileSync(baseSitemap, "utf8") : "",
        ),
      );
      // Solution aliases must precede the SPA fallback in _redirects.
      const redirectsFile = join(outDir, "_redirects");
      const current = existsSync(redirectsFile)
        ? readFileSync(redirectsFile, "utf8")
        : "";
      if (!current.includes("/solutions "))
        write(redirectsFile, `${solutionRedirects()}\n${current}`);
    },
  };
}
