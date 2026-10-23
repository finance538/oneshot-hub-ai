import { useEffect, useMemo, useState } from "react";
import { Flame, LogIn, RefreshCw } from "lucide-react";
import { useAuth } from "../components/auth";
import { api, RequestError } from "../lib/api";
import { toolBySlug, toolPages } from "../../shared/tools/catalog";
import { clusters, toolPath } from "../../shared/tools/clusters";
import { isWinner, rates, WINNER_MIN_VIEWS } from "../../shared/tools/radar";
import type { ClusterId } from "../../shared/tools/types";

interface Row {
  slug: string;
  cluster: ClusterId;
  views: number;
  uses: number;
  funnels: number;
  views7: number;
  winner: boolean;
  pro: boolean;
}

type Sort = "views" | "views7" | "uses" | "funnels" | "funnelRate";
const PAGE = 50;

function RadarBoard({ lang }: { lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [cluster, setCluster] = useState<ClusterId | "all">("all");
  const [sort, setSort] = useState<Sort>("views");
  const [winnersOnly, setWinnersOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [pending, setPending] = useState<string | null>(null);

  async function load() {
    setError("");
    try {
      const data = await api<{ rows: Omit<Row, "pro">[]; pro: string[] }>(
        "/api/tools/radar",
        undefined,
        { quiet: true },
      );
      const bySlug = new Map(data.rows.map((r) => [r.slug, r]));
      const pro = new Set(data.pro);
      // Every catalog tool appears, including those with no traffic yet.
      setRows(
        toolPages.map((p) => {
          const r = bySlug.get(p.slug);
          return {
            slug: p.slug,
            cluster: p.cluster,
            views: r?.views ?? 0,
            uses: r?.uses ?? 0,
            funnels: r?.funnels ?? 0,
            views7: r?.views7 ?? 0,
            winner: r?.winner ?? false,
            pro: pro.has(p.slug),
          };
        }),
      );
    } catch (e) {
      setError(
        e instanceof RequestError
          ? e.message
          : ar
            ? "تعذّر تحميل الرادار."
            : "Could not load the radar.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function togglePro(row: Row) {
    setPending(row.slug);
    setError("");
    try {
      const r = await api<{ slug: string; pro: boolean }>(
        "/api/tools/pro",
        { slug: row.slug, pro: !row.pro },
        { method: "PATCH", quiet: true },
      );
      setRows(
        (list) =>
          list?.map((x) => (x.slug === r.slug ? { ...x, pro: r.pro } : x)) ??
          list,
      );
    } catch (e) {
      setError(
        e instanceof RequestError
          ? e.message
          : ar
            ? "لم يُحفظ التغيير."
            : "Change not saved.",
      );
    } finally {
      setPending(null);
    }
  }

  const filtered = useMemo(() => {
    if (!rows) return [];
    const list = rows.filter(
      (r) =>
        (cluster === "all" || r.cluster === cluster) &&
        (!winnersOnly || r.winner),
    );
    const value = (r: Row) =>
      sort === "funnelRate" ? rates(r).funnelRate : r[sort];
    return list.sort((a, b) => value(b) - value(a));
  }, [rows, cluster, sort, winnersOnly]);

  if (error && !rows)
    return (
      <p className="tools-error" role="alert">
        {error}
      </p>
    );
  if (!rows)
    return <p role="status">{ar ? "جارٍ تحميل البيانات…" : "Loading data…"}</p>;

  const totals = rows.reduce(
    (t, r) => ({
      views: t.views + r.views,
      uses: t.uses + r.uses,
      funnels: t.funnels + r.funnels,
    }),
    { views: 0, uses: 0, funnels: 0 },
  );
  const fmt = (n: number) => n.toLocaleString(ar ? "ar-SA" : "en-US");

  return (
    <div className="tools-radar">
      <dl className="tools-kpis">
        <div>
          <dt>{ar ? "الزيارات" : "Visits"}</dt>
          <dd>{fmt(totals.views)}</dd>
        </div>
        <div>
          <dt>{ar ? "استخدام الأدوات" : "Tool usage"}</dt>
          <dd>{fmt(totals.uses)}</dd>
        </div>
        <div>
          <dt>{ar ? "نقرات التحويل للنطاقات" : "Subdomain funnel clicks"}</dt>
          <dd>{fmt(totals.funnels)}</dd>
        </div>
        <div>
          <dt>{ar ? "أدوات رابحة" : "Winning tools"}</dt>
          <dd>{fmt(rows.filter((r) => r.winner).length)}</dd>
        </div>
        <div>
          <dt>{ar ? "أدوات Pro" : "Pro tools"}</dt>
          <dd>{fmt(rows.filter((r) => r.pro).length)}</dd>
        </div>
      </dl>
      <p className="tools-hint">
        {ar
          ? `«أداة رابحة» تعني ${WINNER_MIN_VIEWS} زيارة على الأقل مع نسبة تحويل للنطاقات 3% فأكثر، أو استخدام 40% مع 3 نقرات تحويل. الأرقام عدادات مجهولة دون بيانات شخصية.`
          : `"Winning" means at least ${WINNER_MIN_VIEWS} visits with a 3%+ funnel rate, or 40% usage with 3 funnel clicks. Counts are anonymous.`}
      </p>
      <div className="tools-radar-controls">
        <select
          value={cluster}
          onChange={(e) => {
            setCluster(e.target.value as ClusterId | "all");
            setShown(PAGE);
          }}
          aria-label={ar ? "القسم" : "Cluster"}
        >
          <option value="all">{ar ? "كل الأقسام" : "All clusters"}</option>
          {clusters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {ar ? c.nameAr : c.nameEn}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label={ar ? "الترتيب" : "Sort"}
        >
          <option value="views">{ar ? "الأكثر زيارة" : "Most visits"}</option>
          <option value="views7">
            {ar ? "زيارات آخر 7 أيام" : "Visits, last 7 days"}
          </option>
          <option value="uses">{ar ? "الأكثر استخداماً" : "Most used"}</option>
          <option value="funnels">
            {ar ? "الأكثر تحويلاً" : "Most funnel clicks"}
          </option>
          <option value="funnelRate">
            {ar ? "أعلى نسبة تحويل" : "Highest funnel rate"}
          </option>
        </select>
        <label className="tools-check">
          <input
            type="checkbox"
            checked={winnersOnly}
            onChange={(e) => setWinnersOnly(e.target.checked)}
          />
          {ar ? "الرابحة فقط" : "Winners only"}
        </label>
        <button
          type="button"
          className="tools-ghost"
          onClick={() => void load()}
        >
          <RefreshCw size={14} /> {ar ? "تحديث" : "Refresh"}
        </button>
      </div>
      {error ? (
        <p className="tools-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="tools-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">{ar ? "الأداة" : "Tool"}</th>
              <th scope="col">{ar ? "زيارات" : "Visits"}</th>
              <th scope="col">{ar ? "7 أيام" : "7 days"}</th>
              <th scope="col">{ar ? "استخدام" : "Uses"}</th>
              <th scope="col">{ar ? "تحويل" : "Funnel"}</th>
              <th scope="col">{ar ? "نسبة التحويل" : "Funnel rate"}</th>
              <th scope="col">Pro</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, shown).map((r) => {
              const page = toolBySlug.get(r.slug)!;
              const winner = r.winner || isWinner(r);
              return (
                <tr key={r.slug} className={winner ? "is-winner" : ""}>
                  <td>
                    <a href={toolPath(page.cluster, page.slug)}>
                      {ar ? page.titleAr : page.titleEn}
                    </a>
                    {winner ? (
                      <span className="tools-winner">
                        <Flame size={13} aria-hidden="true" />{" "}
                        {ar
                          ? "🔥 أداة رابحة - جاهزة للاستثمار"
                          : "🔥 Winning tool — ready to monetise"}
                      </span>
                    ) : null}
                  </td>
                  <td>{fmt(r.views)}</td>
                  <td>{fmt(r.views7)}</td>
                  <td>{fmt(r.uses)}</td>
                  <td>{fmt(r.funnels)}</td>
                  <td dir="ltr">{rates(r).funnelRate.toFixed(1)}%</td>
                  <td>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.pro}
                      aria-label={`Pro: ${ar ? page.titleAr : page.titleEn}`}
                      className={`tools-switch${r.pro ? " is-on" : ""}`}
                      disabled={pending === r.slug}
                      onClick={() => void togglePro(r)}
                    >
                      <span />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > shown ? (
        <button
          type="button"
          className="tools-secondary tools-more"
          onClick={() => setShown((n) => n + PAGE)}
        >
          {ar ? "عرض المزيد" : "Show more"}
        </button>
      ) : null}
      <p className="tools-hint">
        {ar
          ? "تفعيل Pro يحجب المخرجات المتقدمة ويعرض رابط استفسار للتوفر؛ تبقى الحاسبة الأساسية مجانية. يلزم ربط صلاحيات الشراء قبل بيع أي وصول مدفوع."
          : "Pro gates advanced outputs with an availability inquiry link; the core calculator stays free. Purchase entitlements must be connected before selling paid access."}
      </p>
    </div>
  );
}

export default function Radar({ lang }: { lang: "ar" | "en" }) {
  const auth = useAuth();
  const ar = lang === "ar";
  const admin = !!auth.user?.roles?.includes("admin");
  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    document.title = ar ? "رادار المالك — 1Shot" : "Owner radar — 1Shot";
    return () => robots.remove();
  }, [ar]);
  return (
    <section className="tools-page">
      <header className="tools-hero">
        <p className="tools-kicker">OWNER RADAR</p>
        <h1>
          {ar ? "رادار المالك للأدوات والتحويل" : "Tools & monetisation radar"}
        </h1>
        <p>
          {ar
            ? "الزيارات واستخدام الأدوات ونقرات التحويل إلى نطاقات المنظومة عبر 500 صفحة."
            : "Visits, tool usage and ecosystem funnel clicks across 500 pages."}
        </p>
      </header>
      {!auth.ready ? (
        <p role="status">
          {ar ? "جارٍ التحقق من الجلسة…" : "Checking session…"}
        </p>
      ) : !auth.user ? (
        <button
          type="button"
          className="tools-cta"
          onClick={() => auth.openLogin()}
        >
          <LogIn size={16} />{" "}
          {ar ? "سجّل الدخول كمسؤول" : "Sign in as administrator"}
        </button>
      ) : !admin ? (
        <p className="tools-error" role="alert">
          {ar
            ? "هذه الصفحة متاحة لمسؤول المنصة فقط."
            : "This page is for the platform administrator only."}
        </p>
      ) : (
        <RadarBoard key={auth.user.id} lang={lang} />
      )}
      {auth.dialog}
    </section>
  );
}
