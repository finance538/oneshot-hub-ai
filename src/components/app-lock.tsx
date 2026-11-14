import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Fingerprint, KeyRound, Lock, MailCheck, ShieldCheck } from "lucide-react";
import { Notice, Busy } from "./common";
import { useAppearance } from "../storefront/i18n";
import type { SessionUser } from "./auth";
import {
  AuthRequestError,
  biometricAvailable,
  confirmPinReset,
  lockStatus,
  registerBiometric,
  requestPinReset,
  savePin,
  unlockWithBiometric,
  unlockWithPin,
} from "../lib/passwordless";

// How long the app may sit untouched before it asks again. Short enough that a
// put-down phone is covered, long enough not to interrupt real work.
const IDLE_MINUTES = 10;
const UNLOCKED_KEY = "oneshot.lock.unlocked.v1";

// The unlock marker lives in sessionStorage and holds no secret — it only
// records that this tab already satisfied the lock. The server still checks
// the PIN or the signature on every unlock.
function readUnlocked(ownerId: string) {
  try {
    const value = JSON.parse(sessionStorage.getItem(UNLOCKED_KEY) || "null");
    return (
      value?.ownerId === ownerId &&
      typeof value.at === "number" &&
      Date.now() - value.at < IDLE_MINUTES * 60_000
    );
  } catch {
    return false;
  }
}
function markUnlocked(ownerId: string) {
  try {
    sessionStorage.setItem(
      UNLOCKED_KEY,
      JSON.stringify({ ownerId, at: Date.now() }),
    );
  } catch {
    /* Storage may be unavailable; the lock then asks every time. */
  }
}

