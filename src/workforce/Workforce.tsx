import { MarketingComparison } from "../marketing/MarketingComparison";
import { marketingCopy } from "../marketing/copy";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Menu,
  Monitor,
  Check,
  CircleDot,
  FileText,
  Mail,
  MessageSquare,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import {
  useAppearance,
  appearanceLink,
  languageNames,
  workforceLanguages,
  type Language,
} from "../storefront/i18n";
import { AppearanceControls } from "../storefront/Brand";
import type { SessionUser } from "../components/auth";
import type {
  Employee,
  Meeting,
  Workspace,
  WorkTask,
  WorkEvent,
} from "../../shared/workforce";
import { wfText } from "./copy";
import { ChatPanel } from "./ChatPanel";
import { OfficeScene } from "./OfficeScene";
import { MasterPC } from "./MasterPC";
import { MeetingAudio } from "./MeetingAudio";
import { useLiveVoice } from "./useLiveVoice";
import { useConversation } from "./useConversation";
import { liveText } from "./liveCopy";
import "./workforce.css";
import "./live-workspace.css";
import "./compact.css";

const emptyWorkspace: Workspace = {
  organization: null,
  tasks: [],
  events: [],
  meetings: [],
};
const request = <T,>(path: string, body?: unknown, method?: string) =>
  api<T>(`/api/workforce/${path}`, body, { quiet: true, method });
