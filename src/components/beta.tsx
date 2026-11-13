import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  Gift,
  ImagePlus,
  LifeBuoy,
  Send,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Modal, Notice } from "./common";
import { api } from "../lib/api";
import { useAppearance } from "../storefront/i18n";
import "./beta.css";

/**
 * طبقة البيتا: إشعار أول زيارة، وزر «أبلغ عن مشكلة» الثابت.
 *
 * المنصة في فترة تجريبية، فمن حق كل زائر أن يعرف ذلك قبل أن يبدأ: الخدمات
 * مجانية إلى أن تنتهي الفترة، والأخطاء واردة، والإبلاغ عنها لقطة شاشة ونقرة.
 * الإشعار يظهر لمن يفتح المنصة أول مرة على هذا الجهاز، ولمن غاب طويلاً ثم عاد.
 * البلاغ نفسه مفتوح للزائر بلا حساب، ويصل إلى صندوق الدعم بالبريد.
 */

const SEEN_KEY = "oneshot.beta.seen";
const AWAY_DAYS = 14;
const MAX_BYTES = 3_000_000;

function shouldAnnounce() {
  try {
    const seen = Number(localStorage.getItem(SEEN_KEY) || 0);
    return !seen || Date.now() - seen > AWAY_DAYS * 86_400_000;
  } catch {
    // متصفح يمنع التخزين: نعرض الإشعار مرة في هذه الجلسة ولا نُلحّ.
    return false;
  }
}

function remember() {
  try {
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    /* لا شيء يعتمد على نجاح التخزين. */
  }
}

export function BetaLayer() {
  const { tr } = useAppearance();
  const [notice, setNotice] = useState(false);
  const [report, setReport] = useState(false);
  const [sent, setSent] = useState("");
  useEffect(() => {
    if (shouldAnnounce()) setNotice(true);
  }, []);
  const close = () => {
    remember();
    setNotice(false);
  };
  return (
    <>
      <button
        type="button"
        className="beta-launcher"
        onClick={() => setReport(true)}
      >
        <LifeBuoy size={15} />
        {tr("أبلغ عن مشكلة", "Report a problem")}
      </button>
      {notice && (
        <BetaNotice
          onClose={close}
          onReport={() => {
            close();
            setReport(true);
          }}
        />
      )}
      {report && (
        <ReportDialog
          onClose={() => setReport(false)}
          onSent={(message) => setSent(message)}
        />
      )}
      {sent && (
        <Modal
          title={tr("وصل بلاغك", "Report received")}
          onClose={() => setSent("")}
        >
          <p>{sent}</p>
          <button
            className="button primary"
            type="button"
            onClick={() => setSent("")}
          >
            {tr("إغلاق", "Close")}
          </button>
        </Modal>
      )}
    </>
  );
}

function BetaNotice({
  onClose,
  onReport,
}: {
  onClose: () => void;
  onReport: () => void;
}) {
  const { tr } = useAppearance();
  const points = [
    {
      icon: Gift,
      title: tr("كل الخدمات مجانية خلال التجربة", "Free during the beta"),
      text: tr(
        "كل ميزة تراها مجانية إلى أن تنتهي الفترة التجريبية.",
        "Every feature you see is free until the beta ends.",
      ),
    },
    {
      icon: TriangleAlert,
      title: tr("توقّع مشاكل تقنية", "Expect rough edges"),
      text: tr(
        "هذه أول نسخة تظهر للعامة، فمن المتوقع أن تواجهك أخطاء تقنية.",
        "This is the first public release, so technical problems are likely.",
      ),
    },
    {
      icon: Camera,
      title: tr("أبلغنا عن أي خطأ", "Report anything that breaks"),
      text: tr(
        "اضغط «أبلغ عن مشكلة»، الصق لقطة شاشة، ويصل البلاغ مباشرة لفريق الدعم.",
        "Tap “Report a problem”, paste a screenshot, and it reaches support directly.",
      ),
    },
  ];
  return (
    <Modal
      title={tr("أهلاً بك — هذه نسخة تجريبية", "Welcome — this is a beta")}
      onClose={onClose}
    >
      <p>
        {tr(
          "شكراً لأنك من الأوائل. بلاغاتك هي ما يحوّل هذه النسخة إلى منتج مكتمل.",
          "Thank you for being early. Your reports are what finish this product.",
        )}
      </p>
      <ul className="beta-points">
        {points.map((point) => {
          const Icon = point.icon;
          return (
            <li key={point.title}>
              <span className="beta-point-icon">
                <Icon size={17} />
              </span>
              <span>
                <strong>{point.title}</strong>
                <small>{point.text}</small>
              </span>
            </li>
          );
        })}
      </ul>
      <button type="button" className="button primary" onClick={onClose}>
        <BadgeCheck size={16} /> {tr("تمام، لنبدأ", "Got it")}
      </button>{" "}
      <button type="button" className="button subtle" onClick={onReport}>
        <Camera size={15} /> {tr("أبلغ عن مشكلة الآن", "Report now")}
      </button>
    </Modal>
  );
}

