import { requestQuote } from "../commerce/events";
import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowUpLeft,
  ArrowUpRight,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { clusterById, funnelHref, toolPath } from "../../shared/tools/clusters";
import { relatedPages, toolJsonLd } from "../../shared/tools/seo";
import type { ToolPage as Tool } from "../../shared/tools/types";
import Calculator from "./Calculator";
import { applyHead } from "./head";
import { loadProTools, trackTool } from "./telemetry";

export default function ToolPage({
  page,
  lang,
}: {
  page: Tool;
  lang: "ar" | "en";
}) {
  const cluster = clusterById[page.cluster];
  const ar = lang === "ar";
  const [pro, setPro] = useState(false);
  const path = toolPath(page.cluster, page.slug);
  useEffect(() => {
    trackTool(page.slug, "view");
    void loadProTools().then((set) => setPro(set.has(page.slug)));
  }, [page.slug]);
  useEffect(() => {
    applyHead({
      title: ar
        ? `${page.titleAr} | ${page.titleEn} — 1Shot`
        : `${page.titleEn} — 1Shot`,
      description: ar ? page.descriptionAr : page.descriptionEn,
      path,
      jsonLd: toolJsonLd(page),
    });
  }, [page, ar, path]);
  const funnel = funnelHref(cluster, page.slug);
  const proHref = (() => {
    return "/support?quote=1";
  })();
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  const cta = (
    <a
      className="tools-cta"
      href={funnel}
      onClick={() => trackTool(page.slug, "funnel")}
      rel="noopener"
    >
      {ar ? cluster.ctaAr : cluster.ctaEn}
      <Arrow size={18} aria-hidden="true" />
    </a>
  );

  return (
    <article
      className="tools-page"
      style={{ "--tool-accent": cluster.accent } as CSSProperties}
    >
      <nav
        className="tools-crumbs"
        aria-label={ar ? "مسار التنقل" : "Breadcrumb"}
      >
        <a href="/">{ar ? "الرئيسية" : "Home"}</a>
        <span aria-hidden="true">›</span>
        <a href="/tools">{ar ? "الأدوات" : "Tools"}</a>
        <span aria-hidden="true">›</span>
        <a href={`/tools/${cluster.id}`}>
          {ar ? cluster.nameAr : cluster.nameEn}
        </a>
      </nav>
      <header className="tools-hero">
        <p className="tools-kicker">
          {cluster.emoji} {ar ? cluster.nameAr : cluster.nameEn}
          {pro ? <span className="tools-pro-badge">PRO</span> : null}
        </p>
        <h1>{ar ? page.titleAr : page.titleEn}</h1>
        <p>{ar ? page.introAr : page.introEn}</p>
        <p className="tools-privacy">
          <ShieldCheck size={15} aria-hidden="true" />
          {ar
            ? "تعمل بالكامل داخل متصفحك — لا تُرسل أرقامك لأي خادم."
            : "Runs entirely in your browser — your numbers are never sent."}
        </p>
      </header>

      <Calculator
        page={page}
        lang={lang}
        locked={pro}
        onUse={() => trackTool(page.slug, "use")}
        lockedNotice={
          <div className="tools-lock">
            <Lock size={18} aria-hidden="true" />
            <p>
              {ar
                ? "هذه المخرجات مخصّصة لنسخة Pro. التفعيل بعد الشراء غير متاح بعد؛ تواصل معنا للتحقق من التوفر قبل أي دفع."
                : "These outputs are reserved for Pro. Purchase activation is not available yet; contact us to confirm availability before paying."}
            </p>
            <a
              className="tools-cta"
              href={proHref}
              onClick={(event) => {
                event.preventDefault();
                trackTool(page.slug, "funnel");
                requestQuote({ kind: "pro", toolSlug: page.slug });
              }}
              rel="noopener"
            >
              <Sparkles size={16} aria-hidden="true" />
              {ar ? "استفسر عن توفر Pro" : "Ask about Pro availability"}
            </a>
          </div>
        }
      />

      <aside className="tools-funnel">
        {cta}
        {cluster.secondary ? (
          <a
            className="tools-secondary"
            href={cluster.secondary.href}
            onClick={() => trackTool(page.slug, "funnel")}
          >
            {ar ? cluster.secondary.ar : cluster.secondary.en}
          </a>
        ) : null}
      </aside>

      <section className="tools-reference">
        <h2>{ar ? "جدول المقارنة" : "Comparison table"}</h2>
        <div className="tools-table-wrap">
          <table>
            <thead>
              <tr>
                {(ar ? page.table.headAr : page.table.headEn).map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.table.rows.map((row) => (
                <tr key={row.join("|")}>
                  {row.map((cell, i) => (
                    <td key={i} dir="auto">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tools-reference">
        <h2>{ar ? "الدليل المرجعي" : "Reference guide"}</h2>
        {(ar ? page.guideAr : page.guideEn).map((g) => (
          <p key={g}>{g}</p>
        ))}
        {ar ? (
          <details className="tools-english">
            <summary lang="en">English summary</summary>
            <div lang="en" dir="ltr">
              <p>{page.introEn}</p>
              {page.guideEn.map((g) => (
                <p key={g}>{g}</p>
              ))}
            </div>
          </details>
        ) : null}
      </section>

      <section className="tools-reference">
        <h2>{ar ? "الأسئلة الشائعة" : "FAQ"}</h2>
        <div className="tools-faq">
          {page.faq.map((f) => (
            <details key={f.qEn}>
              <summary>{ar ? f.qAr : f.qEn}</summary>
              <p>{ar ? f.aAr : f.aEn}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="tools-reference">
        <h2>{ar ? "أدوات ذات صلة" : "Related tools"}</h2>
        <ul className="tools-related">
          {relatedPages(page).map((r) => (
            <li key={r.slug}>
              <a href={toolPath(r.cluster, r.slug)}>
                {ar ? r.titleAr : r.titleEn}
              </a>
            </li>
          ))}
        </ul>
      </section>
      <aside className="tools-funnel tools-funnel-end">{cta}</aside>
    </article>
  );
}
