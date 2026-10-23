import { useEffect, useState } from "react";
import { BadgeCheck, RefreshCw } from "lucide-react";
import { api, money } from "../lib/api";
import { useAppearance } from "../storefront/i18n";
import { estimateNotice, type RevenueSummary } from "../../shared/commerce";
export function EstimateNotice() {
  const { tr } = useAppearance();
  return (
    <div className="commerce-estimates">
      <strong>
        {tr(
          "التقديرات ونقرات التحويل الاسترشادية",
          "Estimates, traffic & funnel clicks",
        )}
      </strong>
      <p>{tr(...estimateNotice)}</p>
    </div>
  );
}
export function RevenueCard() {
  const { tr, language } = useAppearance();
  const [data, setData] = useState<RevenueSummary | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    void load();
  }, []);
  async function load() {
    setBusy(true);
    setError("");
    try {
      setData(
        await api<RevenueSummary>("/api/admin/revenue", undefined, {
          quiet: true,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="commerce-card revenue-verified"
      aria-label={tr("الإيرادات الفعلية", "Actual revenue")}
    >
      <div className="commerce-actions">
        <BadgeCheck size={22} />
        <h3>
          {tr(
            "الإيرادات والمدفوعات الفعلية المؤكدة",
            "Verified paid revenue & real orders",
          )}
        </h3>
        <button
          className="button subtle small"
          disabled={busy}
          onClick={() => void load()}
          aria-label={tr("تحديث الإيرادات", "Refresh revenue")}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {error && (
        <p className="commerce-error" role="alert">
          {error}
        </p>
      )}
      <strong dir="ltr">{data ? money(data.revenueCents, "SAR") : "—"}</strong>
      <p>
        {tr("الطلبات المدفوعة:", "Paid orders:")}{" "}
        {data ? data.paidOrders.toLocaleString(language) : "—"}
      </p>
      <small>
        {tr(
          "دفعات حية بحالة PAID / CAPTURED بالريال فقط. لا تشمل الاختبار أو الطلبات المعلقة أو تقديرات الأدوات.",
          "Live SAR orders with PAID / CAPTURED status only. Excludes sandbox, pending orders and tool estimates.",
        )}
      </small>
      {data && (
        <p>
          <small>
            {tr("آخر تحقق:", "Last checked:")}{" "}
            {new Date(data.checkedAt).toLocaleString(language)}
          </small>
        </p>
      )}
    </section>
  );
}
