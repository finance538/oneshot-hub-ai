import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ClipboardList,
  Copy,
  RefreshCw,
  Settings2,
  Activity,
} from "lucide-react";
import { api, money, orderLabel } from "../lib/api";
import { appearanceLink, useAppearance } from "../storefront/i18n";
import {
  quoteStatuses,
  quoteStatusLabels,
  type QuoteRecord,
  type QuoteStatus,
  type OfficialContact,
} from "../../shared/commerce";
import type { EcosystemStatus } from "../../shared/ecosystem";
import { ecosystemApps } from "../../shared/ecosystem";
export default function OwnerOperations() {
  const { tr } = useAppearance();
  const [tab, setTab] = useState<"quotes" | "settings" | "health">(() => {
    const panel = new URLSearchParams(location.search).get("panel");
    return panel === "settings" || panel === "health" ? panel : "quotes";
  });
  return (
    <section className="commerce-card">
      <h2>
        {tr("مكتب متابعة العملاء والتشغيل", "Customer & operations desk")}
      </h2>
      <div
        className="commerce-tabs"
        aria-label={tr("أقسام الإدارة", "Administration sections")}
      >
        <button
          aria-pressed={tab === "quotes"}
          onClick={() => setTab("quotes")}
        >
          <ClipboardList size={16} />{" "}
          {tr("متابعة طلبات عروض الأسعار", "Quote requests CRM")}
        </button>
        <button
          aria-pressed={tab === "settings"}
          onClick={() => setTab("settings")}
        >
          <Settings2 size={16} /> {tr("إعدادات التواصل", "Contact settings")}
        </button>
        <button
          aria-pressed={tab === "health"}
          onClick={() => setTab("health")}
        >
          <Activity size={16} /> {tr("الصحة والتشخيص", "Health & diagnostics")}
        </button>
      </div>
      {tab === "quotes" ? (
        <Quotes />
      ) : tab === "settings" ? (
        <Settings />
      ) : (
        <Health />
      )}
    </section>
  );
}
function Quotes() {
  const { tr, language } = useAppearance();
  const [status, setStatus] = useState<QuoteStatus | "">("");
  const [page, setPage] = useState(0),
    [hasMore, setMore] = useState(false);
  const [rows, setRows] = useState<QuoteRecord[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const generation = useRef(0);
  async function load(silent = false) {
    const id = ++generation.current;
    if (!silent) setBusy(true);
    try {
      const result = await api<{ quotes: QuoteRecord[]; hasMore: boolean }>(
        `/api/admin/quotes?status=${status}&page=${page}`,
        undefined,
        { quiet: true },
      );
      if (id === generation.current) {
        setRows(result.quotes);
        setMore(result.hasMore);
        setError("");
      }
    } catch (e) {
      if (id === generation.current) setError((e as Error).message);
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    setRows(null);
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load(true);
    }, 30000);
    return () => {
      generation.current++;
      clearInterval(timer);
    };
  }, [status, page]);
  return (
    <>
      <div className="commerce-actions">
        <label>
          {tr("حالة الطلب", "Request status")}{" "}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as QuoteStatus | "");
              setPage(0);
            }}
          >
            <option value="">{tr("كل الطلبات", "All requests")}</option>
            {quoteStatuses.map((s) => (
              <option key={s} value={s}>
                {tr(...quoteStatusLabels[s])}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button subtle"
          disabled={busy}
          onClick={() => void load()}
        >
          <RefreshCw size={16} />
          {tr("تحديث", "Refresh")}
        </button>
        <small>
          {tr(
            "تحديث تلقائي كل 30 ثانية أثناء عرض الصفحة",
            "Refreshes every 30 seconds while visible",
          )}
        </small>
      </div>
      {error && (
        <p role="alert" className="commerce-error">
          {error}
        </p>
      )}
      {!rows && busy && (
        <p role="status">{tr("تحميل الطلبات…", "Loading requests…")}</p>
      )}
      {rows?.length === 0 && (
        <p>
          {tr("لا توجد طلبات بهذه الحالة.", "No requests with this status.")}
        </p>
      )}
      <div className="quote-list">
        {rows?.map((row) => (
          <QuoteCard key={row.id} row={row} onChange={() => void load(true)} />
        ))}
      </div>
      <div className="commerce-actions">
        <button
          className="button subtle"
          disabled={!page || busy}
          onClick={() => setPage((p) => p - 1)}
        >
          {tr("السابق", "Previous")}
        </button>
        <span>
          {tr("صفحة", "Page")} {(page + 1).toLocaleString(language)}
        </span>
        <button
          className="button subtle"
          disabled={!hasMore || busy}
          onClick={() => setPage((p) => p + 1)}
        >
          {tr("التالي", "Next")}
        </button>
      </div>
    </>
  );
}
function QuoteCard({
  row,
  onChange,
}: {
  row: QuoteRecord;
  onChange: () => void;
}) {
  const { tr, language } = useAppearance();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  const [offerId, setOfferId] = useState(row.offerId);
  const currentOffer = offerId || row.offerId;
  const expired = !!row.expiresAt && new Date(row.expiresAt) <= new Date();
  const shareable = row.status === "quoted" && !expired;
  // Share the deployed origin, so preview links cannot accidentally point to production records.
  const href = currentOffer
    ? new URL(appearanceLink(`/quote/${currentOffer}`), location.origin).href
    : "";
  async function change(status: string) {
    setBusy(true);
    setError("");
    try {
      await api(
        `/api/admin/quotes/${row.id}`,
        { status },
        { method: "PATCH", quiet: true },
      );
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function convert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await api<{ offerId: string }>(
        `/api/admin/quotes/${row.id}/convert`,
        { amount: data.get("amount"), scope: data.get("scope") },
        { quiet: true },
      );
      setOfferId(result.offerId);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
    } catch {
      setError(
        tr(
          "تعذّر النسخ؛ حدد الرابط وانسخه يدوياً.",
          "Copy failed; select the link and copy it manually.",
        ),
      );
    }
  }
  return (
    <article>
      <div className="commerce-actions">
        <strong dir="ltr">{row.reference}</strong>
        <span className="price-badge">
          {tr(...quoteStatusLabels[row.status])}
        </span>
        {row.kind === "pro" && (
          <span>Pro · {tr("استفسار فقط", "Inquiry only")}</span>
        )}
      </div>
      <h3>{row.serviceName}</h3>
      <dl>
        <dt>{tr("العميل", "Customer")}</dt>
        <dd>{row.customerName}</dd>
        <dt>{tr("البريد", "Email")}</dt>
        <dd dir="ltr">{row.email}</dd>
        <dt>{tr("التواصل", "Phone")}</dt>
        <dd dir="ltr">{row.phone}</dd>
        <dt>{tr("اللغة", "Language")}</dt>
        <dd>{row.language === "ar" ? "العربية" : "English"}</dd>
        <dt>{tr("تاريخ الطلب", "Requested")}</dt>
        <dd>{new Date(row.createdAt).toLocaleString(language)}</dd>
        <dt>{tr("الخدمة", "Service ID")}</dt>
        <dd>{row.productId || tr("طلب مخصص", "Custom request")}</dd>
      </dl>
      <details>
        <summary>{tr("النطاق والملاحظات", "Scope & notes")}</summary>
        <p className="quote-notes">{row.notes}</p>
      </details>
      {row.orderId && (
        <p>
          {tr("حالة الدفع:", "Payment:")}{" "}
          {orderLabel(row.orderStatus || "pending")} · <bdi>{row.orderId}</bdi>
        </p>
      )}
      <label>
        {tr("متابعة الحالة", "Update status")}{" "}
        <select
          disabled={busy}
          value={row.status}
          onChange={(e) => void change(e.target.value)}
        >
          {quoteStatuses.map((s) => (
            <option
              key={s}
              value={s}
              disabled={s === "quoted" || (!!currentOffer && s !== "closed")}
            >
              {tr(...quoteStatusLabels[s])}
            </option>
          ))}
        </select>
      </label>
      {currentOffer ? (
        <div className="quote-scope">
          <p>
            {shareable
              ? tr(
                  "رابط العرض جاهز للمشاركة مع العميل. لم يُرسل تلقائياً.",
                  "The quote link is ready to share with the customer. It was not sent automatically.",
                )
              : tr(
                  "العرض مغلق أو منتهي الصلاحية. راجع حالة الطلب المرتبط قبل إصدار عرض جديد.",
                  "This offer is closed or expired. Review its linked order before issuing a new quote.",
                )}
          </p>
          {row.amountCents && <strong>{money(row.amountCents, "SAR")}</strong>}
          <p className="quote-notes">{row.approvedScope}</p>
          <label>
            {tr("رابط الدفع", "Payment link")}
            <input
              dir="ltr"
              readOnly
              value={href}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <button
            className="button subtle"
            disabled={!shareable}
            onClick={() => void copy()}
          >
            <Copy size={15} />
            {copied ? tr("تم النسخ", "Copied") : tr("نسخ الرابط", "Copy link")}
          </button>
          <small>
            {row.expiresAt &&
              `${tr("صالح حتى", "Valid until")} ${new Date(row.expiresAt).toLocaleDateString(language)}`}
          </small>
          {row.status === "closed" && (
            <p>
              {tr(
                "هذا العرض مغلق ولا يقبل دفعات جديدة.",
                "This quote is closed to new payments.",
              )}
            </p>
          )}
        </div>
      ) : row.kind === "pro" ? (
        <p>
          {tr(
            "لا يُصدر رابط شراء Pro قبل تكامل استحقاق الاشتراك المدفوع.",
            "A Pro purchase link is unavailable until paid subscription entitlements are integrated.",
          )}
        </p>
      ) : (
        row.status !== "closed" && (
          <details>
            <summary>
              {tr(
                "اعتماد العرض وتحويله إلى رابط دفع",
                "Approve quote & create payment link",
              )}
            </summary>
            <form className="commerce-form" onSubmit={convert}>
              <label>
                {tr(
                  "المبلغ النهائي بالريال شاملاً الضرائب والرسوم المنطبقة",
                  "Final SAR amount including applicable taxes and fees",
                )}
                <input
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  required
                  pattern="[0-9]{1,7}(\.[0-9]{1,2})?"
                />
              </label>
              <label>
                {tr(
                  "النطاق والتسليم والشروط المعتمدة",
                  "Approved scope, delivery & terms",
                )}
                <textarea
                  name="scope"
                  defaultValue={row.notes}
                  required
                  maxLength={4000}
                  rows={4}
                />
              </label>
              <p>
                {tr(
                  "الرابط صالح 14 يوماً. السعر والنطاق ثابتان بعد الإصدار. لا يتم خصم مبلغ عند إنشائه.",
                  "The link lasts 14 days. Price and scope are fixed after issue. Creating it does not charge the customer.",
                )}
              </p>
              <button className="button primary" disabled={busy}>
                {busy
                  ? tr("جارٍ الاعتماد…", "Approving…")
                  : tr(
                      "اعتماد وإنشاء رابط الدفع",
                      "Approve & create payment link",
                    )}
              </button>
            </form>
          </details>
        )
      )}
      {error && (
        <p role="alert" className="commerce-error">
          {error}
        </p>
      )}
    </article>
  );
}
function Settings() {
  const { tr } = useAppearance();
  const [data, setData] = useState<OfficialContact | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    void api<OfficialContact>("/api/admin/contact", undefined, { quiet: true })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const form = new FormData(e.currentTarget);
    try {
      setData(
        await api<OfficialContact>(
          "/api/admin/contact",
          {
            email: form.get("email"),
            phone: form.get("phone"),
            whatsapp: form.get("whatsapp"),
            confirmOfficial: form.get("official") === "on",
          },
          { method: "PATCH", quiet: true },
        ),
      );
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p>
        {tr(
          "لا يظهر أي رقم هاتف قبل أن تضيف رقم المنشأة وتؤكد ملكيته. اترك الرقم فارغاً لإخفائه.",
          "Phone numbers appear only after you add and attest ownership of official business numbers. Leave blank to hide.",
        )}
      </p>
      {error && <p role="alert">{error}</p>}
      {data ? (
        <form className="commerce-form" onSubmit={save}>
          <label>
            {tr(
              "البريد الرسمي ضمن @1shotcam.com",
              "Official @1shotcam.com email",
            )}
            <input
              name="email"
              type="email"
              defaultValue={data.email}
              required
              maxLength={254}
              dir="ltr"
            />
          </label>
          <label>
            {tr("رقم الهاتف بصيغة دولية", "International phone number")}
            <input
              name="phone"
              type="tel"
              defaultValue={data.phone || ""}
              dir="ltr"
              maxLength={24}
            />
          </label>
          <label>
            {tr("رقم واتساب بصيغة دولية", "International WhatsApp number")}
            <input
              name="whatsapp"
              type="tel"
              defaultValue={data.whatsapp || ""}
              dir="ltr"
              maxLength={24}
            />
          </label>
          <label className="commerce-check">
            <input name="official" type="checkbox" required />
            {tr(
              "أؤكد أن هذه القنوات رسمية ومملوكة للمنشأة.",
              "I confirm these are official channels owned by the business.",
            )}
          </label>
          <button className="button primary" disabled={busy}>
            {busy
              ? tr("جارٍ الحفظ…", "Saving…")
              : tr("حفظ القنوات الرسمية", "Save official channels")}
          </button>
          {saved && (
            <p role="status">
              {tr(
                "حُفظت الإعدادات. تظهر في الزيارات التالية للتذييل.",
                "Settings saved. Footer contact channels update on the next visit.",
              )}
            </p>
          )}
        </form>
      ) : (
        !error && (
          <p role="status">{tr("تحميل الإعدادات…", "Loading settings…")}</p>
        )
      )}
    </>
  );
}
type DiagnosticData = {
  api: string;
  database: string;
  databaseLatencyMs: number;
  identity: string;
  ecosystem: EcosystemStatus | null;
  checkedAt: string;
  retentionDays: number;
  logs:
    | {
        id: string;
        source: string;
        code: string;
        area: string;
        status: number | null;
        createdAt: string;
      }[]
    | null;
};
function Health() {
  const { tr, language } = useAppearance();
  const [data, setData] = useState<DiagnosticData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const generation = useRef(0);
  async function load() {
    const id = ++generation.current;
    setBusy(true);
    try {
      const value = await api<DiagnosticData>(
        "/api/admin/diagnostics",
        undefined,
        { quiet: true, timeoutMs: 15000 },
      );
      if (id === generation.current) {
        setData(value);
        setError("");
      }
    } catch (e) {
      if (id === generation.current) {
        setData(null);
        setError((e as Error).message);
      }
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 60000);
    const net = () => setOnline(navigator.onLine);
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    return () => {
      generation.current++;
      clearInterval(timer);
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
    };
  }, []);
  return (
    <>
      <div className="commerce-actions">
        <button
          className="button subtle"
          disabled={busy}
          onClick={() => void load()}
        >
          <RefreshCw size={16} />
          {tr("فحص الآن", "Check now")}
        </button>
        <small>
          {data && new Date(data.checkedAt).toLocaleString(language)}
        </small>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="health-grid">
        <div>
          {tr("المتصفح", "Browser")}
          <strong>
            {online
              ? tr("الشبكة متاحة", "Network available")
              : tr("دون اتصال", "Offline")}
          </strong>
        </div>
        <div>
          API
          <strong>
            {data ? tr("استجابة موثقة", "Authenticated response") : "—"}
          </strong>
        </div>
        <div>
          {tr("قاعدة البيانات", "Database")}
          <strong>
            {data
              ? data.database === "connected"
                ? tr("متصلة", "Connected")
                : tr("غير متاحة", "Unavailable")
              : "—"}
          </strong>
        </div>
        <div>
          Identity
          <strong>
            {data ? tr("جلسة مسؤول مؤكدة", "Verified admin session") : "—"}
          </strong>
        </div>
      </div>
      <h3>{tr("الربط بين التطبيقات", "Cross-app SSO")}</h3>
      <p>
        {tr(
          "الفحص يؤكد استجابة بروتوكول الربط وإعداده فقط. نجاح الدخول الكامل يحتاج تجربة بحساب فعلي.",
          "Checks verify handshake responses and configuration only. Complete sign-in requires a real account acceptance check.",
        )}
      </p>
      <div className="health-grid">
        {ecosystemApps
          .filter((a) => a.id !== "hub")
          .map((app) => {
            const state = data?.ecosystem?.apps.find((a) => a.id === app.id);
            return (
              <div key={app.id}>
                <strong>{app.name}</strong>
                <span>
                  {state?.status === "available"
                    ? tr("الخدمة تستجيب", "Service responding")
                    : tr("غير متحقق", "Unverified")}
                </span>
                <p>
                  SSO:{" "}
                  {state?.sso
                    ? tr("مهيأ للربط", "Configured")
                    : tr("غير متحقق", "Unverified")}
                </p>
              </div>
            );
          })}
      </div>
      <h3>{tr("أحداث التشخيص الأخيرة", "Recent diagnostic events")}</h3>
      <p>
        {tr(
          "رموز عامة ومصدر وتوقيت فقط؛ دون نصوص المستخدم أو روابط أو رموز جلسة. سجلات المتصفح بلاغات غير موثقة. الاحتفاظ 14 يوماً.",
          "Only generic codes, source and timestamps; no user text, URLs or session tokens. Browser reports are untrusted signals. Retained for 14 days.",
        )}
      </p>
      {data?.logs === null ? (
        <p role="alert">{tr("تعذّرت قراءة السجل.", "Logs unavailable.")}</p>
      ) : data?.logs.length === 0 ? (
        <p>
          {tr(
            "لا توجد أحداث محفوظة في فترة الاحتفاظ.",
            "No recorded events in the retention window.",
          )}
        </p>
      ) : (
        <div className="commerce-table">
          <table>
            <thead>
              <tr>
                <th>{tr("الوقت", "Time")}</th>
                <th>{tr("المصدر", "Source")}</th>
                <th>{tr("القسم", "Area")}</th>
                <th>{tr("الرمز", "Code")}</th>
                <th>HTTP</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs?.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString(language)}</td>
                  <td>{log.source}</td>
                  <td>{log.area}</td>
                  <td>{log.code}</td>
                  <td>{log.status ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
