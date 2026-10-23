// Run with: npm test (Node's built-in runner with type stripping).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { toolPages, findTool } from "../shared/tools/catalog.ts";
import { clusters, toolPath } from "../shared/tools/clusters.ts";
import {
  depthOfField,
  engines,
  profitBreakdown,
  psuEstimate,
  roasPlan,
  runEngine,
  vatSplit,
  workforceRoi,
  contrast,
} from "../shared/tools/engines.ts";
import { buildSitemap, renderToolHtml } from "../scripts/tools-prerender.ts";
import { isWinner } from "../shared/tools/radar.ts";

test("exactly 500 pages, 100 per cluster", () => {
  assert.equal(toolPages.length, 500);
  for (const c of clusters)
    assert.equal(toolPages.filter((p) => p.cluster === c.id).length, 100, c.id);
});

test("slugs are unique and URL-safe", () => {
  const slugs = new Set(toolPages.map((p) => p.slug));
  assert.equal(slugs.size, 500);
  for (const s of slugs) assert.match(s, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(findTool(toolPages[0].slug));
});

test("titles and descriptions are unique in both languages", () => {
  for (const key of [
    "titleAr",
    "titleEn",
    "descriptionAr",
    "descriptionEn",
  ] as const)
    assert.equal(new Set(toolPages.map((p) => p[key])).size, 500, key);
});

test("every page has FAQ, guide, table, related links and a defined engine", () => {
  for (const p of toolPages) {
    assert.ok(p.faq.length >= 3, p.slug);
    assert.ok(p.guideAr.length >= 2 && p.guideEn.length >= 2, p.slug);
    assert.ok(p.table.rows.length >= 2, p.slug);
    assert.ok(p.related.length >= 3, p.slug);
    for (const r of p.related) assert.ok(findTool(r), `${p.slug} → ${r}`);
    assert.ok(engines[p.engine], p.engine);
  }
});

test("every engine computes finite, non-empty results for every page in both languages", () => {
  for (const p of toolPages)
    for (const lang of ["ar", "en"] as const) {
      const fields = engines[p.engine].fields(p);
      assert.ok(fields.length > 0, p.slug);
      for (const f of fields)
        if (f.kind === "select")
          assert.ok(
            p.defaults[f.key] === undefined ||
              f.options.some((o) => o.value === String(p.defaults[f.key])),
            `${p.slug}: default ${f.key}=${p.defaults[f.key]}`,
          );
      const r = runEngine(p, {}, lang);
      assert.ok(r.kpis.length > 0, p.slug);
      for (const k of r.kpis)
        if (typeof k.value === "number")
          assert.ok(Number.isFinite(k.value), `${p.slug}: ${k.en}=${k.value}`);
      for (const b of r.bars ?? [])
        assert.ok(Number.isFinite(b.value), `${p.slug}: bar ${b.en}`);
    }
});

test("core math matches hand calculations", () => {
  const v = vatSplit(115, true);
  assert.equal(Math.round(v.net * 100) / 100, 100);
  assert.equal(Math.round(v.vat * 100) / 100, 15);
  const p = profitBreakdown({
    cost: 50,
    price: 115,
    shipping: 0,
    pct: 0,
    ad: 0,
    returns: 0,
  });
  assert.equal(Math.round(p.profit), 50);
  const r = roasPlan({
    daily: 100,
    days: 10,
    cpc: 2,
    cvr: 2,
    aov: 200,
    margin: 50,
  });
  assert.equal(r.clicks, 500);
  assert.equal(r.orders, 10);
  assert.equal(r.roas, 2);
  assert.equal(r.breakEven, 2);
  assert.equal(psuEstimate(100, 300, 0, 0, 0, 30).size, 650);
  const d = depthOfField(50, 8, 3, "ff");
  assert.ok(d.near < 3 && d.far > 3);
  assert.equal(Math.round(contrast("#000000", "#ffffff")), 21);
  const w = workforceRoi({
    salary: 10000,
    overhead: 0,
    hiring: 0,
    headcount: 1,
    shifts: 1,
    share: 50,
    ai: 1000,
    setup: 0,
  });
  assert.equal(w.monthly, 4000);
});

test("winner flag needs real traffic and funnel performance", () => {
  assert.equal(isWinner({ views: 5, uses: 5, funnels: 5 }), false);
  assert.equal(isWinner({ views: 200, uses: 120, funnels: 12 }), true);
  assert.equal(isWinner({ views: 200, uses: 10, funnels: 0 }), false);
});

test("sitemap lists all 500 canonical tool URLs plus hubs", () => {
  const xml = buildSitemap("");
  for (const p of toolPages)
    assert.ok(
      xml.includes(
        `https://www.1shotcam.com${toolPath(p.cluster, p.slug)}</loc>`,
      ),
      p.slug,
    );
  for (const c of clusters) assert.ok(xml.includes(`/tools/${c.id}</loc>`));
  assert.ok(xml.includes("https://www.1shotcam.com/tools</loc>"));
});

test("pre-rendered HTML carries title, canonical, JSON-LD and Arabic RTL", () => {
  const template =
    '<!doctype html><html lang="ar" dir="rtl"><head><title>x</title><link rel="canonical" href="https://www.1shotcam.com/" /><meta name="description" content="d" /></head><body><div id="root"></div></body></html>';
  const p = toolPages[123];
  const html = renderToolHtml(template, p);
  assert.ok(
    html.includes(
      `<link rel="canonical" href="https://www.1shotcam.com${toolPath(p.cluster, p.slug)}"`,
    ),
  );
  assert.ok(!html.includes('href="https://www.1shotcam.com/" />'));
  for (const type of [
    "SoftwareApplication",
    "FAQPage",
    "BreadcrumbList",
    "Product",
  ])
    assert.ok(html.includes(`"@type":"${type}"`), type);
  assert.ok(html.includes('lang="ar" dir="rtl"'));
  assert.ok(html.includes(p.titleAr));
});

test("legal footer data and policies remain intact", () => {
  const footer = readFileSync(
    new URL("../src/hub/experience/BusinessFooter.tsx", import.meta.url),
    "utf8",
  );
  for (const needle of [
    "مؤسسة يحيى أحمد يحيى الهوساوي للتصوير الفوتوغرافي",
    "finance@1shotcam.com",
    "support@1shotcam.com",
    "المملكة العربية السعودية",
    "Object.entries(documents)",
  ])
    assert.ok(
      (
        footer +
        readFileSync(
          new URL("../src/commerce/OfficialContact.tsx", import.meta.url),
          "utf8",
        )
      ).includes(needle),
      needle,
    );
});

test("language persistence script runs before the app bundle", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const script = html.indexOf("oneshot-lang");
  assert.ok(script > 0 && script < html.indexOf("/src/main.tsx"));
});
