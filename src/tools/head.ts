import { SITE } from "../../shared/tools/clusters";

function meta(selector: string, create: () => HTMLElement) {
  let node = document.head.querySelector<HTMLElement>(selector);
  if (!node) {
    node = create();
    document.head.appendChild(node);
  }
  return node;
}

/**
 * Keeps the document head aligned with the visible tool. Static pre-rendered
 * HTML already carries this; the browser copy covers language switches and
 * routes served by the SPA fallback (e.g. local development).
 */
export function applyHead(input: {
  title: string;
  description: string;
  path: string;
  jsonLd: unknown[];
}) {
  document.title = input.title;
  meta('meta[name="description"]', () =>
    Object.assign(document.createElement("meta"), { name: "description" }),
  ).setAttribute("content", input.description);
  const canonical = SITE + input.path;
  const links = document.head.querySelectorAll<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  links.forEach((l, i) => (i ? l.remove() : (l.href = canonical)));
  if (!links.length)
    meta('link[rel="canonical"]', () =>
      Object.assign(document.createElement("link"), { rel: "canonical" }),
    ).setAttribute("href", canonical);
  document.head
    .querySelectorAll('meta[property="og:url"]')
    .forEach((m) => m.setAttribute("content", canonical));
  const hasStatic = Array.from(
    document.head.querySelectorAll('script[type="application/ld+json"]'),
  ).some(
    (s) => !s.hasAttribute("data-tools") && s.textContent?.includes(canonical),
  );
  document.head
    .querySelectorAll("script[data-tools]")
    .forEach((s) => s.remove());
  if (!hasStatic)
    for (const data of input.jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.tools = "1";
      script.textContent = JSON.stringify(data);
      document.head.appendChild(script);
    }
}