function ReportDialog({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const { tr } = useAppearance();
  const [note, setNote] = useState("");
  const [contact, setContact] = useState("");
  const [shot, setShot] = useState<{ data: string; mime: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const picker = useRef<HTMLInputElement>(null);

  async function attach(file: File | null | undefined) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setError(
        tr(
          "أرفق صورة بصيغة PNG أو JPG أو WEBP.",
          "Attach a PNG, JPG or WEBP image.",
        ),
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(
        tr(
          "حجم اللقطة يجب أن يكون أقل من ٣ ميجابايت.",
          "The screenshot must be under 3 MB.",
        ),
      );
      return;
    }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(String(reader.result || "").replace(/^data:[^,]+,/, ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (!data) {
      setError(tr("لم تتم قراءة الصورة.", "That image could not be read."));
      return;
    }
    setError("");
    setShot({ data, mime: file.type });
  }

  async function submit() {
    if (!note.trim()) {
      setError(tr("اكتب ما حدث أولاً.", "Tell us what happened first."));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/support/report", {
        message: note.trim(),
        contact: contact.trim() || undefined,
        page: location.pathname + location.search,
        ...(shot ? { screenshot: shot.data, mime: shot.mime } : {}),
      });
      onSent(
        tr(
          "وصل بلاغك للدعم. شكراً لك — بهذا تتحسّن النسخة التجريبية.",
          "Your report reached support. Thank you.",
        ),
      );
      onClose();
    } catch (failure) {
      setError(
        (failure as Error)?.message ||
          tr("لم يُرسل البلاغ. حاول مرة أخرى.", "The report could not be sent."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={tr("أبلغ عن مشكلة", "Report a problem")} onClose={onClose}>
      <div
        className="report-form"
        onPaste={(event) => {
          const item = Array.from(event.clipboardData?.files || [])[0];
          if (item) {
            event.preventDefault();
            void attach(item);
          }
        }}
      >
        <p className="beta-micro">
          {tr(
            "المنصة في فترة تجريبية ومجانية خلالها. إذا واجهتك مشكلة، لقطة الشاشة تساعدنا على إصلاحها بسرعة.",
            "The platform is in beta and free meanwhile. A screenshot helps us fix it fast.",
          )}
        </p>
        <label>
          {tr("ماذا حدث؟", "What happened?")}
          <textarea
            rows={4}
            maxLength={3000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={tr(
              "اشرح المشكلة. تجنّب كلمات المرور وبيانات الحساب الخاصة.",
              "Describe the problem. Avoid passwords or private account details.",
            )}
          />
        </label>
        <label>
          {tr(
            "بريدك (اختياري، ليتمكّن الدعم من الرد)",
            "Your email (optional, so support can reply)",
          )}
          <input
            type="email"
            inputMode="email"
            maxLength={160}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="name@example.com"
            dir="ltr"
          />
        </label>
        <div className="report-shot">
          {shot ? (
            <>
              <img
                src={`data:${shot.mime};base64,${shot.data}`}
                alt={tr("اللقطة المرفقة", "Attached screenshot")}
              />
              <button
                type="button"
                className="button subtle small"
                onClick={() => setShot(null)}
              >
                <Trash2 size={14} /> {tr("إزالة اللقطة", "Remove screenshot")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="button subtle small"
                onClick={() => picker.current?.click()}
              >
                <ImagePlus size={15} />{" "}
                {tr("إرفاق لقطة شاشة", "Attach a screenshot")}
              </button>
              <span className="beta-micro">
                {tr(
                  "أو خُذ لقطة شاشة وألصقها هنا (Ctrl/⌘ + V، أو اضغط مطولاً ثم لصق).",
                  "Or take a screenshot and paste it here.",
                )}
              </span>
            </>
          )}
          <input
            ref={picker}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => void attach(event.target.files?.[0])}
          />
        </div>
        {error && <Notice>{error}</Notice>}
        <button
          type="button"
          className="button primary"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? tr("جارٍ الإرسال…", "Sending…") : tr("إرسال إلى الدعم", "Send to support")}
          <Send size={16} />
        </button>
        <p className="beta-micro">
          support@1shotcam.com ·{" "}
          {tr(
            "يُرسل فقط ما تكتبه واللقطة إن أرفقتها. لا تُرفق المحادثات أو الملفات.",
            "Only what you type and the optional screenshot are sent.",
          )}
        </p>
      </div>
    </Modal>
  );
}
