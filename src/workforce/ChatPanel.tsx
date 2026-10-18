import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BriefcaseBusiness,
  Mail,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { Employee } from "../../shared/workforce";
import type { Conversation } from "./useConversation";
import type { LiveVoice } from "./useLiveVoice";
import { VoiceControls } from "./VoiceControls";
import {
  useAppearance,
  languageNames,
  workforceLanguages,
  type Language,
} from "../storefront/i18n";
import { liveText } from "./liveCopy";
import { wfText } from "./copy";
export function PersonIcon({ id, size = 22 }: { id: string; size?: number }) {
  return id === "ceo" ? (
    <BriefcaseBusiness size={size} />
  ) : id === "mail" ? (
    <Mail size={size} />
  ) : (
    <Sparkles size={size} />
  );
}
export function ChatPanel({
  catalog,
  selected,
  onSelect,
  chat,
  voice,
  onSend,
  keyboard = true,
  compact = false,
}: {
  catalog: Employee[];
  selected: string;
  onSelect: (id: string) => void;
  chat: Conversation;
  voice: LiveVoice;
  onSend: (text: string, audible?: boolean) => Promise<boolean>;
  keyboard?: boolean;
  compact?: boolean;
}) {
  const { language, outputLanguage, setOutputLanguage } = useAppearance(),
    t = (key: string) => liveText(language, key),
    w = (key: string) => wfText(language, key);
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const employee = catalog.find((e) => e.id === selected);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [chat.turns.length, chat.busy]);
  useEffect(() => setDraft(""), [selected]);
  async function submit() {
    const text = draft;
    if (await onSend(text, voice.active))
      setDraft((value) => (value === text ? "" : value));
  }
  return (
    <section
      className={`wf-chat-panel ${compact ? "wf-chat-compact" : ""}`}
      aria-label={t("chat")}
    >
      <header className="wf-chat-header">
        <span
          className={`wf-person ${voice.speaker === selected ? "wf-speaking" : ""}`}
        >
          <PersonIcon id={selected} />
        </span>
        <div>
          <strong>
            {employee?.title[language] || employee?.title.en || "CEO"}
          </strong>
          <small>
            AI · {voice.speaker === selected ? t("speaking") : t("chat")}
          </small>
        </div>
        <select
          aria-label={w("team")}
          value={selected}
          onChange={(event) => onSelect(event.target.value)}
        >
          {catalog.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title[language] || e.title.en}
            </option>
          ))}
        </select>
        <button
          aria-label={w("refresh")}
          onClick={() => void chat.refresh()}
          disabled={chat.loading}
        >
          <RefreshCw size={16} />
        </button>
      </header>
      <div className="wf-chat-messages" aria-busy={chat.busy || chat.loading}>
        {chat.loading ? (
          <div className="wf-chat-loading" role="status">
            <i />
            <i />
            <i />
            <span>{w("loading")}</span>
          </div>
        ) : !chat.turns.length ? (
          <div className="wf-chat-empty">
            <MessageSquare size={34} />
            <span className="wf-eyebrow">ONE CONVERSATION. YOUR TEAM.</span>
            <h2>{t("chatIntro")}</h2>
            <p>{employee?.bio[language] || employee?.bio.en}</p>
          </div>
        ) : (
          chat.turns.map((turn) => (
            <div key={turn.id} className="wf-chat-turn">
              <article className="wf-chat-message wf-chat-user">
                <small>{t("you")}</small>
                <p dir="auto">{turn.input}</p>
              </article>
              <article className="wf-chat-message">
                <small>
                  <PersonIcon id={selected} size={14} />
                  {employee?.title[language] || employee?.title.en}
                </small>
                <p dir="auto">
                  {turn.output ||
                    w(turn.status === "generating" ? "busy" : "failed")}
                </p>
                {turn.output && (
                  <button
                    className="wf-read-aloud"
                    aria-label={t("read")}
                    onClick={() => {
                      voice.stop();
                      void voice.speak({
                        employeeId: turn.employeeId,
                        text: turn.output,
                        language: turn.outputLanguage,
                      });
                    }}
                  >
                    <Volume2 size={15} />
                    {t("read")}
                  </button>
                )}
              </article>
            </div>
          ))
        )}
        {chat.busy && (
          <p role="status" className="wf-chat-pending">
            {t("thinking")}
            <span>···</span>
          </p>
        )}
        <div ref={end} />
      </div>
      {chat.error && (
        <p className="wf-error" role="alert">
          {chat.error}
        </p>
      )}
      <div className="wf-chat-bottom">
        <form
          className="wf-chat-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <textarea
            aria-label={t("placeholder")}
            placeholder={t("placeholder")}
            value={draft}
            maxLength={4000}
            rows={2}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                if (draft.trim() && !chat.busy && !chat.loading) void submit();
              }
            }}
          />
          <div>
            <label className="wf-output-select">
              {w("output")}
              <select
                value={outputLanguage}
                onChange={(event) =>
                  setOutputLanguage(event.target.value as Language)
                }
              >
                {workforceLanguages.map((l) => (
                  <option key={l} value={l}>
                    {languageNames[l]}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="wf-primary"
              disabled={!draft.trim() || chat.busy || chat.loading}
              aria-label={t("send")}
            >
              <ArrowUp size={20} />
            </button>
          </div>
        </form>
        <VoiceControls
          voice={voice}
          employeeId={selected}
          keyboard={keyboard}
        />
      </div>
    </section>
  );
}
