import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  Download,
  Fingerprint,
  Monitor,
  Smartphone,
  WifiOff,
} from "lucide-react";
import type { EcosystemStatus } from "../../../shared/ecosystem";
import type { SessionUser } from "../../components/auth";
import { useAppearance } from "../../storefront/i18n";
import { api } from "../../lib/api";
import { Modal } from "../../components/Modal";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
type DeliveryConfig = {
  pushKey: string | null;
  appleUrl: string | null;
  googleUrl: string | null;
};

function PushControls({ user }: { user: SessionUser }) {
  const { tr } = useAppearance();
  const [config, setConfig] = useState<DeliveryConfig | null>(null),
    [configState, setConfigState] = useState<"loading" | "ready" | "error">(
      "loading",
    ),
    [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const alive = useRef(true);
  const supported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
  useEffect(() => {
    alive.current = true;
    void api<DeliveryConfig>("/api/experience/config", undefined, {
      quiet: true,
    })
      .then((value) => {
        if (alive.current) {
          setConfig(value);
          setConfigState("ready");
        }
      })
      .catch(() => {
        if (alive.current) setConfigState("error");
      });
    if (supported)
      void navigator.serviceWorker
        .getRegistration("/")
        .then(async (registration) => {
          const subscription =
            await registration?.pushManager.getSubscription();
          if (!subscription || !alive.current) return;
          const result = await api<{ subscribed: boolean }>(
            "/api/experience/push/status",
            { endpoint: subscription.endpoint },
            { quiet: true },
          );
          if (alive.current) setEnabled(result.subscribed);
        })
        .catch(() => {});
    return () => {
      alive.current = false;
    };
  }, [user.id, supported]);
  async function toggle() {
    if (busy || !supported) return;
    setBusy(true);
    setMessage("");
    try {
      // Request permission synchronously from the user's click (required by Safari).
      const permissionPromise = !enabled
        ? Notification.requestPermission()
        : Promise.resolve("granted");
      if ((await permissionPromise) !== "granted")
        throw new Error("permission");
      if (!alive.current) return;
      const registration = await navigator.serviceWorker.getRegistration("/");
      if (!alive.current) return;
      if (!registration?.active) throw new Error("worker");
      let subscription = await registration.pushManager.getSubscription();
      if (!alive.current) return;
      if (enabled) {
        if (subscription) {
          await api(
            "/api/experience/push/unsubscribe",
            { endpoint: subscription.endpoint },
            { quiet: true },
          );
          if (!alive.current) return;
          await subscription.unsubscribe();
        }
        if (alive.current) {
          setEnabled(false);
          setMessage(
            tr(
              "تم إيقاف التنبيهات على هذا الجهاز.",
              "Notifications disabled on this device.",
            ),
          );
        }
      } else {
        if (!config?.pushKey) throw new Error("configuration");
        const binary = atob(
          config.pushKey.replace(/-/g, "+").replace(/_/g, "/") +
            "=".repeat((4 - (config.pushKey.length % 4)) % 4),
        );
        const key = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        let created = false;
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key,
          });
          created = true;
        }
        if (!alive.current) {
          if (created) await subscription.unsubscribe();
          return;
        }
        try {
          await api(
            "/api/experience/push/subscribe",
            { subscription: subscription.toJSON() },
            { quiet: true },
          );
        } catch (error) {
          if (created) await subscription.unsubscribe();
          throw error;
        }
        if (alive.current) {
          setEnabled(true);
          setMessage(
            tr(
              "تم تفعيل التنبيهات لهذا الحساب على هذا الجهاز.",
              "Notifications enabled for this account on this device.",
            ),
          );
        }
      }
    } catch {
      if (alive.current)
        setMessage(
          tr(
            "تعذّر تغيير التنبيهات. راجع إذن المتصفح وحالة الاتصال، وعلى iPhone افتح التطبيق من الشاشة الرئيسية.",
            "Could not update notifications. Check browser permission and connectivity. On iPhone, open the installed Home Screen app.",
          ),
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!alive.current) return;
      if (!subscription) throw new Error("subscription");
      await api(
        "/api/experience/push/test",
        { endpoint: subscription.endpoint },
        { quiet: true },
      );
      if (alive.current)
        setMessage(
          tr(
            "قُبل طلب الإشعار التجريبي. ظهوره يعتمد على إعدادات جهازك.",
            "Test notification accepted. Display depends on your device settings.",
          ),
        );
    } catch {
      if (alive.current)
        setMessage(
          tr(
            "تعذّر إرسال الإشعار التجريبي.",
            "The test notification could not be sent.",
          ),
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <div className="lux-push-controls">
      <p>
        {tr(
          "تنبيهات اختيارية عند جاهزية مسودة مهمة للمراجعة أو تعذّرها. لا تتضمن اسمك أو محتوى عملك، ويمكنك إيقافها هنا.",
          "Optional notifications when a task draft needs review or a task fails. They contain no name or work content, and you can disable them here.",
        )}
      </p>
      {!supported ? (
        <p>
          {tr(
            "التنبيهات غير مدعومة هنا. على iPhone ثبّت التطبيق وافتحه من الشاشة الرئيسية.",
            "Notifications are unavailable here. On iPhone, install and open the Home Screen app.",
          )}
        </p>
      ) : (
        <>
          <button
            className="lux-text-button"
            disabled={busy || (!enabled && !config?.pushKey)}
            onClick={() => void toggle()}
          >
            {enabled ? <BellOff size={16} /> : <Bell size={16} />}
            {enabled
              ? tr("إيقاف التنبيهات", "Disable notifications")
              : tr("تفعيل التنبيهات", "Enable notifications")}
          </button>
          {enabled && (
            <button
              className="lux-text-button"
              disabled={busy}
              onClick={() => void test()}
            >
              {tr("اختبار على هذا الجهاز", "Test on this device")}
            </button>
          )}
          {!config?.pushKey && (
            <small>
              {configState === "loading"
                ? tr(
                    "جار التحقق من خدمة التنبيهات…",
                    "Checking notification availability…",
                  )
                : configState === "error"
                  ? tr(
                      "تعذّر التحقق من التنبيهات. أعد فتح الصفحة بعد استعادة الاتصال.",
                      "Could not check notifications. Reopen the page when connected.",
                    )
                  : tr(
                      "خدمة التنبيهات بانتظار التفعيل.",
                      "Notification service is awaiting activation.",
                    )}
            </small>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}

export default function InstallStudio({
  status,
  user,
  onLogin,
}: {
  status: EcosystemStatus | null;
  user: SessionUser | null;
  onLogin: () => void;
}) {
  const { tr } = useAppearance();
  const [install, setInstall] = useState<InstallEvent | null>(null),
    [installed, setInstalled] = useState(
      matchMedia("(display-mode: standalone)").matches ||
        !!(navigator as Navigator & { standalone?: boolean }).standalone ||
        !!(
          window as Window & {
            Capacitor?: { isNativePlatform?: () => boolean };
          }
        ).Capacitor?.isNativePlatform?.(),
    );
  const [help, setHelp] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [config, setConfig] = useState<DeliveryConfig | null>(null);
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/.test(navigator.userAgent);
  useEffect(() => {
    let alive = true;
    const before = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setInstall(null);
    };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", done);
    void api<DeliveryConfig>("/api/experience/config", undefined, {
      quiet: true,
    })
      .then((value) => {
        if (alive) setConfig(value);
      })
      .catch(() => {});
    return () => {
      alive = false;
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  async function download() {
    if (!install) {
      setHelp(true);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await install.prompt();
      const choice = await install.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? tr("تم قبول طلب التثبيت.", "Installation accepted.")
          : tr("يمكنك تثبيت التطبيق لاحقاً.", "You can install later."),
      );
    } catch {
      setHelp(true);
    } finally {
      setInstall(null);
      setBusy(false);
    }
  }
  return (
    <section id="install" className="lux-wrap lux-section">
      <div className="lux-install" data-reveal>
        <div>
          <span className="lux-eyebrow">05 / ALWAYS WITHIN REACH</span>
          <h2>{tr("مساحتك.\nأينما كنت.", "Your space.\nWherever you are.")}</h2>
          <p>
            {tr(
              "من شاشة المكتب إلى راحة يدك. ثبّت OneShot للوصول المباشر، وافتح دليل المنظومة حتى عند انقطاع الاتصال.",
              "From your desk to the palm of your hand. Install OneShot for direct access and an ecosystem guide available offline.",
            )}
          </p>
          <div className="lux-install-actions">
            {installed ? (
              <span className="lux-installed">
                <Check size={18} />
                {tr("تستخدم تجربة التطبيق", "You're in the app experience")}
              </span>
            ) : (
              <button
                className="lux-button lux-button-gold"
                disabled={busy}
                onClick={() => void download()}
              >
                {ios || android ? (
                  <Smartphone size={17} />
                ) : (
                  <Download size={17} />
                )}
                {ios
                  ? tr("أضف إلى iPhone / iPad", "Add to iPhone / iPad")
                  : android
                    ? tr("ثبّت على Android", "Install on Android")
                    : tr("ثبّت تطبيق OneShot", "Install OneShot")}
              </button>
            )}
            {config?.appleUrl && (
              <a
                className="lux-button"
                href={config.appleUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                App Store
              </a>
            )}
            {config?.googleUrl && (
              <a
                className="lux-button"
                href={config.googleUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Play
              </a>
            )}
            {android && status?.apkUrl && (
              <a className="lux-text-button" href={status.apkUrl}>
                Android APK <Download size={16} />
              </a>
            )}
          </div>
          {message && <p role="status">{message}</p>}
          <div className="lux-install-notes">
            <span>
              <Monitor size={15} />
              Chrome · Safari · Edge
            </span>
            <span>
              <WifiOff size={15} />
              {tr("دليل متاح دون اتصال", "Offline guide")}
            </span>
          </div>
          <small>
            {tr(
              "المحادثات والمدفوعات تحتاج اتصالاً. روابط المتاجر تظهر عند توفير إصدار منشور.",
              "Chat and payments require a connection. Store links appear when a published release is configured.",
            )}
          </small>
          {user ? (
            <PushControls key={user.id} user={user} />
          ) : (
            <button
              className="lux-text-button lux-notification-login"
              onClick={onLogin}
            >
              <Fingerprint size={16} />
              {tr(
                "سجّل الدخول لإدارة التنبيهات",
                "Sign in to manage notifications",
              )}
            </button>
          )}
        </div>
        <div className="lux-device-art" aria-hidden="true">
          <div className="lux-phone">
            <div className="lux-phone-island" />
            <span>
              9:41 <i>•••</i>
            </span>
            <img src="/oneshot.svg" width="40" height="40" alt="" />
            <strong>oneShot</strong>
            <small>
              YOUR WORLD.
              <br />
              IN ONE PLACE.
            </small>
            <div className="lux-phone-orbit">
              <i />
              <i />
              <i />
            </div>
            <div className="lux-phone-dock">
              <LayersIcon />
              <Bell size={16} />
              <Fingerprint size={16} />
            </div>
            <b className="lux-home-indicator" />
          </div>
          <span className="lux-device-caption">DESIGNED TO GO WITH YOU</span>
        </div>
      </div>
      {help && (
        <Modal
          title={tr("تثبيت OneShot", "Install OneShot")}
          onClose={() => setHelp(false)}
        >
          <div className="lux-install-help">
            <p>
              {ios
                ? tr(
                    "افتح الموقع في Safari، اضغط مشاركة، ثم «إضافة إلى الشاشة الرئيسية» وأكّد الإضافة. بعد ذلك افتح التطبيق من الأيقونة الجديدة.",
                    "Open this site in Safari, tap Share, then Add to Home Screen and confirm. Open the app from the new icon.",
                  )
                : tr(
                    "افتح قائمة Chrome أو Edge واختر «تثبيت OneShot» أو «تثبيت الصفحة كتطبيق». على Android قد يظهر الخيار باسم «إضافة إلى الشاشة الرئيسية». إذا لم يظهر، افتح الموقع في متصفح مستقل وتحقق من اتصالك.",
                    "Open the Chrome or Edge menu and choose Install OneShot or Install page as app. On Android it may say Add to Home screen. If unavailable, open the site in a standalone browser and check your connection.",
                  )}
            </p>
            <p>
              {tr(
                "التثبيت من المتصفح مستقل عن App Store وGoogle Play.",
                "Browser installation is separate from the App Store and Google Play.",
              )}
            </p>
          </div>
        </Modal>
      )}
    </section>
  );
}
function LayersIcon() {
  return <Monitor size={16} />;
}
