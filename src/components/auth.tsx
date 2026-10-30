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
  AuthError,
  MissingIdentityError,
  type Settings,
} from "@netlify/identity";
import { LogIn, LogOut, UserRound, ArrowLeft } from "lucide-react";
import { Modal, Notice, Busy } from "./common";
import { ProfileDialog } from "./profile";
import { api, clearApiSession } from "../lib/api";
import { useAppearance, appearanceLink } from "../storefront/i18n";
import {
  waitForAuth,
  prepareIdentitySession,
  AuthTimeoutError,
  takeAuthReturn,
} from "../lib/auth-session";
import {
  clearEcosystemSession,
  ecosystemUser,
  receiverApp,
  authOrigin,
  hasSharedCookieSession,
  googleLoginUrl,
  syncIdentitySession,
  logoutSharedSession,
} from "../lib/ecosystem-session";
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
    [profileOpen, setProfileOpen] = useState(false);
  const [callback, setCallback] = useState<{
      type: "invite" | "recovery";
      token?: string;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const applyUser = (u: SessionUser | null) => {
      if (!alive) return;
      const signature = `${u?.id || ""}:${u?.roles?.join(",") || ""}`;
      if (signature !== identitySignature.current) clearApiSession();
      identitySignature.current = signature;
      setUser(u);
    };
    const unsubscribe = onAuthChange((event) => {
      if (!alive || receiverApp()) return;
      if (event === "login" || event === "user_updated") {
        clearApiSession();
        void syncIdentitySession()
          .then(applyUser)
          .catch(() => {
            if (alive)
              setError(
                tr(
                  "تعذّر مزامنة الحساب. أعد تحميل الصفحة.",
                  "Could not synchronize your account. Reload the page.",
                ),
              );
          });
      }
    });
    const returned = new URL(location.href);
    if (returned.searchParams.has("google_error")) {
      returned.searchParams.delete("google_error");
      history.replaceState(history.state, "", returned.href);
      setError(
        tr(
          "لم يكتمل اتصال Google. تحقق من الموافقة وحاول مجدداً.",
          "Google connection did not complete. Check consent and try again.",
        ),
      );
      setOpen(true);
    }
    (async () => {
      try {
        if (receiverApp()) {
          const current = await ecosystemUser();
          if (alive) setUser(current);
          return;
        }
        const fragment = new URLSearchParams(location.hash.slice(1));
        if (fragment.has("error") || fragment.has("error_description")) {
          history.replaceState(
            history.state,
            "",
            location.pathname + location.search,
          );
          throw new Error("OAuth rejected");
        }
        const result = await waitForAuth(handleAuthCallback());
        if (!alive) return;
        if (result?.type === "invite") {
          setCallback({ type: "invite", token: result.token });
          setOpen(true);
        }
        if (result?.type === "recovery") {
          setCallback({ type: "recovery" });
          setOpen(true);
        }
        let current = await ecosystemUser();
        if (current && !hasSharedCookieSession())
          current = await syncIdentitySession();
        if (!current && !hasSharedCookieSession()) {
          await prepareIdentitySession();
          if (await waitForAuth(getUser()))
            current = await syncIdentitySession();
        }
        if (alive) {
          identitySignature.current = `${current?.id || ""}:${current?.roles?.join(",") || ""}`;
          setUser(current);
        }
        if (alive && current && result?.type === "oauth") {
          const destination = takeAuthReturn();
          if (destination) location.replace(destination);
        }
      } catch {
        if (alive) {
          if (
            /(?:access_token|confirmation_token|recovery_token|invite_token|email_change_token)=/.test(
              location.hash,
            )
          )
            history.replaceState(
              history.state,
              "",
              location.pathname + location.search,
            );
          setError(
            tr(
              "تعذّر إكمال الدخول. تحقق من الاتصال أو اطلب رابطاً جديداً.",
              "Could not complete sign-in. Check your connection or request a new link.",
            ),
          );
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
    if (signingOut) return;
    setSigningOut(true);
    afterLogin.current = undefined;
    let sharedRevokeFailed = false;
    try {
      await api(
        "/api/ecosystem/sso/revoke",
        {},
        { quiet: true, timeoutMs: 10000 },
      );
    } catch {
      sharedRevokeFailed = true;
    }
    try {
      await logoutSharedSession();
      clearEcosystemSession();
      if (!receiverApp()) await waitForAuth(logout());
      clearApiSession();
      setUser(null);
      if (sharedRevokeFailed) {
        setError(
          tr(
            "تم إغلاق الجلسة المشتركة. تعذّر تأكيد إلغاء روابط الدخول القديمة؛ تنتهي خلال عشر دقائق.",
            "The shared session is closed. Legacy sign-in grants could not be revoked; they expire within ten minutes.",
          ),
        );
        setOpen(true);
      }
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
          <button
            type="button"
            className="account-label account-profile"
            onClick={() => setProfileOpen(true)}
            title={tr("ملفي الشخصي", "My profile")}
          >
            <UserRound size={16} />
            {user.name || tr("حسابي", "My account")}
            {user.roles?.includes("admin") && (
              <small>{tr("مسؤول", "Administrator")}</small>
            )}
          </button>
          {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
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
  const dialog =
    open && receiverApp() ? (
      <Modal
        title={tr("OneShot · الدخول الموحد", "OneShot · Unified sign-in")}
        onClose={() => {
          setOpen(false);
          setError("");
        }}
      >
        {error && <Notice>{error}</Notice>}
        <button
          className="button primary"
          onClick={() => location.assign(googleLoginUrl())}
        >
          {tr("المتابعة باستخدام Google", "Continue with Google")}
        </button>
      </Modal>
    ) : open ? (
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
  const { tr } = useAppearance();
  const alive = useRef(true);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login"),
    [error, setError] = useState(initialError),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [googleEnabled, setGoogleEnabled] = useState(false),
    [settings, setSettings] = useState<Settings | null>(null),
    [settingsState, setSettingsState] = useState<"loading" | "ready" | "error">(
      "loading",
    );
  async function loadSettings() {
    setSettingsState("loading");
    try {
      const [value, googleSettings] = await Promise.all([
        waitForAuth(getSettings(), 10000).catch(() => null),
        fetch(`${authOrigin()}/api/auth/google/settings`, {
          signal: AbortSignal.timeout(10000),
        })
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null),
      ]);
      if (!value && !googleSettings) throw new Error("settings unavailable");
      if (alive.current) {
        setSettings(value);
        setGoogleEnabled(googleSettings?.enabled === true);
        setSettingsState("ready");
      }
    } catch {
      if (alive.current) setSettingsState("error");
    }
  }
  useEffect(() => {
    alive.current = true;
    void loadSettings();
    return () => {
      alive.current = false;
    };
  }, []);
  function authError(cause: unknown) {
    if (cause instanceof AuthTimeoutError)
      return tr(
        "استغرقت الاستجابة وقتاً طويلاً. لم نكرر العملية. تحقق من اتصالك وبريدك قبل المحاولة مجدداً.",
        "The response took too long. The operation was not repeated. Check your connection and inbox before trying again.",
      );
    if (cause instanceof MissingIdentityError)
      return tr(
        "خدمة الحسابات بانتظار التفعيل لدى مسؤول المنصة.",
        "Account services are awaiting activation by the site administrator.",
      );
    const status = cause instanceof AuthError ? cause.status : undefined;
    if (status === 403)
      return tr(
        "العملية غير متاحة لهذا الحساب. قد يتطلب التسجيل دعوة؛ تواصل مع الدعم.",
        "This action is unavailable for this account. Registration may require an invitation; contact support.",
      );
    if (status === 429)
      return tr(
        "طلبات كثيرة خلال وقت قصير. انتظر دقيقة ثم حاول مجدداً.",
        "Too many requests. Wait a minute and try again.",
      );
    return tr(
      "تعذّر إتمام العملية. تحقق من بياناتك وتأكيد بريدك، ثم حاول مجدداً.",
      "Could not complete the request. Check your details and email confirmation, then try again.",
    );
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "").trim(),
      password = String(data.get("password") || "");
    try {
      if (callback?.type === "invite") {
        await waitForAuth(acceptInvite(callback.token!, password));
        if (alive.current) onDone();
      } else if (callback?.type === "recovery") {
        await waitForAuth(updateUser({ password }));
        if (alive.current) onDone();
      } else if (mode === "forgot") {
        await waitForAuth(requestPasswordRecovery(email));
        if (alive.current)
          setNotice(
            tr(
              "إذا كان الحساب موجوداً، تصلك رسالة لاستعادة كلمة المرور.",
              "If the account exists, a password recovery email is on its way.",
            ),
          );
      } else if (mode === "signup") {
        if (!settings || settings.disableSignup)
          throw new AuthError("Registration unavailable", 403);
        const u = await waitForAuth(
          signup(email, password, {
            full_name: String(data.get("name") || "").trim(),
          }),
        );
        if (!alive.current) return;
        if (u.confirmedAt) onDone();
        else
          setNotice(
            tr(
              "راجع بريدك الإلكتروني لتأكيد الحساب، ثم سجّل الدخول.",
              "Check your inbox to confirm your account, then sign in.",
            ),
          );
      } else {
        await waitForAuth(login(email, password));
        if (alive.current) onDone();
      }
    } catch (cause) {
      if (alive.current) setError(authError(cause));
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function google() {
    if (busy || !googleEnabled) return;
    location.assign(googleLoginUrl(window.location.href));
  }
  function changeMode(value: typeof mode) {
    setMode(value);
    setError("");
    setNotice("");
  }
  const title = callback
    ? tr("تعيين كلمة المرور", "Set your password")
    : mode === "signup"
      ? tr("انضم إلى oneShot", "Join oneShot")
      : mode === "forgot"
        ? tr("استعادة الحساب", "Recover your account")
        : tr("مرحباً بعودتك", "Welcome back");
  return (
    <Modal title={title} onClose={onClose}>
      <p className="muted">
        {tr(
          "حساب واحد للمتجر ومقر شركتك الرقمي وموظفي AI.",
          "One account for the store, your workspace and AI employees.",
        )}
      </p>
      {!callback && mode !== "forgot" && googleEnabled && (
        <button
          type="button"
          className="button subtle auth-google"
          disabled={busy}
          onClick={google}
        >
          <LogIn size={18} />
          {tr("تسجيل الدخول عبر جوجل", "Continue with Google")}
        </button>
      )}
      {!callback && settingsState === "error" && (
        <Notice>
          {tr(
            "تعذّر تحميل خيارات التسجيل. يمكنك محاولة الدخول بالبريد أو إعادة التحقق.",
            "Could not load sign-up options. Try email sign-in or check again.",
          )}
          <button
            type="button"
            className="button subtle small"
            onClick={() => void loadSettings()}
          >
            {tr("إعادة التحقق", "Check again")}
          </button>
        </Notice>
      )}
      {!callback && settingsState === "loading" && (
        <p role="status">
          {tr("جارٍ التحقق من خيارات الدخول…", "Checking sign-in options…")}
        </p>
      )}
      <form onSubmit={submit} className="form-stack" aria-busy={busy}>
        {!callback && mode === "signup" && (
          <label>
            {tr("الاسم", "Name")}
            <input
              name="name"
              required
              autoComplete="name"
              maxLength={100}
              disabled={busy}
            />
          </label>
        )}
        {!callback && (
          <label>
            {tr("البريد الإلكتروني", "Email")}
            <input
              name="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              required
              disabled={busy}
            />
          </label>
        )}
        {(callback || mode !== "forgot") && (
          <label>
            {tr("كلمة المرور", "Password")}
            <input
              name="password"
              type="password"
              dir="ltr"
              minLength={mode === "login" && !callback ? undefined : 8}
              required
              disabled={busy}
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
        <button
          type="submit"
          className="button primary"
          disabled={
            busy || (mode === "signup" && (!settings || settings.disableSignup))
          }
        >
          {busy ? <Busy /> : <ArrowLeft size={17} />}
          {callback
            ? tr("حفظ كلمة المرور", "Save password")
            : mode === "login"
              ? tr("دخول إلى حسابك", "Sign in")
              : mode === "forgot"
                ? tr("إرسال رابط الاستعادة", "Send recovery link")
                : tr("إنشاء الحساب", "Create account")}
        </button>
      </form>
      {!callback && (
        <div className="auth-links">
          {mode === "login" ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => changeMode("forgot")}
              >
                {tr("نسيت كلمة المرور", "Forgot password")}
              </button>
              {settings && !settings.disableSignup && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => changeMode("signup")}
                >
                  {tr("إنشاء حساب جديد", "Create an account")}
                </button>
              )}
              {settings?.disableSignup && (
                <p>
                  {tr(
                    "التسجيل بالدعوات فقط. تواصل مع الدعم لطلب دعوة.",
                    "Registration is by invitation. Contact support for an invitation.",
                  )}
                </p>
              )}
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => changeMode("login")}
            >
              {tr("العودة لتسجيل الدخول", "Back to sign in")}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
