import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Busy, Notice, SectionHeading } from "./common";
import { api, money } from "../lib/api";
import { useAppearance } from "../storefront/i18n";
import "./studio.css";

/**
 * نبض الأعمال — قراءة أسبوعية واحدة.
 * ما لا تملكه المنصة لا يظهر هنا: لا تقديرات ولا مقارنات مع أسبوع سابق.
 */

interface Pulse {
  windowDays: number;
  sales: { currency: string; orders: number; revenueCents: number }[];
  quoteRequests: number;
  pages: { published: number; views: number; bookings: number };
  tasks: { open: number; done: number };
  mostUsed: { action: string; count: number }[];
  narrative: string;
}

export function BusinessPulse() {
  const { tr } = useAppearance();
  const [data, setData] = useState<Pulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api<Pulse>("/api/pulse"));
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="panel">
      <SectionHeading
        eyebrow="BUSINESS PULSE"
        title={tr("نبض الأعمال", "Business pulse")}
        description={tr(
          `قراءة آخر ${data?.windowDays ?? 7} أيام من أرقام المنصة نفسها، بلا تقديرات.`,
          "The last seven days, counted from the platform's own records.",
        )}
      />
      <button className="button subtle small" onClick={() => void load()}>
        <RefreshCw size={14} className={loading ? "spin" : ""} />{" "}
        {tr("تحديث", "Refresh")}
      </button>
      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Busy />
      ) : data ? (
        <>
          {data.narrative && (
            <p className="studio-output" style={{ marginTop: 16 }}>
              {data.narrative}
            </p>
          )}
          <div className="studio-grid" style={{ marginTop: 16 }}>
            <div className="studio-card">
              <h4>{tr("المبيعات المؤكدة", "Confirmed sales")}</h4>
              {data.sales.length ? (
                data.sales.map((row) => (
                  <small key={row.currency}>
                    {row.orders} {tr("طلب", "orders")} ·{" "}
                    {money(row.revenueCents, row.currency)}
                  </small>
                ))
              ) : (
                <small>{tr("لا مبيعات مؤكدة هذا الأسبوع.", "None.")}</small>
              )}
            </div>
            <div className="studio-card">
              <h4>{tr("طلبات التسعير", "Quote requests")}</h4>
              <small>{data.quoteRequests}</small>
            </div>
            <div className="studio-card">
              <h4>{tr("الصفحات المنشورة", "Published pages")}</h4>
              <small>
                {data.pages.published} {tr("صفحة", "pages")} ·{" "}
                {data.pages.views} {tr("مشاهدة", "views")} ·{" "}
                {data.pages.bookings} {tr("طلب حجز", "bookings")}
              </small>
            </div>
            <div className="studio-card">
              <h4>{tr("مهام الفريق", "Team tasks")}</h4>
              <small>
                {tr("مفتوحة", "Open")}: {data.tasks.open} ·{" "}
                {tr("منجزة", "Done")}: {data.tasks.done}
              </small>
            </div>
          </div>
          {data.mostUsed.length > 0 && (
            <div className="studio-chips" style={{ marginTop: 14 }}>
              {data.mostUsed.map((row) => (
                <span key={row.action} className="studio-chip">
                  {row.action} · {row.count}
                </span>
              ))}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
