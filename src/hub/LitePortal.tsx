import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Bot,
  FilePlus2,
  Mic,
  RefreshCw,
  Settings2,
  Square,
  Volume2,
} from "lucide-react";
import type {
  Employee,
  MailMessage,
  Workspace,
  WorkTask,
} from "../../shared/workforce";
import type { SessionUser } from "../components/auth";
import { Modal } from "../components/Modal";
import { api } from "../lib/api";
import type { Order } from "../../shared/contracts";
import {
  useAppearance,
  appearanceLink,
  workforceLanguages,
  languageNames,
  type Language,
} from "../storefront/i18n";
import { useConversation } from "../workforce/useConversation";
import { useLiveVoice } from "../workforce/useLiveVoice";
import { VoiceSettings } from "../workforce/VoiceControls";
import { liveText } from "../workforce/liveCopy";
import { wfText } from "../workforce/copy";
import { hubCopy } from "./copy";
export default function LitePortal({
  user,
  onDeep,
}: {
  user: SessionUser;
  onDeep: () => void;
}) {
  const { language, outputLanguage, setOutputLanguage } = useAppearance(),
    c = hubCopy[language];
  const [catalog, setCatalog] = useState<Employee[]>([]),
    [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [orders, setOrders] = useState<Order[]>([]),
    [orderError, setOrderError] = useState("");
  const [mail, setMail] = useState<MailMessage[]>([]),
    [mailError, setMailError] = useState("");
  const [selected, setSelected] = useState("ceo"),
    [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false),
    [extracting, setExtracting] = useState(false),
    [settings, setSettings] = useState(false);
  const [review, setReview] = useState<MailMessage | null>(null),
    [sendError, setSendError] = useState("");
  const [mailUncertain, setMailUncertain] = useState(false);
  const [taskMode, setTaskMode] = useState(false);
  const alive = useRef(true),
    read = useRef(0),
    generation = useRef(0),
    log = useRef<HTMLDivElement>(null);
  const taskRequest = useRef<{ signature: string; key: string } | null>(null);
  const chat = useConversation(
    selected,
    undefined,
    language,
    outputLanguage,
    !!workspace?.organization && catalog.some((item) => item.id === selected),
  );
  const voice = useLiveVoice({
    language,
    outputLanguage,
    enabled: !!workspace?.organization && !busy && !extracting && !review,
    onTranscript: async (text) => {
      await send(text, true);
    },
  });
  const employee = catalog.find((item) => item.id === selected);
  useEffect(() => {
    setOutputLanguage(language);
  }, [language]);
  async function refresh() {
    const seq = ++read.current;
    const results = await Promise.allSettled([
      api<{ employees: Employee[] }>("/api/workforce/catalog", undefined, {
        quiet: true,
      }),
      api<Workspace>("/api/workforce/workspace", undefined, { quiet: true }),
      api<{ orders: Order[] }>("/api/orders", undefined, { quiet: true }),
    ]);
    if (!alive.current || seq !== read.current) return;
    setLoading(false);
    if (results[2].status === "fulfilled") {
      setOrders(results[2].value.orders);
      setOrderError("");
    } else setOrderError(String(results[2].reason?.message || c.retry));
    if (results[0].status === "fulfilled")
      setCatalog(results[0].value.employees);
    if (results[1].status === "fulfilled") {
      const w = results[1].value;
      setWorkspace(w);
      if (w.organization) {
        try {
          const result = await api<{ messages: MailMessage[] }>(
            "/api/workforce/mail",
            undefined,
            { quiet: true },
          );
          if (alive.current && seq === read.current) {
            setMail(result.messages);
            setMailError("");
          }
        } catch (err) {
          if (alive.current && seq === read.current)
            setMailError((err as Error).message);
        }
      }
    }
    if (!alive.current || seq !== read.current) return;
    const rejected = results
      .slice(0, 2)
      .find((result) => result.status === "rejected");
    setLoadError(
      rejected?.status === "rejected"
        ? String(rejected.reason?.message || c.retry)
        : "",
    );
    setLoading(false);
  }
  useEffect(() => {
    alive.current = true;
    void refresh();
    const interval = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 20000);
    return () => {
      alive.current = false;
      read.current++;
      generation.current++;
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    log.current?.scrollTo({
      top: log.current.scrollHeight,
      behavior: "instant",
    });
  }, [chat.turns, chat.busy]);
  function selectEmployee(value: string) {
    voice.stop();
    generation.current++;
    setSelected(value);
    setDraft("");
    setError("");
    taskRequest.current = null;
  }
  async function send(text: string, audible = false) {
    if (
      !text.trim() ||
      chat.busy ||
      chat.loading ||
      busy ||
      extracting ||
      !employee
    )
      return;
    const epoch = generation.current;
    setError("");
    if (audible) voice.pauseForReply();
    try {
      if (taskMode) {
        setBusy(true);
        const signature = JSON.stringify([selected, text, outputLanguage]);
        if (taskRequest.current?.signature !== signature)
          taskRequest.current = { signature, key: crypto.randomUUID() };
        await api(
          "/api/workforce/tasks",
          {
            employeeId: selected,
            input: text,
            outputLanguage,
            mode: "live",
            requestKey: taskRequest.current.key,
          },
          { quiet: true },
        );
        if (!alive.current || epoch !== generation.current) return;
        taskRequest.current = null;
        setDraft((value) => (value === text ? "" : value));
      } else {
        const turn = await chat.send(text);
        if (!alive.current || epoch !== generation.current) return;
        if (turn) setDraft((value) => (value === text ? "" : value));
        if (audible && turn?.output && turn.status === "ready")
          await voice.speak({
            employeeId: selected,
            text: turn.output,
            language: turn.outputLanguage,
          });
      }
      if (alive.current && epoch === generation.current) void refresh();
    } catch (err) {
      if (alive.current && epoch === generation.current)
        setError((err as Error).message);
    } finally {
      if (alive.current && epoch === generation.current) {
        setBusy(false);
        if (audible) voice.resume();
      }
    }
  }
  async function extract(file: File) {
    if (file.size > 1_000_000) {
      setError(c.attachNote);
      return;
    }
    const epoch = generation.current;
    setExtracting(true);
    setError("");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const result = await api<{ context: string }>(
        "/api/ecosystem/extract",
        {
          mimeType:
            file.type || (file.name.endsWith(".txt") ? "text/plain" : ""),
          data: btoa(binary),
          language,
        },
        { quiet: true },
      );
      if (alive.current && epoch === generation.current)
        setDraft((value) =>
          `${value}\n${result.context}`.trim().slice(0, 4000),
        );
    } catch (err) {
      if (alive.current && epoch === generation.current)
        setError((err as Error).message);
    } finally {
      if (alive.current && epoch === generation.current) setExtracting(false);
    }
  }
  async function approveMail() {
    if (!review || busy || mailUncertain) return;
    setBusy(true);
    setSendError("");
    try {
      const result = await api<{ message: MailMessage }>(
        `/api/workforce/mail/${review.id}/send`,
        {
          approved: true,
          recipient: review.recipient,
          subject: review.subject,
          body: review.body,
        },
        { quiet: true },
      );
      if (!alive.current) return;
      setReview(result.message);
      void refresh();
    } catch (err) {
      if (alive.current) {
        setSendError((err as Error).message);
        setMailUncertain(true);
        void refresh();
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="hub-skeleton" role="status">
        {c.loading}
      </div>
    );
  if (!workspace?.organization)
    return (
      <div className="hub-task-panel">
        <h3>{c.create}</h3>
        {(error || loadError) && (
          <p className="hub-error" role="alert">
            {error || loadError}
          </p>
        )}
        <form
          className="hub-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            const name = new FormData(event.currentTarget).get("name");
            setBusy(true);
            setError("");
            try {
              await api(
                "/api/workforce/organization",
                { name, outputLanguage: language },
                { quiet: true },
              );
              if (alive.current) await refresh();
            } catch (err) {
              if (alive.current) setError((err as Error).message);
            } finally {
              if (alive.current) setBusy(false);
            }
          }}
        >
          <label>
            {c.company}
            <input
              name="name"
              required
              maxLength={100}
              autoComplete="organization"
            />
          </label>
          <button className="hub-button hub-primary" disabled={busy}>
            {busy ? c.loading : c.create}
          </button>
          <button
            className="hub-button"
            type="button"
            onClick={() => void refresh()}
          >
            {c.refresh}
          </button>
        </form>
      </div>
    );
  return (
    <div className="hub-lite">
      <section className="hub-chat" aria-label={c.chat}>
        <header className="hub-chat-head">
          <span className="hub-avatar">
            <Bot size={23} />
          </span>
          <strong>{c.chat}</strong>
          <select
            className="hub-select"
            value={selected}
            disabled={busy || chat.busy || extracting}
            aria-label={c.chat}
            onChange={(event) => selectEmployee(event.target.value)}
          >
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title[language] || item.title.en}
              </option>
            ))}
          </select>
          <button
            className="hub-icon"
            onClick={() => {
              voice.stop();
              setSettings(true);
            }}
            aria-label={c.settings}
          >
            <Settings2 size={17} />
          </button>
        </header>
        <div
          className="hub-chat-log"
          ref={log}
          aria-busy={chat.loading || chat.busy}
        >
          {chat.loading ? (
            <p role="status">{c.loading}</p>
          ) : !chat.turns.length ? (
            <div className="hub-chat-empty">
              <Bot size={32} />
              <h3>{c.prompt}</h3>
              <p>{employee?.bio[language] || employee?.bio.en}</p>
            </div>
          ) : (
            chat.turns.map((turn) => (
              <div key={turn.id}>
                <article className="hub-user-message">
                  <small>{user.name || liveText(language, "you")}</small>
                  <p dir="auto">{turn.input}</p>
                </article>
                <article>
                  <small>
                    {employee?.title[language] || employee?.title.en}
                  </small>
                  <p dir="auto">
                    {turn.output ||
                      wfText(
                        language,
                        turn.status === "generating" ? "busy" : "failed",
                      )}
                  </p>
                  {turn.output && (
                    <button
                      className="hub-text-link"
                      onClick={() => {
                        voice.stop();
                        void voice.speak({
                          employeeId: turn.employeeId,
                          text: turn.output,
                          language: turn.outputLanguage,
                        });
                      }}
                    >
                      <Volume2 size={14} />
                      {liveText(language, "read")}
                    </button>
                  )}
                  {!!turn.collaboration.length && (
                    <details>
                      <summary>{wfText(language, "team")}</summary>
                      {turn.collaboration.map((part) => (
                        <p key={part.employeeId} dir="auto">
                          {part.employeeId}: {part.output}
                        </p>
                      ))}
                    </details>
                  )}
                </article>
              </div>
            ))
          )}
        </div>
        <form
          className="hub-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
        >
          {(error || chat.error || loadError) && (
            <p className="hub-error" role="alert">
              {error || chat.error || loadError}
            </p>
          )}
          <label className="sr-only" htmlFor="hub-message">
            {c.prompt}
          </label>
          <textarea
            id="hub-message"
            value={draft}
            maxLength={4000}
            rows={3}
            placeholder={c.prompt}
            disabled={extracting}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void send(draft);
              }
            }}
          />
          <div className="hub-composer-actions">
            <label className="hub-file">
              <FilePlus2 size={17} />
              <span>{extracting ? c.loading : c.attach}</span>
              <input
                type="file"
                aria-label={c.attach}
                accept="image/png,image/jpeg,image/webp,application/pdf,text/plain"
                disabled={extracting || busy || chat.busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void extract(file);
                }}
              />
            </label>
            <button
              className="hub-icon"
              type="button"
              aria-label={
                voice.active || voice.phase !== "idle"
                  ? liveText(language, "stop")
                  : liveText(language, "call")
              }
              onClick={() =>
                voice.active || voice.phase !== "idle"
                  ? voice.stop()
                  : voice.startCall()
              }
            >
              {voice.active || voice.phase !== "idle" ? (
                <Square size={17} />
              ) : (
                <Mic size={17} />
              )}
            </button>
            <select
              aria-label={c.send}
              className="hub-select"
              style={{ width: "auto" }}
              value={taskMode ? "task" : "chat"}
              disabled={busy || chat.busy}
              onChange={(event) => {
                voice.stop();
                setTaskMode(event.target.value === "task");
              }}
            >
              <option value="chat">{c.chat}</option>
              <option value="task">{wfText(language, "task")}</option>
            </select>
            <button
              className="hub-button hub-primary"
              disabled={
                !draft.trim() ||
                busy ||
                chat.busy ||
                chat.loading ||
                extracting ||
                !employee
              }
              aria-label={c.send}
            >
              <ArrowUp size={18} />
              {busy || chat.busy ? c.loading : c.send}
            </button>
          </div>
          <p className="hub-file-note">{c.attachNote}</p>
          {(voice.error || voice.interim || voice.phase !== "idle") && (
            <p role="status">
              {voice.error || voice.interim || liveText(language, voice.phase)}
            </p>
          )}
        </form>
      </section>
      <aside className="hub-side">
        <section className="hub-task-panel">
          <h3>{c.orders} · OneShot Pay</h3>
          {orderError ? (
            <p className="hub-error" role="alert">
              {orderError}
            </p>
          ) : orders.length ? (
            orders.slice(0, 3).map((order) => (
              <div className="hub-mail-row" key={order.id}>
                <strong>{order.description}</strong>
                <small>
                  {new Intl.NumberFormat(language, {
                    style: "currency",
                    currency: order.currency,
                  }).format(order.amountCents / 100)}{" "}
                  · {order.status} · {order.executionMode}
                </small>
                <a
                  className="hub-text-link"
                  href={appearanceLink(
                    `/?order=${encodeURIComponent(order.id)}`,
                  )}
                >
                  {c.review}
                  <ArrowUpRight size={14} />
                </a>
              </div>
            ))
          ) : (
            <p>{c.empty}</p>
          )}
        </section>
        <section className="hub-task-panel">
          <div className="hub-panel-heading">
            <h3>{c.tasks}</h3>
            <button
              className="hub-icon"
              onClick={() => void refresh()}
              aria-label={c.refresh}
            >
              <RefreshCw size={15} />
            </button>
          </div>
          {workspace.tasks.length ? (
            workspace.tasks.slice(0, 8).map((task: WorkTask) => (
              <details key={task.id}>
                <summary>
                  {task.input.slice(0, 90)}
                  <small> · {wfText(language, task.status)}</small>
                </summary>
                <small>
                  {task.employeeId} ·{" "}
                  {new Date(task.updatedAt).toLocaleString(language)}
                </small>
                <p dir="auto">{task.output || wfText(language, task.status)}</p>
              </details>
            ))
          ) : (
            <p>{c.empty}</p>
          )}
        </section>
        <section className="hub-task-panel">
          <h3>{c.approvals}</h3>
          {mailError && (
            <p className="hub-error" role="alert">
              {mailError}
            </p>
          )}
          {mail
            .filter(
              (item) =>
                item.direction === "outbound" &&
                ["draft", "sending", "unknown"].includes(item.status),
            )
            .slice(0, 6)
            .map((item) => (
              <div key={item.id} className="hub-mail-row">
                <strong>{item.subject}</strong>
                <small>
                  {item.recipient} · {item.status}
                </small>
                <button
                  className="hub-text-link"
                  onClick={() => {
                    voice.stop();
                    setReview(item);
                    setSendError("");
                    setMailUncertain(false);
                  }}
                >
                  {c.review}
                  <ArrowUpRight size={14} />
                </button>
              </div>
            ))}
          {!mailError &&
            !mail.some(
              (item) =>
                item.direction === "outbound" &&
                ["draft", "sending", "unknown"].includes(item.status),
            ) && <p>{c.empty}</p>}
        </section>
        <section className="hub-task-panel">
          <h3>{c.deepTitle}</h3>
          <p>{c.deepBody}</p>
          <button
            className="hub-text-link"
            onClick={() => {
              voice.stop();
              onDeep();
            }}
          >
            {c.fullOffice}
            <ArrowUpRight size={16} />
          </button>
        </section>
      </aside>
      {settings && (
        <Modal title={c.settings} onClose={() => setSettings(false)}>
          <label>
            {c.settings}
            <select
              className="hub-select"
              value={outputLanguage}
              onChange={(event) =>
                setOutputLanguage(event.target.value as Language)
              }
            >
              {workforceLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {languageNames[lang]}
                </option>
              ))}
            </select>
          </label>
          <VoiceSettings voice={voice} employeeId={selected} />
        </Modal>
      )}
      {review && (
        <Modal
          title={c.approvals}
          onClose={() => {
            if (!busy) setReview(null);
          }}
        >
          <div className="hub-mail-fields">
            <strong dir="auto">{review.recipient}</strong>
            <strong dir="auto">{review.subject}</strong>
            <p className="hub-mail-body" dir="auto">
              {review.body}
            </p>
            <small>{review.status}</small>
            {sendError && (
              <p className="hub-error" role="alert">
                {sendError}
              </p>
            )}
            <button
              className="hub-button hub-primary"
              disabled={busy || review.status !== "draft" || mailUncertain}
              onClick={() => void approveMail()}
            >
              {busy ? c.loading : c.approve}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
