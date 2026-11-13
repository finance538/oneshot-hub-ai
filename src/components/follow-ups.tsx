import { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  Check,
  Copy,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Busy, Modal, Notice } from "./common";
import { api } from "../lib/api";
import { useAppearance } from "../storefront/i18n";
import { DEFAULT_REMINDER_DAYS } from "../../shared/follow-ups";
import "./studio.css";

/**
 * متابعة العروض: ما أُرسل، ومتى يُسأل عنه مرة أخرى.
 * المنصة لا ترسل ولا تقرأ بريدك ولا تعرف أن العميل ردّ — أنت تُعلّم ذلك.
 */

interface FollowUp {
  id: string;
  contact: string;
  contactEmail: string;
  subject: string;
  sentAt: string;
  remindAfterDays: number;
  status: string;
  draft: string;
  autoSend: boolean;
  autoReply: boolean;
  messagesSent: number;
  due?: boolean;
}
interface MailLink {
  enabled: boolean;
  connected: boolean;
  mail: boolean;
  email?: string;
}

export function FollowUps() {
  const { tr } = useAppearance();
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<FollowUp | null>(null);
  const [link, setLink] = useState<MailLink | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api<{ followUps: FollowUp[] }>("/api/follow-ups");
      setRows(result.followUps || []);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    void api<MailLink>("/api/google/workspace")
      .then(setLink)
      .catch(() => setLink(null));
  }, [load]);

  async function connectMail() {
    try {
      const result = await api<{ authorization: string }>(
        "/api/google/workspace/connect",
        { purpose: "gmail", return_to: location.href },
      );
      location.assign(result.authorization);
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function toggle(row: FollowUp, field: "autoSend" | "autoReply") {
    try {
      const result = await api<{ followUp: FollowUp }>(
        `/api/follow-ups/${row.id}`,
        { [field]: !row[field] },
        { method: "PATCH" },
      );
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, ...result.followUp } : item,
        ),
      );
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function mark(row: FollowUp, status: string) {
    try {
      await api(`/api/follow-ups/${row.id}`, { status }, { method: "PATCH" });
      setRows((current) => current.filter((item) => item.id !== row.id));
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/follow-ups/${id}`, undefined, { method: "DELETE" });
      setRows((current) => current.filter((item) => item.id !== id));
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  return (
    <>
      <div className="studio-tabs">
        <button className="button primary small" onClick={() => setAdding(true)}>
          <Plus size={15} /> {tr("عرض للمتابعة", "Track an offer")}
        </button>
        <button className="button subtle small" onClick={() => void load()}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />{" "}
          {tr("تحديث", "Refresh")}
        </button>
      </div>
      {link?.mail ? (
        <p className="beta-micro">
          {tr("البريد مربوط:", "Mail connected:")} <span dir="ltr">{link.email}</span>{" "}
          ·{" "}
          {tr(
            "المنصة تقرأ ردود العملاء في هذه المحادثات فقط، وترسل باسمك حين تُفعّل المتابعة أو الردّ على العرض نفسه.",
            "Replies are read for these threads only; sending happens where you enable it.",
          )}
        </p>
      ) : (
        <div className="studio-card" style={{ marginBottom: 14 }}>
          <h4>{tr("اربط بريدك لتتولّى المنصة المتابعة", "Connect your mail")}</h4>
          <small>
            {tr(
              "بدون ربط: المنصة تُنبّهك وتجهّز المسودة فقط. مع الربط: تلتقط ردّ العميل، وترسل المتابعة وتردّ عنك حين تسمح بذلك لكل عرض.",
              "Without it you get reminders and drafts only.",
            )}
          </small>
          <div className="studio-actions">
            <button
              className="button primary small"
              onClick={() => void connectMail()}
              disabled={link ? !link.enabled : true}
            >
              <Mail size={14} /> {tr("ربط Gmail", "Connect Gmail")}
            </button>
          </div>
          {link && !link.enabled && (
            <small>
              {tr(
                "ربط Google بانتظار الإعداد لدى مسؤول المشروع.",
                "Google is not configured yet.",
              )}
            </small>
          )}
        </div>
      )}
      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Busy />
      ) : rows.length ? (
        <div className="studio-grid">
          {rows.map((row) => (
            <div key={row.id} className="studio-card">
              <h4>{row.subject || tr("عرض", "Offer")}</h4>
              <small dir="auto">{row.contact}</small>
              <div className="studio-chips">
                <span className="studio-chip">
                  {row.due
                    ? tr("حلّ موعد المتابعة", "Due now")
                    : tr("بالانتظار", "Waiting")}
                </span>
                <span className="studio-chip">
                  {tr("أُرسل", "Sent")}:{" "}
                  {new Date(row.sentAt).toLocaleDateString("ar")}
                </span>
                <span className="studio-chip">
                  {tr("التذكير بعد", "Remind after")}: {row.remindAfterDays}{" "}
                  {tr("يوم", "d")}
                </span>
                {row.messagesSent > 0 && (
                  <span className="studio-chip">
                    {tr("رسائل أُرسلت", "Sent by platform")}: {row.messagesSent}
                  </span>
                )}
              </div>
              {link?.mail && row.contactEmail && (
                <div className="studio-actions">
                  <button
                    className={`button ${row.autoSend ? "primary" : "subtle"} small`}
                    onClick={() => void toggle(row, "autoSend")}
                  >
                    <Send size={14} />{" "}
                    {row.autoSend
                      ? tr("المتابعة تلقائية", "Auto follow-up on")
                      : tr("تابع عني", "Follow up for me")}
                  </button>
                  <button
                    className={`button ${row.autoReply ? "primary" : "subtle"} small`}
                    onClick={() => void toggle(row, "autoReply")}
                  >
                    <MessageSquare size={14} />{" "}
                    {row.autoReply
                      ? tr("الردّ تلقائي", "Auto reply on")
                      : tr("ردّ عني", "Reply for me")}
                  </button>
                </div>
              )}
              <div className="studio-actions">
                <button
                  className="button primary small"
                  onClick={() => setDraft(row)}
                >
                  <BellRing size={14} /> {tr("المسودة", "Draft")}
                </button>
                <button
                  className="button subtle small"
                  onClick={() => void mark(row, "replied")}
                >
                  <Check size={14} /> {tr("ردّ العميل", "Replied")}
                </button>
                <button
                  className="button subtle small"
                  onClick={() => void mark(row, "closed")}
                >
                  <X size={14} /> {tr("إغلاق", "Close")}
                </button>
                <button
                  className="button subtle small"
                  onClick={() => void remove(row.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <BellRing size={30} />
          <p>
            {tr(
              "لا عروض تحت المتابعة. أضف عرضاً أرسلته، ونُنبّهك إن لم يأتِ ردّ.",
              "No offers tracked yet.",
            )}
          </p>
        </div>
      )}
      {adding && (
        <AddFollowUp
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            void load();
          }}
        />
      )}
      {draft && (
        <Modal
          title={draft.subject || tr("مسودة المتابعة", "Follow-up draft")}
          onClose={() => setDraft(null)}
        >
          <div className="studio-output">{draft.draft}</div>
          <button
            className="button primary"
            onClick={() => void navigator.clipboard?.writeText(draft.draft)}
          >
            <Copy size={15} /> {tr("نسخ المسودة", "Copy draft")}
          </button>
        </Modal>
      )}
    </>
  );
}

function AddFollowUp({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { tr } = useAppearance();
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [days, setDays] = useState(DEFAULT_REMINDER_DAYS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!contact.trim() || !subject.trim()) {
      setError(tr("جهة الاتصال والموضوع مطلوبان.", "Contact and subject are required."));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/follow-ups", {
        contact: contact.trim(),
        contactEmail: email.trim() || undefined,
        subject: subject.trim(),
        remindAfterDays: days,
      });
      onSaved();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={tr("عرض للمتابعة", "Track an offer")} onClose={onClose}>
      <div className="studio-form">
        <label>
          {tr("جهة الاتصال (اسم أو بريد)", "Contact")}
          <input
            maxLength={200}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
          />
        </label>
        <label>
          {tr("موضوع العرض", "Offer subject")}
          <input
            maxLength={200}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </label>
        <label>
          {tr("بريد العميل (لالتقاط ردّه والإرسال إليه)", "Client email")}
          <input
            dir="ltr"
            type="email"
            maxLength={200}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="client@example.com"
          />
        </label>
        <label>
          {tr("نبّهني بعد (أيام)", "Remind me after (days)")}
          <input
            type="number"
            min={1}
            max={30}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          />
        </label>
        {error && <Notice>{error}</Notice>}
        <button
          className="button primary"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? tr("جارٍ الحفظ…", "Saving…") : tr("حفظ", "Save")}
        </button>
      </div>
    </Modal>
  );
}