function Dialog({
  title,
  onClose,
  children,
  inline = false,
}: {
  inline?: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    { language } = useAppearance();
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => node?.close();
  }, [inline]);
  if (inline)
    return (
      <section className="wf-dialog wf-meeting-panel" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button aria-label={wfText(language, "close")} onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    );
  return (
    <dialog
      ref={ref}
      className="wf-dialog"
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button aria-label={wfText(language, "close")} onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function EmployeeIcon({ id, size = 24 }: { id: string; size?: number }) {
  return id === "ceo" ? (
    <BriefcaseBusiness size={size} />
  ) : id === "mail" ? (
    <Mail size={size} />
  ) : (
    <Sparkles size={size} />
  );
}
function useTyped(text: string, identity: string) {
  const [length, setLength] = useState(0);
  const timerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLength(text.length);
      return;
    }
    setLength(0);
    let count = 0;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      count = Math.min(
        text.length,
        count + Math.max(4, Math.ceil(text.length / 100)),
      );
      setLength(count);
      if (count >= text.length) clearInterval(timer);
    }, 35);
    timerRef.current = timer;
    return () => clearInterval(timer);
  }, [text, identity]);
  return {
    visible: text.slice(0, length),
    full: () => {
      clearInterval(timerRef.current);
      setLength(text.length);
    },
    typing: length < text.length,
  };
}
function Desktop({
  employee,
  task,
  events,
  mode,
  onApprove,
  busy,
  demoText,
}: {
  employee?: Employee;
  task?: WorkTask;
  events: WorkEvent[];
  mode: "demo" | "live" | "replay";
  onApprove?: () => void;
  busy: boolean;
  demoText: string;
}) {
  const { language } = useAppearance(),
    t = (key: string) => wfText(language, key);
  const [replayIndex, setReplayIndex] = useState(0);
  const history = [...events]
    .filter((e) => e.taskId === task?.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  useEffect(() => {
    setReplayIndex(0);
    if (mode !== "replay") return;
    let position = 0;
    const timer = setInterval(() => {
      if (document.hidden) return;
      position = Math.min(position + 1, Math.max(0, history.length - 1));
      setReplayIndex(position);
      if (position >= history.length - 1) clearInterval(timer);
    }, 1600);
    return () => clearInterval(timer);
  }, [mode, task?.id, history.length]);
  const phase =
    mode === "demo" && !task
      ? "awaiting_approval"
      : mode === "replay"
        ? history[replayIndex]?.phase || task?.status || "available"
        : task?.status || "available";
  const output =
    mode === "replay" && ["received", "drafting", "queued"].includes(phase)
      ? ""
      : task?.output || (mode === "demo" ? demoText : "");
  const { visible, full, typing } = useTyped(
    output,
    `${task?.id || "demo"}:${mode}`,
  );
  return (
    <section className={`wf-desktop ${typing ? "is-typing" : ""}`}>
      <div className="wf-windowbar">
        <span className="wf-windowdots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <Monitor size={15} />
        <span>{employee?.title[language] || employee?.title.en || "CEO"}</span>
        <b>
          {t(mode)}
          {task?.mode === "demo" && mode !== "demo" ? ` · ${t("demo")}` : ""}
        </b>
      </div>
      <p className="wf-context">
        {t(
          mode === "demo"
            ? "demoNote"
            : mode === "replay"
              ? "replayNote"
              : "liveNote",
        )}
      </p>
      <div className="wf-desktop-body">
        <aside aria-hidden="true">
          <Mail />
          <FileText />
          <MessageSquare />
        </aside>
        <div className="wf-screen-content">
          <ol className="wf-progress" aria-label={t("tasks")}>
            {[
              "received",
              "drafting",
              "awaiting_approval",
              task?.mode === "demo"
                ? "demo_completed"
                : task?.employeeId === "mail"
                  ? "awaiting_connection"
                  : "approved",
            ].map((step) => (
              <li key={step} aria-current={phase === step ? "step" : undefined}>
                {t(step)}
              </li>
            ))}
          </ol>
          <div className="wf-step">
            <CircleDot size={16} />
            <span role="status">{t(phase)}</span>
          </div>
          {task?.input && (
            <details>
              <summary>{t("task")}</summary>
              <p className="wf-text" dir="auto">
                {task.input}
              </p>
            </details>
          )}
          <article className="wf-paper">
            <div className="wf-paper-heading">
              <FileText size={18} />
              <span>{t("approve")}</span>
            </div>
            <div className="wf-text" dir="auto">
              {(mode === "live" ? output : visible) ||
                (busy ? t("busy") : t("empty"))}
            </div>
          </article>
          <div className="wf-actions">
            <button onClick={full}>{t("full")}</button>
            {mode !== "replay" && task?.status === "awaiting_approval" && (
              <button
                className="wf-primary"
                disabled={busy}
                onClick={onApprove}
              >
                <Check size={16} />
                {t("approve")}
              </button>
            )}
          </div>
          {mode === "replay" && history[replayIndex] && (
            <time>
              {new Date(history[replayIndex].createdAt).toLocaleString(
                language,
              )}
            </time>
          )}
        </div>
      </div>
    </section>
  );
}
export default function Workforce({
  user,
  onLogin,
  accountControl,
}: {
  user: SessionUser | null;
  onLogin: () => void;
  accountControl: ReactNode;
}) {
  const { language, outputLanguage, setOutputLanguage } = useAppearance();
  const t = (key: string) => wfText(language, key);
  const [tab, setTabState] = useState<"market" | "office">(
      new URLSearchParams(window.location.search).get("view") === "office"
        ? "office"
        : "market",
    ),
    [catalog, setCatalog] = useState<Employee[]>([]),
    [catalogLoading, setCatalogLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [trial, setTrial] = useState<Employee | null>(null),
    [selected, setSelected] = useState("ceo");
  const [input, setInput] = useState(""),
    [company, setCompany] = useState(""),
    [activeTask, setActiveTask] = useState<string>(),
    [mode, setMode] = useState<"demo" | "live" | "replay">("live");
  const [boardroom, setBoardroom] = useState(false),
    [topic, setTopic] = useState(""),
    [meetingId, setMeetingId] = useState<string>(),
    [selectedProposals, setSelectedProposals] = useState<string[]>([]),
    [revision, setRevision] = useState("");
  const [view, setView] = useState<"chat" | "headquarters">(
    new URLSearchParams(window.location.search).get("mode") === "headquarters"
      ? "headquarters"
      : "chat",
  );
  const [chatCollapsed, setChatCollapsed] = useState(
    () => window.matchMedia("(max-width: 900px)").matches,
  );
  const [toolFocus, setToolFocus] = useState<{
    employeeId: string;
    resourceId?: string;
  }>();
  const [masterOpen, setMasterOpen] = useState(false),
    [operationsOpen, setOperationsOpen] = useState(false);
  const live = (key: string) => liveText(language, key);
  const conversation = useConversation(
    selected,
    boardroom ? meetingId : undefined,
    language,
    outputLanguage,
    !!user && !!workspace.organization && tab === "office",
  );
  const sendVoice = useRef<(text: string) => Promise<void>>(async () => {});
  const voice = useLiveVoice({
    language,
    outputLanguage,
    enabled: !!user && !!workspace.organization && tab === "office",
    onTranscript: (text) => sendVoice.current(text),
  });
  const sendSequence = useRef(0);
  async function sendChat(text: string, audible = false) {
    if (!text.trim()) return false;
    const sequence = ++sendSequence.current,
      audioEpoch = voice.audioEpoch.current;
    voice.pauseForReply();
    try {
      const turn = await conversation.send(text);
      if (
        turn?.status === "ready" &&
        audible &&
        sequence === sendSequence.current &&
        audioEpoch === voice.audioEpoch.current
      )
        await voice.speak({
          employeeId: turn.employeeId,
          text: turn.output,
          language: turn.outputLanguage,
        });
      return turn?.status === "ready";
    } catch {
      if (
        sequence === sendSequence.current &&
        audioEpoch === voice.audioEpoch.current
      )
        voice.stop();
      return false;
    } finally {
      if (
        sequence === sendSequence.current &&
        audioEpoch === voice.audioEpoch.current
      )
        voice.resume();
    }
  }
  sendVoice.current = async (text) => {
    if (!(await sendChat(text, true))) throw new Error("unconfirmed");
  };
  function selectPerson(id: string) {
    if (id === selected) return;
    sendSequence.current++;
    const wasActive = voice.active;
    voice.stop();
    setSelected(id);
    setActiveTask(undefined);
    setMode("live");
    if (wasActive) voice.startCall();
  }
  function changeView(value: "chat" | "headquarters") {
    setView(value);
    const url = new URL(window.location.href);
    url.searchParams.set("mode", value);
    window.history.replaceState({}, "", url);
  }
  function openMeeting() {
    voice.stop();
    setBoardroom(true);
  }
  function closeMeeting() {
    voice.stop();
    setBoardroom(false);
  }
  useEffect(() => {
    sendSequence.current++;
    voice.stop();
  }, [boardroom, meetingId]);
  const chatPanel = (inMeeting = false, inWorkstation = false) => (
    <ChatPanel
      catalog={catalog}
      selected={selected}
      onSelect={selectPerson}
      chat={conversation}
      voice={voice}
      onSend={sendChat}
      onTools={(employeeId, resourceId) => {
        voice.stop();
        if (employeeId) selectPerson(employeeId);
        setToolFocus({ employeeId: employeeId || selected, resourceId });
        setMasterOpen(true);
      }}
      keyboard={
        inMeeting === boardroom &&
        (inWorkstation || !masterOpen) &&
        (inWorkstation || view !== "headquarters" || !chatCollapsed)
      }
      compact={inMeeting || view === "headquarters"}
    />
  );
  function setTab(value: "market" | "office") {
    setTabState(value);
    const url = new URL(window.location.href);
    url.searchParams.set("view", value);
    window.history.replaceState({}, "", url);
  }
  const mounted = useRef(true),
    syncSequence = useRef(0),
    intent = useRef<{ key: string; signature: string } | null>(null),
    meetingIntent = useRef<{ key: string; signature: string } | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function loadCatalog() {
    setCatalogLoading(true);
    try {
      const r = await request<{ employees: Employee[] }>("catalog");
      if (mounted.current) setCatalog(r.employees);
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setCatalogLoading(false);
    }
  }
  async function sync() {
    if (!user) return;
    const seq = ++syncSequence.current;
    try {
      const data = await request<Workspace>("workspace");
      if (mounted.current && seq === syncSequence.current) setWorkspace(data);
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    }
  }
  useEffect(() => {
    const updateVisibility = () =>
      document.documentElement.classList.toggle("wf-hidden", document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    updateVisibility();
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
      document.documentElement.classList.remove("wf-hidden");
    };
  }, []);
  useEffect(() => {
    if (workspace.organization)
      setOutputLanguage(workspace.organization.outputLanguage);
  }, [workspace.organization?.id]);
  useEffect(() => {
    void loadCatalog();
    if (user) void sync();
  }, [user?.id]);
  useEffect(() => {
    if (!user || tab !== "office") return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (!document.hidden) await sync();
      if (!stopped) timer = setTimeout(poll, busy ? 2000 : 10000);
    }
    timer = setTimeout(poll, 2000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [user?.id, tab, busy]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) {
        await sync();
        setBusy(false);
      }
    }
  }
  const employee = catalog.find((e) => e.id === selected),
    task =
      workspace.tasks.find((t) => t.id === activeTask) ||
      workspace.tasks.find((t) => t.employeeId === selected);
  const [replayEvents, setReplayEvents] = useState<WorkEvent[]>([]);
  useEffect(() => {
    let alive = true;
    setReplayEvents([]);
    if (task && mode === "replay") {
      request<{ events: WorkEvent[] }>(`tasks/${task.id}/events`)
        .then((r) => {
          if (alive) setReplayEvents(r.events);
        })
        .catch((e) => {
          if (alive) setError((e as Error).message);
        });
    }
    return () => {
      alive = false;
    };
  }, [task?.id, task?.updatedAt, mode]);
  const meeting = workspace.meetings.find((m) => m.id === meetingId);
  const demoText = t(`sample_${trial?.id || selected}`);
  const title = (e?: Employee) => e?.title[language] || e?.title.en || "CEO";
  async function createOrganization() {
    await action(async () => {
      const r = await request<{
        organization: NonNullable<Workspace["organization"]>;
      }>("organization", { name: company, outputLanguage });
      setWorkspace((w) => ({ ...w, organization: r.organization }));
    });
  }
  async function run(employeeId = selected, isTrial = false) {
    if (!user) {
      onLogin();
      return;
    }
    if (!workspace.organization) {
      setTrial(null);
      setTab("office");
      return;
    }
    await action(async () => {
      const signature = JSON.stringify({
        input,
        employeeId,
        outputLanguage,
        isTrial,
      });
      if (intent.current?.signature !== signature)
        intent.current = { key: crypto.randomUUID(), signature };
      selectPerson(employeeId);
      setActiveTask(undefined);
      setOperationsOpen(true);
      setMode(isTrial ? "demo" : "live");
      setTab("office");
      setTrial(null);
      const r = await request<{ task: WorkTask }>("tasks", {
        input,
        employeeId,
        outputLanguage,
        mode: isTrial ? "demo" : "live",
        requestKey: intent.current.key,
      });
      if (mounted.current) {
        setActiveTask(r.task.id);
        intent.current = null;
      }
    });
  }
  async function startMeeting() {
    voice.stop();
    await action(async () => {
      const signature = JSON.stringify({ topic, outputLanguage });
      if (meetingIntent.current?.signature !== signature)
        meetingIntent.current = { key: crypto.randomUUID(), signature };
      const r = await request<{ meeting: Meeting }>("meetings", {
        topic,
        outputLanguage,
        requestKey: meetingIntent.current.key,
      });
      setMeetingId(r.meeting.id);
      setSelectedProposals([]);
      meetingIntent.current = null;
    });
  }
  async function meetingAction(actionName: string) {
    if (!meeting) return;
    await action(async () => {
      await request(
        `meetings/${meeting.id}`,
        {
          action: actionName,
          selected: selectedProposals,
          revision,
          outputLanguage,
        },
        "PATCH",
      );
    });
  }
  const languageControl = (
    <label className="wf-label">
      {t("output")}
      <select
        value={outputLanguage}
        onChange={(e) => setOutputLanguage(e.target.value as Language)}
      >
        {workforceLanguages.map((l) => (
          <option key={l} value={l}>
            {languageNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
  const meetingPanel = boardroom ? (
    <Dialog
      inline={view === "headquarters"}
      title={t("boardroom")}
      onClose={closeMeeting}
    >
      {error && (
        <p className="wf-error" role="alert">
          {error}
        </p>
      )}
      <MeetingAudio
        meeting={meeting}
        catalog={catalog}
        workspace={workspace}
        voice={voice}
        onSelect={selectPerson}
      />
      {chatPanel(true)}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void startMeeting();
        }}
      >
        <label>
          {t("topic")}
          <textarea
            required
            maxLength={2000}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>
        <button className="wf-primary" disabled={busy}>
          {busy ? t("busy") : t("meeting")}
        </button>
      </form>
      {meeting && (
        <>
          <h3>{t("minutes")}</h3>
          {["ready", "saved", "revision_requested"].includes(
            meeting.status,
          ) && <p role="status">{t(meeting.status)}</p>}
          {meeting.revision && (
            <p className="wf-text" dir="auto">
              {meeting.revision}
            </p>
          )}
          <details>
            <summary>{t("full")}</summary>
            <p className="wf-text" dir="auto">
              {meeting.minutes}
            </p>
          </details>
          {["ready", "saved", "revision_requested"].includes(meeting.status) ? (
            <>
              <fieldset>
                <legend>{t("tasks")}</legend>
                {meeting.proposals.map((p) => (
                  <label key={p.id} className="wf-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedProposals.includes(p.id)}
                      onChange={(e) =>
                        setSelectedProposals((prev) =>
                          e.target.checked
                            ? [...prev, p.id]
                            : prev.filter((id) => id !== p.id),
                        )
                      }
                    />
                    {p.title}
                  </label>
                ))}
              </fieldset>
              <label>
                {t("revise")}
                <textarea
                  maxLength={2000}
                  value={revision}
                  onChange={(e) => setRevision(e.target.value)}
                />
              </label>
              <div className="wf-actions">
                <button
                  disabled={busy}
                  onClick={() => void meetingAction("save")}
                >
                  {t("save")}
                </button>
                <button
                  disabled={busy || !revision.trim()}
                  onClick={() => void meetingAction("revise")}
                >
                  {t("revise")}
                </button>
                <button
                  className="wf-primary"
                  disabled={busy || !selectedProposals.length}
                  onClick={() => void meetingAction("approve")}
                >
                  {t("selected")}
                </button>
              </div>
            </>
          ) : (
            <p role="status">
              {meeting.status === "approved"
                ? t("approved")
                : meeting.status === "failed"
                  ? t("failed")
                  : t("busy")}
            </p>
          )}
        </>
      )}
    </Dialog>
  ) : null;
  return (
    <div className="wf-shell">
      <header className="wf-header">
        <a href={appearanceLink("/")} className="wf-brand">
          <img src="/oneshot.svg" width="38" height="38" alt="oneShot" />
          <span>
            oneShot <small>AI WORKFORCE</small>
          </span>
        </a>
        <nav>
          <button
            className={tab === "market" ? "active" : ""}
            onClick={() => setTab("market")}
          >
            <span className="wf-nav-long">{t("market")}</span>
            <span className="wf-nav-short">
              {language === "ar" ? "السوق" : "Market"}
            </span>
          </button>
          <button
            className={tab === "office" ? "active" : ""}
            onClick={() => setTab("office")}
          >
            <span className="wf-nav-long">{t("office")}</span>
            <span className="wf-nav-short">
              {language === "ar" ? "المقر" : "Office"}
            </span>
          </button>
        </nav>
        <details className="wf-global-menu">
          <summary aria-label="إعدادات الحساب واللغة والمظهر">
            <Menu size={20} />
          </summary>
          <div>
            <AppearanceControls />
            {accountControl}
            <a href={appearanceLink("/")}>{t("home")}</a>
          </div>
        </details>
      </header>
      <main className="wf-main">
        {error && (
          <div className="wf-error" role="alert">
            {error}
            <button
              onClick={() => {
                setError("");
                void loadCatalog();
                void sync();
              }}
            >
              {t("refresh")}
            </button>
          </div>
        )}
        {tab === "market" ? (
          <>
            <section className="wf-hero">
              <div>
                <span className="wf-eyebrow">
                  {marketingCopy[language].badge}
                </span>
                <h1>{marketingCopy[language].headline}</h1>
                <p>{marketingCopy[language].intro}</p>
                <p>{marketingCopy[language].examples}</p>
                <button
                  className="wf-primary"
                  onClick={() => {
                    setSelected("ceo");
                    setTab("office");
                  }}
                >
                  <Building2 size={18} />
                  {t("free")}
                  <ArrowUpRight size={18} />
                </button>
                <p className="wf-muted">{t("prototype")}</p>
              </div>
              <div className="wf-hero-art" aria-hidden="true">
                <div className="wf-orbit" />
                <div className="wf-art-desk">
                  <BriefcaseBusiness size={38} />
                  <span>CEO</span>
                  <i />
                </div>
                <div className="wf-art-desk">
                  <Mail size={28} />
                  <span>MAIL</span>
                </div>
                <div className="wf-art-desk">
                  <Sparkles size={28} />
                  <span>CONTENT</span>
                </div>
                <span className="wf-art-caption">
                  {marketingCopy[language].team}
                </span>
              </div>
            </section>
            <MarketingComparison />
            <section className="wf-market">
              <div className="wf-section-title">
                <div>
                  <span className="wf-eyebrow">01 / DISCOVER</span>
                  <h2>{t("market")}</h2>
                </div>
                <span className="wf-pill">AI</span>
              </div>
              <div className="wf-filters">
                <label>
                  <Search size={18} />
                  <input
                    aria-label={t("search")}
                    placeholder={t("search")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label={t("all")}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="all">{t("all")}</option>
                  {[...new Set(catalog.map((e) => e.category))].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              {catalogLoading ? (
                <p role="status">{t("loading")}</p>
              ) : !catalog.filter(
                  (e) =>
                    (category === "all" || e.category === category) &&
                    JSON.stringify([e.title, e.bio, e.skills])
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                ).length ? (
                <p>{t("empty")}</p>
              ) : (
                <div className="wf-cards">
                  {catalog
                    .filter(
                      (e) =>
                        (category === "all" || e.category === category) &&
                        JSON.stringify([e.title, e.bio, e.skills])
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((e, i) => (
                      <article key={e.id} className="wf-card">
                        <div className="wf-card-top">
                          <span className="wf-avatar">
                            <EmployeeIcon id={e.id} size={28} />
                          </span>
                          <span className="wf-card-number">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <span className="wf-eyebrow">AI / {e.category}</span>
                        <h3>{title(e)}</h3>
                        <p>{e.bio[language] || e.bio.en}</p>
                        <div className="wf-skills">
                          {e.skills.map((s) => (
                            <span key={s}>{s}</span>
                          ))}
                        </div>
                        <small>{t("details")}</small>
                        <footer>
                          <span>{e.id === "ceo" ? t("free") : t("demo")}</span>
                          <button
                            onClick={() => {
                              setTrial(e);
                              setInput("");
                            }}
                          >
                            <Play size={15} />
                            {t("try")}
                          </button>
                        </footer>
                      </article>
                    ))}
                </div>
              )}
            </section>
            <div className="wf-connection">
              <ShieldCheck />
              <p>{t("connections")}</p>
            </div>
          </>
        ) : (
          <>
            <div
              className={`wf-office-title ${view === "headquarters" ? "is-cinematic" : ""}`}
            >
              <div>
                <span className="wf-eyebrow">YOUR EXECUTIVE OFFICE</span>
                <h1>{workspace.organization?.name || t("office")}</h1>
                <p>{t("prototype")}</p>
              </div>
              <div className="wf-actions">
                <button
                  disabled={syncing || !user}
                  onClick={async () => {
                    setSyncing(true);
                    await sync();
                    setSyncing(false);
                  }}
                >
                  <RotateCcw size={16} />
                  {t("refresh")}
                </button>
                <button
                  className="wf-primary"
                  disabled={!workspace.organization || busy}
                  onClick={openMeeting}
                >
                  <Users size={18} />
                  {t("meeting")}
                </button>
              </div>
            </div>
            {!user ? (
              <div className="wf-setup">
                <Building2 size={40} />
                <h2>{t("create")}</h2>
                <p>{t("free")}</p>
                <button className="wf-primary" onClick={onLogin}>
                  {t("login")}
                </button>
              </div>
            ) : !workspace.organization ? (
              <form
                className="wf-setup"
                onSubmit={(e) => {
                  e.preventDefault();
                  void createOrganization();
                }}
              >
                <h2>{t("create")}</h2>
                <label>
                  {t("company")}
                  <input
                    required
                    maxLength={100}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </label>
                {languageControl}
                <button className="wf-primary" disabled={busy}>
                  {busy ? t("busy") : t("create")}
                </button>
              </form>
            ) : (
              <>
                <div
                  className="wf-view-switch"
                  role="group"
                  aria-label={t("office")}
                >
                  <button
                    aria-pressed={view === "chat"}
                    onClick={() => changeView("chat")}
                  >
                    <MessageSquare size={18} />
                    {live("chat")}
                  </button>
                  <button
                    aria-pressed={view === "headquarters"}
                    onClick={() => changeView("headquarters")}
                  >
                    <Building2 size={18} />
                    {live("headquarters")}
                    <small>EXECUTIVE HQ</small>
                  </button>
                  <button
                    onClick={() => {
                      voice.stop();
                      setMasterOpen(true);
                    }}
                  >
                    <Monitor size={17} />
                    <span>البريد والبحث</span>
                  </button>
                  <span className="wf-muted">
                    {voice.active ? live("call") : "ONESHOT / WORKSPACE"}
                  </span>
                </div>
                <div
                  className={`wf-live-workspace ${view === "headquarters" ? "has-office" : "standard-chat"}`}
                >
                  {view === "headquarters" && (
                    <OfficeScene
                      catalog={catalog}
                      workspace={workspace}
                      selected={selected}
                      voice={voice}
                      turns={conversation.turns}
                      chatBusy={conversation.busy}
                      onSelect={selectPerson}
                      onMaster={() => {
                        voice.stop();
                        setToolFocus(undefined);
                        setMasterOpen(true);
                      }}
                      onWorkstation={(id) => {
                        voice.stop();
                        selectPerson(id);
                        setToolFocus({ employeeId: id });
                        setMasterOpen(true);
                      }}
                      onMeeting={openMeeting}
                      meetingOpen={boardroom}
                      paused={masterOpen || !!trial}
                      onStandard={() => changeView("chat")}
                    />
                  )}
                  {view === "headquarters" ? (
                    <aside
                      className={`hq-chat-shell ${chatCollapsed && !boardroom ? "is-collapsed" : ""}`}
                    >
                      <button
                        className="hq-chat-toggle"
                        type="button"
                        aria-expanded={!chatCollapsed || boardroom}
                        aria-controls="hq-chat-body"
                        onClick={() => {
                          if (boardroom) closeMeeting();
                          voice.stop();
                          setChatCollapsed((value) => !value);
                        }}
                      >
                        <MessageSquare size={17} />
                        <span>{live("chat")}</span>
                        <span aria-hidden="true">
                          {chatCollapsed && !boardroom ? "+" : "−"}
                        </span>
                      </button>
                      <div
                        id="hq-chat-body"
                        className="hq-chat-body"
                        inert={chatCollapsed && !boardroom}
                      >
                        {boardroom ? meetingPanel : chatPanel()}
                      </div>
                    </aside>
                  ) : !boardroom ? (
                    chatPanel()
                  ) : null}
                </div>
                <details
                  className="wf-operations"
                  open={operationsOpen}
                  onToggle={(event) =>
                    setOperationsOpen(event.currentTarget.open)
                  }
                >
                  <summary>
                    <FileText size={18} />
                    {live("operations")}
                  </summary>
                  <div className="wf-office-grid">
                    <section className="wf-team">
                      <h2>
                        <Users size={18} />
                        {t("team")}
                      </h2>
                      {catalog.map((e) => {
                        const current = workspace.tasks.find(
                          (x) => x.employeeId === e.id,
                        );
                        return (
                          <button
                            key={e.id}
                            className={`wf-desk ${selected === e.id ? "selected" : ""}`}
                            onClick={() => {
                              selectPerson(e.id);
                            }}
                          >
                            <EmployeeIcon id={e.id} />
                            <strong>{title(e)}</strong>
                            <small>
                              <i
                                className={
                                  current?.status === "drafting"
                                    ? "working"
                                    : ""
                                }
                              />
                              {t(current?.status || "available")}
                            </small>
                          </button>
                        );
                      })}
                    </section>
                    <section className="wf-work">
                      <div className="wf-modebar">
                        {(["demo", "live", "replay"] as const).map((m) => (
                          <button
                            key={m}
                            aria-pressed={mode === m}
                            disabled={m === "replay" && !task}
                            onClick={() => setMode(m)}
                          >
                            {t(m)}
                          </button>
                        ))}
                      </div>
                      <Desktop
                        employee={employee}
                        task={
                          mode === "demo" && task?.mode !== "demo"
                            ? undefined
                            : task
                        }
                        mode={mode}
                        events={
                          mode === "replay" ? replayEvents : workspace.events
                        }
                        demoText={demoText}
                        busy={busy}
                        onApprove={() =>
                          void action(async () => {
                            if (task)
                              await request(`tasks/${task.id}/approve`, {});
                          })
                        }
                      />
                      <form
                        className="wf-composer"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void run(selected, mode === "demo");
                        }}
                      >
                        {languageControl}
                        <label>
                          {t("task")}
                          <textarea
                            required
                            maxLength={6000}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                          />
                        </label>
                        <button
                          className="wf-primary"
                          disabled={busy || !input.trim()}
                        >
                          <Play size={16} />
                          {busy ? t("busy") : t("run")}
                        </button>
                      </form>
                    </section>
                    <aside className="wf-activity">
                      <h2>
                        <CircleDot size={17} />
                        {t("activity")}
                      </h2>
                      {!workspace.events.length && <p>{t("empty")}</p>}
                      {workspace.events.slice(0, 20).map((e) => (
                        <button
                          key={e.id}
                          onClick={() => {
                            const row = workspace.tasks.find(
                              (x) => x.id === e.taskId,
                            );
                            if (row) {
                              selectPerson(row.employeeId);
                              setActiveTask(row.id);
                              setMode("replay");
                            }
                          }}
                        >
                          <span>{t(e.phase)}</span>
                          <time>
                            {new Date(e.createdAt).toLocaleTimeString(language)}
                          </time>
                        </button>
                      ))}
                    </aside>
                  </div>
                  <section className="wf-history">
                    <h2>{t("tasks")}</h2>
                    {!workspace.tasks.length && <p>{t("empty")}</p>}
                    {workspace.tasks.map((row) => (
                      <article key={row.id}>
                        <button
                          onClick={() => {
                            selectPerson(row.employeeId);
                            setActiveTask(row.id);
                            setMode("live");
                          }}
                        >
                          <EmployeeIcon id={row.employeeId} size={18} />
                          <span>{row.input.slice(0, 90)}</span>
                          <small>{t(row.status)}</small>
                        </button>
                        {["received", "queued", "failed"].includes(
                          row.status,
                        ) && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              void action(async () => {
                                const r = await request<{ task: WorkTask }>(
                                  `tasks/${row.id}/run`,
                                  {},
                                );
                                selectPerson(r.task.employeeId);
                                setActiveTask(r.task.id);
                              })
                            }
                          >
                            {t("run")}
                          </button>
                        )}
                      </article>
                    ))}
                  </section>
                  <section className="wf-history">
                    <h2>{t("minutes")}</h2>
                    {!workspace.meetings.length && <p>{t("empty")}</p>}
                    {workspace.meetings.map((m) => (
                      <article key={m.id}>
                        <button
                          onClick={() => {
                            setMeetingId(m.id);
                            setSelectedProposals([]);
                            setBoardroom(true);
                          }}
                        >
                          {m.topic}
                          <time>
                            {new Date(m.createdAt).toLocaleDateString(language)}
                          </time>
                        </button>
                      </article>
                    ))}
                  </section>
                </details>
                <div className="wf-connection">
                  <ShieldCheck />
                  <p>{t("connections")}</p>
                </div>
              </>
            )}
          </>
        )}
      </main>
      {trial && (
        <Dialog title={title(trial)} onClose={() => setTrial(null)}>
          <p>{trial.bio[language] || trial.bio.en}</p>
          <Desktop
            employee={trial}
            mode="demo"
            events={[]}
            demoText={demoText}
            busy={false}
          />
          <form
            className="wf-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void run(trial.id, true);
            }}
          >
            {languageControl}
            <label>
              {t("task")}
              <textarea
                required
                maxLength={6000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </label>
            <button className="wf-primary" disabled={busy}>
              {user ? t("run") : t("login")}
            </button>
          </form>
        </Dialog>
      )}
      {masterOpen && (
        <MasterPC
          catalog={catalog}
          workspace={workspace}
          selected={selected}
          toolFocus={toolFocus}
          conversationPanel={chatPanel(false, true)}
          onRevise={async (text) => sendChat(text)}
          onClose={() => {
            voice.stop();
            setMasterOpen(false);
            setToolFocus(undefined);
          }}
          onSelect={selectPerson}
          onTask={(id) => {
            const row = workspace.tasks.find((item) => item.id === id);
            if (row) {
              selectPerson(row.employeeId);
              setActiveTask(id);
              setMode("live");
              setOperationsOpen(true);
            }
          }}
        />
      )}
      {view !== "headquarters" && meetingPanel}
    </div>
  );
}
