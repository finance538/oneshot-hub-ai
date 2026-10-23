import { PriceBadge } from "../../commerce/Journey";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpLeft,
  AudioLines,
  LoaderCircle,
  Square,
  Volume2,
} from "lucide-react";
import { Modal } from "../../components/Modal";
import { api } from "../../lib/api";
import { appearanceLink, useAppearance } from "../../storefront/i18n";

type Recommendation = {
  sku: string;
  name: string;
  reason: string;
  amount: number;
  currency: string;
  billingCycle: string;
  pricingType: string;
};
export default function Concierge({ onClose }: { onClose: () => void }) {
  const { tr, language } = useAppearance();
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [answer, setAnswer] = useState<Recommendation | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const alive = useRef(true);
  const speech = typeof speechSynthesis !== "undefined";
  useEffect(() => {
    alive.current = true;
    const stop = () => {
      if (document.hidden && speech) {
        speechSynthesis.cancel();
        setSpeaking(false);
      }
    };
    document.addEventListener("visibilitychange", stop);
    return () => {
      alive.current = false;
      if (speech) speechSynthesis.cancel();
      document.removeEventListener("visibilitychange", stop);
    };
  }, [speech]);
  function speak(text: string) {
    if (!speech) return;
    speechSynthesis.cancel();
    if (speaking) {
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "ar" ? "ar-SA" : "en-US";
    utterance.rate = 0.9;
    const voice = speechSynthesis
      .getVoices()
      .find((v) => v.lang.startsWith(language === "ar" ? "ar" : "en"));
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (alive.current) setSpeaking(false);
    };
    utterance.onerror = () => {
      if (alive.current) {
        setSpeaking(false);
        setError(
          tr(
            "تعذّرت القراءة الصوتية. يمكنك متابعة النص.",
            "Voice playback is unavailable. You can read the text.",
          ),
        );
      }
    };
    setSpeaking(true);
    speechSynthesis.speak(utterance);
  }
  const welcome = tr(
    "أهلاً بك في ون شوت. أخبرني بما تريد إنجازه، وسأقترح خدمة من كتالوجنا تناسب احتياجك. هل تحتاج محتوى، تصويراً احترافياً، أم أتمتة لأعمالك؟",
    "Welcome to OneShot. Tell me what you want to achieve and I can suggest a service from our catalog. Are you looking for content, professional photography or business automation?",
  );
  async function recommend() {
    if (busy || !goal.trim()) return;
    setBusy(true);
    setError("");
    setAnswer(null);
    if (speech) speechSynthesis.cancel();
    setSpeaking(false);
    try {
      const result = await api<Recommendation>(
        "/api/experience/recommend",
        { goal, language: language === "ar" ? "ar" : "en" },
        { quiet: true },
      );
      if (alive.current) setAnswer(result);
    } catch {
      if (alive.current)
        setError(
          tr(
            "تعذّر الحصول على اقتراح الآن. يمكنك المحاولة لاحقاً أو تصفح الكتالوج.",
            "A recommendation is unavailable right now. Try again later or browse the catalog.",
          ),
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <Modal
      title={tr("مرشدك في OneShot", "Your OneShot concierge")}
      onClose={onClose}
    >
      <div className="lux-concierge">
        <span className="lux-eyebrow">
          <AudioLines size={18} /> A THOUGHTFUL FIRST STEP
        </span>
        <p>{welcome}</p>
        {speech && (
          <button
            className="lux-text-button"
            onClick={() =>
              speak(answer ? `${answer.name}. ${answer.reason}` : welcome)
            }
          >
            {speaking ? <Square size={16} /> : <Volume2 size={16} />}
            {speaking
              ? tr("إيقاف القراءة", "Stop reading")
              : tr("استمع", "Listen")}
          </button>
        )}
        <div className="lux-prompt-options">
          {[
            [
              "أريد أتمتة متابعة طلبات متجري",
              "I want to automate my store's order follow-up",
            ],
            [
              "أحتاج تصوير منتجات احترافي",
              "I need professional product photography",
            ],
            [
              "أريد مساعداً ذكياً لخدمة العملاء",
              "I need an AI customer support assistant",
            ],
          ].map(([ar, en]) => (
            <button
              key={en}
              disabled={busy}
              onClick={() => setGoal(tr(ar, en))}
            >
              {tr(ar, en)}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void recommend();
          }}
        >
          <label className="lux-field" htmlFor="concierge-goal">
            {tr("ما الذي تريد إنجازه؟", "What would you like to achieve?")}
            <textarea
              id="concierge-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              maxLength={700}
              rows={3}
              required
              placeholder={tr(
                "صف احتياجك وميزانيتك إن وجدت…",
                "Describe your need and budget, if known…",
              )}
            />
          </label>
          <button
            className="lux-button lux-button-gold"
            disabled={busy || !goal.trim()}
          >
            {busy ? (
              <LoaderCircle className="lux-spinner" size={17} />
            ) : (
              <ArrowUpLeft size={17} />
            )}
            {busy
              ? tr("أراجع الكتالوج…", "Reviewing the catalog…")
              : tr("اقترح لي البداية المناسبة", "Suggest my starting point")}
          </button>
        </form>
        {error && (
          <p className="lux-error" role="alert">
            {error}
          </p>
        )}
        {answer && (
          <article className="lux-recommendation" aria-live="polite">
            <small>
              {tr(
                "اقتراح استشاري من الذكاء الاصطناعي",
                "An advisory AI recommendation",
              )}
            </small>
            <h3>{answer.name}</h3>
            <PriceBadge
              details={{
                pricing: {
                  type: answer.pricingType,
                  billingCycle: answer.billingCycle,
                  amount: answer.amount,
                  currency: answer.currency,
                },
              }}
            />
            <p>{answer.reason}</p>
            <strong>
              {new Intl.NumberFormat(language, {
                style: "currency",
                currency: answer.currency,
              }).format(answer.amount)}{" "}
              {answer.billingCycle === "monthly"
                ? tr("شهرياً", "monthly")
                : answer.pricingType === "starts_at"
                  ? tr("يبدأ من", "starting at")
                  : ""}
            </strong>
            <a
              className="lux-text-button"
              href={appearanceLink(`/products/${answer.sku}`)}
            >
              {tr(
                "راجع التفاصيل والنطاق قبل الطلب",
                "Review details and scope before ordering",
              )}
              <ArrowUpLeft size={16} />
            </a>
          </article>
        )}
        <small>
          {tr(
            "تُرسل رسالتك لخدمة الذكاء الاصطناعي لإعداد الاقتراح. لا تُدخل معلومات حساسة. الصوت قراءة من المتصفح، ويُرسل النص لخدمة الصوت في جهازك عند تشغيله. لا يتم تسجيل الميكروفون.",
            "Your message is sent to the AI service for a recommendation. Avoid sensitive information. Listening uses your browser's speech service, which may process the text. Your microphone is not recorded.",
          )}
        </small>
        <a className="lux-text-button" href={appearanceLink("/products")}>
          {tr("تصفح الكتالوج", "Browse the catalog")}
        </a>
      </div>
    </Modal>
  );
}
