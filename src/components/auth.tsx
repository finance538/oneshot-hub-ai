import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  login,
  signup,
  logout,
  getUser,
  getSettings,
  onAuthChange,
  handleAuthCallback,
  acceptInvite,
  updateUser,
  requestPasswordRecovery,
} from "@netlify/identity";
import { LogIn, LogOut, UserRound, ArrowLeft } from "lucide-react";
import { Modal, Notice, Busy } from "./common";
import { clearApiSession } from "../lib/api";
export interface SessionUser {
  id: string;
  name?: string;
  email?: string;
  roles?: string[];
}
export function useAuth() {
  const afterLogin = useRef<(() => void) | undefined>(undefined);
  const [user, setUser] = useState<SessionUser | null>(null),
    [ready, setReady] = useState(false),
    [open, setOpen] = useState(false);
  const [callback, setCallback] = useState<{
      type: "invite" | "recovery";
      token?: string;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const unsubscribe = onAuthChange((event, u) => {
      if (alive) {
        if (event !== "token_refresh") clearApiSession();
        setUser(u);
      }
    });
    (async () => {
      try {
        const result = await handleAuthCallback();
        if (result?.type === "invite") {
          setCallback({ type: "invite", token: result.token });
          setOpen(true);
        }
        if (result?.type === "recovery") {
          setCallback({ type: "recovery" });
          setOpen(true);
        }
        const current = await getUser();
        if (alive) setUser(current);
      } catch {
        if (alive) {
          setError("تعذّر إكمال رابط الدخول. اطلب رابطاً جديداً.");
          setOpen(true);
        }
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);
  async function signOut() {
    afterLogin.current = undefined;
    try {
      await logout();
      clearApiSession();
      setUser(null);
    } catch {
      setError("تعذّر تسجيل الخروج. حاول مجدداً.");
      setOpen(true);
    }
  }
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
            {user.name || "حسابي"}
            {user.roles?.includes("admin") && <small>مسؤول</small>}
          </span>
          <button
            className="icon-button"
            onClick={signOut}
            title="تسجيل الخروج"
            aria-label="تسجيل الخروج"
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
          <LogIn size={16} /> تسجيل الدخول
        </button>
      )}
    </div>
  );
  const dialog = open ? (
    <AuthDialog
      callback={callback}
      initialError={error}
      onClose={() => {
        afterLogin.current = undefined;
        setOpen(false);
        setError("");
      }}
      onDone={() => {
        const onSuccess = afterLogin.current;
        afterLogin.current = undefined;
        setOpen(false);
        setCallback(null);
        onSuccess?.();
      }}
    />
  ) : null;
  return { user, ready, openLogin, control, dialog };
}
function AuthDialog({
  callback,
  initialError,
  onClose,
  onDone,
}: {
  callback: { type: "invite" | "recovery"; token?: string } | null;
  initialError: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login"),
    [error, setError] = useState(initialError),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [signupEnabled, setSignupEnabled] = useState(false);
  useEffect(() => {
    getSettings()
      .then((s) => setSignupEnabled(!s.disableSignup))
      .catch(() => {});
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || ""),
      password = String(data.get("password") || "");
    try {
      if (callback?.type === "invite") {
        await acceptInvite(callback.token!, password);
        onDone();
      } else if (callback?.type === "recovery") {
        await updateUser({ password });
        onDone();
      } else if (mode === "forgot") {
        await requestPasswordRecovery(email);
        setNotice("إذا كان الحساب موجوداً، تصلك رسالة لاستعادة كلمة المرور.");
      } else if (mode === "signup") {
        const u = await signup(email, password, {
          full_name: String(data.get("name")),
        });
        if (u.confirmedAt) onDone();
        else setNotice("راجع بريدك الإلكتروني لتأكيد الحساب.");
      } else {
        await login(email, password);
        onDone();
      }
    } catch {
      setError(
        "تعذّر إتمام العملية. تحقق من بياناتك وتأكيد بريدك، ثم حاول مجدداً.",
      );
    } finally {
      setBusy(false);
    }
  }
  const title = callback
    ? "تعيين كلمة المرور"
    : mode === "signup"
      ? "انضم إلى oneShot"
      : mode === "forgot"
        ? "استعادة الحساب"
        : "مرحباً بعودتك";
  return (
    <Modal title={title} onClose={onClose}>
      <p className="muted">حساب واحد للمتجر ومقر شركتك الرقمي وموظفي AI.</p>
      <form onSubmit={submit} className="form-stack">
        {!callback && mode === "signup" && (
          <label>
            الاسم
            <input name="name" required autoComplete="name" maxLength={100} />
          </label>
        )}
        {!callback && (
          <label>
            البريد الإلكتروني
            <input
              name="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              required
            />
          </label>
        )}
        {(callback || mode !== "forgot") && (
          <label>
            كلمة المرور
            <input
              name="password"
              type="password"
              dir="ltr"
              minLength={8}
              required
              autoComplete={
                mode === "login" && !callback
                  ? "current-password"
                  : "new-password"
              }
            />
          </label>
        )}
        {error && <Notice>{error}</Notice>}
        {notice && <Notice success>{notice}</Notice>}
        <button className="button primary" disabled={busy}>
          {busy ? <Busy /> : <ArrowLeft size={17} />}{" "}
          {callback
            ? "حفظ كلمة المرور"
            : mode === "login"
              ? "دخول إلى حسابك"
              : mode === "forgot"
                ? "إرسال رابط الاستعادة"
                : "إنشاء الحساب"}
        </button>
      </form>
      {!callback && (
        <div className="auth-links">
          {mode === "login" ? (
            <>
              <button onClick={() => setMode("forgot")}>
                نسيت كلمة المرور
              </button>
              {signupEnabled && (
                <button onClick={() => setMode("signup")}>
                  إنشاء حساب جديد
                </button>
              )}
            </>
          ) : (
            <button onClick={() => setMode("login")}>
              العودة لتسجيل الدخول
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
