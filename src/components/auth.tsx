import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { LogIn, LogOut, UserRound, ArrowLeft, RotateCcw } from "lucide-react";
import { Modal, Notice, Busy } from "./common";
import { clearApiSession } from "../lib/api";
import { useAppearance } from "../storefront/i18n";
import {
  clearEcosystemSession,
  ecosystemUser,
  logoutSharedSession,
} from "../lib/ecosystem-session";
import {
  AuthRequestError,
  otpSettings,
  requestCode,
  verifyCode,
} from "../lib/passwordless";
import { AppLock } from "./app-lock";

export interface SessionUser {
  id: string;
  name?: string;
  email?: string;
  roles?: string[];
}

export function useAuth() {
  const { tr } = useAppearance();
  const [signingOut, setSigningOut] = useState(false);
  const afterLogin = useRef<(() => void) | undefined>(undefined);
  const identitySignature = useRef("");
  const [user, setUser] = useState<SessionUser | null>(null),
    [ready, setReady] = useState(false),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // The shared cookie is the whole session now: no OAuth fragment to
        // unpick, no refresh token to exchange before the first paint.
        const current = await ecosystemUser();
        if (!alive) return;
        identitySignature.current = `${current?.id || ""}:${current?.roles?.join(",") || ""}`;
        setUser(current);
      } catch {
        if (alive) {
          setError(
            tr(
              "تعذّر التحقق من الجلسة. تحقق من اتصالك ثم أعد المحاولة.",
              "Could not verify your session. Check your connection and try again.",
            ),
          );
        }
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    afterLogin.current = undefined;
    try {
      await logoutSharedSession();
      clearEcosystemSession();
      clearApiSession();
      setUser(null);
    } catch {
      setError(
        tr(
          "تعذّر تأكيد تسجيل الخروج. تحقق من اتصالك وحاول مجدداً.",
          "Sign-out could not be confirmed. Check your connection and try again.",
        ),
      );
      setOpen(true);
    } finally {
      setSigningOut(false);
    }
  }

  // A session can be revoked from another device; re-check while the tab is
  // visible rather than trusting the copy held in memory.
  useEffect(() => {
    let alive = true;
    const verify = async () => {
      if (document.hidden) return;
      try {
        const current = await ecosystemUser();
        if (!alive) return;
        if (
          current?.id !== user?.id ||
          current?.roles?.join(",") !== user?.roles?.join(",")
        ) {
          clearApiSession();
          setUser(current);
        }
      } catch {
        /* A network failure is not evidence of a changed account. */
      }
    };
    const interval = setInterval(() => void verify(), 30000);
    document.addEventListener("visibilitychange", verify);
    return () => {
      alive = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", verify);
    };
  }, [user?.id, user?.roles?.join(",")]);

  function openLogin(onSuccess?: () => void) {
    afterLogin.current = onSuccess;
    setOpen(true);
  }

  const control = (
    <div className="account-controls">
      {user ? (
        <>
          <span className="account-label">
            <UserRound size={16} />
            {user.name || tr("حسابي", "My account")}
            {user.roles?.includes("admin") && (
              <small>{tr("مسؤول", "Administrator")}</small>
            )}
          </span>
          <button
            className="icon-button"
            onClick={signOut}
            disabled={signingOut}
            title={tr("تسجيل الخروج", "Sign out")}
            aria-label={tr("تسجيل الخروج", "Sign out")}
          >
            <LogOut size={17} />
          </button>
        </>
      ) : (
        <button
          className="button subtle small"
          disabled={!ready}
          onClick={() => openLogin()}
        >
          <LogIn size={16} /> {tr("تسجيل الدخول", "Sign in")}
        </button>
      )}
    </div>
  );

  const dialog = open ? (
    <SignInDialog
      initialError={error}
      onClose={() => {
        afterLogin.current = undefined;
        setOpen(false);
        setError("");
      }}
      onDone={(signedIn) => {
        clearApiSession();
        identitySignature.current = `${signedIn.id}:${signedIn.roles?.join(",") || ""}`;
        setUser(signedIn);
        const onSuccess = afterLogin.current;
        afterLogin.current = undefined;
        setOpen(false);
        setError("");
        onSuccess?.();
      }}
    />
  ) : null;

  // The lock sits over the app once a session exists, so a returning visit
  // asks for a PIN or a fingerprint instead of another code.
  const lock: ReactNode = user ? <AppLock user={user} /> : null;

  return { user, ready, openLogin, control, dialog, lock };
}

// ---------------------------------------------------------------------------
// Sign-in: a destination, then the six digits sent to it
// ---------------------------------------------------------------------------

