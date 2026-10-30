import { useAppearance } from "../storefront/i18n";
import { uiText as t } from "../lib/legacy-copy";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Sparkles,
  ArrowUp,
  Plus,
  MessageSquare,
  Trash2,
  Copy,
  Check,
  Mic,
  Square,
  Search,
  MapPin,
  ChevronDown,
  Bot,
  Clock3,
} from "lucide-react";
import { api, callBackendApi } from "../lib/api";
import {
  endpoints,
  type ChatMessage,
  type Conversation,
} from "../../shared/contracts";
import { Busy, Notice, Modal } from "./common";
interface SpeechResult {
  results: { [index: number]: { [index: number]: { transcript: string } } };
  resultIndex: number;
}
interface SpeechRecognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
// Customer-facing local models keep their safety training; uncensored builds are not offered here.
const OLLAMA_MODELS = [
  "command-r7b-arabic-128k",
  "deepseek-v4.1-flash:cloud",
];
function providerFor(model: string): "ollama" | "gemini" {
  return OLLAMA_MODELS.includes(model) ? "ollama" : "gemini";
}
export function Assistant({ staffId }: { staffId?: string }) {
  const { language } = useAppearance();
  const [model, setModel] = useState("gemini-3-flash-preview"),
    [persona, setPersona] = useState("executive"),
    [search, setSearch] = useState(false),
    [maps, setMaps] = useState(false);
  const [history, setHistory] = useState<Conversation[]>([]),
    [conversation, setConversation] = useState<string | undefined>(),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(""),
    [deleting, setDeleting] = useState<Conversation | null>(null);
  const [recording, setRecording] = useState(false),
    [voiceAvailable, setVoiceAvailable] = useState(false),
    recognizer = useRef<SpeechRecognizer | null>(null),
    end = useRef<HTMLDivElement>(null),
    loadVersion = useRef(0);
  async function refreshHistory() {
    try {
      const r = await api<{ conversations: Conversation[] }>(
        "/api/conversations?kind=ceo",
        undefined,
        { quiet: true },
      );
      setHistory(r.conversations);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refreshHistory();
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognizer;
      webkitSpeechRecognition?: new () => SpeechRecognizer;
    };
    setVoiceAvailable(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => recognizer.current?.abort();
  }, []);
  useEffect(
    () => end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    [messages, busy],
  );
  function newChat() {
    loadVersion.current++;
    setConversation(undefined);
    setMessages([]);
    setInput("");
    setError("");
    setLoading(false);
  }
  async function loadChat(item: Conversation) {
    const version = ++loadVersion.current;
    setLoading(true);
    setError("");
    try {
      const r = await api<{ messages: ChatMessage[] }>(
        `/api/conversations/${item.id}`,
        undefined,
        { quiet: true },
      );
      if (version === loadVersion.current) {
        setConversation(item.id);
        setMessages(r.messages);
      }
    } catch (e) {
      if (version === loadVersion.current) setError((e as Error).message);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy || loading) return;
    setBusy(true);
    setError("");
    const prompt = input.trim();
    try {
      const r = await callBackendApi<{ reply: string; conversationId: string }>(
        endpoints.ceo,
        {
          message: prompt,
          provider: providerFor(model),
          model,
          persona,
          conversationId: conversation,
          searchGrounding: search,
          mapsGrounding: maps,
          staffId,
          language,
        },
      );
      setConversation(r.conversationId);
      setInput("");
      setMessages((old) => [
        ...old,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: prompt,
          createdAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: r.reply,
          createdAt: new Date().toISOString(),
        },
      ]);
      void refreshHistory();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/conversations/${deleting.id}`, undefined, {
        method: "DELETE",
      });
      if (conversation === deleting.id) newChat();
      await refreshHistory();
      setDeleting(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function voice() {
    if (recording) {
      recognizer.current?.stop();
      return;
    }
    const w = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognizer;
        webkitSpeechRecognition?: new () => SpeechRecognizer;
      },
      Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setError(t("الإملاء الصوتي غير متاح في هذا المتصفح."));
      return;
    }
    const r = new Ctor();
    r.lang = language === "ar" ? "ar-SA" : "en-US";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e) =>
      setInput((old) =>
        (old + " " + e.results[e.resultIndex][0].transcript)
          .trim()
          .slice(0, 8000),
      );
    r.onerror = () => {
      setError(t("تعذّر استخدام الميكروفون. تحقق من الإذن وحاول مجدداً."));
      setRecording(false);
    };
    r.onend = () => setRecording(false);
    recognizer.current = r;
    try {
      r.start();
      setRecording(true);
    } catch {
      setError(t("تعذّر بدء الإملاء الصوتي."));
    }
  }
  const prompts = [
    t("حلّل المبيعات حسب العملة وحالة الدفع"),
    t("راجع حالات الطلبات واقترح الخطوات التالية"),
    t("اقترح توزيع المهام على الفريق"),
  ];
  return (
    <>
      <section className="ai-workspace">
        <div className="ai-toolbar">
          <div className="ai-provider">
            <Bot size={19} />
            <span dir="ltr">
              {providerFor(model) === "ollama"
                ? "Ollama · محلي"
                : "Gemini · Netlify"}
            </span>
          </div>
          <select
            aria-label={t("نموذج الذكاء الاصطناعي")}
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              if (providerFor(e.target.value) === "ollama") {
                setMaps(false);
                setSearch(false);
              } else if (e.target.value !== "gemini-2.5-flash") {
                setMaps(false);
              }
            }}
            disabled={busy}
          >
            <optgroup label="Gemini">
              <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            </optgroup>
            <optgroup label="Ollama · محلي">
              <option value="command-r7b-arabic-128k">
                Command R7B Arabic 128K
              </option>
              <option value="deepseek-v4.1-flash:cloud">
                DeepSeek V4.1 Flash
              </option>
            </optgroup>
          </select>
          <button
            className="button subtle small"
            disabled={busy}
            onClick={newChat}
          >
            <Plus size={15} /> {t("محادثة جديدة")}
          </button>
        </div>
        <div className="ai-body">
          <div className="ai-chat">
            <div className="chat-messages" aria-live="polite">
              {loading ? (
                <div className="empty-state">
                  <Busy />
                  <p>{t("جارٍ فتح المحادثة...")}</p>
                </div>
              ) : messages.length ? (
                messages.map((m) => (
                  <div className={`chat-message ${m.role}`} key={m.id}>
                    <div className="message-avatar">
                      {m.role === "assistant" ? (
                        <Sparkles size={16} />
                      ) : (
                        <span>{t("أنت")}</span>
                      )}
                    </div>
                    <div className="message-content">
                      <strong>
                        {m.role === "assistant" ? "oneShot AI" : t("أنت")}
                      </strong>
                      <div>{m.content}</div>
                      {m.role === "assistant" && (
                        <button
                          className="copy-message"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(m.content);
                              setCopied(m.id);
                              setTimeout(() => setCopied(""), 2000);
                            } catch {
                              setError(t("تعذّر النسخ من المتصفح."));
                            }
                          }}
                        >
                          {copied === m.id ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={12} />
                          )}{" "}
                          {copied === m.id ? t("تم النسخ") : t("نسخ")}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="ai-welcome">
                  <div className="ai-mark">
                    <Sparkles size={36} strokeWidth={1.5} />
                  </div>
                  <span className="eyebrow">YOUR EXECUTIVE ADVISOR</span>
                  <h2>{t("ما القرار التالي لأعمالك؟")}</h2>
                  <p>
                    {t(
                      "تقارير تستند إلى الطلبات والفريق المسجلين في المنظومة.",
                    )}
                  </p>
                  <div className="prompt-suggestions">
                    {prompts.map((p) => (
                      <button key={p} onClick={() => setInput(p)}>
                        {p}
                        <ArrowUp size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {busy && !deleting && (
                <div className="thinking">
                  <span />
                  <span />
                  <span /> {t("جارٍ إعداد الإجابة...")}
                </div>
              )}
              <div ref={end} />
            </div>
            {error && <Notice>{error}</Notice>}
            <form className="composer" onSubmit={send}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("اكتب توجيهك التنفيذي...")}
                aria-label={t("رسالتك")}
                maxLength={8000}
                required
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <div className="composer-bottom">
                <div className="composer-tools">
                  <button
                    type="button"
                    aria-pressed={search}
                    className={search ? "active" : ""}
                    onClick={() => setSearch(!search)}
                    disabled={busy}
                  >
                    <Search size={14} /> {t("بحث")}
                  </button>
                  <button
                    type="button"
                    aria-pressed={maps}
                    className={maps ? "active" : ""}
                    onClick={() => {
                      setMaps(!maps);
                      if (!maps) setModel("gemini-2.5-flash");
                    }}
                    disabled={busy}
                  >
                    <MapPin size={14} /> {t("خرائط")}
                  </button>
                  {voiceAvailable && (
                    <button
                      type="button"
                      className={recording ? "recording" : ""}
                      onClick={voice}
                      disabled={busy}
                      aria-label={
                        recording ? t("إيقاف الإملاء") : t("إملاء صوتي")
                      }
                    >
                      {recording ? <Square size={14} /> : <Mic size={16} />}
                    </button>
                  )}
                </div>
                <button
                  className="send-button"
                  disabled={busy || loading || !input.trim()}
                  aria-label={t("إرسال الرسالة")}
                >
                  {busy ? <Busy /> : <ArrowUp size={20} />}
                </button>
              </div>
            </form>
            <p className="ai-disclaimer">
              {recording
                ? t("جارٍ الاستماع...")
                : t(
                    "راجع المعلومات المهمة. تُحفظ المحادثات في حسابك بعد وصول الإجابة.",
                  )}
            </p>
          </div>
          <aside className="chat-sidebar">
            <label>
              {t("تخصص المساعد")}
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                disabled={busy}
              >
                <option value="executive">{t("المستشار التنفيذي")}</option>
                <option value="developer">{t("مساعد البرمجة")}</option>
                <option value="marketing">{t("خبير التسويق")}</option>
                <option value="analyst">{t("محلل البيانات")}</option>
              </select>
            </label>
            <div className="history-heading">
              <Clock3 size={14} /> {t("محادثاتك السابقة")}
            </div>
            {history.length ? (
              history.map((c) => (
                <div
                  className={`conversation-item ${conversation === c.id ? "active" : ""}`}
                  key={c.id}
                >
                  <button disabled={busy} onClick={() => loadChat(c)}>
                    <MessageSquare size={13} />
                    <span>{c.title}</span>
                  </button>
                  <button
                    className="delete-chat"
                    disabled={busy}
                    onClick={() => setDeleting(c)}
                    aria-label={`${t("حذف المحادثة")} · ${c.title}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            ) : (
              <p className="muted small-text">
                {t("تظهر محادثاتك المحفوظة هنا.")}
              </p>
            )}
            <button
              className="history-refresh"
              disabled={busy}
              onClick={refreshHistory}
            >
              {t("تحديث السجل")}
              <ChevronDown size={13} />
            </button>
          </aside>
        </div>
      </section>
      {deleting && (
        <Modal
          title={t("حذف المحادثة")}
          onClose={() => !busy && setDeleting(null)}
        >
          <p>{t("تُحذف هذه المحادثة ورسائلها نهائياً من حسابك.")}</p>
          <p className="muted">{deleting.title}</p>
          <div className="modal-actions">
            <button className="button danger" onClick={remove} disabled={busy}>
              {busy ? <Busy /> : <Trash2 size={16} />} {t("حذف المحادثة")}
            </button>
            <button
              className="button subtle"
              onClick={() => setDeleting(null)}
              disabled={busy}
            >
              {t("إلغاء")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
