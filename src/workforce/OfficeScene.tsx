import { Modal } from "../components/Modal";
import type { Conversation } from "./useConversation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Monitor, Users, ArrowUpRight, Activity } from "lucide-react";
import type { ChatTurn, Employee, Workspace } from "../../shared/workforce";
import { useAppearance } from "../storefront/i18n";
import { liveText } from "./liveCopy";
import { wfText } from "./copy";
import type { LiveVoice } from "./useLiveVoice";
import { ExecutivePerson, ExecutiveRoom } from "./ExecutiveRoom";
import "./executive-hq.css";

const seats = [
  { x: 24, y: 56 },
  { x: 76, y: 56 },
  { x: 19, y: 79 },
  { x: 81, y: 79 },
];
// One proportional coordinate system for the illustration and its hit targets.
const roomWidth = 1000;
const roomHeight = 625;
export function OfficeScene({
  catalog,
  conversation,
  workspace,
  selected,
  voice,
  onSelect,
  onMaster,
  onMeeting,
  meetingOpen,
  paused,
  turns,
  chatBusy,
  onWorkstation,
}: {
  catalog: Employee[];
  conversation: Conversation;
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
  onWorkstation: (id: string) => void;
}) {
  const { language } = useAppearance();
  const t = (key: string) => liveText(language, key),
    w = (key: string) => wfText(language, key);
  const ar = language === "ar" || language === "ur";
  const [focused, setFocused] = useState(false),
    [pan, setPan] = useState(0),
    [activityOpen, setActivityOpen] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const resize = () => {
      setViewport({ width: node.clientWidth, height: node.clientHeight });
      setPan(0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const fitScale = Math.min(
    viewport.width / roomWidth,
    viewport.height / roomHeight,
  );
  const zoom = focused
    ? Math.max(fitScale * 1.24, Math.min(0.95, viewport.height / 420))
    : fitScale;
  const panLimit = Math.min(
    200,
    Math.max(0, (roomWidth * zoom - viewport.width) / 2),
  );
  const pointer = useRef<{
    id: number;
    x: number;
    pan: number;
    moved: boolean;
  } | null>(null);
  const moved = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const specialists = catalog.filter((e) => e.id !== "ceo");
  const selectedIndex = specialists.findIndex((e) => e.id === selected);
  const page = Math.max(0, Math.floor(selectedIndex / 4));
  const visible = [
    ...catalog
      .filter((e) => e.id === "ceo")
      .map((e) => ({ employee: e, x: 50, y: 48 })),
    ...specialists
      .slice(page * 4, page * 4 + 4)
      .map((employee, index) => ({ employee, ...seats[index] })),
  ];
  const target = visible.find((e) => e.employee.id === selected) || {
    x: 50,
    y: 48,
  };
  const name = (e?: Employee) => e?.title[language] || e?.title.en || "";
  const latest = turns.at(-1);
  const activityText =
    voice.interim ||
    (chatBusy ? w("busy") : latest?.output) ||
    workspace.activity?.[selected]?.text ||
    w("empty");
  useEffect(() => {
    setPan(0);
    setActivityOpen(false);
  }, [selected]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if ((paused || activityOpen) && timer.current) clearTimeout(timer.current);
  }, [paused, activityOpen]);
  function travel(id: string, open = false) {
    if (paused || moved.current) return;
    if (timer.current) clearTimeout(timer.current);
    onSelect(id);
    setFocused(true);
    setPan(0);
    if (open) {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      timer.current = setTimeout(() => onWorkstation(id), reduce ? 0 : 420);
    }
  }
  return (
    <section className="hq-stage" aria-label={t("headquarters")}>
      <header className="hq-stage-header">
        <span>
          oneShot <small>EXECUTIVE HQ</small>
        </span>
        <span className="hq-stage-type">2.5D</span>
      </header>
      <div className="hq-activity">
        <Activity size={15} aria-hidden="true" />
        <button
          type="button"
          onClick={() => setActivityOpen((v) => !v)}
          aria-haspopup="dialog"
        >
          <strong>{name(catalog.find((e) => e.id === selected))}</strong>
          <span dir="auto">{activityText}</span>
        </button>
      </div>
      {activityOpen && (
        <Modal
          title={name(catalog.find((e) => e.id === selected)) || w("activity")}
          onClose={() => setActivityOpen(false)}
        >
          <p className="ui-detail-text" dir="auto">
            {activityText}
          </p>
        </Modal>
      )}
      <div
        ref={viewportRef}
        className="hq-viewport"
        aria-label={
          ar
            ? "انقر على الموظف للتقريب، وعلى الشاشة لفتح عمله"
            : "Select a colleague to approach; select their screen to open their work"
        }
        onPointerDown={(event) => {
          if (event.button !== 0 || paused) return;
          moved.current = false;
          pointer.current = {
            id: event.pointerId,
            x: event.clientX,
            pan,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const start = pointer.current;
          if (!start || start.id !== event.pointerId) return;
          const delta = event.clientX - start.x;
          if (Math.abs(delta) > 8) {
            start.moved = true;
            moved.current = true;
            setPan(Math.max(-panLimit, Math.min(panLimit, start.pan + delta)));
          }
        }}
        onPointerUp={() => {
          pointer.current = null;
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
        onPointerLeave={() => {
          pointer.current = null;
        }}
      >
        <div
          className="hq-world"
          style={
            {
              "--hq-width": `${roomWidth}px`,
              "--hq-height": `${roomHeight}px`,
              "--hq-x": `${focused ? ((50 - target.x) / 100) * roomWidth * zoom : 0}px`,
              "--hq-y": `${focused ? ((50 - target.y) / 100) * roomHeight * zoom : 0}px`,
              "--hq-zoom": zoom,
              "--hq-pan": `${pan}px`,
            } as CSSProperties
          }
        >
          <ExecutiveRoom />
          <button
            className="hq-meeting-door"
            type="button"
            aria-label={w("meeting")}
            disabled={paused || meetingOpen}
            onClick={() => {
              if (!moved.current) onMeeting();
            }}
          >
            <span>{w("meeting")}</span>
          </button>
          {visible.map(({ employee, x, y }, i) => {
            const task = workspace.tasks.find(
              (row) => row.employeeId === employee.id,
            );
            const activity = workspace.activity?.[employee.id];
            const text =
              employee.id === selected && latest
                ? latest.output || latest.input
                : activity?.text || task?.output;
            const status =
              employee.id === selected && chatBusy
                ? "generating"
                : activity?.status || task?.status;
            return (
              <div
                key={employee.id}
                className={`hq-station ${employee.id === selected ? "is-selected" : ""} ${employee.id === "ceo" ? "is-ceo" : ""}`}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <button
                  type="button"
                  className="hq-person-target"
                  aria-label={name(employee)}
                  disabled={paused}
                  onClick={() => travel(employee.id)}
                  onKeyDown={() => {
                    moved.current = false;
                  }}
                >
                  <ExecutivePerson variant={i + page} />
                </button>
                <div className="hq-glass-desk" aria-hidden="true">
                  <i />
                  <i />
                </div>
                <button
                  type="button"
                  className="hq-screen"
                  disabled={paused}
                  aria-label={`${t("screens")} · ${name(employee)}`}
                  onClick={() => travel(employee.id, true)}
                  onKeyDown={() => {
                    moved.current = false;
                  }}
                >
                  <span className="hq-screen-top">
                    <Monitor size={10} />
                    <b>{employee.id.toUpperCase()}</b>
                    <i
                      data-active={
                        status === "generating" ||
                        status === "running" ||
                        status === "browsing"
                      }
                    />
                  </span>
                  <span className="hq-screen-content" dir="auto">
                    {text || w("empty")}
                  </span>
                  <span className="hq-screen-footer">
                    {status ? w(status) : w("available")}
                    <ArrowUpRight size={12} />
                  </span>
                </button>
                <button
                  type="button"
                  className="hq-nameplate"
                  disabled={paused}
                  onClick={() => travel(employee.id)}
                  onKeyDown={() => {
                    moved.current = false;
                  }}
                >
                  <span
                    className={
                      voice.speaker === employee.id ? "is-speaking" : ""
                    }
                  />
                  {name(employee)}
                </button>
              </div>
            );
          })}
          <button
            className="hq-boss-screen"
            type="button"
            aria-label={t("master")}
            disabled={paused}
            onClick={() => {
              if (!moved.current) onMaster();
            }}
          >
            <Monitor size={22} />
            <span>oneShot OS</span>
            <small>{t("master")}</small>
          </button>
        </div>
        {focused && (
          <button
            className="hq-overview"
            type="button"
            onClick={() => {
              setFocused(false);
              setPan(0);
            }}
          >
            {ar ? "نظرة عامة" : "Overview"}
          </button>
        )}
      </div>
      <nav className="hq-dock" aria-label={t("headquarters")}>
        <button type="button" onClick={onMaster} disabled={paused}>
          <Monitor size={17} />
          <span>{t("master")}</span>
        </button>
        <button
          type="button"
          onClick={onMeeting}
          disabled={paused || meetingOpen}
        >
          <Users size={17} />
          <span>{w("meeting")}</span>
        </button>
        <select
          value={selected}
          aria-label={w("team")}
          disabled={paused}
          onChange={(event) => {
            moved.current = false;
            travel(event.target.value);
          }}
        >
          {catalog.map((e) => (
            <option key={e.id} value={e.id}>
              {name(e)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onWorkstation(selected)}
          disabled={
            paused || !catalog.some((employee) => employee.id === selected)
          }
        >
          <ArrowUpRight size={17} />
          <span>{t("screens")}</span>
        </button>
      </nav>
    </section>
  );
}
