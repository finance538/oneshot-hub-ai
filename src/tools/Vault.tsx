import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ArrowUpLeft, ArrowUpRight, Search } from "lucide-react";
import { toolPages } from "../../shared/tools/catalog";
import { clusters, toolPath } from "../../shared/tools/clusters";
import type { ClusterId } from "../../shared/tools/types";
import { searchTools } from "./search";

const PAGE = 60;

/** Categorised spotlight over all 500 tools. Used as modal content and page. */
export default function Vault({
  lang,
  initialCluster = "all",
  autoFocus = false,
}: {
  lang: "ar" | "en";
  initialCluster?: ClusterId | "all";
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ClusterId | "all">(initialCluster);
  const [shown, setShown] = useState(PAGE);
  const input = useRef<HTMLInputElement>(null);
  const deferred = useDeferredValue(query);
  const ar = lang === "ar";
  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);
  useEffect(() => setShown(PAGE), [deferred, tab]);
  const matches = useMemo(() => searchTools(toolPages, deferred), [deferred]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: matches.length };
    for (const p of matches) c[p.cluster] = (c[p.cluster] ?? 0) + 1;
    return c;
  }, [matches]);
  const list =
    tab === "all" ? matches : matches.filter((p) => p.cluster === tab);
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;

  return (
    <div className="tools-vault">
      <label className="tools-search">
        <Search size={18} aria-hidden="true" />
        <span className="tools-sr">
          {ar ? "ابحث في 500 أداة" : "Search 500 tools"}
        </span>
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            ar
              ? "ابحث: رسوم مدى، Llama، ضريبة، FPS، يوتيوب…"
              : "Search: Mada fees, Llama, VAT, FPS, YouTube…"
          }
          enterKeyHint="search"
        />
        <kbd dir="ltr">Ctrl K</kbd>
      </label>
      <div
        className="tools-tabs"
        role="tablist"
        aria-label={ar ? "الأقسام" : "Categories"}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "all"}
          onClick={() => setTab("all")}
        >
          {ar ? "الكل" : "All"} <span>{counts.all ?? 0}</span>
        </button>
        {clusters.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={tab === c.id}
            onClick={() => setTab(c.id)}
          >
            {c.emoji} {ar ? c.nameAr : c.nameEn}{" "}
            <span>{counts[c.id] ?? 0}</span>
          </button>
        ))}
      </div>
      {list.length ? (
        <>
          <ul className="tools-vault-list" role="tabpanel">
            {list.slice(0, shown).map((p) => {
              const c = clusters.find((x) => x.id === p.cluster)!;
              return (
                <li key={p.slug}>
                  <a
                    href={toolPath(p.cluster, p.slug)}
                    style={{ "--tool-accent": c.accent } as CSSProperties}
                  >
                    <span className="tools-vault-emoji" aria-hidden="true">
                      {c.emoji}
                    </span>
                    <span>
                      <strong>{ar ? p.titleAr : p.titleEn}</strong>
                      <small>{ar ? p.descriptionAr : p.descriptionEn}</small>
                    </span>
                    <Arrow size={16} aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
          {list.length > shown ? (
            <button
              type="button"
              className="tools-secondary tools-more"
              onClick={() => setShown((n) => n + PAGE)}
            >
              {ar
                ? `عرض المزيد (${list.length - shown} متبقية)`
                : `Show more (${list.length - shown} left)`}
            </button>
          ) : null}
        </>
      ) : (
        <p className="tools-empty" role="status">
          {ar
            ? "لا توجد أداة مطابقة. جرّب كلمة أقصر أو اسم منصة."
            : "No matching tool. Try a shorter word or a platform name."}
        </p>
      )}
    </div>
  );
}
