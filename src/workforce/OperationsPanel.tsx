import { uiText as t } from "../lib/legacy-copy";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Check,
  ExternalLink,
  Globe,
  Inbox,
  KeyRound,
  Link2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import type {
  MailMessage,
  ResearchRun,
  WorkforceConnection,
} from "../../shared/workforce";
import { api } from "../lib/api";
import { useAppearance } from "../storefront/i18n";
import "./operations.css";
import GoogleWorkspace from "./GoogleWorkspace";
const labels: Record<string, string> = {
  saved: "محفوظ · يحتاج اختبار",
  connected: "اتصال متحقق",
  receiving: "استقبال متحقق",
  connection_error: "تعذر الاتصال",
  session_saved: "جلسة محفوظة",
  session_closed: "الجلسة مغلقة",
  draft: "بانتظار اعتمادك",
  sending: "جارٍ الإرسال",
  sent: "قبله خادم البريد",
  unknown: "الإرسال غير مؤكد",
  rejected: "رفضه خادم البريد",
  received: "وارد",
  running: "جارٍ البحث",
  browsing: "جارٍ تصفح الصفحات",
  ready: "اكتمل",
  failed: "تعذر التنفيذ",
  needs_attention: "يحتاج تدخلك",
};
export const operationLabel = (status: string) => t(labels[status] || status);
export function OperationsPanel({
  initial = "mail",
  resourceId,
}: {
  initial?: string;
  resourceId?: string;
}) {
  const { outputLanguage } = useAppearance();
  const [tab, setTab] = useState(
    initial === "researcher" ? "research" : "mail",
  );
  const [connections, setConnections] = useState<WorkforceConnection[]>([]),
    [messages, setMessages] = useState<MailMessage[]>([]),
    [runs, setRuns] = useState<ResearchRun[]>([]);
  const [ready, setReady] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [adding, setAdding] = useState<"mail" | "portal" | null>(null),
    [provider, setProvider] = useState("gmail");
  const [selectedMail, setSelectedMail] = useState<string | undefined>(
      resourceId,
    ),
    [selectedRun, setSelectedRun] = useState<string | undefined>(resourceId),
    [filter, setFilter] = useState(
      resourceId && initial === "mail" ? "outbound" : "inbound",
    );
  const [compose, setCompose] = useState<{
    id?: string;
    updatedAt?: string;
    connectionId: string;
    recipient: string;
    subject: string;
    body: string;
    replyId?: string;
  } | null>(null);
  const [portal, setPortal] = useState(""),
    [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string>();
  const alive = useRef(true),
    read = useRef(0),
    pending = useRef<{ signature: string; key: string } | null>(null),
    saving = useRef(false);
  async function refresh(silent = false) {
    const sequence = ++read.current;
    try {
      const [accounts, mailbox, research] = await Promise.all([
        api<{ connections: WorkforceConnection[]; vaultReady: boolean }>(
          "/api/workforce/connections",
          undefined,
          { quiet: true },
        ),
        api<{ messages: MailMessage[] }>("/api/workforce/mail", undefined, {
          quiet: true,
        }),
        api<{ runs: ResearchRun[] }>("/api/workforce/research", undefined, {
          quiet: true,
        }),
      ]);
      if (!alive.current || sequence !== read.current) return;
      setConnections(accounts.connections);
      setReady(accounts.vaultReady);
      setMessages(mailbox.messages);
      setRuns(research.runs);
    } catch (err) {
      if (alive.current && !silent) setError((err as Error).message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void refresh();
    const timer = setInterval(() => {
      if (!document.hidden) void refresh(true);
    }, 4500);
    return () => {
      alive.current = false;
      read.current++;
      clearInterval(timer);
    };
  }, []);
  async function action(fn: () => Promise<void>) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      if (alive.current) await refresh();
    } catch (err) {
      if (alive.current) setError((err as Error).message);
    } finally {
      saving.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const mailAccounts = connections.filter((row) => row.kind === "mail"),
    portals = connections.filter((row) => row.kind === "portal");
  const message = messages.find((row) => row.id === selectedMail),
    run = runs.find((row) => row.id === selectedRun) || runs[0];
  function keyFor(value: unknown) {
    const signature = JSON.stringify(value);
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    return pending.current.key;
  }
  async function saveConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      body = Object.fromEntries(new FormData(form));
    await action(async () => {
      await api(
        "/api/workforce/connections",
        {
          ...body,
          kind: adding,
          keepSession: body.keepSession === "on",
          syncEnabled: body.syncEnabled === "on",
          smtpPort: Number(body.smtpPort),
        },
        { quiet: true },
      );
      form.reset();
      setAdding(null);
      setNotice(t("حُفظ الحساب مشفراً. اختبر الاتصال قبل بدء العمل."));
    });
  }
  function startCompose(source?: MailMessage) {
    setCompose(
      source
        ? {
            connectionId: source.connectionId,
            recipient: source.sender,
            subject: `Re: ${source.subject}`.slice(0, 500),
            body: "",
            replyId: source.id,
          }
        : {
            connectionId: mailAccounts[0]?.id || "",
            recipient: "",
            subject: "",
            body: "",
          },
    );
  }
  return (
    <section className="wf-ops-panel" dir="rtl">
      <div className="wf-ops-nav" role="group" aria-label={t("أدوات الموظفين")}>
        <button aria-pressed={tab === "mail"} onClick={() => setTab("mail")}>
          <Mail size={17} />
          {t("البريد")}
        </button>
        <button
          aria-pressed={tab === "research"}
          onClick={() => setTab("research")}
        >
          <Globe size={17} />
          {t("البحث والتصفح")}
        </button>
        <button
          aria-pressed={tab === "accounts"}
          onClick={() => setTab("accounts")}
        >
          <KeyRound size={17} />
          {t("خزنة الحسابات")}
        </button>
        <button
          onClick={() => void refresh()}
          disabled={busy}
          aria-label={t("تحديث")}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {error && (
        <p className="wf-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="wf-ops-notice" role="status">
          <Check size={16} />
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">{t("جارٍ جلب بيانات المنشأة…")}</p>
      ) : tab === "accounts" ? (
        <>
          <GoogleWorkspace />
          <div className="wf-ops-intro">
            <ShieldCheck size={28} />
            <div>
              <h3>{t("حسابات منشأتك، في خزنة واحدة")}</h3>
              <p>
                {t(
                  "تُشفّر كلمات المرور والجلسات في الخادم. لا تُرسل إلى نموذج الذكاء الاصطناعي.",
                )}
              </p>
            </div>
          </div>
          {!ready && (
            <p className="wf-error">
              {t(
                "الخزنة تحتاج تفعيل مفتاح التشفير لدى مسؤول المنصة قبل حفظ الحسابات.",
              )}
            </p>
          )}
          <div className="wf-ops-actions">
            <button disabled={!ready} onClick={() => setAdding("mail")}>
              <Plus size={16} />
              {t("ربط بريد")}
            </button>
            <button disabled={!ready} onClick={() => setAdding("portal")}>
              <Plus size={16} />
              {t("ربط منصة")}
            </button>
          </div>
          {adding && (
            <form className="wf-connection-form" onSubmit={saveConnection}>
              <div className="wf-ops-heading">
                <h3>
                  {adding === "mail"
                    ? t("ربط البريد · SMTP / IMAP")
                    : t("خزنة المتصفح · تسجيل دخول آمن")}
                </h3>
                <button
                  type="button"
                  aria-label={t("إغلاق")}
                  onClick={() => setAdding(null)}
                >
                  <X size={17} />
                </button>
              </div>
              <label>
                {t("اسم الحساب")}
                <input
                  name="label"
                  required
                  maxLength={80}
                  placeholder={t("بريد المتجر / منصة المورد")}
                />
              </label>
              {adding === "mail" ? (
                <>
                  <label>
                    {t("المزود")}
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                    >
                      <option value="gmail">
                        {t("Gmail · كلمة مرور تطبيق")}
                      </option>
                      <option value="custom">{t("SMTP / IMAP مخصص")}</option>
                    </select>
                  </label>
                  <p className="wf-context">
                    {t(
                      "في Gmail فعّل IMAP واستخدم كلمة مرور تطبيق مع التحقق بخطوتين. الحسابات التي تفرض OAuth فقط تحتاج إعداداً يدعمه مزود البريد.",
                    )}
                  </p>
                  <label>
                    {t("عنوان المرسل")}
                    <input
                      name="email"
                      type="email"
                      dir="ltr"
                      required
                      autoComplete="email"
                    />
                  </label>
                  <div className="wf-form-pair" key={provider}>
                    <label>
                      {t("خادم SMTP")}
                      <input
                        name="smtpHost"
                        defaultValue={
                          provider === "gmail" ? "smtp.gmail.com" : ""
                        }
                        dir="ltr"
                        required
                      />
                    </label>
                    <label>
                      {t("المنفذ")}
                      <select name="smtpPort" defaultValue="465">
                        <option value="465">465 · TLS</option>
                        <option value="587">587 · STARTTLS</option>
                      </select>
                    </label>
                    <label>
                      {t("مستخدم SMTP")}
                      <input
                        name="smtpUser"
                        dir="ltr"
                        required
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      {t("كلمة مرور SMTP")}
                      <input
                        name="smtpPassword"
                        type="password"
                        required
                        maxLength={2048}
                        autoComplete="new-password"
                      />
                    </label>
                    <label>
                      {t("خادم IMAP")}
                      <input
                        name="imapHost"
                        defaultValue={
                          provider === "gmail" ? "imap.gmail.com" : ""
                        }
                        dir="ltr"
                        required
                      />
                    </label>
                    <label>
                      {t("مستخدم IMAP")}
                      <input
                        name="imapUser"
                        dir="ltr"
                        required
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      {t("كلمة مرور IMAP")}
                      <input
                        name="imapPassword"
                        type="password"
                        required
                        maxLength={2048}
                        autoComplete="new-password"
                      />
                    </label>
                  </div>
                  <label className="wf-checkbox">
                    <input name="syncEnabled" type="checkbox" defaultChecked />
                    {t("مزامنة دورية للوارد حتى عند إغلاق المكتب")}
                  </label>
                  <small>
                    {t(
                      "تُجلب آخر 30 رسالة في كل مزامنة. تُفحص الحسابات بالتتابع، ولا يُرسل رد تلقائياً.",
                    )}
                  </small>
                </>
              ) : (
                <>
                  <label>
                    {t("رابط صفحة الدخول")}
                    <input
                      name="url"
                      type="url"
                      placeholder="https://…"
                      dir="ltr"
                      required
                      maxLength={1500}
                    />
                  </label>
                  <label>
                    {t("الإيميل / اسم المستخدم")}
                    <input
                      name="username"
                      required
                      autoComplete="off"
                      maxLength={254}
                      dir="ltr"
                    />
                  </label>
                  <label>
                    {t("كلمة المرور")}
                    <input
                      name="password"
                      type="password"
                      required
                      autoComplete="new-password"
                      maxLength={2048}
                    />
                  </label>
                  <label className="wf-checkbox">
                    <input name="keepSession" type="checkbox" />
                    {t("حفظ الجلسة مشفرة لمدة أقصاها 12 ساعة")}
                  </label>
                  <p className="wf-context">
                    {t(
                      "يدعم نماذج الدخول المعتادة داخل نفس الموقع، ثم قراءة الصفحات المرتبطة بالمهمة. قد تتطلب المنصة تحققاً إضافياً أو تمنع الأتمتة. لا ينفذ شراءً أو نشراً أو تعديلاً للحساب.",
                    )}
                  </p>
                </>
              )}
              <button className="wf-primary" disabled={busy}>
                <ShieldCheck size={17} />
                {busy ? t("جارٍ الحفظ…") : t("حفظ مشفر")}
              </button>
            </form>
          )}
          <div className="wf-connection-list">
            {!connections.length && (
              <p className="wf-context">{t("لم تربط أي حساب بعد.")}</p>
            )}
            {connections.map((row) => (
              <article key={row.id}>
                <div>
                  <strong>{row.label}</strong>
                  <span dir="auto">{row.origin}</span>
                  <small>
                    {operationLabel(row.status)}
                    {row.lastSyncAt &&
                      ` · ${new Date(row.lastSyncAt).toLocaleString("ar")}`}
                  </small>
                </div>
                <div className="wf-ops-actions">
                  {row.kind === "mail" ? (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void action(async () => {
                          await api(
                            `/api/workforce/mail/verify/${row.id}`,
                            {},
                            { quiet: true },
                          );
                          setNotice(t("تم اختبار SMTP وجلب الوارد بنجاح."));
                        })
                      }
                    >
                      <Link2 size={15} />
                      {t("اختبار الاتصال")}
                    </button>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void action(async () => {
                          await api(
                            `/api/workforce/connections/${row.id}/disconnect`,
                            {},
                            { quiet: true },
                          );
                          setNotice(t("حُذفت الجلسة المحفوظة من الخزنة."));
                        })
                      }
                    >
                      {t("إنهاء الجلسة المحفوظة")}
                    </button>
                  )}
                  <button
                    disabled={busy}
                    aria-label={t("حذف الحساب وبياناته")}
                    onClick={() => setConfirmDelete(row.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                  {confirmDelete === row.id && (
                    <>
                      <span>{t("حذف الحساب وبيانات بريده المحفوظة؟")}</span>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void action(async () => {
                            await api(
                              `/api/workforce/connections/${row.id}`,
                              undefined,
                              { method: "DELETE", quiet: true },
                            );
                            setConfirmDelete(undefined);
                          })
                        }
                      >
                        {t("تأكيد الحذف")}
                      </button>
                      <button onClick={() => setConfirmDelete(undefined)}>
                        {t("إلغاء")}
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : tab === "mail" ? (
        <>
          <div className="wf-ops-heading">
            <div>
              <h3>{t("صندوق بريد الموظف")}</h3>
              <p className="wf-context">
                {t("وارد حقيقي، وإرسال بعد اعتماد المستلم والنص.")}
              </p>
            </div>
            <button
              className="wf-primary"
              disabled={!mailAccounts.length || busy}
              onClick={() => startCompose()}
            >
              <Plus size={16} />
              {t("رسالة")}
            </button>
          </div>
          {!mailAccounts.length && (
            <div className="wf-ops-empty">
              <Inbox size={34} />
              <p>{t("اربط بريد منشأتك لبدء الاستقبال والإرسال.")}</p>
              <button
                onClick={() => {
                  setTab("accounts");
                  setAdding("mail");
                }}
              >
                {t("ربط البريد")}
              </button>
            </div>
          )}
          <div className="wf-ops-actions">
            {mailAccounts.map((row) => (
              <button
                key={row.id}
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await api(
                      `/api/workforce/mail/sync/${row.id}`,
                      {},
                      { quiet: true },
                    );
                    setNotice(t("اكتملت مزامنة الوارد."));
                  })
                }
              >
                <RefreshCw size={15} />
                {row.label}
              </button>
            ))}
          </div>
          {compose && (
            <form
              className="wf-connection-form"
              onSubmit={(event) => {
                event.preventDefault();
                const value = compose;
                void action(async () => {
                  const result = await api<{ message: MailMessage }>(
                    value.id
                      ? `/api/workforce/mail/${value.id}/draft`
                      : "/api/workforce/mail/draft",
                    { ...value, requestKey: keyFor(value) },
                    { quiet: true, method: value.id ? "PATCH" : "POST" },
                  );
                  pending.current = null;
                  setCompose(null);
                  setFilter("outbound");
                  setSelectedMail(result.message.id);
                  setNotice(t("المسودة محفوظة للمراجعة. لم تُرسل بعد."));
                });
              }}
            >
              <div className="wf-ops-heading">
                <h3>{t("مسودة للمراجعة")}</h3>
                <button
                  type="button"
                  aria-label={t("إغلاق")}
                  onClick={() => setCompose(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <label>
                {t("من الحساب")}
                <select
                  disabled={!!compose.id}
                  value={compose.connectionId}
                  onChange={(e) =>
                    setCompose({ ...compose, connectionId: e.target.value })
                  }
                >
                  {mailAccounts.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("إلى")}
                <input
                  type="email"
                  required
                  value={compose.recipient}
                  dir="ltr"
                  onChange={(e) =>
                    setCompose({ ...compose, recipient: e.target.value })
                  }
                />
              </label>
              <label>
                {t("العنوان")}
                <input
                  required
                  maxLength={500}
                  value={compose.subject}
                  onChange={(e) =>
                    setCompose({ ...compose, subject: e.target.value })
                  }
                />
              </label>
              <label>
                {t("النص")}
                <textarea
                  required
                  rows={6}
                  maxLength={20000}
                  value={compose.body}
                  onChange={(e) =>
                    setCompose({ ...compose, body: e.target.value })
                  }
                />
              </label>
              <button disabled={busy} className="wf-primary">
                {t("حفظ ومراجعة")}
              </button>
            </form>
          )}
          <div className="wf-ops-actions">
            <button
              aria-pressed={filter === "inbound"}
              onClick={() => {
                setFilter("inbound");
                setSelectedMail(undefined);
              }}
            >
              {t("الوارد")}
            </button>
            <button
              aria-pressed={filter === "outbound"}
              onClick={() => {
                setFilter("outbound");
                setSelectedMail(undefined);
              }}
            >
              {t("المسودات والإرسال")}
            </button>
          </div>
          <div className="wf-mail-layout">
            <div className="wf-message-list">
              {messages
                .filter((row) => row.direction === filter)
                .map((row) => (
                  <button
                    key={row.id}
                    aria-pressed={selectedMail === row.id}
                    onClick={() => setSelectedMail(row.id)}
                  >
                    <strong>{row.subject}</strong>
                    <span dir="auto">
                      {row.direction === "inbound" ? row.sender : row.recipient}
                    </span>
                    <small>{operationLabel(row.status)}</small>
                  </button>
                ))}
              {!messages.some((row) => row.direction === filter) && (
                <p className="wf-context">{t("لا توجد رسائل في هذا القسم.")}</p>
              )}
            </div>
            <article className="wf-mail-detail">
              {message ? (
                <>
                  <span className="wf-pill">
                    {operationLabel(message.status)}
                  </span>
                  <h3 dir="auto">{message.subject}</h3>
                  <p dir="auto">
                    {message.sender} ← {message.recipient}
                  </p>
                  <p className="wf-text" dir="auto">
                    {message.body}
                  </p>
                  {message.status === "draft" && (
                    <div className="wf-ops-actions">
                      <button
                        disabled={busy}
                        onClick={() =>
                          setCompose({
                            id: message.id,
                            updatedAt: message.updatedAt,
                            connectionId: message.connectionId,
                            recipient: message.recipient,
                            subject: message.subject,
                            body: message.body,
                          })
                        }
                      >
                        {t("تعديل")}
                      </button>
                      <button
                        disabled={busy}
                        className="wf-primary"
                        onClick={() =>
                          void action(async () => {
                            const result = await api<{ message: MailMessage }>(
                              `/api/workforce/mail/${message.id}/send`,
                              {
                                approved: true,
                                recipient: message.recipient,
                                subject: message.subject,
                                body: message.body,
                              },
                              { quiet: true },
                            );
                            setNotice(operationLabel(result.message.status));
                          })
                        }
                      >
                        <Send size={16} />
                        {t("اعتماد وإرسال")}
                      </button>
                    </div>
                  )}
                  {message.direction === "inbound" && (
                    <button onClick={() => startCompose(message)}>
                      {t("الرد على الرسالة")}
                    </button>
                  )}
                  {message.status === "unknown" && (
                    <>
                      <p className="wf-context">
                        {t(
                          "قد يكون الخادم استلم الرسالة؛ لا تُعد إرسالها قبل مراجعة مزود البريد.",
                        )}
                      </p>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void action(async () => {
                            const result = await api<{ note?: string }>(
                              `/api/workforce/mail/${message.id}/reconcile`,
                              {},
                              { quiet: true },
                            );
                            setNotice(
                              result.note || t("تم تحديث حالة الرسالة."),
                            );
                          })
                        }
                      >
                        {t("التحقق من مجلد المرسل")}
                      </button>
                    </>
                  )}
                  {message.status === "sent" && (
                    <small>
                      {t(
                        "قبول خادم SMTP لا يثبت وصول الرسالة لصندوق المستلم أو قراءتها.",
                      )}
                    </small>
                  )}
                </>
              ) : (
                <p className="wf-context">
                  {t("اختر رسالة لقراءة محتواها أو اعتماد مسودتها.")}
                </p>
              )}
            </article>
          </div>
        </>
      ) : (
        <>
          <div className="wf-ops-intro">
            <Search size={28} />
            <div>
              <h3>{t("الباحث والمتصفح الذاتي")}</h3>
              <p>{t("نتائج موثقة بالمصادر، وصفحات الجلسة داخل شاشة العمل.")}</p>
            </div>
          </div>
          <form
            className="wf-research-form"
            onSubmit={(event) => {
              event.preventDefault();
              const value = {
                query,
                connectionId: portal || undefined,
                language: outputLanguage,
              };
              void action(async () => {
                const result = await api<{ run: ResearchRun }>(
                  "/api/workforce/research",
                  { ...value, requestKey: keyFor(value) },
                  { quiet: true },
                );
                pending.current = null;
                setSelectedRun(result.run.id);
              });
            }}
          >
            <label>
              {t("مكان البحث")}
              <select
                value={portal}
                onChange={(event) => setPortal(event.target.value)}
              >
                <option value="">{t("الويب العام · بحث بالمصادر")}</option>
                {portals.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("المهمة")}
              <textarea
                required
                maxLength={2000}
                rows={2}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t(
                  "ابحث عن المنافسين… / افتح صفحة تقارير الحساب ولخّصها…",
                )}
              />
            </label>
            <button className="wf-primary" disabled={busy || !query.trim()}>
              <Search size={16} />
              {busy
                ? t("جارٍ العمل…")
                : portal
                  ? t("دخول وقراءة الصفحات")
                  : t("بحث مباشر")}
            </button>
          </form>
          <p className="wf-context">
            {t(
              "الجلسة الحالية تقرأ الصفحات وتلخصها. تنفيذ تغييرات داخل المواقع، وتجاوز MFA أو CAPTCHA، غير مدعوم.",
            )}
          </p>
          {runs.length > 0 && (
            <label>
              {t("سجل البحث")}
              <select
                value={run?.id || ""}
                onChange={(event) => setSelectedRun(event.target.value)}
              >
                {runs.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.query.slice(0, 90)} · {operationLabel(row.status)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {run ? (
            <article className="wf-research-result">
              <div className="wf-ops-heading">
                <h3 dir="auto">{run.query}</h3>
                <span className="wf-pill">{operationLabel(run.status)}</span>
              </div>
              <p className="wf-text" dir="auto">
                {run.summary ||
                  t("جارٍ جمع الأدلة؛ تظهر الصفحات هنا عند فتحها.")}
              </p>
              <div className="wf-source-list">
                {run.pages.map((page, index) => (
                  <details
                    key={`${index}:${page.url}`}
                    open={run.kind === "portal"}
                  >
                    <summary>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {page.title}
                    </summary>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      dir="ltr"
                    >
                      <ExternalLink size={14} />
                      {page.url}
                    </a>
                    <p className="wf-text" dir="auto">
                      {page.excerpt}
                    </p>
                  </details>
                ))}
              </div>
            </article>
          ) : (
            <div className="wf-ops-empty">
              <Globe size={36} />
              <p>
                {t(
                  "ابدأ بحثاً؛ تظهر هنا النتائج والصفحات الفعلية التي يقرأها الموظف.",
                )}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
