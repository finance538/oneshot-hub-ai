import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  BellOff,
  ArrowUpRight,
  MonitorSmartphone,
  Check,
  WifiOff,
} from "lucide-react";
import { api } from "../lib/api";
import { useAppearance } from "../storefront/i18n";
import type { EcosystemStatus } from "../../shared/ecosystem";

function PushControls({
  signedIn,
  onSignIn,
}: {
  signedIn: boolean;
  onSignIn: () => void;
}) {
  const { tr } = useAppearance();
  const [config, setConfig] = useState<{
    enabled: boolean;
    publicKey: string | null;
  } | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const alive = useRef(true);
  const supported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
  useEffect(() => {
    alive.current = true;
    void api<{ enabled: boolean; publicKey: string | null }>(
      "/api/notifications/config",
      undefined,
      { quiet: true },
    )
      .then((value) => {
        if (alive.current) setConfig(value);
      })
      .catch(() => {
        if (alive.current)
          setMessage(
            tr(
              "تعذّر التحقق من خدمة الإشعارات. أعد تحميل الصفحة للمحاولة.",
              "Could not check notifications. Reload to try again.",
            ),
          );
      });
    if (supported && signedIn)
      void navigator.serviceWorker
        .getRegistration("/")
        .then(async (registration) => {
          const sub = await registration?.pushManager.getSubscription();
          if (!sub) return;
          const result = await api<{ subscribed: boolean }>(
            "/api/notifications/status",
            { endpoint: sub.endpoint },
            { quiet: true },
          );
          if (alive.current && result.subscribed) setSubscription(sub);
        })
        .catch(() => {});
    return () => {
      alive.current = false;
    };
  }, [signedIn]);
  async function enable() {
    if (!signedIn) {
      onSignIn();
      return;
    }
    if (!supported || !config?.publicKey || busy) return;
    setBusy(true);
    setMessage("");
    try {
      // Permission is requested only from this explicit click, including iOS.
      const permission = await Notification.requestPermission();
      if (!alive.current) return;
      if (permission !== "granted")
        throw new Error(
          tr(
            "لم يُمنح إذن الإشعارات. يمكنك تغييره في إعدادات المتصفح.",
            "Notification permission was not granted. You can change it in browser settings.",
          ),
        );
      const registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration?.active)
        throw new Error(
          tr(
            "التطبيق يتهيأ. أعد المحاولة بعد لحظات.",
            "The app is preparing. Try again shortly.",
          ),
        );
      const bytes = Uint8Array.from(
        atob(
          config.publicKey.replace(/-/g, "+").replace(/_/g, "/") +
            "=".repeat((4 - (config.publicKey.length % 4)) % 4),
        ),
        (char) => char.charCodeAt(0),
      );
      const sub =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: bytes,
        }));
      if (!alive.current) return;
      await api("/api/notifications/subscription", sub.toJSON(), {
        quiet: true,
      });
      if (alive.current) {
        setSubscription(sub);
        setMessage(
          tr(
            "تم تفعيل الإشعارات لهذا الحساب والجهاز لمدة ٩٠ يوماً. يمكنك إلغاؤها هنا.",
            "Notifications are enabled for this account and device for 90 days. You can disable them here.",
          ),
        );
      }
    } catch (error) {
      if (alive.current)
        setMessage(
          error instanceof Error
            ? error.message
            : tr("تعذّر التفعيل.", "Could not enable notifications."),
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function disable() {
    if (!subscription || busy) return;
    setBusy(true);
    setMessage("");
    try {
      // Remove the server record first: a failed browser unsubscribe cannot
      // leave this account receiving notifications from this service.
      await api(
        "/api/notifications/subscription",
        { endpoint: subscription.endpoint },
        { method: "DELETE", quiet: true },
      );
      await subscription.unsubscribe();
      if (alive.current) {
        setSubscription(null);
        setMessage(tr("تم إلغاء الاشتراك.", "Subscription removed."));
      }
    } catch {
      if (alive.current)
        setMessage(
          tr(
            "تعذّر تأكيد الإلغاء. أعد المحاولة أو ألغِ الإذن من المتصفح.",
            "Could not confirm removal. Retry or revoke permission in your browser.",
          ),
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function sendTest() {
    if (!subscription || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await api(
        "/api/notifications/test",
        { endpoint: subscription.endpoint },
        { quiet: true },
      );
      if (alive.current)
        setMessage(
          tr(
            "قبل مزود الإشعارات الطلب. ظهور الإشعار يعتمد على إعدادات جهازك.",
            "The push service accepted the request. Display depends on your device settings.",
          ),
        );
    } catch (error) {
      if (alive.current)
        setMessage(
          error instanceof Error
            ? error.message
            : tr("تعذّر الإرسال.", "Could not send."),
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <div className="lux-push">
      <h3>
        <Bell size={17} />
        {tr("إشعارات بإذنك", "Notifications, on your terms")}
      </h3>
      {!supported ? (
        <p>
          {tr(
            "افتح التطبيق المثبّت في متصفح يدعم الإشعارات. على iPhone: أضفه إلى الشاشة الرئيسية أولاً.",
            "Use an installed app in a supported browser. On iPhone, add it to your Home Screen first.",
          )}
        </p>
      ) : config?.enabled ? (
        <div className="hub-actions">
          {subscription ? (
            <>
              <button
                className="hub-button"
                disabled={busy}
                onClick={() => void sendTest()}
              >
                <Bell size={15} />
                {tr("أرسل إشعاراً تجريبياً لجهازي", "Send my device a test")}
              </button>
              <button
                className="hub-text-link"
                disabled={busy}
                onClick={() => void disable()}
              >
                <BellOff size={15} />
                {tr("إلغاء الاشتراك", "Unsubscribe")}
              </button>
            </>
          ) : (
            <button
              className="hub-button"
              disabled={busy}
              onClick={() => void enable()}
            >
              <Bell size={15} />
              {tr(
                signedIn ? "تفعيل لهذا الجهاز" : "سجّل الدخول لتفعيل الإشعارات",
                signedIn
                  ? "Enable on this device"
                  : "Sign in to enable notifications",
              )}
            </button>
          )}
        </div>
      ) : (
        <p>
          {tr(
            config
              ? "الإشعارات بانتظار تهيئة الخدمة."
              : "جارٍ التحقق من توفر الإشعارات…",
            config
              ? "Notifications are awaiting service configuration."
              : "Checking notification availability…",
          )}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
export default function AppCenter({
  downloadActions,
  status,
  installed,
  userId,
  onSignIn,
}: {
  downloadActions: ReactNode;
  status: EcosystemStatus | null;
  installed: boolean;
  userId?: string;
  onSignIn: () => void;
}) {
  const { tr } = useAppearance();
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/.test(navigator.userAgent);
  return (
    <section id="install" className="hub-wrap hub-section lux-install">
      <div className="lux-install-copy">
        <span className="hub-kicker">05 / ALWAYS WITHIN REACH</span>
        <h2>{tr("مساحتك. أينما تكون.", "Your space. Wherever you are.")}</h2>
        <p>
          {tr(
            "على مكتبك أو في جيبك. ثبّت ون شوت من المتصفح وافتح مساحتك مباشرة من شاشة جهازك.",
            "At your desk or in your pocket. Install OneShot from your browser and open your workspace from your device’s home screen.",
          )}
        </p>
        <span className="lux-device-label">
          <MonitorSmartphone size={16} />
          {ios ? "iPhone / iPad" : android ? "Android" : "Desktop / Chrome"}
          {installed && (
            <>
              <Check size={14} />
              {tr("مثبّت", "Installed")}
            </>
          )}
        </span>
        {downloadActions}
        <div className="lux-store-links">
          {status?.iosStoreUrl && (
            <a
              className="hub-button"
              href={status.iosStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              App Store <ArrowUpRight size={14} />
            </a>
          )}
          {status?.playStoreUrl && (
            <a
              className="hub-button"
              href={status.playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Play <ArrowUpRight size={14} />
            </a>
          )}
        </div>
        <details>
          <summary>
            {tr("طريقة التثبيت على جهازك", "Installation instructions")}
          </summary>
          <p>
            {ios
              ? tr(
                  "في Safari: مشاركة ← إضافة إلى الشاشة الرئيسية ← إضافة. افتح التطبيق من الأيقونة لتفعيل الإشعارات على إصدار iOS يدعمها.",
                  "In Safari: Share → Add to Home Screen → Add. Open from the icon to enable notifications on a supported iOS version.",
                )
              : tr(
                  "في Chrome أو Edge: افتح قائمة المتصفح، ثم تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية. يظهر زر التثبيت المباشر عندما يتيحه المتصفح.",
                  "In Chrome or Edge, open the browser menu and choose Install app or Add to Home screen. Direct installation appears when the browser makes it available.",
                )}
          </p>
        </details>
        <small>
          {tr(
            "تظهر روابط المتاجر عند إعداد إصداراتها المنشورة. التثبيت من المتصفح متاح وفق دعم جهازك.",
            "Store links appear when published releases are configured. Browser installation depends on your device.",
          )}
        </small>
      </div>
      <div className="lux-install-panel">
        <div className="lux-mini-shell" aria-hidden="true">
          <div>
            <i />
            <span>ONESHOT / YOUR SPACE</span>
            <i />
          </div>
          <img src="/oneshot.svg" alt="" width="48" height="48" />
          <strong>
            Good work.
            <br />
            <em>Anywhere.</em>
          </strong>
          <span className="lux-mini-dock">
            <span>HUB</span>
            <span>AI</span>
            <span>WORKFLOW</span>
          </span>
        </div>
        <div className="lux-offline-note">
          <WifiOff size={18} />
          <p>
            {tr(
              "صفحة عامة وحاسبة تعملان دون اتصال. تسجيل الدخول والمهام والدفع تحتاج إلى الإنترنت.",
              "A public page and calculator are available offline. Sign-in, tasks and payments need a connection.",
            )}
          </p>
        </div>
        <PushControls
          key={userId || "visitor"}
          signedIn={!!userId}
          onSignIn={onSignIn}
        />
      </div>
    </section>
  );
}
