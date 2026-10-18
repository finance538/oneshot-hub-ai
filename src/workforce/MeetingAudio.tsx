import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play } from "lucide-react";
import type { Employee, Meeting, Workspace } from "../../shared/workforce";
import { isLanguage } from "../../shared/workforce";
import type { LiveVoice, SpokenTurn } from "./useLiveVoice";
import { PersonIcon } from "./ChatPanel";
import { useAppearance } from "../storefront/i18n";
import { liveText } from "./liveCopy";
import { wfText } from "./copy";
export function MeetingAudio({
  meeting,
  catalog,
  workspace,
  voice,
  onSelect,
}: {
  meeting?: Meeting;
  catalog: Employee[];
  workspace: Workspace;
  voice: LiveVoice;
  onSelect: (id: string) => void;
}) {
  const { language, outputLanguage } = useAppearance(),
    t = (key: string) => liveText(language, key);
  const [playing, setPlaying] = useState(false),
    [index, setIndex] = useState(0);
  const playback = useRef(0),
    alive = useRef(true);
  const select = useRef(onSelect);
  select.current = onSelect;
  const participants = [...catalog].sort((a, b) =>
    a.id === "ceo" ? -1 : b.id === "ceo" ? 1 : 0,
  );
  const segments: SpokenTurn[] = participants.map((e) => {
    const report = meeting?.reports.find((r) => r.employeeId === e.id);
    const task = workspace.tasks.find((row) => row.id === report?.taskId);
    const lang =
      e.id === "ceo"
        ? isLanguage(meeting?.outputLanguage)
          ? meeting.outputLanguage
          : outputLanguage
        : isLanguage(task?.outputLanguage)
          ? task.outputLanguage
          : outputLanguage;
    return {
      employeeId: e.id,
      language: lang,
      text:
        e.id === "ceo"
          ? meeting?.minutes || ""
          : `${e.title[lang] || e.title.en}. ${report?.output ? `${wfText(lang, report.status)}. ${task?.mode === "demo" ? wfText(lang, "demo") + ". " : ""}${report.output}` : liveText(lang, "noReport")}`,
    };
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      playback.current++;
      voice.stop();
    };
  }, []);
  useEffect(() => {
    playback.current++;
    voice.stop();
    setPlaying(false);
    setIndex(0);
  }, [meeting?.id]);
  async function play() {
    if (!meeting?.minutes) return;
    voice.stop();
    const run = ++playback.current;
    setPlaying(true);
    for (
      let i = index >= segments.length ? 0 : index;
      i < segments.length;
      i++
    ) {
      if (run !== playback.current || !alive.current) break;
      setIndex(i);
      select.current(segments[i].employeeId);
      const completed = await voice.speak(segments[i]);
      if (!completed || run !== playback.current) break;
      if (alive.current) setIndex(i + 1);
    }
    if (alive.current && run === playback.current) setPlaying(false);
  }
  function pause() {
    playback.current++;
    voice.stop();
    setPlaying(false);
  }
  return (
    <section className="wf-meeting-audio">
      <div className="wf-board-table">
        {participants.map((e) => (
          <button
            key={e.id}
            className={voice.speaker === e.id ? "wf-speaking" : ""}
            onClick={() => {
              pause();
              onSelect(e.id);
            }}
          >
            <PersonIcon id={e.id} />
            <span>{e.title[language] || e.title.en}</span>
            {voice.speaker === e.id && <small>{t("speaking")}</small>}
          </button>
        ))}
      </div>
      <div className="wf-actions">
        <button
          className="wf-primary"
          disabled={!meeting?.minutes || voice.muted}
          onClick={() => (playing ? pause() : void play())}
        >
          {playing ? <Pause size={17} /> : <Play size={17} />}{" "}
          {t(
            playing
              ? "stop"
              : index > 0 && index < segments.length
                ? "resume"
                : "playMeeting",
          )}
        </button>
        <button
          onClick={() => {
            pause();
            voice.interrupt();
          }}
        >
          <Mic size={17} />
          {t("interrupt")}
        </button>
      </div>
      {segments[index]?.text && meeting?.minutes && (
        <details>
          <summary>
            {participants[index]?.title[language] ||
              participants[index]?.title.en}
          </summary>
          <p className="wf-text" dir="auto">
            {segments[index].text}
          </p>
        </details>
      )}
    </section>
  );
}
