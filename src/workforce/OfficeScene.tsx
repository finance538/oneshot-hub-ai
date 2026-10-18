import { useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Monitor,
  Users,
} from "lucide-react";
import type { Employee, Workspace } from "../../shared/workforce";
import { useAppearance } from "../storefront/i18n";
import { liveText } from "./liveCopy";
import { wfText } from "./copy";
const iso = (x: number, y: number, z = 0) => ({
  x: 500 + (x - y) * 0.58,
  y: 85 + (x + y) * 0.3 - z,
});
const polygon = (x: number, y: number, w: number, h: number, z = 0) =>
  [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]
    .map(([a, b]) => {
      const p = iso(a, b, z);
      return `${p.x},${p.y}`;
    })
    .join(" ");
export function OfficeScene({
  catalog,
  workspace,
  selected,
  speaker,
  onSelect,
  onMaster,
  onMeeting,
  meetingOpen,
}: {
  catalog: Employee[];
  workspace: Workspace;
  selected: string;
  speaker: string | null;
  onSelect: (id: string) => void;
  onMaster: () => void;
  onMeeting: () => void;
  meetingOpen: boolean;
}) {
  const { language } = useAppearance(),
    t = (key: string) => liveText(language, key);
  const svg = useRef<SVGSVGElement>(null),
    [position, setPosition] = useState({ x: 450, y: 470 });
  const desks = catalog.map((employee, i) => ({
    employee,
    x: i === 0 ? 160 : 470 + ((i - 1) % 3) * 140,
    y: i === 0 ? 155 : 125 + Math.floor((i - 1) / 3) * 100,
  }));
  function move(x: number, y: number) {
    const next = {
      x: Math.max(35, Math.min(865, x)),
      y: Math.max(35, Math.min(565, y)),
    };
    setPosition(next);
    const near = desks.find((d) => Math.hypot(d.x - next.x, d.y - next.y) < 80);
    if (near && near.employee.id !== selected) onSelect(near.employee.id);
  }
  function navigate(event: KeyboardEvent<SVGSVGElement>) {
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [0, -28],
      KeyW: [0, -28],
      ArrowDown: [0, 28],
      KeyS: [0, 28],
      ArrowLeft: [-28, 0],
      KeyA: [-28, 0],
      ArrowRight: [28, 0],
      KeyD: [28, 0],
    };
    const delta = deltas[event.code];
    if (delta) {
      event.preventDefault();
      move(position.x + delta[0], position.y + delta[1]);
    }
  }
  function objectKey(event: KeyboardEvent<SVGGElement>, action: () => void) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      action();
    }
  }
  const person = iso(position.x, position.y, 12);
  return (
    <section className="wf-office-scene" aria-label={t("headquarters")}>
      <div className="wf-scene-heading">
        <span className="wf-eyebrow">ONESHOT / HEADQUARTERS</span>
        <span>2.5D</span>
      </div>
      <svg
        ref={svg}
        viewBox="0 0 1060 600"
        tabIndex={0}
        role="group"
        aria-label={t("navigation")}
        onKeyDown={navigate}
        onClick={(event) => {
          if (!svg.current) return;
          const matrix = svg.current.getScreenCTM();
          if (!matrix) return;
          const point = new DOMPoint(
            event.clientX,
            event.clientY,
          ).matrixTransform(matrix.inverse());
          const a = (point.x - 500) / 0.58,
            b = (point.y - 85) / 0.3;
          move((a + b) / 2, (b - a) / 2);
        }}
      >
        <defs>
          <pattern
            id="wf-floor-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
            patternTransform="matrix(.58 .30 -.58 .30 500 85)"
          >
            <path
              d="M40 0H0V40"
              fill="none"
              stroke="currentColor"
              strokeOpacity=".12"
            />
          </pattern>
        </defs>
        <polygon points={polygon(0, 0, 900, 600, -20)} fill="#1b2022" />
        <polygon points={polygon(0, 0, 900, 600)} className="wf-floor" />
        <polygon points={polygon(0, 0, 900, 600)} fill="url(#wf-floor-grid)" />
        <polygon
          points={polygon(25, 25, 300, 255)}
          className="wf-executive-floor"
        />
        <polygon
          points={polygon(350, 25, 525, 255)}
          className="wf-staff-floor"
        />
        <polygon
          points={polygon(25, 320, 480, 250)}
          className="wf-board-floor"
        />
        <path
          d="M500 85L1022 355V287L500 17L152 197V265L500 85"
          className="wf-office-wall"
        />
        <path
          d="M500 85V17M326 175V107M674 175V107M848 265V197"
          stroke="#a5b2ac"
          strokeOpacity=".25"
        />
        {[
          [170, 70, "CEO"],
          [600, 65, "TEAM"],
          [260, 350, "BOARDROOM"],
        ].map(([x, y, label]) => {
          const p = iso(Number(x), Number(y));
          return (
            <text
              key={label}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              className="wf-room-label"
            >
              {label}
            </text>
          );
        })}
        <polygon
          points={polygon(95, 400, 315, 95, 24)}
          className="wf-meeting-table"
        />
        <g
          role="button"
          tabIndex={0}
          aria-label={wfText(language, "meeting")}
          className="wf-scene-object"
          onClick={(event) => {
            event.stopPropagation();
            move(270, 480);
            onMeeting();
          }}
          onKeyDown={(event) => objectKey(event, onMeeting)}
        >
          <rect
            x={iso(250, 445, 24).x - 36}
            y={iso(250, 445, 24).y - 18}
            width="72"
            height="34"
            rx="8"
            fill="#303c36"
          />
          <text
            x={iso(250, 445, 24).x}
            y={iso(250, 445, 24).y + 3}
            textAnchor="middle"
            fill="#b9d8c7"
            fontSize="12"
          >
            {wfText(language, "meeting")}
          </text>
        </g>
        {desks.map(({ employee: e, x, y }, i) => {
          const p = meetingOpen ? iso(115 + i * 115, 400, 30) : iso(x, y, 58);
          const status = workspace.tasks.find(
            (task) => task.employeeId === e.id,
          )?.status;
          return (
            <g key={e.id}>
              <polygon
                points={polygon(x - 55, y + 22, 110, 65)}
                fill="#252b2d"
              />
              <polygon
                points={polygon(x - 55, y + 22, 110, 65, 25)}
                className="wf-desk-top"
              />
              <g
                transform={`translate(${iso(x, y + 40, 25).x},${iso(x, y + 40, 25).y})`}
                aria-hidden="true"
              >
                <rect
                  x="-19"
                  y="-30"
                  width="38"
                  height="25"
                  rx="3"
                  fill="#161c1e"
                  stroke={status === "drafting" ? "#94bca8" : "#7d8983"}
                />
                <path
                  d="M-12 -22H12M-12 -17H4M-12 -12H9"
                  stroke="#7d8983"
                  strokeWidth="2"
                />
                <path d="M0 -5V2M-9 2H9" stroke="#7d8983" />
              </g>
              <g
                role="button"
                tabIndex={0}
                className={`wf-scene-object ${speaker === e.id ? "wf-speaking" : ""}`}
                aria-label={e.title[language] || e.title.en}
                aria-pressed={selected === e.id}
                onClick={(event) => {
                  event.stopPropagation();
                  move(x, y + 90);
                  onSelect(e.id);
                }}
                onKeyDown={(event) => objectKey(event, () => onSelect(e.id))}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="29"
                  className="wf-speaking-ring"
                  fill="none"
                  stroke={selected === e.id ? "#dfaa7e" : "#62706a"}
                  strokeWidth="2"
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="23"
                  fill={i === 0 ? "#aa7855" : "#456255"}
                />
                <circle cx={p.x} cy={p.y - 6} r="7" fill="#f1e5d1" />
                <path
                  d={`M${p.x - 12} ${p.y + 14}q0 -16 12 -16t12 16`}
                  fill="#f1e5d1"
                />
                <text
                  x={p.x}
                  y={p.y - 39}
                  textAnchor="middle"
                  className="wf-person-label"
                >
                  {e.title[language] || e.title.en}
                </text>
              </g>
            </g>
          );
        })}
        <g
          role="button"
          tabIndex={0}
          className="wf-scene-object"
          aria-label={t("master")}
          onClick={(event) => {
            event.stopPropagation();
            move(230, 270);
            onMaster();
          }}
          onKeyDown={(event) => objectKey(event, onMaster)}
        >
          <polygon points={polygon(110, 235, 160, 65, 28)} fill="#9e7657" />
          <g
            transform={`translate(${iso(190, 265, 30).x},${iso(190, 265, 30).y})`}
          >
            <rect
              x="-38"
              y="-42"
              width="76"
              height="40"
              rx="4"
              fill="#192322"
              stroke="#d5aa7d"
              strokeWidth="2"
            />
            <path
              d="M-24 -30H24M-24 -23H8M-24 -16H18"
              stroke="#b2ccba"
              strokeWidth="2"
            />
            <text y="22" textAnchor="middle" className="wf-person-label">
              {t("master")}
            </text>
          </g>
        </g>
        <g
          transform={`translate(${person.x},${person.y})`}
          className="wf-player"
          pointerEvents="none"
        >
          <ellipse cy="15" rx="15" ry="7" fill="#111a1790" />
          <circle r="13" fill="#e5b388" stroke="#faead9" strokeWidth="3" />
          <text y="39" textAnchor="middle" className="wf-person-label">
            {t("you")}
          </text>
        </g>
        {[
          { x: 60, y: 75 },
          { x: 840, y: 520 },
          { x: 540, y: 550 },
        ].map(({ x, y }) => {
          const p = iso(x, y);
          return (
            <g key={x} aria-hidden="true">
              <ellipse cx={p.x} cy={p.y} rx="16" ry="8" fill="#797468" />
              <path
                d={`M${p.x} ${p.y}v-35m0 20q-28 -5 -18 -28q25 0 18 28m0 -10q28 -8 15 -26q-20 2 -15 26`}
                fill="#5d7764"
                stroke="#6b8a72"
              />
            </g>
          );
        })}
      </svg>
      <div className="wf-scene-footer">
        <p>{t("navigation")}</p>
        <div className="wf-direction-pad" dir="ltr">
          {[
            [ArrowLeft, -35, 0],
            [ArrowUp, 0, -35],
            [ArrowDown, 0, 35],
            [ArrowRight, 35, 0],
          ].map(([Icon, dx, dy], i) => {
            const DirectionIcon = Icon as typeof ArrowLeft;
            return (
              <button
                key={i}
                aria-label={["←", "↑", "↓", "→"][i]}
                onClick={() =>
                  move(position.x + Number(dx), position.y + Number(dy))
                }
              >
                <DirectionIcon size={16} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="wf-actions">
        <button onClick={onMaster}>
          <Monitor size={16} />
          {t("master")}
        </button>
        <button onClick={onMeeting}>
          <Users size={16} />
          {wfText(language, "meeting")}
        </button>
      </div>
    </section>
  );
}
