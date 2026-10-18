import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileText,
  Globe,
  Monitor,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import type { Employee, Workspace } from "../../shared/workforce";
import { useAppearance } from "../storefront/i18n";
import { liveText } from "./liveCopy";
import { wfText } from "./copy";
import { OperationsPanel } from "./OperationsPanel";
export function MasterPC({
  catalog,
  workspace,
  selected,
  onClose,
  onSelect,
  onTask,
  toolFocus,
}: {
  catalog: Employee[];
  workspace: Workspace;
  selected: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onTask: (id: string) => void;
  toolFocus?: { employeeId: string; resourceId?: string };
}) {
  const { language } = useAppearance(),
    t = (key: string) => liveText(language, key),
    w = (key: string) => wfText(language, key);
  const dialog = useRef<HTMLDialogElement>(null);
  const [screen, setScreen] = useState(selected),
    [tab, setTab] = useState<"screens" | "browserTab" | "operations">(
      "operations",
    );
  const [address, setAddress] = useState(""),
    [history, setHistory] = useState(["oneshot://team"]),
    [cursor, setCursor] = useState(0),
    [reload, setReload] = useState(0),
    [error, setError] = useState("");
  const [taskId, setTaskId] = useState<string>();
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  const employee = catalog.find((e) => e.id === screen),
    tasks = workspace.tasks.filter((row) => row.employeeId === screen);
  const task = tasks.find((row) => row.id === taskId) || tasks[0];
  const location = history[cursor],
    external = location.startsWith("https://");
  const term = location.startsWith("oneshot://search/")
    ? decodeURIComponent(location.slice("oneshot://search/".length))
    : "";
  useEffect(() => {
    setAddress(external ? location : term);
  }, [location]);
  function navigate(value: string) {
    setHistory((prev) => [...prev.slice(0, cursor + 1), value]);
    setCursor(cursor + 1);
    setError("");
  }
  function go() {
    const value = address.trim();
    if (!value) {
      navigate("oneshot://team");
      return;
    }
    if (
      /^[a-z][a-z0-9+.-]*:/i.test(value) ||
      (/\.[a-z]{2,}/i.test(value) && !value.includes(" "))
    ) {
      try {
        const url = new URL(value.includes("://") ? value : `https://${value}`);
        if (url.protocol !== "https:" || url.username || url.password)
          throw new Error();
        navigate(url.href);
      } catch {
        setError(t("invalidUrl"));
      }
    } else navigate(`oneshot://search/${encodeURIComponent(value)}`);
  }
  const results = workspace.tasks.filter(
    (row) =>
      !term ||
      `${row.input} ${row.output} ${catalog.find((e) => e.id === row.employeeId)?.title[language] || ""}`
        .toLowerCase()
        .includes(term.toLowerCase()),
  );
  return (
    <dialog
      ref={dialog}
      className="wf-dialog wf-master"
      aria-label={t("master")}
      onCancel={onClose}
    >
      <header className="wf-master-title">
        <Monitor size={21} />
        <h2>{t("master")}</h2>
        <span className="wf-eyebrow">ONESHOT OS</span>
        <button onClick={onClose} aria-label={w("close")}>
          <X size={20} />
        </button>
      </header>
      <div className="wf-master-apps">
        {(["operations", "screens", "browserTab"] as const).map((key) => (
          <button
            key={key}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {key === "screens" ? <Monitor size={16} /> : <Globe size={16} />}{" "}
            {key === "operations" ? "البريد والبحث والخزنة" : t(key)}
          </button>
        ))}
      </div>
      {tab === "operations" ? (
        <OperationsPanel
          initial={toolFocus?.employeeId || selected}
          resourceId={toolFocus?.resourceId}
        />
      ) : tab === "screens" ? (
        <div className="wf-master-screens">
          <aside>
            <h3>{t("screens")}</h3>
            {catalog.map((e) => (
              <button
                key={e.id}
                aria-pressed={screen === e.id}
                onClick={() => {
                  setScreen(e.id);
                  setTaskId(undefined);
                }}
              >
                <Monitor size={17} />
                {e.title[language] || e.title.en}
              </button>
            ))}
          </aside>
          <section>
            <div className="wf-screen-heading">
              <h3>{employee?.title[language] || employee?.title.en}</h3>
              <button
                onClick={() => {
                  onSelect(screen);
                  onClose();
                }}
              >
                {t("chat")}
              </button>
            </div>
            <p className="wf-context">{t("screenNote")}</p>
            {!task ? (
              <div className="wf-chat-empty">
                <Monitor size={38} />
                <p>{w("empty")}</p>
              </div>
            ) : (
              <>
                <label className="wf-label">
                  {w("tasks")}
                  <select
                    value={task.id}
                    onChange={(event) => setTaskId(event.target.value)}
                  >
                    {tasks.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.input.slice(0, 75)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="wf-screen-heading">
                  <span className="wf-pill">
                    {w(task.status)} · {w(task.mode)}
                  </span>
                  <time>
                    {new Date(task.updatedAt).toLocaleString(language)}
                  </time>
                </div>
                <div className="wf-document-window">
                  <div>
                    <FileText size={16} />
                    {w("task")}
                  </div>
                  <p className="wf-text" dir="auto">
                    {task.input}
                  </p>
                  <hr />
                  <p className="wf-text" dir="auto">
                    {task.output || w(task.status)}
                  </p>
                </div>
                <ol className="wf-screen-events">
                  {workspace.events
                    .filter((e) => e.taskId === task.id)
                    .slice()
                    .reverse()
                    .map((event) => (
                      <li key={event.id}>
                        <span>{w(event.phase)}</span>
                        <time>
                          {new Date(event.createdAt).toLocaleTimeString(
                            language,
                          )}
                        </time>
                      </li>
                    ))}
                </ol>
                <button
                  onClick={() => {
                    onTask(task.id);
                    onClose();
                  }}
                >
                  {t("operations")}
                </button>
              </>
            )}
          </section>
        </div>
      ) : (
        <section className="wf-virtual-browser">
          <form
            className="wf-addressbar"
            onSubmit={(event) => {
              event.preventDefault();
              go();
            }}
            dir="ltr"
          >
            <button
              type="button"
              aria-label="←"
              disabled={!cursor}
              onClick={() => setCursor((i) => i - 1)}
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="→"
              disabled={cursor >= history.length - 1}
              onClick={() => setCursor((i) => i + 1)}
            >
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              aria-label={w("refresh")}
              onClick={() => setReload((i) => i + 1)}
            >
              <RefreshCw size={16} />
            </button>
            <input
              aria-label={t("address")}
              placeholder={t("address")}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={2000}
            />
            <button aria-label={t("go")}>
              <Search size={17} />
            </button>
          </form>
          {error && (
            <p className="wf-error" role="alert">
              {error}
            </p>
          )}
          <div className="wf-location" dir="ltr">
            {location}
          </div>
          {external ? (
            <>
              <p className="wf-context">
                {t("embedNote")}{" "}
                <a href={location} target="_blank" rel="noopener noreferrer">
                  {t("external")} <ExternalLink size={13} />
                </a>
              </p>
              <iframe
                key={`${location}:${reload}`}
                title={t("browserTab")}
                src={location}
                sandbox="allow-scripts allow-forms"
                referrerPolicy="no-referrer"
                allow="microphone 'none'; camera 'none'; geolocation 'none'"
              />
            </>
          ) : (
            <div className="wf-browser-home">
              <span className="wf-eyebrow">ONESHOT / WORKSPACE SEARCH</span>
              <h3>{term || t("screens")}</h3>
              {term && (
                <button
                  onClick={() =>
                    navigate(
                      `https://www.bing.com/search?q=${encodeURIComponent(term)}`,
                    )
                  }
                >
                  <Globe size={16} />
                  {t("webSearch")}
                </button>
              )}
              {!results.length && <p>{w("empty")}</p>}
              {results.map((row) => (
                <button
                  key={row.id}
                  onClick={() => {
                    setScreen(row.employeeId);
                    setTaskId(row.id);
                    setTab("screens");
                  }}
                >
                  <FileText size={18} />
                  <span>
                    {row.input.slice(0, 140)}
                    <small>{w(row.status)}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </dialog>
  );
}
