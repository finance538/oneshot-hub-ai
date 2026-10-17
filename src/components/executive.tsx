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
        title="رؤية أوضح. قرارات أذكى."
        description="مبيعاتك، فريقك وتقاريرك التنفيذية في مساحة قيادة واحدة."
      >
        <button
          className="button subtle small"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} /> تحديث
        </button>
      </SectionHeading>
      {error && <Notice>{error}</Notice>}
      <div className="metric-grid">
        <div className="metric-card">
          <span>
            <TrendingUp size={18} /> إيرادات مؤكدة
            <select
              aria-label="عملة الإيرادات"
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
          <small>طلبات حية مثبتة بإشعار دفع</small>
        </div>
        <div className="metric-card">
          <span>
            <ReceiptText size={18} /> إجمالي الطلبات الحية
          </span>
          <strong>{data ? count : "—"}</strong>
          <small>جميع العملات، دون جمع مبالغها</small>
        </div>
        <div className="metric-card">
          <span>
            <UsersRound size={18} /> أعضاء الفريق النشطون
          </span>
          <strong>
            {data ? data.staff.filter((s) => s.active).length : "—"}
          </strong>
          <small>مساعدون بتخصصات مخصصة</small>
        </div>
      </div>
      <section className="panel team-panel">
        <div className="panel-title">
          <BriefcaseBusiness size={20} />
          <div>
            <h2>فريقك الذكي</h2>
            <p>أضف تخصصاً وحدد تعليمات المساعد</p>
          </div>
          <button
            className="button subtle small"
            onClick={() => setAdding(true)}
          >
            <Plus size={15} /> إضافة موظف
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
                    {item.active ? "نشط" : "متوقف"}
                  </span>
                </div>
                <button
                  disabled={busy}
                  className="icon-button"
                  onClick={() => toggle(item)}
                  aria-label={
                    item.active ? `إيقاف ${item.name}` : `تفعيل ${item.name}`
                  }
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
                ? "جارٍ تحميل الفريق..."
                : "ابدأ بإضافة أول مساعد إلى فريقك."}
            </p>
          </div>
        )}
      </section>
      <div className="ceo-heading">
        <h2>مكتب التوجيه التنفيذي</h2>
        <select
          aria-label="الموظف المستهدف"
          value={employee}
          onChange={(e) => setEmployee(e.target.value)}
        >
          <option value="">AI CEO — المدير التنفيذي</option>
          {data?.staff
            .filter((s) => s.active)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.role}
              </option>
            ))}
        </select>
      </div>
      <Assistant kind="ceo" staffId={employee || undefined} />
      <section className="panel orders-panel">
        <div className="panel-title">
          <ReceiptText size={20} />
          <h2>أحدث الطلبات</h2>
          <span className="tag">آخر ٥٠ طلباً</span>
        </div>
        {orders.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>الطلب</th>
                  <th>البوابة</th>
                  <th>القيمة</th>
                  <th>البيئة</th>
                  <th>الحالة</th>
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
                      {o.executionMode === "PRODUCTION" ? "حي" : "اختبار"}
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
              {loading ? "جارٍ تحميل الطلبات..." : "لا توجد طلبات مسجلة بعد."}
            </p>
          </div>
        )}
      </section>
      {adding && (
        <Modal title="إضافة موظف ذكي" onClose={() => !busy && setAdding(false)}>
          <form className="form-stack" onSubmit={save}>
            <label>
              الاسم
              <input
                name="name"
                required
                maxLength={100}
                placeholder="اسم المساعد"
              />
            </label>
            <label>
              التخصص
              <input
                name="role"
                required
                maxLength={150}
                placeholder="مثل: محلل المبيعات"
              />
            </label>
            <label>
              تعليمات المساعد
              <textarea
                name="instructions"
                required
                maxLength={2000}
                rows={4}
                placeholder="حدّد المهام والأسلوب المطلوبين..."
              />
            </label>
            {error && <Notice>{error}</Notice>}
            <button className="button primary" disabled={busy}>
              {busy ? <Busy /> : <Plus size={16} />} إضافة إلى الفريق
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
