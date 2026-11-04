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
import { slotById, styleById } from "../shared/gaming/attachments.ts";
import { recommend } from "../shared/gaming/engine.ts";
import {
  arsenalPath,
  classById,
  liveGames,
  weaponsByClass,
} from "../shared/gaming/games.ts";
import type { Game, Weapon } from "../shared/gaming/types.ts";

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

// ── Gaming arsenal ──────────────────────────────────────────────────────
// The arsenal is a stepped tool rather than a catalog page, so each step gets
// its own static page: the game list, each game's roster and each weapon with
// its balanced class, perks and sources already in the HTML.
const DEFAULT_STYLE = "balanced" as const;

export function renderArsenalHub(template: string) {
  const list = liveGames();
  const body = shell(
    `<nav aria-label="مسار التنقل"><a href="/">الرئيسية</a> › <a href="/tools">الأدوات</a> › <a href="/tools/gaming">الألعاب</a> › ترسانة كود</nav>` +
      `<article><h1>ترسانة كول أوف ديوتي: الأسلحة والإضافات والكلاسات</h1>` +
      `<p>اختر اللعبة ثم السلاح ثم نمط لعبك — سريع، ثبات وايم، مدى طويل، أو تخفّي — وتطلع لك أفضل الإضافات لكل خانة وإيش تسوي كل واحدة وإيش تخسر مقابلها، مع البركات المناسبة.</p>` +
      list
        .map(
          (game) =>
            `<section><h2><a href="${arsenalPath(game.id)}">${esc(game.ar)} — ${esc(game.name)}</a></h2><p>${esc(game.blurbAr)}</p><p>عدد الأسلحة: ${game.weapons.length} · البيانات: ${esc(game.patch)} · آخر مراجعة: ${esc(game.checkedOn)}</p></section>`,
        )
        .join("") +
      `<p>الأرقام في الأداة اتجاهية للمقارنة بين الخيارات، وليست نِسَباً من اللعبة؛ المرجع النهائي هو الجنسميث داخل اللعبة لأن التوازن يتغيّر كل موسم.</p></article>`,
  );
  return applyMeta(template, {
    title: "ترسانة كول أوف ديوتي: الأسلحة وأفضل الإضافات | COD arsenal — 1Shot",
    description:
      "اختر لعبة كود ثم السلاح ثم نمط اللعب، واحصل على أفضل الإضافات لكل خانة مع شرح أثر كل إضافة ومقابلها والبركات المناسبة.",
    path: arsenalPath(),
    keywords: ["افضل اضافات كود", "كلاسات كود", "اسلحة كول اوف ديوتي"],
    body,
    jsonLd: [],
  });
}

export function renderArsenalGame(template: string, game: Game) {
  const groups = weaponsByClass(game);
  const body = shell(
    `<nav aria-label="مسار التنقل"><a href="/">الرئيسية</a> › <a href="/tools">الأدوات</a> › <a href="${arsenalPath()}">ترسانة كود</a> › ${esc(game.ar)}</nav>` +
      `<article><h1>أسلحة ${esc(game.ar)} كاملة وأفضل إضافاتها</h1><p>${esc(game.blurbAr)}</p>` +
      `<p>البيانات: ${esc(game.patch)} · آخر مراجعة: ${esc(game.checkedOn)}</p>` +
      groups
        .map(
          (group) =>
            `<section><h2>${esc(group.class.ar)}</h2><ul>${group.weapons
              .map(
                (weapon) =>
                  `<li><a href="${arsenalPath(game.id, weapon.id)}">${esc(weapon.name)}</a> — ${esc(weapon.roleAr)}</li>`,
              )
              .join("")}</ul></section>`,
        )
        .join("") +
      `</article>`,
  );
  return applyMeta(template, {
    title: `أسلحة ${game.ar} كاملة وأفضل الإضافات | ${game.short} weapons — 1Shot`,
    description: `كل أسلحة ${game.ar} مقسّمة بفئاتها، ولكل سلاح أفضل الإضافات حسب نمط لعبك مع شرح أثر كل إضافة والبركات المناسبة.`,
    path: arsenalPath(game.id),
    body,
    jsonLd: [],
  });
}

