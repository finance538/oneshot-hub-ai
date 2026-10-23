// Structured data shared by the build-time pre-renderer and the browser.
import { findTool } from "./catalog.ts";
import { clusterById, SITE, toolPath } from "./clusters.ts";
import type { Cluster, ToolPage } from "./types.ts";

export const breadcrumbs = (items: [string, string][]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({
    "@type": "ListItem",
    position: i + 1,
    name,
    item: SITE + path,
  })),
});

export function toolJsonLd(page: ToolPage) {
  const cluster = clusterById[page.cluster];
  const path = toolPath(page.cluster, page.slug);
  const url = SITE + path;
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: page.titleAr,
      alternateName: page.titleEn,
      description: page.descriptionAr,
      url,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web browser",
      inLanguage: ["ar", "en"],
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "SAR" },
      publisher: {
        "@type": "Organization",
        name: "OneShot Photography",
        url: SITE,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: page.titleEn,
      description: page.descriptionEn,
      url,
      brand: { "@type": "Brand", name: "OneShot" },
      category: cluster.nameEn,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "SAR",
        availability: "https://schema.org/InStock",
        url,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((f) => ({
        "@type": "Question",
        name: f.qAr,
        acceptedAnswer: { "@type": "Answer", text: f.aAr },
      })),
    },
    breadcrumbs([
      ["الرئيسية", "/"],
      ["الأدوات", "/tools"],
      [cluster.nameAr, `/tools/${cluster.id}`],
      [page.titleAr, path],
    ]),
  ];
}

export function hubMeta(cluster?: Cluster) {
  const title = cluster
    ? `${cluster.nameAr} — 100 أداة وحاسبة مجانية | 1Shot`
    : "موسوعة وأدوات 1Shot الذكية — 500 أداة ودليل مجاني";
  const description = cluster
    ? cluster.blurbAr
    : "500 حاسبة وأداة تفاعلية مجانية تعمل في متصفحك: بوابات الدفع والضريبة، أتمتة جوجل ويوتيوب، الألعاب والذكاء المحلي، التصوير والإعلانات، وموظفو الذكاء الاصطناعي.";
  const path = cluster ? `/tools/${cluster.id}` : "/tools";
  return { title, description, path };
}

export function hubJsonLd(cluster: Cluster | undefined, pages: ToolPage[]) {
  const { title, description, path } = hubMeta(cluster);
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description,
      url: SITE + path,
      hasPart: pages.slice(0, 100).map((p) => ({
        "@type": "WebPage",
        name: p.titleAr,
        url: SITE + toolPath(p.cluster, p.slug),
      })),
    },
    breadcrumbs(
      cluster
        ? [
            ["الرئيسية", "/"],
            ["الأدوات", "/tools"],
            [cluster.nameAr, path],
          ]
        : [
            ["الرئيسية", "/"],
            ["الأدوات", "/tools"],
          ],
    ),
  ];
}

export const relatedPages = (page: ToolPage) =>
  page.related.map((s) => findTool(s)).filter((p): p is ToolPage => !!p);
