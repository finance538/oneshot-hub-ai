import { useAppearance } from "../storefront/i18n";
import { uiText as t } from "../lib/legacy-copy";
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
  regions,
  endpoints,
  type Order,
} from "../../shared/contracts";
import { api, callBackendApi, isUnconfirmedRequest } from "../lib/api";
import { Busy, Notice, SectionHeading } from "./common";
export function Gateway({ onOrder }: { onOrder: (order: Order) => void }) {
  useAppearance();
  const [mode, setMode] = useState("SANDBOX"),
    [topology, setTopology] = useState("HOSTED_PAGE"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
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
        setNotice(
          result.message || t("أُرسل الطلب. تابع حالته في مراقب النظام."),
        );
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
    };
    void execute(body, crypto.randomUUID());
  }
  return (
    <>
      <SectionHeading
        eyebrow="PAYMENT WORKSPACE"
        title={t("غرفة البوابات والمسارات")}
        description={t(
          "إعداد واحد يجمع بواباتك. اختر المسار، اضبط البيئة، وتابع الاستجابة لحظياً.",
        )}
      >
        <span
          className={`mode-badge ${mode === "PRODUCTION" ? "production" : ""}`}
        >
          <FlaskConical size={15} />
          {mode === "SANDBOX" ? t("بيئة اختبار") : t("بيئة حية")}
        </span>
      </SectionHeading>
      <form onSubmit={submit} className="form-stack">
        <section className="panel">
          <div className="panel-title">
            <span className="step-number">01</span>
            <div>
              <h2>{t("إعدادات الاتصال")}</h2>
              <p>{t("البوابة، بيئة التنفيذ ومسار العملية")}</p>
            </div>
            <Link size={19} />
          </div>
          <div className="form-grid">
            <label>
              {t("بوابة الدفع")}
              <select name="gatewayCode" defaultValue="" required>
                <option value="" disabled>
                  {t("اختر بوابة متاحة")}
                </option>
                {gateways.map(([code, name]) => (
                  <option key={code} value={code} disabled={code !== "stripe"}>
                    {t(name)}
                    {code !== "stripe" ? t("— الربط المباشر قيد النقل") : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("وضع التنفيذ")}
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="SANDBOX">{t("SANDBOX — اختبار")}</option>
                <option value="PRODUCTION">{t("PRODUCTION — دفع حي")}</option>
              </select>
            </label>
            <label className="span-2">
              {t("طريقة ربط البوابة")}
              <select
                value={topology}
                onChange={(e) => setTopology(e.target.value)}
              >
                {topologies.map(([code, name], i) => (
                  <option
                    key={code}
                    value={code}
                    disabled={
                      !["HOSTED_PAGE", "PAYMENT_LINK", "ALL_6_MODES"].includes(
                        code,
                      )
                    }
                  >
                    {i + 1}. {t(name)} · {code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("الدولة والعملة")}
              <select name="region">
                {regions.map(([code, name]) => (
                  <option key={code} value={code}>
                    {t(name)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("مبلغ العملية")}
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
              <h2>{t("الطلب وبيئة الجهاز")}</h2>
              <p>{t("بيانات العملية المرسلة إلى الباك إند")}</p>
            </div>
            <CreditCard size={19} />
          </div>
          <div className="form-grid">
            <label>
              {t("اسم حامل البطاقة / وصف الطلب")}
              <input
                name="cardholder"
                placeholder={t("مثال: تحقق من مسار الدفع")}
                required
                maxLength={200}
              />
            </label>
            <label>
              {t("بيئة الجهاز")}
              <select name="deviceEnvironment">
                <option>Chrome Desktop (Windows 11)</option>
                <option>iPhone 16 Pro (Safari Mobile)</option>
                <option>Ultra (Android Emulator)</option>
              </select>
            </label>
            {tokenNeeded && (
              <label className="span-2">
                {t("رمز الدفع الصادر من البوابة")}
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
                  {t(
                    "أصدر الرمز عبر SDK الرسمي للبوابة. لا تُدخل رقم البطاقة أو رمز CVV هنا.",
                  )}
                </small>
              </label>
            )}
          </div>
          <div className="inline-info">
            <LockKeyhole size={17} />
            <span>
              {t(
                "رقم البطاقة، تاريخ الانتهاء وCVV تُدخل داخل صفحة البوابة الآمنة. اختيار الجهاز وصف للاختبار، ولا يغيّر بصمة المتصفح.",
              )}
            </span>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <span className="step-number">03</span>
            <div>
              <h2>{t("حماية الدفع المستضاف")}</h2>
              <p>{t("بيانات البطاقة تبقى داخل صفحة Stripe")}</p>
            </div>
            <ShieldCheck size={19} />
          </div>
          <p className="fine-print">
            {t(
              "يطلب الربط تحقق 3D Secure من Stripe، ويحدّ محاولات الطلب ويحفظ مفتاح العملية لمنع التكرار. قرار التحقق والموافقة لدى مزود الدفع والبنك. لا يُعلن الموقع إجراء فحوص VPN أو بصمة الجهاز أو AVS دون تكامل موثّق.",
            )}
          </p>
        </section>
        {topology === "ALL_6_MODES" && (
          <Notice>
            {t(
              "هذا الخيار يفحص الاتصال ويعرض المسارات الستة دون إنشاء دفعات. تنفيذ كل مسار يحتاج عملية مستقلة.",
            )}
          </Notice>
        )}
        {mode === "PRODUCTION" && (
          <Notice>
            {t("هذه عملية مالية حقيقية بالمبلغ والعملة المحددين.")}
          </Notice>
        )}
        {error && <Notice>{error}</Notice>}
        {notice && <Notice success>{notice}</Notice>}
        {lastAttempt && (
          <div className="inline-info">
            <span>{t("للتحقق من الطلب السابق استخدم نفس معرّف العملية.")}</span>
            <button
              type="button"
              className="button subtle small"
              disabled={busy}
              onClick={() => execute(lastAttempt.body, lastAttempt.key)}
            >
              {t("استعادة نتيجة الطلب")}
            </button>
          </div>
        )}
        <button
          className="button primary execute-button"
          disabled={busy || !!lastAttempt}
        >
          {busy ? <Busy /> : <Zap size={18} />}{" "}
          {topology === "ALL_6_MODES"
            ? t("فحص الاتصال والمسارات")
            : t("تنفيذ العملية الآن")}{" "}
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
  const { language } = useAppearance();
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
        [t("قاعدة بيانات المنظومة"), readiness.database?.connected],
        [
          t("خدمات Netlify وقاعدة البيانات"),
          readiness.core?.connected && readiness.core?.secure,
        ],
        [t("تشفير الخزنة"), readiness.vaultEncryptionConfigured],
        [
          t("التحقق المباشر من الدفع"),
          readiness.confirmation === "authenticated_provider_query",
        ],
        [t("صلاحية المسؤول"), readiness.adminVerified],
        [t("دفع حي مثبت لدى المزود"), readiness.livePaymentVerified],
      ] as const)
    : [];
  return (
    <>
      <SectionHeading
        eyebrow="ADMIN CONTROL CENTER"
        title={t("خزنة مفاتيح API")}
        description={t(
          "إدارة بيانات اتصال بوابات الدفع في مكان واحد، بتشفير وصلاحيات للمسؤول.",
        )}
      >
        <span className="mode-badge">
          <LockKeyhole size={15} /> {t("مساحة محمية")}
        </span>
      </SectionHeading>
      <section className="panel readiness-panel">
        <div className="panel-title">
          <ShieldCheck size={22} />
          <div>
            <h2>{t("جاهزية الإطلاق")}</h2>
            <p>{t("النطاقات تنتقل بعد نجاح النشر والتحقق")}</p>
          </div>
          <button
            className="icon-button"
            onClick={refresh}
            disabled={loading}
            aria-label={t("تحديث الجاهزية")}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
        </div>
        {loading ? (
          <div className="muted">{t("جارٍ فحص المتطلبات...")}</div>
        ) : (
          <div className="readiness-list">
            {readinessItems.map(([label, ok]) => (
              <div key={label}>
                <span>{label}</span>
                <b className={ok ? "text-green" : "text-amber"}>
                  {ok ? <Check size={16} /> : <Circle size={13} />}{" "}
                  {ok ? t("جاهز") : t("بانتظار الإعداد")}
                </b>
              </div>
            ))}
          </div>
        )}
        <p className="fine-print">
          {t(
            "نجاح اتصال الخدمات لا يعني نجاح دفع حي. يجب التحقق من مسار الدفع والتحقق لدى المزود قبل نقل النطاقات.",
          )}
        </p>
      </section>
      <form onSubmit={submit} className="panel form-stack">
        <div className="panel-title">
          <KeyRound size={23} />
          <div>
            <h2>{t("إضافة أو تحديث مفاتيح بوابة")}</h2>
            <p>{t("حفظ القيم يستبدل مفاتيح البوابة في البيئة المحددة")}</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            {t("بوابة الدفع")}
            <select name="gatewayCode">
              {gateways.map(([code, name]) => (
                <option key={code} value={code}>
                  {t(name)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("البيئة")}
            <select name="environment">
              <option value="sandbox">{t("Sandbox — اختبار")}</option>
              <option value="live">{t("Live — حي")}</option>
            </select>
          </label>
          <label className="span-2">
            {t("معرّف التاجر")}
            <span dir="ltr">Merchant / Store / Profile ID</span>
            <input
              name="merchantId"
              required
              maxLength={200}
              dir="ltr"
              autoComplete="off"
            />
          </label>
          <label className="span-2">
            {t("المفتاح السري للسيرفر")}
            <span dir="ltr">Secret / Auth Key</span>
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
            {t("مفتاح العميل العام")}
            <span dir="ltr">Client Key</span>
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
          {busy ? <Busy /> : <Save size={18} />}{" "}
          {t("حفظ المفاتيح في قاعدة البيانات")}
        </button>
        <div className="inline-info">
          <LockKeyhole size={15} />{" "}
          {t("تُشفّر المفاتيح قبل الحفظ ولا تُعاد إلى المتصفح.")}
        </div>
      </form>
      <section className="panel">
        <div className="panel-title">
          <h2>{t("البوابات المحفوظة")}</h2>
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
                  {t("آخر تحديث")}
                  {new Date(k.updatedAt).toLocaleDateString(language)}
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
                ? t("جارٍ تحميل الخزنة...")
                : t("لم تُضف مفاتيح بعد. أضف أول بوابة للبدء.")}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