export function renderArsenalWeapon(
  template: string,
  game: Game,
  weapon: Weapon,
) {
  const result = recommend(game, weapon, DEFAULT_STYLE);
  const facts = [
    `الفئة: ${classById[weapon.class].ar}`,
    weapon.rpm ? `معدل الرمي: ${weapon.rpm} طلقة/دقيقة` : "",
    weapon.rounds ? `المخزن: ${weapon.rounds} طلقة` : "",
    weapon.unlock ? `يُفتح بمستوى اللاعب ${weapon.unlock}` : "",
    weapon.maxLevel ? `أعلى مستوى للسلاح: ${weapon.maxLevel}` : "",
  ].filter(Boolean);
  const body = shell(
    `<nav aria-label="مسار التنقل"><a href="/">الرئيسية</a> › <a href="/tools">الأدوات</a> › <a href="${arsenalPath()}">ترسانة كود</a> › <a href="${arsenalPath(game.id)}">${esc(game.ar)}</a> › ${esc(weapon.name)}</nav>` +
      `<article><h1>أفضل إضافات وكلاس ${esc(weapon.name)} في ${esc(game.ar)}</h1>` +
      `<p>${esc(weapon.roleAr)}</p><ul>${facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` +
      (result.picks.length
        ? `<section><h2>الكلاس المتوازن المقترح</h2><table><thead><tr><th>الخانة</th><th>الإضافة</th><th>إيش تسوي</th><th>المقابل</th></tr></thead><tbody>${result.picks
            .map(
              (pick) =>
                `<tr><td>${esc(slotById[pick.slot].ar)}</td><td>${esc(pick.attachment?.name ?? pick.type.ar)}</td><td>${esc(pick.type.doesAr)}</td><td>${esc(pick.type.costAr)}</td></tr>`,
            )
            .join(
              "",
            )}</tbody></table><p>اختر نمط لعب آخر داخل الأداة (سريع، ثبات وايم، مدى طويل، تخفّي) ليتغيّر الكلاس بالكامل.</p></section>`
        : `<p>هذا السلاح لا يقبل إضافات في اللعبة.</p>`) +
      `<section><h2>البركات المناسبة</h2><ul>${result.perks
        .map(
          (perk) =>
            `<li>بركة ${perk.slot} · ${esc(perk.en)}: ${esc(perk.doesAr)}</li>`,
        )
        .join("")}</ul></section>` +
      (weapon.apex
        ? `<section><h2>إضافة Apex</h2><p>${esc(weapon.apex.name)} — ${esc(weapon.apex.doesAr)}</p></section>`
        : "") +
      weapon.builds
        .map((build) => {
          const ref = game.sources.find((s) => s.id === build.sourceId);
          return `<section><h2>${esc(build.labelAr)} (${esc(styleById[build.style].ar)})</h2><ul>${build.picks
            .map(
              (pick) =>
                `<li>${esc(slotById[pick.slot].ar)}: ${esc(pick.name)}</li>`,
            )
            .join(
              "",
            )}</ul>${ref ? `<p>المصدر: <a href="${esc(ref.url)}" rel="noopener noreferrer">${esc(ref.label)}</a> — ${esc(ref.readOn)}</p>` : ""}</section>`;
        })
        .join("") +
      `<p>البيانات: ${esc(game.patch)} · آخر مراجعة: ${esc(game.checkedOn)}. الأرقام اتجاهية للمقارنة فقط، والنِسَب الحقيقية تظهر في الجنسميث داخل اللعبة وتتغيّر مع تحديثات التوازن.</p></article>`,
  );
  return applyMeta(template, {
    title: `أفضل إضافات ${weapon.name} وكلاسه في ${game.ar} | Best ${weapon.name} loadout — 1Shot`,
    description: `أفضل إضافات ${weapon.name} في ${game.ar} حسب نمط لعبك، مع شرح إيش تسوي كل إضافة وإيش تخسر مقابلها، والبركات وإضافة Apex والكلاسات المنشورة.`,
    path: arsenalPath(game.id, weapon.id),
    keywords: [
      `افضل اضافات ${weapon.name}`,
      `كلاس ${weapon.name}`,
      `best ${weapon.name} loadout`,
    ],
    body,
    jsonLd: [],
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
    // Arsenal pages change with every balance patch, hence weekly.
    entry(arsenalPath(), "0.8", "weekly"),
    ...liveGames().flatMap((game) => [
      entry(arsenalPath(game.id), "0.8", "weekly"),
      ...game.weapons.map((weapon) =>
        entry(arsenalPath(game.id, weapon.id), "0.7", "weekly"),
      ),
    ]),
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
      write(join(outDir, "tools", "arsenal.html"), renderArsenalHub(template));
      for (const game of liveGames()) {
        write(
          join(outDir, "tools", "arsenal", `${game.id}.html`),
          renderArsenalGame(template, game),
        );
        for (const weapon of game.weapons)
          write(
            join(outDir, "tools", "arsenal", game.id, `${weapon.id}.html`),
            renderArsenalWeapon(template, game, weapon),
          );
      }
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
