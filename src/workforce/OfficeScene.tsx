import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  Crosshair,
  HelpCircle,
  Maximize2,
  Minimize2,
  Monitor,
  MousePointer2,
  RotateCcw,
  Smartphone,
  Users,
  Volume2,
} from "lucide-react";
import type { ChatTurn, Employee, Workspace } from "../../shared/workforce";
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
  turns,
  chatBusy,
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
  turns: ChatTurn[];
  chatBusy: boolean;
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
  const [gyro, setGyro] = useState(false),
    [sensorError, setSensorError] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  const recent = turns.at(-1);
  const handoff =
    recent?.action &&
    recent.employeeId !== recent.action.employeeId &&
    now - Date.parse(recent.createdAt) < 90000
      ? { id: recent.id, from: recent.employeeId, to: recent.action.employeeId }
      : null;
  const bubbles: Record<string, string> = {};
  if (recent?.output && now - Date.parse(recent.createdAt) < 90000)
    bubbles[selected] = recent.output.slice(0, 170);
  if (chatBusy) bubbles[selected] = "أعالج طلبك الآن…";
  if (voice.interim)
    bubbles[selected] = `أستمع: ${voice.interim.slice(0, 140)}`;
  if (handoff)
    bubbles[handoff.to] =
      recent?.status === "generating"
        ? "أجهّز الإحالة الآن؛ الإرسال ينتظر اعتمادك."
        : recent?.action?.resourceId
          ? "جهزت نتيجة الإحالة؛ راجعها في الكمبيوتر الرئيسي."
          : "أحتاج ربط الحساب أو تحديد تفاصيل الرسالة.";

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
    text: Object.fromEntries(
      catalog.map((employee) => [
        employee.id,
        employee.id === selected && recent
          ? recent.output || recent.input
          : workspace.activity?.[employee.id]?.text ||
            workspace.tasks.find((task) => task.employeeId === employee.id)
              ?.output ||
            "",
      ]),
    ),
    handoff,
    activity: Object.fromEntries(
      catalog.map((employee) => [
        employee.id,
        chatBusy && employee.id === selected
          ? "generating"
          : workspace.activity?.[employee.id]?.status ||
            workspace.tasks.find((task) => task.employeeId === employee.id)
              ?.status ||
            "idle",
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
              lock() {},
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
  }, [
    selected,
    voice.speaker,
    meetingOpen,
    paused,
    workspace.tasks,
    workspace.activity,
    status,
    turns,
    chatBusy,
    now,
  ]);
  useEffect(() => {
    if (status === "error") {
      engine.current?.dispose();
      engine.current = null;
    }
  }, [status]);
  async function toggleGyro() {
    if (gyro) {
      setGyro(false);
      return;
    }
    setSensorError("");
    const sensor =
      window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<string>;
      };
    if (!window.isSecureContext || !sensor) {
      setSensorError("الجايروسكوب غير متاح على هذا الجهاز. استخدم اللمس.");
      return;
    }
    try {
      if (
        sensor.requestPermission &&
        (await sensor.requestPermission()) !== "granted"
      ) {
        setSensorError("لم يُمنح إذن الحركة؛ يمكنك استخدام اللمس.");
        return;
      }
      setGyro(true);
    } catch {
      setSensorError("تعذر تفعيل مستشعر الحركة.");
    }
  }
  useEffect(() => {
    if (!gyro || paused || status !== "ready") {
      engine.current?.orientation(null);
      return;
    }
    let baseline: {
        alpha: number;
        pitch: number;
        yaw: number;
        cameraPitch: number;
      } | null = null,
      received = false;
    const reset = () => {
      baseline = null;
    };
    const orient = (event: DeviceOrientationEvent) => {
      if (
        document.hidden ||
        event.alpha === null ||
        event.beta === null ||
        event.gamma === null
      )
        return;
      received = true;
      const angle = ((screen.orientation?.angle || 0) * Math.PI) / 180;
      const pitch =
        event.beta * Math.cos(angle) + event.gamma * Math.sin(angle);
      if (!baseline) {
        const pose = engine.current?.pose();
        baseline = {
          alpha: event.alpha,
          pitch,
          yaw: pose?.yaw || 0,
          cameraPitch: pose?.pitch || 0,
        };
      }
      const delta = ((event.alpha - baseline.alpha + 540) % 360) - 180;
      engine.current?.orientation(
        baseline.yaw + (delta * Math.PI) / 180,
        baseline.cameraPitch + ((pitch - baseline.pitch) * Math.PI) / 180,
      );
    };
    const hidden = () => {
      baseline = null;
      if (document.hidden) engine.current?.orientation(null);
    };
    window.addEventListener("deviceorientation", orient);
    window.addEventListener("orientationchange", reset);
    document.addEventListener("visibilitychange", hidden);
    const timer = setTimeout(() => {
      if (!received) {
        setSensorError("لم تصل بيانات الحركة. استخدم السحب أو عصا التحكم.");
        setGyro(false);
      }
    }, 3500);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("deviceorientation", orient);
      window.removeEventListener("orientationchange", reset);
      document.removeEventListener("visibilitychange", hidden);
      engine.current?.orientation(null);
    };
  }, [gyro, paused, status]);
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
          aria-description={o("navigate")}
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
              <select
                aria-label={o("travel")}
                value={selected}
                onChange={(event) => {
                  travel(event.target.value);
                  onSelect(event.target.value);
                }}
              >
                {catalog.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {title(employee.id)}
                  </option>
                ))}
              </select>
              <button
                aria-label={t("master")}
                title={t("master")}
                onClick={onMaster}
              >
                <Monitor size={16} />
              </button>
              <button
                aria-label={o("boardroom")}
                title={o("boardroom")}
                onClick={onMeeting}
                disabled={meetingOpen}
              >
                <Users size={16} />
              </button>
              <button
                aria-label="تفعيل الجايروسكوب"
                title="تفعيل الجايروسكوب"
                aria-pressed={gyro}
                onClick={() => void toggleGyro()}
              >
                <Smartphone size={16} />
              </button>
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
                  {bubbles[id] && (
                    <span className="wf-speech-bubble" dir="auto">
                      {bubbles[id]}
                    </span>
                  )}
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
                <p id="wf-pov-help">{o("navigate")}</p>
                <p>{o("drag")}</p>
                <p>{o("unlock")}</p>
                <button onClick={() => void engine.current?.lockPointer()}>
                  <MousePointer2 size={15} />
                  {o("look")}
                </button>
                <p>
                  جولة CEO حركة بصرية؛ شاشات العمل والفقاعات تتبع السجل الفعلي.
                </p>
              </div>
            )}
            <div className="wf-pov-hud">
              {(voice.error || voice.interim || sensorError) && (
                <p className="wf-pov-caption" dir="auto">
                  {voice.error || voice.interim || sensorError}
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
                <TouchStick
                  disabled={meetingOpen || paused}
                  onMove={(x, y) => engine.current?.joystick(x, y)}
                />
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
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function TouchStick({
  onMove,
  disabled,
}: {
  onMove: (x: number, y: number) => void;
  disabled: boolean;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);
  const reset = () => {
    pointer.current = null;
    setOffset({ x: 0, y: 0 });
    onMove(0, 0);
  };
  useEffect(() => {
    if (disabled) reset();
  }, [disabled]);
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current !== event.pointerId || disabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / 30,
      y = (event.clientY - rect.top - rect.height / 2) / 30,
      length = Math.max(1, Math.hypot(x, y));
    setOffset({ x: (x / length) * 26, y: (y / length) * 26 });
    onMove(x / length, y / length);
  };
  return (
    <button
      type="button"
      className="wf-touch-stick"
      aria-label="عصا الحركة: اسحب أو استخدم الأسهم"
      disabled={disabled}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={move}
      onPointerUp={reset}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
      onBlur={reset}
      onKeyDown={(event) => {
        const axes: Record<string, [number, number]> = {
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
        };
        const axis = axes[event.key];
        if (axis) {
          event.preventDefault();
          onMove(...axis);
          setOffset({ x: axis[0] * 26, y: axis[1] * 26 });
        }
      }}
      onKeyUp={reset}
    >
      <span style={{ transform: `translate(${offset.x}px,${offset.y}px)` }}>
        <Crosshair size={21} />
      </span>
    </button>
  );
}