export function AppLock({ user }: { user: SessionUser }) {
  const { tr } = useAppearance();
  const alive = useRef(true);
  const [state, setState] = useState<
    "checking" | "open" | "locked" | "setup" | "reset"
  >("checking");
  // "reset" has two steps: ask for the email code, then take code + new PIN.
  const [resetStage, setResetStage] = useState<"request" | "confirm">(
    "request",
  );
  const [resetDestination, setResetDestination] = useState("");
  const [hasBiometric, setHasBiometric] = useState(false),
    [canUseBiometric, setCanUseBiometric] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [status, available] = await Promise.all([
        lockStatus(),
        biometricAvailable(),
      ]);
      if (!alive.current) return;
      setHasBiometric(status.biometric);
      setCanUseBiometric(available);
      // No PIN yet means first run after sign-in: offer to set one rather
      // than locking someone out of an app they just entered.
      if (!status.pin) setState("setup");
      else setState(readUnlocked(user.id) ? "open" : "locked");
    } catch {
      // A lock that cannot be checked must not become a wall. The session
      // cookie is still the thing that authorises every request.
      if (alive.current) setState("open");
    }
  }, [user.id]);

  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  // Re-lock after the app has been in the background longer than the idle
  // window — the case the whole feature exists for.
  useEffect(() => {
    if (state !== "open") return;
    const touch = () => markUnlocked(user.id);
    const check = () => {
      if (document.hidden) {
        touch();
        return;
      }
      if (!readUnlocked(user.id)) setState("locked");
    };
    const interval = setInterval(check, 15000);
    document.addEventListener("visibilitychange", check);
    for (const event of ["pointerdown", "keydown"])
      document.addEventListener(event, touch, { passive: true });
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      for (const event of ["pointerdown", "keydown"])
        document.removeEventListener(event, touch);
    };
  }, [state, user.id]);

  function failure(cause: unknown) {
    if (cause instanceof AuthRequestError) return cause.message;
    if (cause instanceof DOMException && cause.name === "NotAllowedError")
      return tr(
        "أُلغي التحقق من البصمة. استخدم الرمز السري.",
        "Biometric check was cancelled. Use your PIN.",
      );
    return tr("تعذّر إتمام العملية. حاول مجدداً.", "Could not complete that. Try again.");
  }

  async function submitUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const pin = String(new FormData(event.currentTarget).get("pin") || "");
      await unlockWithPin(pin);
      if (!alive.current) return;
      markUnlocked(user.id);
      setState("open");
    } catch (cause) {
      if (alive.current) setError(failure(cause));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function biometricUnlock() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await unlockWithBiometric();
      if (!alive.current) return;
      markUnlocked(user.id);
      setState("open");
    } catch (cause) {
      if (alive.current) setError(failure(cause));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function sendResetCode() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await requestPinReset();
      if (!alive.current) return;
      setResetDestination(result.destination);
      setResetStage("confirm");
      setNotice(
        tr(
          `أُرسل رمز إلى ${result.destination}. صالح ${Math.round(
            result.expiresInSeconds / 60,
          )} دقيقة.`,
          `Code sent to ${result.destination}. Valid for ${Math.round(
            result.expiresInSeconds / 60,
          )} minutes.`,
        ),
      );
    } catch (cause) {
      if (alive.current) setError(failure(cause));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function submitReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const code = String(data.get("code") || ""),
      pin = String(data.get("pin") || ""),
      confirmation = String(data.get("confirm") || "");
    if (pin !== confirmation) {
      setError(tr("الرمزان غير متطابقين.", "The two codes do not match."));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await confirmPinReset(code, pin);
      if (!alive.current) return;
      // A successful reset also ends any lockout, so open straight away.
      markUnlocked(user.id);
      setState("open");
    } catch (cause) {
      if (alive.current) setError(failure(cause));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function submitSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const pin = String(data.get("pin") || ""),
      confirmation = String(data.get("confirm") || "");
    if (pin !== confirmation) {
      setError(tr("الرمزان غير متطابقين.", "The two codes do not match."));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await savePin(pin);
      if (!alive.current) return;
      markUnlocked(user.id);
      // Offering the sensor only after a PIN exists keeps a fallback in place.
      if (canUseBiometric) {
        setNotice(
          tr(
            "تم حفظ الرمز. تفعيل البصمة اختياري.",
            "Your PIN is saved. Biometric unlock is optional.",
          ),
        );
        setState("open");
        void enableBiometric();
      } else setState("open");
    } catch (cause) {
      if (alive.current) setError(failure(cause));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function enableBiometric() {
    try {
      await registerBiometric(navigator.platform || undefined);
      if (alive.current) setHasBiometric(true);
    } catch {
      /* The PIN is set and working; the sensor stays optional. */
    }
  }

  if (state === "checking" || state === "open") return null;

  return (
    <div
      className="app-lock"
      role="dialog"
      aria-modal="true"
      aria-label={tr("قفل التطبيق", "App lock")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "grid",
        placeItems: "center",
        padding: "var(--ui-gutter, 20px)",
        background: "var(--ui-bg, #101211)",
      }}
    >
      <div
        style={{
          width: "min(380px, 100%)",
          background: "var(--ui-panel, #171b17)",
          border: "1px solid var(--ui-border, #30392b)",
          borderRadius: "var(--ui-radius, 12px)",
          padding: "clamp(20px, 5vw, 30px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "var(--ui-accent, #cfbc97)",
            marginBottom: 14,
          }}
        >
          {state === "setup" ? <ShieldCheck size={20} /> : <Lock size={20} />}
          <strong style={{ fontSize: "1.05rem" }}>
            {state === "setup"
              ? tr("أمّن دخولك القادم", "Secure your next visit")
              : tr("أدخل رمزك السري", "Enter your PIN")}
          </strong>
        </div>

        {state === "setup" ? (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              {tr(
                "اختر رمزاً من ٦ أرقام لفتح التطبيق في المرات القادمة، بدل انتظار رسالة في كل مرة.",
                "Choose a 6-digit code to open the app next time, instead of waiting for a message each visit.",
              )}
            </p>
            <form onSubmit={submitSetup} className="form-stack" aria-busy={busy}>
              <label>
                {tr("الرمز السري", "PIN")}
                <input
                  name="pin"
                  type="password"
                  dir="ltr"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="new-password"
                  required
                  disabled={busy}
                  autoFocus
                />
              </label>
              <label>
                {tr("تأكيد الرمز", "Confirm PIN")}
                <input
                  name="confirm"
                  type="password"
                  dir="ltr"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="new-password"
                  required
                  disabled={busy}
                />
              </label>
              {error && <Notice>{error}</Notice>}
              {notice && <Notice success>{notice}</Notice>}
              <button type="submit" className="button primary" disabled={busy}>
                {busy ? <Busy /> : <ShieldCheck size={17} />}
                {tr("حفظ الرمز", "Save PIN")}
              </button>
            </form>
          </>
        ) : state === "reset" ? (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              {resetStage === "request"
                ? tr(
                    "سنرسل رمزاً من ٦ أرقام إلى بريد حسابك الموثّق، ثم تختار رمزاً جديداً.",
                    "We will email a 6-digit code to your verified address, then you choose a new PIN.",
                  )
                : tr(
                    `أدخل الرمز المرسل إلى ${resetDestination} واختر رمزاً جديداً.`,
                    `Enter the code sent to ${resetDestination} and choose a new PIN.`,
                  )}
            </p>
            {resetStage === "request" ? (
              <>
                {error && <Notice>{error}</Notice>}
                {notice && <Notice success>{notice}</Notice>}
                <button
                  type="button"
                  className="button primary"
                  style={{ width: "100%" }}
                  disabled={busy}
                  onClick={() => void sendResetCode()}
                >
                  {busy ? <Busy /> : <MailCheck size={17} />}
                  {tr("أرسل الرمز إلى بريدي", "Email me a code")}
                </button>
              </>
            ) : (
              <form
                onSubmit={submitReset}
                className="form-stack"
                aria-busy={busy}
              >
                <label>
                  {tr("الرمز المرسل بالبريد", "Email code")}
                  <input
                    name="code"
                    type="password"
                    dir="ltr"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="one-time-code"
                    required
                    disabled={busy}
                    autoFocus
                    style={{ letterSpacing: ".4em", textAlign: "center" }}
                  />
                </label>
                <label>
                  {tr("الرمز الجديد", "New PIN")}
                  <input
                    name="pin"
                    type="password"
                    dir="ltr"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="new-password"
                    required
                    disabled={busy}
                  />
                </label>
                <label>
                  {tr("تأكيد الرمز الجديد", "Confirm new PIN")}
                  <input
                    name="confirm"
                    type="password"
                    dir="ltr"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="new-password"
                    required
                    disabled={busy}
                  />
                </label>
                {error && <Notice>{error}</Notice>}
                {notice && <Notice success>{notice}</Notice>}
                <button type="submit" className="button primary" disabled={busy}>
                  {busy ? <Busy /> : <ShieldCheck size={17} />}
                  {tr("احفظ الرمز الجديد", "Save new PIN")}
                </button>
              </form>
            )}
            <button
              type="button"
              className="button subtle"
              style={{ width: "100%", marginTop: 10 }}
              disabled={busy}
              onClick={() => {
                setState("locked");
                setResetStage("request");
                setError("");
                setNotice("");
              }}
            >
              {tr("رجوع", "Back")}
            </button>
          </>
        ) : (
          <>
            {hasBiometric && canUseBiometric && (
              <button
                type="button"
                className="button subtle"
                style={{ width: "100%", marginBottom: 14 }}
                disabled={busy}
                onClick={() => void biometricUnlock()}
              >
                <Fingerprint size={18} />
                {tr("الفتح بالبصمة أو Face ID", "Unlock with biometrics")}
              </button>
            )}
            <form onSubmit={submitUnlock} className="form-stack" aria-busy={busy}>
              <label>
                {tr("الرمز السري", "PIN")}
                <input
                  name="pin"
                  type="password"
                  dir="ltr"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="current-password"
                  required
                  disabled={busy}
                  autoFocus
                  style={{ letterSpacing: ".4em", textAlign: "center" }}
                />
              </label>
              {error && <Notice>{error}</Notice>}
              <button type="submit" className="button primary" disabled={busy}>
                {busy ? <Busy /> : <Lock size={17} />}
                {tr("فتح", "Unlock")}
              </button>
              <button
                type="button"
                className="button subtle"
                style={{ width: "100%", marginTop: 10 }}
                disabled={busy}
                onClick={() => {
                  setState("reset");
                  setResetStage("request");
                  setError("");
                  setNotice("");
                }}
              >
                <KeyRound size={17} />
                {tr("نسيت الرمز؟ أعد تعيينه بالبريد", "Forgot your PIN? Reset it by email")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
