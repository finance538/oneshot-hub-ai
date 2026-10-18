import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BriefcaseBusiness,
  Mail,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Volume2,
  KeyRound,
  Settings2,
} from "lucide-react";
import type { Employee } from "../../shared/workforce";
import type { Conversation } from "./useConversation";
import type { LiveVoice } from "./useLiveVoice";
import { VoiceControls, VoiceSettings } from "./VoiceControls";
import { Modal } from "../components/Modal";
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
  onTools,
}: {
  catalog: Employee[];
  selected: string;
  onSelect: (id: string) => void;
  chat: Conversation;
  voice: LiveVoice;
  onSend: (text: string, audible?: boolean) => Promise<boolean>;
  keyboard?: boolean;
  compact?: boolean;
  onTools?: (employeeId?: string, resourceId?: string) => void;
}) {
  const { language, outputLanguage, setOutputLanguage } = useAppearance(),
    t = (key: string) => liveText(language, key),
    w = (key: string) => wfText(language, key);
  const [draft, setDraft] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [collaborationTurn, setCollaborationTurn] = useState<string>();
  const collaboration = chat.turns.find(
    (turn) => turn.id === collaborationTurn,
  );
  const messages = useRef<HTMLDivElement>(null);
  const employee = catalog.find((e) => e.id === selected);
  useEffect(() => {
    const pane = messages.current;
    // Keep incoming voice replies inside the chat; do not scroll the merchant
    // away from the first-person scene, especially on a stacked mobile layout.
    if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: "instant" });
  }, [chat.turns.length, chat.busy]);
  useEffect(() => {
    setDraft("");
    setCollaborationTurn(undefined);
  }, [selected]);
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
        <button
          type="button"
          aria-label={
            language === "ar"
              ? "إعدادات المحادثة والصوت"
              : "Conversation & voice"
          }
          title={
            language === "ar"
              ? "إعدادات المحادثة والصوت"
              : "Conversation & voice"
          }
          aria-haspopup="dialog"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 size={17} />
        </button>
      </header>
      <div
        ref={messages}
        className="wf-chat-messages"
        aria-busy={chat.busy || chat.loading}
      >
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
                {!!turn.collaboration?.length && (
                  <button
                    className="wf-read-aloud"
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setCollaborationTurn(turn.id)}
                  >
                    {language === "ar"
                      ? "مساهمات الفريق"
                      : "Team contributions"}{" "}
                    · {turn.collaboration.length}
                  </button>
                )}
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
                {turn.action && onTools && (
                  <button
                    className="wf-read-aloud"
                    onClick={() =>
                      onTools(turn.action?.employeeId, turn.action?.resourceId)
                    }
                  >
                    {turn.action.kind === "research"
                      ? "المصادر وصفحات البحث"
                      : "فتح البريد والمراجعة"}
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
            <VoiceControls
              voice={voice}
              employeeId={selected}
              keyboard={keyboard && !settingsOpen && !collaborationTurn}
              compact
            />
            <button
              className="wf-primary"
              disabled={!draft.trim() || chat.busy || chat.loading}
              aria-label={t("send")}
            >
              <ArrowUp size={20} />
            </button>
          </div>
        </form>
        {(voice.phase !== "idle" || voice.interim || voice.error) && (
          <div className="wf-inline-status" role="status">
            <span>{t(voice.phase)}</span>
            <span dir="auto">{voice.error || voice.interim}</span>
          </div>
        )}
      </div>
      {settingsOpen && (
        <Modal
          title={
            language === "ar"
              ? "إعدادات المحادثة والصوت"
              : "Conversation & voice"
          }
          onClose={() => setSettingsOpen(false)}
        >
          <div className="ui-settings">
            <label>
              {w("team")}
              <select
                value={selected}
                onChange={(event) => onSelect(event.target.value)}
              >
                {catalog.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title[language] || e.title.en}
                  </option>
                ))}
              </select>
            </label>
            <p>{employee?.bio[language] || employee?.bio.en}</p>
            <label>
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
            <VoiceSettings voice={voice} employeeId={selected} />
            <div className="ui-settings-actions">
              <button
                type="button"
                disabled={chat.loading}
                onClick={() => void chat.refresh()}
              >
                <RefreshCw size={16} />
                {w("refresh")}
              </button>
              {onTools && (
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    onTools();
                  }}
                >
                  <KeyRound size={16} />
                  {language === "ar"
                    ? "البريد والبحث والحسابات"
                    : "Mail, research & accounts"}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
      {collaboration && (
        <Modal
          title={language === "ar" ? "مساهمات الفريق" : "Team contributions"}
          onClose={() => setCollaborationTurn(undefined)}
        >
          <div className="wf-contributions">
            {collaboration.collaboration?.map((part) => (
              <article key={part.employeeId}>
                <h3>
                  {catalog.find((e) => e.id === part.employeeId)?.title[
                    language
                  ] ||
                    catalog.find((e) => e.id === part.employeeId)?.title.en ||
                    part.employeeId}
                </h3>
                <p className="ui-detail-text" dir="auto">
                  {part.output}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    voice.stop();
                    void voice.speak({
                      employeeId: part.employeeId,
                      text: part.output,
                      language: collaboration.outputLanguage,
                    });
                  }}
                >
                  <Volume2 size={14} />
                  {t("read")}
                </button>
              </article>
            ))}
          </div>
        </Modal>
      )}
    </section>
  );
}
