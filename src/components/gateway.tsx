import { useEffect, useState, type FormEvent } from "react";
import {
  ShieldCheck,
  LockKeyhole,
  Zap,
  KeyRound,
  Save,
  RefreshCw,
  ArrowLeft,
  Link,
  CreditCard,
  FlaskConical,
  Check,
  Circle,
} from "lucide-react";
import {
  gateways,
  topologies,
  securityControls,
  regions,
  endpoints,
  type Order,
} from "../../shared/contracts";
import { api, callBackendApi, isUnconfirmedRequest } from "../lib/api";
import { Busy, Notice, SectionHeading } from "./common";
export function Gateway({ onOrder }: { onOrder: (order: Order) => void }) {
  const [mode, setMode] = useState("SANDBOX"),
    [topology, setTopology] = useState("HOSTED_PAGE"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [security, setSecurity] = useState<Record<string, boolean>>(
    Object.fromEntries(securityControls.map(([key]) => [key, true])),
  );
  const [lastAttempt, setLastAttempt] = useState<{
    key: string;
    body: Record<string, unknown>;
  } | null>(null);
  const tokenNeeded = ["DIRECT_API", "TOKENIZATION", "MOBILE_SDK"].includes(
    topology,
  );
  async function execute(body: Record<string, unknown>, key: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await callBackendApi<{
        order?: Order;
        message?: string;
        error?: string;
      }>(endpoints.payment, body, { idempotencyKey: key });
      if (result.order) onOrder(result.order);
      if (result.error) setError(result.error);
      else
        setNotice(result.message || "أُرسل الطلب. تابع حالته في مراقب النظام.");
      setLastAttempt(null);
    } catch (e) {
      setError((e as Error).message);
      setLastAttempt(isUnconfirmedRequest(e) ? { key, body } : null);
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const body = {
      ...data,
      executionMode: mode,
      topologyMode: topology,
      loaderSecurityOverrides:
        mode === "PRODUCTION"
          ? Object.fromEntries(securityControls.map(([key]) => [key, true]))
          : security,
    };
    void execute(body, crypto.randomUUID());
  }
  return (
    <>
      <SectionHeading
        eyebrow="PAYMENT WORKSPACE"
        title="غرفة البوابات والمسارات"
        description="إعداد واحد يجمع بواباتك. اختر المسار، اضبط البيئة، وتابع الاستجابة لحظياً."
      >
        <span
          className={`mode-badge ${mode === "PRODUCTION" ? "production" : ""}`}
        >
          <FlaskConical size={15} />
          {mode === "SANDBOX" ? "بيئة اختبار" : "بيئة حية"}
        </span>
      </SectionHeading>
      <form onSubmit={submit} className="form-stack">
        <section className="panel">
          <div className="panel-title">
            <span className="step-number">01</span>
            <div>
              <h2>إعدادات الاتصال</h2>
              <p>البوابة، بيئة التنفيذ ومسار العملية</p>
            </div>
            <Link size={19} />
          </div>
          <div className="form-grid">
            <label>
              بوابة الدفع
              <select name="gatewayCode">
                {gateways.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              وضع التنفيذ
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="SANDBOX">SANDBOX — اختبار</option>
                <option value="PRODUCTION">PRODUCTION — دفع حي</option>
              </select>
            </label>
            <label className="span-2">
              طريقة ربط البوابة
              <select
                value={topology}
                onChange={(e) => setTopology(e.target.value)}
              >
                {topologies.map(([code, name], i) => (
                  <option key={code} value={code}>
                    {i + 1}. {name} · {code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              الدولة والعملة
              <select name="region">
                {regions.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              مبلغ العملية
              <input
                name="amount"
                type="number"
                min="1"
                max="10000"
                step="0.01"
                defaultValue="1.00"
                required
                dir="ltr"
              />
            </label>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <span className="step-number">02</span>
            <div>
              <h2>الطلب وبيئة الجهاز</h2>
              <p>بيانات العملية المرسلة إلى الباك إند</p>
            </div>
            <CreditCard size={19} />
          </div>
          <div className="form-grid">
            <label>
              اسم حامل البطاقة / وصف الطلب
              <input
                name="cardholder"
                placeholder="مثال: تحقق من مسار الدفع"
                required
                maxLength={200}
              />
            </label>
            <label>
              بيئة الجهاز
              <select name="deviceEnvironment">
                <option>Chrome Desktop (Windows 11)</option>
                <option>iPhone 16 Pro (Safari Mobile)</option>
                <option>Ultra (Android Emulator)</option>
              </select>
            </label>
            {tokenNeeded && (
              <label className="span-2">
                رمز الدفع الصادر من البوابة
                <input
                  name="paymentToken"
                  type="password"
                  autoComplete="off"
                  required
                  maxLength={2000}
                  placeholder="Provider-generated payment token"
                  dir="ltr"
                />
                <small>
                  أصدر الرمز عبر SDK الرسمي للبوابة. لا تُدخل رقم البطاقة أو رمز
                  CVV هنا.
                </small>
              </label>
            )}
          </div>
          <div className="inline-info">
            <LockKeyhole size={17} />
            <span>
              رقم البطاقة، تاريخ الانتهاء وCVV تُدخل داخل صفحة البوابة الآمنة.
              اختيار الجهاز وصف للاختبار، ولا يغيّر بصمة المتصفح.
            </span>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <span className="step-number">03</span>
            <div>
              <h2>حمايات العملية</h2>
              <p>
                {mode === "PRODUCTION"
                  ? "جميع الحمايات إلزامية في البيئة الحية"
                  : "إعدادات اختبار تُرسل إلى الباك إند للتحقق من دعمه"}
              </p>
            </div>
            <ShieldCheck size={19} />
          </div>
          <div className="security-actions">
            <span>٨ طبقات حماية</span>
            <button
              type="button"
              disabled={mode === "PRODUCTION"}
              onClick={() =>
                setSecurity(
                  Object.fromEntries(
                    securityControls.map(([key]) => [key, true]),
                  ),
                )
              }
            >
              تشغيل الكل
            </button>
            <button
              type="button"
              disabled={mode === "PRODUCTION"}
              onClick={() =>
                setSecurity(
                  Object.fromEntries(
                    securityControls.map(([key]) => [key, false]),
                  ),
                )
              }
            >
              إيقاف الكل
            </button>
          </div>
          <div className="security-grid">
            {securityControls.map(([key, label]) => (
              <label className="security-toggle" key={key}>
                <span>
                  {label}
                  <small>{key}</small>
                </span>
                <input
                  type="checkbox"
                  checked={mode === "PRODUCTION" || security[key]}
                  disabled={mode === "PRODUCTION"}
                  onChange={(e) =>
                    setSecurity((s) => ({ ...s, [key]: e.target.checked }))
                  }
                />
                <span className="toggle-track" />
              </label>
            ))}
          </div>
        </section>
        {topology === "ALL_6_MODES" && (
          <Notice>
            هذا الخيار يفحص الاتصال ويعرض المسارات الستة دون إنشاء دفعات. تنفيذ
            كل مسار يحتاج عملية مستقلة.
          </Notice>
        )}
        {mode === "PRODUCTION" && (
          <Notice>هذه عملية مالية حقيقية بالمبلغ والعملة المحددين.</Notice>
        )}
        {error && <Notice>{error}</Notice>}
        {notice && <Notice success>{notice}</Notice>}
        {lastAttempt && (
          <div className="inline-info">
            <span>للتحقق من الطلب السابق استخدم نفس معرّف العملية.</span>
            <button
              type="button"
              className="button subtle small"
              disabled={busy}
              onClick={() => execute(lastAttempt.body, lastAttempt.key)}
            >
              استعادة نتيجة الطلب
            </button>
          </div>
        )}
        <button
          className="button primary execute-button"
          disabled={busy || !!lastAttempt}
        >
          {busy ? <Busy /> : <Zap size={18} />}{" "}
          {topology === "ALL_6_MODES"
            ? "فحص الاتصال والمسارات"
            : "تنفيذ العملية الآن"}{" "}
          <ArrowLeft size={18} />
        </button>
      </form>
    </>
  );
}
interface VaultEntry {
  id: string;
  gateway: string;
  environment: string;
  updatedAt: string;
}
export function Vault() {
  const [keys, setKeys] = useState<VaultEntry[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [readiness, setReadiness] = useState<Record<string, any> | null>(null);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [k, r] = await Promise.all([
        api<{ keys: VaultEntry[] }>("/api/admin/vault/keys"),
        api("/api/admin/readiness"),
      ]);
      setKeys(k.keys);
      setReadiness(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await callBackendApi(
        endpoints.vault,
        Object.fromEntries(new FormData(form)),
      );
      form.reset();
      await refresh();
      setNotice(result.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const readinessItems = readiness
    ? ([
        ["قاعدة بيانات المنظومة", readiness.database?.connected],
        [
          "HTTPS للباك إند",
          readiness.core?.connected && readiness.core?.secure,
        ],
        ["تشفير الخزنة", readiness.vaultEncryptionConfigured],
        ["توقيع إشعارات الدفع", readiness.signedCallbacksConfigured],
        ["صلاحية المسؤول", readiness.adminVerified],
        ["دفع حي مثبت بإشعار", readiness.livePaymentVerified],
      ] as const)
    : [];
  return (
    <>
      <SectionHeading
        eyebrow="ADMIN CONTROL CENTER"
        title="خزنة مفاتيح API"
        description="إدارة بيانات اتصال بوابات الدفع في مكان واحد، بتشفير وصلاحيات للمسؤول."
      >
        <span className="mode-badge">
          <LockKeyhole size={15} /> مساحة محمية
        </span>
      </SectionHeading>
      <section className="panel readiness-panel">
        <div className="panel-title">
          <ShieldCheck size={22} />
          <div>
            <h2>جاهزية الإطلاق</h2>
            <p>النطاقات تنتقل بعد نجاح النشر والتحقق</p>
          </div>
          <button
            className="icon-button"
            onClick={refresh}
            disabled={loading}
            aria-label="تحديث الجاهزية"
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
        </div>
        {loading ? (
          <div className="muted">جارٍ فحص المتطلبات...</div>
        ) : (
          <div className="readiness-list">
            {readinessItems.map(([label, ok]) => (
              <div key={label}>
                <span>{label}</span>
                <b className={ok ? "text-green" : "text-amber"}>
                  {ok ? <Check size={16} /> : <Circle size={13} />}{" "}
                  {ok ? "جاهز" : "بانتظار الإعداد"}
                </b>
              </div>
            ))}
          </div>
        )}
        <p className="fine-print">
          نجاح اتصال الخدمات لا يعني نجاح دفع حي. يجب التحقق من مسار الدفع
          والإشعار الموقّع قبل نقل النطاقات.
        </p>
      </section>
      <form onSubmit={submit} className="panel form-stack">
        <div className="panel-title">
          <KeyRound size={23} />
          <div>
            <h2>إضافة أو تحديث مفاتيح بوابة</h2>
            <p>حفظ القيم يستبدل مفاتيح البوابة في البيئة المحددة</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            بوابة الدفع
            <select name="gatewayCode">
              {gateways.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            البيئة
            <select name="environment">
              <option value="sandbox">Sandbox — اختبار</option>
              <option value="live">Live — حي</option>
            </select>
          </label>
          <label className="span-2">
            معرّف التاجر <span dir="ltr">Merchant / Store / Profile ID</span>
            <input
              name="merchantId"
              required
              maxLength={200}
              dir="ltr"
              autoComplete="off"
            />
          </label>
          <label className="span-2">
            المفتاح السري للسيرفر <span dir="ltr">Secret / Auth Key</span>
            <input
              name="secretKey"
              type="password"
              required
              maxLength={4000}
              dir="ltr"
              autoComplete="new-password"
            />
          </label>
          <label className="span-2">
            مفتاح العميل العام <span dir="ltr">Client Key</span>
            <input
              name="clientKey"
              type="password"
              maxLength={4000}
              dir="ltr"
              autoComplete="off"
            />
          </label>
        </div>
        {error && <Notice>{error}</Notice>}
        {notice && <Notice success>{notice}</Notice>}
        <button className="button primary" disabled={busy}>
          {busy ? <Busy /> : <Save size={18} />} حفظ المفاتيح في قاعدة البيانات
        </button>
        <div className="inline-info">
          <LockKeyhole size={15} /> تُشفّر المفاتيح قبل الحفظ ولا تُعاد إلى
          المتصفح.
        </div>
      </form>
      <section className="panel">
        <div className="panel-title">
          <h2>البوابات المحفوظة</h2>
          <span className="count-badge">{keys.length}</span>
        </div>
        {keys.length ? (
          <div className="saved-keys">
            {keys.map((k) => (
              <div key={k.id}>
                <KeyRound size={18} />
                <strong>{gateways.find((g) => g[0] === k.gateway)?.[1]}</strong>
                <span
                  className={`tag ${k.environment === "live" ? "orange" : ""}`}
                >
                  {k.environment}
                </span>
                <small>
                  آخر تحديث {new Date(k.updatedAt).toLocaleDateString("ar")}
                </small>
                <ShieldCheck className="text-green" size={17} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <KeyRound size={28} />
            <p>
              {loading
                ? "جارٍ تحميل الخزنة..."
                : "لم تُضف مفاتيح بعد. أضف أول بوابة للبدء."}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
