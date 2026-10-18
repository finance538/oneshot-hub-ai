import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crosshair,
  HelpCircle,
  Maximize2,
  Mic,
  Minimize2,
  Monitor,
  MousePointer2,
  PhoneOff,
  RotateCcw,
  Users,
  Volume2,
} from "lucide-react";
import type { Employee, Workspace } from "../../shared/workforce";
import { useAppearance } from "../storefront/i18n";
import { liveText } from "./liveCopy";
import { wfText } from "./copy";
import { officeText } from "./officeCopy";
import type { LiveVoice } from "./useLiveVoice";
import { AudioMeter } from "./VoiceControls";
import type { OfficeEngine, OfficeFrame, OfficeState } from "./officeEngine";
import "./office-scene.css";

export function OfficeScene({
  catalog,
  workspace,
  selected,
  voice,
  onSelect,
  onMaster,
  onMeeting,
  onStandard,
  meetingOpen,
  paused,
}: {
  catalog: Employee[];
  workspace: Workspace;
  selected: string;
  voice: LiveVoice;
  onSelect: (id: string) => void;
  onMaster: () => void;
  onMeeting: () => void;
  onStandard: () => void;
  meetingOpen: boolean;
  paused: boolean;
}) {
  const { language } = useAppearance();
  const t = (key: string) => liveText(language, key);
  const o = (key: string) => officeText(language, key);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<OfficeEngine | null>(null);
  const labels = useRef(new Map<string, HTMLButtonElement>());
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [expanded, setExpanded] = useState(false);
  const [locked, setLocked] = useState(false);
  const [help, setHelp] = useState(false);
  const [room, setRoom] = useState<OfficeFrame["room"]>("executive");
  const [nearest, setNearest] = useState<string | null>(null);
  const lastFrame = useRef({
    room: "executive",
    nearest: null as string | null,
  });
  const state: OfficeState = {
    selected,
    speaker: voice.speaker,
    meeting: meetingOpen,
    paused,
    activity: Object.fromEntries(
      catalog.map((employee) => [
        employee.id,
        workspace.tasks.find((task) => task.employeeId === employee.id)
          ?.status || "idle",
      ]),
    ),
  };
  const latest = useRef({ state, onSelect, onMaster, onMeeting });
  latest.current = { state, onSelect, onMaster, onMeeting };
  const ids = [...catalog]
    .sort((a, b) =>
      a.id === "ceo" ? -1 : b.id === "ceo" ? 1 : a.id.localeCompare(b.id),
    )
    .map((employee) => employee.id);
  const catalogKey = JSON.stringify(ids);
  const title = (id: string) =>
    id === "@master"
      ? t("master")
      : id === "@meeting"
        ? o("boardroom")
        : catalog.find((employee) => employee.id === id)?.title[language] ||
          catalog.find((employee) => employee.id === id)?.title.en ||
          id;
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    lastFrame.current = { room: "executive", nearest: null };
    setRoom("executive");
    setNearest(null);
    // The WebGL dependency never enters the standard-chat startup path.
    import("./officeEngine")
      .then(({ createOffice }) => {
        if (cancelled || !canvas.current) return;
        try {
          engine.current = createOffice(
            canvas.current,
            JSON.parse(catalogKey) as string[],
            latest.current.state,
            {
              action(id) {
                if (id === "@master") latest.current.onMaster();
                else if (id === "@meeting") latest.current.onMeeting();
                else latest.current.onSelect(id);
              },
              proximity(id) {
                if (id !== latest.current.state.selected)
                  latest.current.onSelect(id);
              },
              lock(value) {
                if (!cancelled) setLocked(value);
              },
              error() {
                if (!cancelled) setStatus("error");
              },
              frame(frame) {
                if (cancelled) return;
                for (const anchor of frame.anchors) {
                  const label = labels.current.get(anchor.id);
                  if (!label) continue;
                  label.hidden = !anchor.visible;
                  label.style.transform = `translate3d(${anchor.x}px, ${anchor.y}px, 0) translate(-50%, -100%)`;
                  label.dataset.near = String(anchor.near);
                }
                if (frame.room !== lastFrame.current.room) setRoom(frame.room);
                if (frame.nearest !== lastFrame.current.nearest)
                  setNearest(frame.nearest);
                lastFrame.current = {
                  room: frame.room,
                  nearest: frame.nearest,
                };
              },
            },
          );
          setStatus("ready");
        } catch {
          setStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      engine.current?.dispose();
      engine.current = null;
    };
  }, [catalogKey]);
  useEffect(() => {
    engine.current?.update(state);
  }, [selected, voice.speaker, meetingOpen, paused, workspace.tasks, status]);
  useEffect(() => {
    if (status === "error") {
      engine.current?.dispose();
      engine.current = null;
    }
  }, [status]);
  function move(event: PointerEvent<HTMLButtonElement>, code: string) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    engine.current?.input(code, true);
  }
  function travel(id: string) {
    engine.current?.navigate(id);
    canvas.current?.focus({ preventScroll: true });
  }
  const currentEmployee = catalog.find((employee) => employee.id === selected);
  return (
    <section
      className={`wf-pov ${expanded ? "is-expanded" : ""}`}
      aria-label={t("headquarters")}
    >
      <header className="wf-pov-heading">
        <div>
          <span className="wf-eyebrow">ONESHOT / HEADQUARTERS</span>
          <h2>{o("pov")}</h2>
        </div>
        <span className="wf-pov-badge" dir="ltr">
          FIRST PERSON / 3D
        </span>
      </header>
      <div className="wf-pov-viewport">
        <canvas
          key={catalogKey}
          ref={canvas}
          className="wf-pov-canvas"
          tabIndex={status === "ready" ? 0 : -1}
          role="group"
          aria-label={o("navigate")}
          aria-describedby="wf-pov-help"
        />
        {status !== "ready" ? (
          <div className="wf-pov-fallback" role="status">
            <Crosshair size={32} />
            <p>{o(status === "loading" ? "loading" : "unavailable")}</p>
            {status === "loading" && <span className="wf-pov-loading" />}
            <button onClick={onStandard}>{t("chat")}</button>
          </div>
        ) : (
          <>
            <div className="wf-pov-room">
              <span className="wf-pov-dot" />
              <span>{o(room)}</span>
              <small>01 / ONESHOT</small>
            </div>
            <div className="wf-pov-tools">
              <button
                aria-label={o("reset")}
                title={o("reset")}
                onClick={() => {
                  engine.current?.reset();
                  canvas.current?.focus({ preventScroll: true });
                }}
              >
                <RotateCcw size={16} />
              </button>
              <button
                aria-label={o(expanded ? "collapse" : "expand")}
                title={o(expanded ? "collapse" : "expand")}
                aria-pressed={expanded}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                aria-label={o("help")}
                title={o("help")}
                aria-expanded={help}
                onClick={() => setHelp((value) => !value)}
              >
                <HelpCircle size={16} />
              </button>
            </div>
            <div className="wf-world-labels">
              {[...ids, "@master", "@meeting"].map((id) => (
                <button
                  key={id}
                  ref={(node) => {
                    if (node) labels.current.set(id, node);
                    else labels.current.delete(id);
                  }}
                  className={`wf-world-label ${voice.speaker === id ? "is-speaking" : ""} ${selected === id ? "is-selected" : ""}`}
                  style={{ transform: "translate3d(-1000px, -1000px, 0)" }}
                  tabIndex={-1}
                  onClick={() => engine.current?.activate(id)}
                >
                  <span className="wf-world-label-icon">
                    {id === "@master" ? (
                      <Monitor size={18} />
                    ) : id === "@meeting" ? (
                      <Users size={18} />
                    ) : voice.speaker === id ? (
                      <Volume2 size={18} />
                    ) : (
                      <span>{id === "ceo" ? "C" : title(id).slice(0, 1)}</span>
                    )}
                  </span>
                  <span>
                    <strong>{title(id)}</strong>
                    <small>
                      {voice.speaker === id
                        ? t("speaking")
                        : id === "@master"
                          ? "MASTER BOSS PC"
                          : id === "@meeting"
                            ? "BOARDROOM"
                            : `AI · ${wfText(language, workspace.tasks.find((task) => task.employeeId === id)?.status || "available")}`}
                    </small>
                  </span>
                  <span className="wf-label-wave" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </button>
              ))}
            </div>
            <span className="wf-crosshair" aria-hidden="true">
              <i />
              <i />
            </span>
            {help && (
              <div className="wf-pov-help">
                <strong>{o("help")}</strong>
                <p>{o("navigate")}</p>
                <p>{o("drag")}</p>
                <p>{o("unlock")}</p>
              </div>
            )}
            <div className="wf-pov-hud">
              {(voice.error || voice.interim) && (
                <p className="wf-pov-caption" dir="auto">
                  {voice.error || voice.interim}
                </p>
              )}
              {meetingOpen ? (
                <p className="wf-pov-seat">
                  <Users size={16} />
                  {o("seated")}
                </p>
              ) : (
                nearest && (
                  <button
                    className="wf-pov-interact"
                    onClick={() => engine.current?.activate(nearest)}
                  >
                    <kbd>E</kbd>
                    <span>
                      {o("interact")} · {title(nearest)}
                    </span>
                    <MousePointer2 size={15} />
                  </button>
                )
              )}
              <div className="wf-pov-bottom-row">
                <div
                  className="wf-pov-pad"
                  dir="ltr"
                  aria-label={o("navigate")}
                >
                  {(
                    [
                      ["KeyW", "forward", ArrowUp],
                      ["KeyA", "left", ArrowLeft],
                      ["KeyS", "back", ArrowDown],
                      ["KeyD", "right", ArrowRight],
                    ] as const
                  ).map(([code, label, Icon]) => (
                    <button
                      key={code}
                      className={code === "KeyW" ? "is-forward" : ""}
                      aria-label={o(label)}
                      disabled={meetingOpen}
                      onPointerDown={(event) => move(event, code)}
                      onPointerUp={() => engine.current?.input(code, false)}
                      onPointerCancel={() => engine.current?.input(code, false)}
                      onLostPointerCapture={() =>
                        engine.current?.input(code, false)
                      }
                      onKeyDown={(event) => {
                        if (event.code === "Space" || event.code === "Enter") {
                          event.preventDefault();
                          engine.current?.input(code, true);
                        }
                      }}
                      onKeyUp={(event) => {
                        if (event.code === "Space" || event.code === "Enter") {
                          event.preventDefault();
                          engine.current?.input(code, false);
                        }
                      }}
                      onBlur={() => engine.current?.input(code, false)}
                    >
                      <Icon size={17} />
                    </button>
                  ))}
                </div>
                <div className="wf-pov-voice">
                  <div>
                    <strong>
                      {currentEmployee?.title[language] ||
                        currentEmployee?.title.en}
                    </strong>
                    <small>{t(voice.phase)}</small>
                  </div>
                  {voice.phase === "listening" && (
                    <AudioMeter analyser={voice.analyser} />
                  )}
                  <button
                    className={voice.active ? "is-calling" : ""}
                    aria-label={t(voice.active ? "hangup" : "call")}
                    title={t(voice.active ? "hangup" : "call")}
                    aria-pressed={voice.active}
                    onClick={voice.active ? voice.stop : voice.startCall}
                  >
                    {voice.active ? <PhoneOff size={20} /> : <Mic size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <footer className="wf-pov-footer">
        <div
          className="wf-pov-destinations"
          role="group"
          aria-label={o("travel")}
        >
          {catalog.map((employee) => (
            <button
              key={employee.id}
              disabled={status !== "ready"}
              aria-pressed={selected === employee.id}
              onClick={() => {
                travel(employee.id);
                onSelect(employee.id);
              }}
            >
              {employee.title[language] || employee.title.en}
            </button>
          ))}
          <button
            disabled={status !== "ready" || meetingOpen}
            onClick={() => {
              travel("@master");
              onMaster();
            }}
          >
            <Monitor size={16} />
            {t("master")}
          </button>
          <button
            className="wf-pov-meeting"
            disabled={meetingOpen}
            onClick={onMeeting}
          >
            <Users size={16} />
            {wfText(language, "meeting")}
          </button>
        </div>
        <div className="wf-pov-instructions">
          <p id="wf-pov-help">{o("navigate")}</p>
          <button
            disabled={status !== "ready"}
            className="wf-pov-lock"
            onClick={async () => {
              if (!(await engine.current?.lockPointer())) setHelp(true);
            }}
          >
            <MousePointer2 size={14} />
            {o(locked ? "unlock" : "look")}
          </button>
        </div>
      </footer>
    </section>
  );
}
