import { useAppearance } from "../storefront/i18n";
import { uiText as t } from "../lib/legacy-copy";
import { useEffect, useState, type FormEvent } from "react";
import {
  UsersRound,
  TrendingUp,
  ReceiptText,
  Plus,
  Power,
  RefreshCw,
  BriefcaseBusiness,
} from "lucide-react";
import { api, money, orderLabel } from "../lib/api";
import type { Order } from "../../shared/contracts";
import { Assistant } from "./assistant";
import { SectionHeading, Notice, Modal, Busy } from "./common";
interface Employee {
  id: string;
  name: string;
  role: string;
  instructions: string;
  active: boolean;
}
interface Overview {
  totals: {
    currency: string;
    count: number;
    paid: number;
    revenueCents: number;
  }[];
  staff: Employee[];
}
export function Executive() {
  useAppearance();
  const [data, setData] = useState<Overview | null>(null),
    [orders, setOrders] = useState<Order[]>([]),
    [currency, setCurrency] = useState("USD"),
    [employee, setEmployee] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [adding, setAdding] = useState(false),
    [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [a, b] = await Promise.all([
        api<Overview>("/api/admin/overview"),
        api<{ orders: Order[] }>("/api/admin/orders"),
      ]);
      setData(a);
      setOrders(b.orders);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        "/api/admin/staff",
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      setAdding(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(item: Employee) {
    setBusy(true);
    try {
      await api(
        `/api/admin/staff/${item.id}`,
        { active: !item.active },
        { method: "PATCH" },
      );
      if (employee === item.id) setEmployee("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const totals = data?.totals.find((t) => t.currency === currency),
    count = data?.totals.reduce((n, t) => n + t.count, 0);
  return (
    <>
      <SectionHeading
        eyebrow="AI EXECUTIVE OFFICE"
        title={t("رؤية أوضح. قرارات أذكى.")}
        description={t(
          "مبيعاتك، فريقك وتقاريرك التنفيذية في مساحة قيادة واحدة.",
        )}
      >
        <button
          className="button subtle small"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} /> {t("تحديث")}
        </button>
      </SectionHeading>
      {error && <Notice>{error}</Notice>}
      <div className="metric-grid">
        <div className="metric-card">
          <span>
            <TrendingUp size={18} /> {t("إيرادات مؤكدة")}
            <select
              aria-label={t("عملة الإيرادات")}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {["USD", "SAR", "AED", "GBP", "EUR"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </span>
          <strong dir="ltr">
            {data ? money(totals?.revenueCents || 0, currency) : "—"}
          </strong>
          <small>{t("طلبات حية مثبتة بإشعار دفع")}</small>
        </div>
        <div className="metric-card">
          <span>
            <ReceiptText size={18} /> {t("إجمالي الطلبات الحية")}
          </span>
          <strong>{data ? count : "—"}</strong>
          <small>{t("جميع العملات، دون جمع مبالغها")}</small>
        </div>
        <div className="metric-card">
          <span>
            <UsersRound size={18} /> {t("أعضاء الفريق النشطون")}
          </span>
          <strong>
            {data ? data.staff.filter((s) => s.active).length : "—"}
          </strong>
          <small>{t("مساعدون بتخصصات مخصصة")}</small>
        </div>
      </div>
      <section className="panel team-panel">
        <div className="panel-title">
          <BriefcaseBusiness size={20} />
          <div>
            <h2>{t("فريقك الذكي")}</h2>
            <p>{t("أضف تخصصاً وحدد تعليمات المساعد")}</p>
          </div>
          <button
            className="button subtle small"
            onClick={() => setAdding(true)}
          >
            <Plus size={15} /> {t("إضافة موظف")}
          </button>
        </div>
        {data?.staff.length ? (
          <div className="team-list">
            {data.staff.map((item) => (
              <div
                className={`employee-card ${!item.active ? "inactive" : ""}`}
                key={item.id}
              >
                <div className="employee-avatar">{item.name.slice(0, 1)}</div>
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.role}</p>
                  <span className={item.active ? "text-green" : "muted"}>
                    {item.active ? t("نشط") : t("متوقف")}
                  </span>
                </div>
                <button
                  disabled={busy}
                  className="icon-button"
                  onClick={() => toggle(item)}
                  aria-label={`${item.active ? t("متوقف") : t("نشط")} · ${item.name}`}
                >
                  <Power size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <UsersRound size={28} />
            <p>
              {loading
                ? t("جارٍ تحميل الفريق...")
                : t("ابدأ بإضافة أول مساعد إلى فريقك.")}
            </p>
          </div>
        )}
      </section>
      <div className="ceo-heading">
        <h2>{t("مكتب التوجيه التنفيذي")}</h2>
        <select
          aria-label={t("الموظف المستهدف")}
          value={employee}
          onChange={(e) => setEmployee(e.target.value)}
        >
          <option value="">{t("AI CEO — المدير التنفيذي")}</option>
          {data?.staff
            .filter((s) => s.active)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.role}
              </option>
            ))}
        </select>
      </div>
      <Assistant staffId={employee || undefined} />
      <section className="panel orders-panel">
        <div className="panel-title">
          <ReceiptText size={20} />
          <h2>{t("أحدث الطلبات")}</h2>
          <span className="tag">{t("آخر ٥٠ طلباً")}</span>
        </div>
        {orders.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("الطلب")}</th>
                  <th>{t("البوابة")}</th>
                  <th>{t("القيمة")}</th>
                  <th>{t("البيئة")}</th>
                  <th>{t("الحالة")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {o.description}
                      <small>#{o.id.slice(0, 8)}</small>
                    </td>
                    <td>{o.gateway}</td>
                    <td dir="ltr">{money(o.amountCents, o.currency)}</td>
                    <td>
                      {o.executionMode === "PRODUCTION" ? t("حي") : t("اختبار")}
                    </td>
                    <td>
                      <span
                        className={`tag ${o.status === "paid" ? "green" : ""}`}
                      >
                        {orderLabel(o.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state compact">
            <ReceiptText size={26} />
            <p>
              {loading
                ? t("جارٍ تحميل الطلبات...")
                : t("لا توجد طلبات مسجلة بعد.")}
            </p>
          </div>
        )}
      </section>
      {adding && (
        <Modal
          title={t("إضافة موظف ذكي")}
          onClose={() => !busy && setAdding(false)}
        >
          <form className="form-stack" onSubmit={save}>
            <label>
              {t("الاسم")}
              <input
                name="name"
                required
                maxLength={100}
                placeholder={t("اسم المساعد")}
              />
            </label>
            <label>
              {t("التخصص")}
              <input
                name="role"
                required
                maxLength={150}
                placeholder={t("مثل: محلل المبيعات")}
              />
            </label>
            <label>
              {t("تعليمات المساعد")}
              <textarea
                name="instructions"
                required
                maxLength={2000}
                rows={4}
                placeholder={t("حدّد المهام والأسلوب المطلوبين...")}
              />
            </label>
            {error && <Notice>{error}</Notice>}
            <button className="button primary" disabled={busy}>
              {busy ? <Busy /> : <Plus size={16} />} {t("إضافة إلى الفريق")}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
