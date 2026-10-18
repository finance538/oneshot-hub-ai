import { useState, useEffect } from "react";
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
  const [entries, setEntries] = useState<ApiEntry[]>([]),
    [active, setActive] = useState<string | null>(null),
    [copied, setCopied] = useState(false),
    [pollError, setPollError] = useState("");
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
    let alive = true,
      count = 0;
    const timer = setInterval(async () => {
      if (++count > 30) {
        clearInterval(timer);
        return;
      }
      try {
        const result = await api<{ order: Order }>(
          `/api/orders/${order.id}${order.processor === "netlify" ? "/reconcile" : ""}`,
          order.processor === "netlify" ? {} : undefined,
          { quiet: true },
        );
        if (alive) {
          onOrder(result.order);
          setPollError("");
        }
      } catch {
        if (alive) setPollError("تعذّر تحديث حالة الطلب تلقائياً.");
      }
    }, 10000);
    return () => {
      alive = false;
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
    }
  }
  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <span className="inspector-icon">
          <Activity size={18} />
        </span>
        <div>
          <h2>مراقب النظام الحي</h2>
          <span>LIVE API INSPECTOR</span>
        </div>
        <span
          className={`status-dot ${health?.core.connected ? "green" : ""}`}
        />
      </div>
      <div className="inspector-status">
        <div>
          <span>قاعدة بيانات المنظومة</span>
          <b className={health?.database.connected ? "text-green" : ""}>
            {health
              ? health.database.connected
                ? "متصلة"
                : "غير متاحة"
              : checking
                ? "جارٍ الفحص"
                : "غير متاحة"}
          </b>
        </div>
        <div>
          <span>خدمات التطبيق على Netlify</span>
          <b className={health?.core.connected ? "text-green" : "text-amber"}>
            {health
              ? health.core.connected
                ? "متصل"
                : "غير متاحة"
              : checking
                ? "جارٍ الفحص"
                : "غير متاح"}
          </b>
        </div>
        <div>
          <span>اتصالات الدفع عبر HTTPS</span>
          <b>{health?.core.secure ? "إلزامي" : "غير متحقق"}</b>
        </div>
        <div className="server-address">
          <Radio size={12} />
          <span dir="ltr">Netlify Functions</span>
          <button
            className="icon-button"
            onClick={refresh}
            disabled={checking}
            aria-label="تحديث حالة الاتصال"
          >
            <RefreshCw size={13} className={checking ? "spin" : ""} />
          </button>
        </div>
      </div>
      <div className="console-toolbar">
        <span>
          <Terminal size={13} /> الاستجابة الفعلية
        </span>
        <button
          className="icon-button"
          onClick={copy}
          disabled={!selected}
          aria-label="نسخ الاستجابة"
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
          <p>في انتظار أول طلب</p>
          <small>تظهر هنا استجابات الخادم فور تنفيذ العمليات.</small>
          <span className="terminal-cursor" />
        </div>
      )}
      {entries.length > 1 && (
        <details className="request-history">
          <summary>
            سجل الطلبات <span>{entries.length}</span>
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
          <h3>إتمام الدفع الآمن</h3>
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
            {order.checkoutUrl && order.status !== "paid" && (
              <>
                {order.processor !== "netlify" && (
                  <iframe
                    className="three-ds-frame"
                    title="إتمام الدفع والتحقق البنكي"
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
                  فتح صفحة الدفع <ExternalLink size={14} />
                </a>
                <small className="muted">
                  إذا منعت البوابة العرض المدمج، استخدم صفحة الدفع.
                </small>
              </>
            )}
            {pollError && <Notice>{pollError}</Notice>}
            <button
              className="button subtle small"
              onClick={async () => {
                try {
                  const r = await api<{ order: Order }>(
                    `/api/orders/${order.id}${order.processor === "netlify" ? "/reconcile" : ""}`,
                    order.processor === "netlify" ? {} : undefined,
                  );
                  onOrder(r.order);
                  setPollError("");
                } catch {
                  setPollError("تعذّر تحديث الحالة.");
                }
              }}
            >
              تحديث حالة الطلب <RefreshCw size={13} />
            </button>
          </>
        ) : (
          <div className="checkout-empty">
            <div className="lock-orbit">
              <LockKeyhole size={24} />
            </div>
            <p>جاهز عندما تكون جاهزاً</p>
            <small>تظهر نافذة التحقق البنكي هنا عند إنشاء عملية دفع.</small>
          </div>
        )}
      </div>
      <div className="inspector-footer">
        <ShieldCheckIcon /> بيانات حساسة محجوبة من السجل
      </div>
    </aside>
  );
}
function ShieldCheckIcon() {
  return <LockKeyhole size={12} />;
}