function SignInDialog({
  initialError,
  onClose,
  onDone,
}: {
  initialError: string;
  onClose: () => void;
  onDone: (user: SessionUser) => void;
}) {
  const { tr } = useAppearance();
  const alive = useRef(true);
  const [step, setStep] = useState<"destination" | "code">("destination"),
    [destination, setDestination] = useState(""),
    [masked, setMasked] = useState(""),
    [channels, setChannels] = useState<{ email: boolean; sms: boolean }>({
      email: true,
      sms: false,
    }),
    [error, setError] = useState(initialError),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    alive.current = true;
    void otpSettings()
      .then((value) => {
        if (alive.current) setChannels(value);
      })
      .catch(() => {
        /* Falls back to email, which the form already assumes. */
      });
    return () => {
      alive.current = false;
    };
  }, []);

  // Counts down to when asking for a new code is worth doing, so people do not
  // hammer "resend" while the first message is still in flight.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function failure(cause: unknown) {
    if (cause instanceof AuthRequestError) return cause.message;
    if (cause instanceof DOMException && cause.name === "TimeoutError")
      return tr(
        "استغرقت الاستجابة وقتاً طويلاً. تحقق من اتصالك وحاول مجدداً.",
        "The response took too long. Check your connection and try again.",
      );
    return tr(
      "تعذّر إتمام العملية. حاول مجدداً.",
      "Could not complete the request. Try again.",
    );
  }

  async function send(value: string, resending = false) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await requestCode(value);
      if (!alive.current) return;
      setMasked(result.destination);
      setStep("code");
      setSecondsLeft(45);
      if (resending)
        setNotice(
          tr("أرسلنا رمزاً جديداً.", "A new code is on its way."),
        );
    } catch (cause) {
      if (alive.current) setError(failure(cause));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function submitDestination(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const value = String(
      new FormData(event.currentTarget).get("destination") || "",
    ).trim();
    setDestination(value);
    await send(value);
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const code = String(
        new FormData(event.currentTarget).get("code") || "",
      ).trim();
      const result = await verifyCode(destination, code);
      if (alive.current) onDone(result.user);
    } catch (cause) {
      if (!alive.current) return;
      setError(failure(cause));
      // An expired or spent code cannot be retyped: send the person back to
      // ask for a new one rather than leaving them guessing.
      if (
        cause instanceof AuthRequestError &&
        (cause.code === "OTP_EXPIRED" || cause.code === "OTP_LOCKED")
      ) {
        setStep("destination");
        setSecondsLeft(0);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  const label = channels.sms
    ? tr("البريد الإلكتروني أو رقم الجوال", "Email or mobile number")
    : tr("البريد الإلكتروني", "Email");

  return (
    <Modal
      title={
        step === "destination"
          ? tr("الدخول إلى oneShot", "Sign in to oneShot")
          : tr("أدخل رمز التحقق", "Enter your code")
      }
      onClose={onClose}
    >
      {step === "destination" ? (
        <>
          <p className="muted">
            {tr(
              "حساب واحد للمتجر ومقر شركتك الرقمي وموظفي AI. نرسل لك رمزاً للدخول — بدون كلمة مرور.",
              "One account for the store, your workspace and AI employees. We send you a code — no password needed.",
            )}
          </p>
          <form onSubmit={submitDestination} className="form-stack" aria-busy={busy}>
            <label>
              {label}
              <input
                name="destination"
                type={channels.sms ? "text" : "email"}
                inputMode={channels.sms ? "email" : undefined}
                dir="ltr"
                autoComplete={channels.sms ? "username" : "email"}
                defaultValue={destination}
                required
                maxLength={254}
                disabled={busy}
                autoFocus
              />
            </label>
            {error && <Notice>{error}</Notice>}
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? <Busy /> : <ArrowLeft size={17} />}
              {tr("أرسل رمز الدخول", "Send my code")}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="muted">
            {tr("أرسلنا رمزاً من ٦ أرقام إلى ", "We sent a 6-digit code to ")}
            <bdi dir="ltr">{masked}</bdi>
            {tr(". صالح لعشر دقائق.", ". It is valid for ten minutes.")}
          </p>
          <form onSubmit={submitCode} className="form-stack" aria-busy={busy}>
            <label>
              {tr("رمز التحقق", "Verification code")}
              <input
                name="code"
                type="text"
                dir="ltr"
                inputMode="numeric"
                pattern="[0-9]{6}"
                // The platform fills this from the message itself, so the
                // person never has to leave the app to read it.
                autoComplete="one-time-code"
                maxLength={6}
                required
                disabled={busy}
                autoFocus
                style={{
                  letterSpacing: ".4em",
                  textAlign: "center",
                  fontSize: "1.3rem",
                }}
              />
            </label>
            {error && <Notice>{error}</Notice>}
            {notice && <Notice success>{notice}</Notice>}
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? <Busy /> : <ArrowLeft size={17} />}
              {tr("تأكيد الدخول", "Confirm sign-in")}
            </button>
          </form>
          <div className="auth-links">
            <button
              type="button"
              disabled={busy || secondsLeft > 0}
              onClick={() => void send(destination, true)}
            >
              <RotateCcw size={14} />
              {secondsLeft > 0
                ? tr(
                    `إعادة الإرسال بعد ${secondsLeft} ثانية`,
                    `Resend in ${secondsLeft}s`,
                  )
                : tr("إرسال رمز جديد", "Send a new code")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStep("destination");
                setError("");
                setNotice("");
                setSecondsLeft(0);
              }}
            >
              {tr("تغيير العنوان", "Use a different address")}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
