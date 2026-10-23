import { useEffect } from "react";
import { Languages, Search } from "lucide-react";
import { AppearanceProvider, useAppearance } from "../storefront/i18n";
import BusinessFooter from "../hub/experience/BusinessFooter";
import { findTool, toolPages } from "../../shared/tools/catalog";
import {
  clusterById,
  clusters,
  isClusterId,
  toolPath,
} from "../../shared/tools/clusters";
import { hubJsonLd, hubMeta } from "../../shared/tools/seo";
import type { Cluster } from "../../shared/tools/types";
import ToolPage from "./ToolPage";
import Vault from "./Vault";
import Radar from "./Radar";
import { applyHead } from "./head";
import "./tools.css";

type Route =
  | { kind: "tool"; slug: string }
  | { kind: "hub"; cluster?: Cluster }
  | { kind: "radar" }
  | { kind: "missing" };

export function resolveToolsRoute(pathname: string): Route {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] === "admin" && parts[1] === "radar") return { kind: "radar" };
  if (parts[0] === "solutions") {
    const page = parts[1] ? findTool(parts[1]) : undefined;
    // Static hosting answers /solutions/* with 301s; this covers the SPA path.
    location.replace(page ? toolPath(page.cluster, page.slug) : "/tools");
    return { kind: "missing" };
  }
  if (parts.length === 1) return { kind: "hub" };
  if (parts.length === 2 && isClusterId(parts[1]))
    return { kind: "hub", cluster: clusterById[parts[1]] };
  if (parts.length === 3 && isClusterId(parts[1])) {
    const page = findTool(parts[2]);
    if (page && page.cluster === parts[1])
      return { kind: "tool", slug: page.slug };
  }
  return { kind: "missing" };
}

function Hub({ cluster, lang }: { cluster?: Cluster; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  useEffect(() => {
    const meta = hubMeta(cluster);
    applyHead({
      ...meta,
      title: ar
        ? meta.title
        : cluster
          ? `${cluster.nameEn} — 100 free tools | 1Shot`
          : "1Shot smart tools — 500 free calculators & guides",
      description: ar
        ? meta.description
        : cluster
          ? cluster.blurbEn
          : "500 free in-browser calculators for payments, Google & AI, gaming, brand and AI workforce.",
      jsonLd: hubJsonLd(
        cluster,
        cluster ? toolPages.filter((p) => p.cluster === cluster.id) : toolPages,
      ),
    });
  }, [cluster, ar]);
  return (
    <section className="tools-page">
      <nav
        className="tools-crumbs"
        aria-label={ar ? "مسار التنقل" : "Breadcrumb"}
      >
        <a href="/">{ar ? "الرئيسية" : "Home"}</a>
        <span aria-hidden="true">›</span>
        <a href="/tools">{ar ? "الأدوات" : "Tools"}</a>
        {cluster ? (
          <>
            <span aria-hidden="true">›</span>
            <span>{ar ? cluster.nameAr : cluster.nameEn}</span>
          </>
        ) : null}
      </nav>
      <header className="tools-hero">
        <p className="tools-kicker">
          {cluster
            ? `${cluster.emoji} 100 ${ar ? "أداة" : "tools"}`
            : "🔎 500+"}
        </p>
        <h1>
          {cluster
            ? ar
              ? cluster.nameAr
              : cluster.nameEn
            : ar
              ? "موسوعة وأدوات 1Shot الذكية"
              : "1Shot smart tools & guides"}
        </h1>
        <p>
          {cluster
            ? ar
              ? cluster.blurbAr
              : cluster.blurbEn
            : ar
              ? "500 حاسبة ومحاكٍ ودليل تفاعلي مجاني يعمل داخل متصفحك، مرتبة في خمسة أقسام."
              : "500 free interactive calculators, simulators and guides that run in your browser."}
        </p>
      </header>
      {!cluster ? (
        <ul className="tools-clusters">
          {clusters.map((c) => (
            <li key={c.id}>
              <a href={`/tools/${c.id}`}>
                <span aria-hidden="true">{c.emoji}</span>
                <strong>{ar ? c.nameAr : c.nameEn}</strong>
                <small>{ar ? c.blurbAr : c.blurbEn}</small>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <Vault lang={lang} initialCluster={cluster?.id ?? "all"} />
    </section>
  );
}

function Shell() {
  const { language, setLanguage } = useAppearance();
  const lang = language === "ar" ? "ar" : "en";
  const route = resolveToolsRoute(location.pathname);
  const page = route.kind === "tool" ? findTool(route.slug) : undefined;
  useEffect(() => {
    if (route.kind !== "missing") return;
    document.title =
      lang === "ar" ? "الأداة غير موجودة — 1Shot" : "Tool not found — 1Shot";
    const robots = Object.assign(document.createElement("meta"), {
      name: "robots",
      content: "noindex",
    });
    document.head.appendChild(robots);
    return () => robots.remove();
  }, [route.kind, lang]);
  return (
    <div className="tools-shell">
      <header className="tools-topbar">
        <a className="tools-brand" href="/" aria-label="OneShot">
          <img src="/oneshot.svg" alt="" width="32" height="32" />
          <span dir="ltr">
            one<b>Shot</b>
          </span>
        </a>
        <nav>
          <a href="/tools">
            <Search size={16} aria-hidden="true" />
            {lang === "ar" ? "كل الأدوات" : "All tools"}
          </a>
          <button
            type="button"
            className="tools-ghost"
            onClick={() => setLanguage(lang === "ar" ? "en" : "ar")}
            aria-label={
              lang === "ar" ? "Switch to English" : "التبديل إلى العربية"
            }
          >
            <Languages size={16} aria-hidden="true" />
            {lang === "ar" ? "English" : "العربية"}
          </button>
        </nav>
      </header>
      <main>
        {page ? (
          <ToolPage key={page.slug} page={page} lang={lang} />
        ) : route.kind === "hub" ? (
          <Hub cluster={route.cluster} lang={lang} />
        ) : route.kind === "radar" ? (
          <Radar lang={lang} />
        ) : (
          <section className="tools-page">
            <h1>{lang === "ar" ? "الأداة غير موجودة" : "Tool not found"}</h1>
            <p>
              <a href="/tools">
                {lang === "ar" ? "تصفّح 500 أداة" : "Browse 500 tools"}
              </a>
            </p>
          </section>
        )}
      </main>
      <BusinessFooter />
    </div>
  );
}

export default function ToolsApp() {
  return (
    <AppearanceProvider>
      <Shell />
    </AppearanceProvider>
  );
}
