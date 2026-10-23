import { useAppearance } from "../storefront/i18n";
import { uiText as t } from "../lib/legacy-copy";
import { useState, useEffect, useRef } from "react";
import {
  Activity,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  LockKeyhole,
  Radio,
  ChevronDown,
} from "lucide-react";
import { api, subscribeApi, orderLabel, type ApiEntry } from "../lib/api";
import type { Health, Order } from "../../shared/contracts";
import { Notice } from "./common";
function JsonView({ value }: { value: unknown }) {
  const raw = JSON.stringify(value, null, 2);
  const parts =
    raw?.split(
      /("(?:\\.|[^"\\])*"\s*:|"(?:\\.|[^"\\])*"|\b(?:true|false|null|\d+)\b)/g,
    ) || [];
  return (
    <pre className="console">
      {parts.map((part, i) => (
        <span
          key={i}
          className={
            /^".*":$/.test(part)
              ? "json-key"
              : part.startsWith('"')
                ? "json-string"
                : /^(true|false|null)$/.test(part)
                  ? "json-bool"
                  : /^\d/.test(part)
                    ? "json-number"
                    : ""
          }
        >
          {part}
        </span>
      ))}
    </pre>
  );
}
export function Inspector({
  health,
  refresh,
  checking,
  order,
  onOrder,
}: {
  health: Health | null;
  refresh: () => void;
  checking: boolean;
  order: Order | null;
  onOrder: (o: Order) => void;
}) {
  useAppearance();
  const [entries, setEntries] = useState<ApiEntry[]>([]),
    [active, setActive] = useState<string | null>(null),
    [copied, setCopied] = useState(false),
    [pollError, setPollError] = useState("");
  const updating = useRef(false),
    currentOrder = useRef(order?.id);
  currentOrder.current = order?.id;
  const [updatingOrder, setUpdatingOrder] = useState(false);
  async function refreshOrder() {
    if (!order || updating.current) return;
    const id = order.id;
    updating.current = true;
    setUpdatingOrder(true);
    try {
      const result = await api<{ order: Order }>(
        `/api/orders/${id}${order.processor === "netlify" ? "/reconcile" : ""}`,
        order.processor === "netlify" ? {} : undefined,
        { quiet: true },
      );
      if (currentOrder.current === id) {
        onOrder(result.order);
        setPollError("");
      }
    } catch {
      if (currentOrder.current === id) setPollError(t("تعذّر تحديث الحالة."));
    } finally {
      updating.current = false;
      setUpdatingOrder(false);
    }
  }
  useEffect(
    () => () => {
      currentOrder.current = undefined;
    },
    [],
  );
  useEffect(
    () =>
      subscribeApi((entry) => {
        setEntries((items) =>
          [entry, ...items.filter((item) => item.id !== entry.id)].slice(0, 12),
        );
        setActive(entry.id);
      }),
    [],
  );
  useEffect(() => {
    if (
      !order ||
      !["pending", "awaiting_payment", "unconfirmed"].includes(order.status)
    )
      return;
    let count = 0;
    const timer = setInterval(async () => {
      if (document.hidden || updating.current) return;
      if (++count > 30) {
        clearInterval(timer);
        return;
      }
      await refreshOrder();
    }, 10000);
    return () => {
      clearInterval(timer);
    };
  }, [order?.id, order?.status]);
  const selected = entries.find((e) => e.id === active) || entries[0];
  async function copy() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(selected.response, null, 2),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setPollError(t("تعذّر النسخ من المتصفح."));
    }
  }
  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <span className="inspector-icon">
          <Activity size={18} />
        </span>
        <div>
          <h2>{t("مراقب النظام الحي")}</h2>
          <span>LIVE API INSPECTOR</span>
        </div>
        <span
          className={`status-dot ${health?.core.connected ? "green" : ""}`}
        />
      </div>
      <div className="inspector-status">
        <div>
          <span>{t("قاعدة بيانات المنظومة")}</span>
          <b className={health?.database.connected ? "text-green" : ""}>
            {health
              ? health.database.connected
                ? t("متصلة")
                : t("غير متاحة")
              : checking
                ? t("جارٍ الفحص")
                : t("غير متاحة")}
          </b>
        </div>
        <div>
          <span>{t("خدمات التطبيق على Netlify")}</span>
          <b className={health?.core.connected ? "text-green" : "text-amber"}>
            {health
              ? health.core.connected
                ? t("متصل")
                : t("غير متاحة")
              : checking
                ? t("جارٍ الفحص")
                : t("غير متاح")}
          </b>
        </div>
        <div>
          <span>{t("اتصالات الدفع عبر HTTPS")}</span>
          <b>{health?.core.secure ? t("إلزامي") : t("غير متحقق")}</b>
        </div>
        <div className="server-address">
          <Radio size={12} />
          <span dir="ltr">Netlify Functions</span>
          <button
            className="icon-button"
            onClick={refresh}
            disabled={checking}
            aria-label={t("تحديث حالة الاتصال")}
          >
            <RefreshCw size={13} className={checking ? "spin" : ""} />
          </button>
        </div>
      </div>
      <div className="console-toolbar">
        <span>
          <Terminal size={13} /> {t("الاستجابة الفعلية")}
        </span>
        <button
          className="icon-button"
          onClick={copy}
          disabled={!selected}
          aria-label={t("نسخ الاستجابة")}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      {selected ? (
        <>
          <div className="request-line" dir="ltr">
            <b>{selected.method}</b>
            <code>{selected.path}</code>
          </div>
          <JsonView value={selected.response} />
          <div className="request-meta">
            <span
              className={
                selected.status >= 200 && selected.status < 300
                  ? "text-green"
                  : "text-amber"
              }
            >
              {selected.status}{" "}
              {selected.status === 102
                ? "PENDING"
                : selected.status >= 200 && selected.status < 300
                  ? "OK"
                  : "ERROR"}
            </span>
            <span>{selected.duration} ms</span>
            <span>{new Date(selected.time).toLocaleTimeString("en-GB")}</span>
          </div>
        </>
      ) : (
        <div className="console-empty">
          <Terminal size={27} />
          <p>{t("في انتظار أول طلب")}</p>
          <small>{t("تظهر هنا استجابات الخادم فور تنفيذ العمليات.")}</small>
          <span className="terminal-cursor" />
        </div>
      )}
      {entries.length > 1 && (
        <details className="request-history">
          <summary>
            {t("سجل الطلبات")}
            <span>{entries.length}</span>
            <ChevronDown size={14} />
          </summary>
          {entries.map((e) => (
            <button
              key={e.id}
              className={e.id === selected?.id ? "selected" : ""}
              onClick={() => setActive(e.id)}
            >
              <span dir="ltr">
                {e.method} {e.path}
              </span>
              <small>{e.status}</small>
            </button>
          ))}
        </details>
      )}
      <div className="checkout-section">
        <div className="checkout-title">
          <LockKeyhole size={16} />
          <h3>{t("إتمام الدفع الآمن")}</h3>
          <span>3DS</span>
        </div>
        {order ? (
          <>
            <div className="order-status">
              <span>{order.description}</span>
              <strong
                className={
                  order.status === "paid" ? "text-green" : "text-amber"
                }
              >
                {orderLabel(order.status)}
              </strong>
              <small dir="ltr">#{order.id.slice(0, 8)}</small>
            </div>
            {order.checkoutUrl &&
              ["pending", "awaiting_payment", "unconfirmed"].includes(
                order.status,
              ) && (
                <>
                  {order.processor !== "netlify" && (
                    <iframe
                      className="three-ds-frame"
                      title={t("إتمام الدفع والتحقق البنكي")}
                      src={order.checkoutUrl}
                      sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
                      allow="payment"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  <a
                    className="button subtle small"
                    href={order.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("فتح صفحة الدفع")}
                    <ExternalLink size={14} />
                  </a>
                  <small className="muted">
                    {t("إذا منعت البوابة العرض المدمج، استخدم صفحة الدفع.")}
                  </small>
                </>
              )}
            {pollError && <Notice>{pollError}</Notice>}
            <button
              className="button subtle small"
              disabled={updatingOrder}
              onClick={() => void refreshOrder()}
            >
              {t("تحديث حالة الطلب")}
              <RefreshCw size={13} />
            </button>
          </>
        ) : (
          <div className="checkout-empty">
            <div className="lock-orbit">
              <LockKeyhole size={24} />
            </div>
            <p>{t("جاهز عندما تكون جاهزاً")}</p>
            <small>
              {t("تظهر نافذة التحقق البنكي هنا عند إنشاء عملية دفع.")}
            </small>
          </div>
        )}
      </div>
      <div className="inspector-footer">
        <ShieldCheckIcon /> {t("بيانات حساسة محجوبة من السجل")}
      </div>
    </aside>
  );
}
function ShieldCheckIcon() {
  return <LockKeyhole size={12} />;
}
