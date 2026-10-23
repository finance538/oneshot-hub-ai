import type { ToolPage } from "../../shared/tools/types";
import { clusterById } from "../../shared/tools/clusters";

// Arabic-aware normalisation: strip diacritics/tatweel, unify alef, ya, ta marbuta.
export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

interface Indexed {
  page: ToolPage;
  title: string;
  haystack: string;
}
const cache = new WeakMap<ToolPage[], Indexed[]>();
function index(pages: ToolPage[]) {
  let built = cache.get(pages);
  if (!built) {
    built = pages.map((page) => ({
      page,
      title: normalize(`${page.titleAr} ${page.titleEn}`),
      haystack: normalize(
        [
          page.titleAr,
          page.titleEn,
          page.descriptionAr,
          page.keywords.join(" "),
          clusterById[page.cluster].nameAr,
          clusterById[page.cluster].nameEn,
          page.slug.replace(/-/g, " "),
        ].join(" "),
      ),
    }));
    cache.set(pages, built);
  }
  return built;
}

/** Every query word must match; title hits rank above body hits. */
export function searchTools(pages: ToolPage[], query: string) {
  const words = normalize(query).split(" ").filter(Boolean);
  if (!words.length) return pages;
  return index(pages)
    .map((item) => {
      if (!words.every((w) => item.haystack.includes(w))) return null;
      const score = words.reduce(
        (s, w) => s + (item.title.includes(w) ? 3 : 1),
        0,
      );
      return { page: item.page, score };
    })
    .filter((x): x is { page: ToolPage; score: number } => !!x)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.page);
}
