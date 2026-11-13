import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  ExternalLink,
  FileText,
  Globe,
  BellRing,
  Inbox,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { Busy, Modal, Notice } from "./common";
import { api } from "../lib/api";
import { useAppearance } from "../storefront/i18n";
import {
  applyTemplate,
  missingVariables,
  templateVariables,
} from "../../shared/templates";
import { PAGE_KINDS, pageSlug, type PageKind } from "../../shared/page-html";
import { FollowUps } from "./follow-ups";
import "./studio.css";

/**
 * القوالب والصفحات الفورية — منقولة من منصة الذكاء إلى الموقع الأساسي.
 *
 * القالب مخرج يُعاد استخدامه: تُكتب أجزاؤه المتغيّرة {{هكذا}}، فتظهر حقولاً
 * تُملأ عند كل استخدام. المتغيّر الذي بلا قيمة يبقى ظاهراً كما هو، فالنقص
 * واضح على الشاشة بدل أن يمرّ بصمت.
 *
 * الصفحة الفورية صفحة تعريف أو حجز على رابط عام /p/الاسم. صفحة الحجز تحتاج
 * بريداً تصل إليه الطلبات، والطلب يُحفظ أولاً ثم يُرسل.
 */

interface Template {
  id: string;
  title: string;
  kind: string;
  content: string;
  variables?: string[];
  updatedAt: string;
}
interface PublishedPage {
  id: string;
  slug: string;
  title: string;
  kind: PageKind;
  content: string;
  contactEmail: string;
  published: boolean;
  views: number;
  updatedAt: string;
}
interface Booking {
  id: string;
  name: string;
  contact: string;
  preferredAt: string;
  message: string;
  createdAt: string;
}

export function Studio() {
  const { tr } = useAppearance();
  const [tab, setTab] = useState<"templates" | "pages" | "follow">(
    "templates",
  );
  return (
    <section className="panel">
      <div className="studio-tabs">
        <button
          className={`button ${tab === "templates" ? "primary" : "subtle"} small`}
          onClick={() => setTab("templates")}
        >
          <FileText size={15} /> {tr("القوالب", "Templates")}
        </button>
        <button
          className={`button ${tab === "pages" ? "primary" : "subtle"} small`}
          onClick={() => setTab("pages")}
        >
          <Globe size={15} /> {tr("الصفحات الفورية", "Instant pages")}
        </button>
        <button
          className={`button ${tab === "follow" ? "primary" : "subtle"} small`}
          onClick={() => setTab("follow")}
        >
          <BellRing size={15} /> {tr("متابعة العروض", "Follow-ups")}
        </button>
      </div>
      {tab === "templates" ? (
        <Templates />
      ) : tab === "pages" ? (
        <Pages />
      ) : (
        <FollowUps />
      )}
    </section>
  );
}

// ---------------------------------------------------------------- القوالب

function Templates() {
  const { tr } = useAppearance();
  const [rows, setRows] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Template | "new" | null>(null);
  const [using, setUsing] = useState<Template | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api<{ templates: Template[] }>(
        "/api/studio/templates",
      );
      setRows(result.templates || []);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    try {
      await api(`/api/studio/templates/${id}`, undefined, { method: "DELETE" });
      setRows((current) => current.filter((row) => row.id !== id));
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  return (
    <>
      <div className="studio-tabs">
        <button
          className="button primary small"
          onClick={() => setEditing("new")}
        >
          <Plus size={15} /> {tr("قالب جديد", "New template")}
        </button>
        <button className="button subtle small" onClick={() => void load()}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />{" "}
          {tr("تحديث", "Refresh")}
        </button>
      </div>
      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Busy />
      ) : rows.length ? (
        <div className="studio-grid">
          {rows.map((row) => (
            <div key={row.id} className="studio-card">
              <h4>{row.title}</h4>
              <div className="studio-chips">
                {(row.variables || templateVariables(row.content)).map(
                  (name) => (
                    <span key={name} className="studio-chip">
                      {name}
                    </span>
                  ),
                )}
              </div>
              <small>{row.content.slice(0, 140)}</small>
              <div className="studio-actions">
                <button
                  className="button primary small"
                  onClick={() => setUsing(row)}
                >
                  {tr("استخدام", "Use")}
                </button>
                <button
                  className="button subtle small"
                  onClick={() => setEditing(row)}
                >
                  {tr("تعديل", "Edit")}
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
          <FileText size={30} />
          <p>
            {tr(
              "لا قوالب بعد. احفظ أي مخرج تكرّره، وضع أجزاءه المتغيّرة بين {{قوسين}}.",
              "No templates yet.",
            )}
          </p>
        </div>
      )}
      {editing && (
        <TemplateEditor
          template={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
      {using && (
        <TemplateRunner template={using} onClose={() => setUsing(null)} />
      )}
    </>
  );
}

function TemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template: Template | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { tr } = useAppearance();
  const [title, setTitle] = useState(template?.title || "");
  const [content, setContent] = useState(template?.content || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const variables = templateVariables(content);

  async function save() {
    if (!title.trim() || !content.trim()) {
      setError(tr("العنوان والمحتوى مطلوبان.", "Title and content are required."));
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (template)
        await api(
          `/api/studio/templates/${template.id}`,
          { title: title.trim(), content },
          { method: "PATCH" },
        );
      else await api("/api/studio/templates", { title: title.trim(), content });
      onSaved();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={template ? tr("تعديل القالب", "Edit template") : tr("قالب جديد", "New template")}
      onClose={onClose}
    >
      <div className="studio-form">
        <label>
          {tr("العنوان", "Title")}
          <input
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          {tr("المحتوى — ضع المتغيّرات بين {{قوسين}}", "Content")}
          <textarea
            rows={10}
            maxLength={100000}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={tr(
              "مرحباً {{اسم العميل}}، سعر {{الخدمة}} هو {{المبلغ}} ريال.",
              "Hello {{name}}…",
            )}
          />
        </label>
        {variables.length > 0 && (
          <div className="studio-chips">
            {variables.map((name) => (
              <span key={name} className="studio-chip">
                {name}
              </span>
            ))}
          </div>
        )}
        {error && <Notice>{error}</Notice>}
        <button
          className="button primary"
          disabled={busy}
          onClick={() => void save()}
        >
          <Save size={15} /> {busy ? tr("جارٍ الحفظ…", "Saving…") : tr("حفظ", "Save")}
        </button>
      </div>
    </Modal>
  );
}

function TemplateRunner({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  const { tr } = useAppearance();
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const variables = template.variables?.length
    ? template.variables
    : templateVariables(template.content);
  const result = applyTemplate(template.content, values);
  const missing = missingVariables(template.content, values);

  return (
    <Modal title={template.title} onClose={onClose}>
      <div className="studio-form">
        {variables.map((name) => (
          <label key={name}>
            {name}
            <input
              value={values[name] || ""}
              maxLength={400}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [name]: event.target.value,
                }))
              }
            />
          </label>
        ))}
        <div className="studio-output">{result}</div>
        {missing.length > 0 && (
          <Notice>
            {tr("بقيت حقول فارغة:", "Still empty:")} {missing.join("، ")}
          </Notice>
        )}
        <button
          className="button primary"
          onClick={() => {
            void navigator.clipboard?.writeText(result).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
        >
          <Copy size={15} />{" "}
          {copied ? tr("نُسخ", "Copied") : tr("نسخ النص", "Copy")}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- الصفحات

function Pages() {
  const { tr } = useAppearance();
  const [rows, setRows] = useState<PublishedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [bookings, setBookings] = useState<{
    page: PublishedPage;
    rows: Booking[];
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api<{ pages: PublishedPage[] }>("/api/studio/pages");
      setRows(result.pages || []);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(page: PublishedPage) {
    try {
      const result = await api<{ page: PublishedPage }>(
        `/api/studio/pages/${page.id}`,
        { published: !page.published },
        { method: "PATCH" },
      );
      setRows((current) =>
        current.map((row) => (row.id === page.id ? result.page : row)),
      );
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/studio/pages/${id}`, undefined, { method: "DELETE" });
      setRows((current) => current.filter((row) => row.id !== id));
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function openBookings(page: PublishedPage) {
    try {
      const result = await api<{ bookings: Booking[] }>(
        `/api/studio/pages/${page.id}/bookings`,
      );
      setBookings({ page, rows: result.bookings || [] });
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  return (
    <>
      <div className="studio-tabs">
        <button
          className="button primary small"
          onClick={() => setCreating(true)}
        >
          <Plus size={15} /> {tr("صفحة جديدة", "New page")}
        </button>
        <button className="button subtle small" onClick={() => void load()}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />{" "}
          {tr("تحديث", "Refresh")}
        </button>
      </div>
      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Busy />
      ) : rows.length ? (
        <div className="studio-grid">
          {rows.map((row) => (
            <div key={row.id} className="studio-card">
              <h4>{row.title}</h4>
              <small dir="ltr">/p/{row.slug}</small>
              <div className="studio-chips">
                <span className="studio-chip">
                  {row.kind === "booking"
                    ? tr("حجز", "Booking")
                    : row.kind === "landing"
                      ? tr("هبوط", "Landing")
                      : tr("تعريف", "Bio")}
                </span>
                <span className="studio-chip">
                  {row.published ? tr("منشورة", "Live") : tr("مخفية", "Hidden")}
                </span>
                <span className="studio-chip">
                  {tr("مشاهدات", "Views")}: {row.views}
                </span>
              </div>
              <div className="studio-actions">
                <a
                  className="button subtle small"
                  href={`/p/${encodeURIComponent(row.slug)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={14} /> {tr("فتح", "Open")}
                </a>
                {row.kind === "booking" && (
                  <button
                    className="button subtle small"
                    onClick={() => void openBookings(row)}
                  >
                    <Inbox size={14} /> {tr("الطلبات", "Requests")}
                  </button>
                )}
                <button
                  className="button subtle small"
                  onClick={() => void toggle(row)}
                >
                  {row.published ? tr("إخفاء", "Hide") : tr("نشر", "Publish")}
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
          <Globe size={30} />
          <p>
            {tr(
              "لا صفحات بعد. انشر صفحة تعريف أو صفحة حجز على رابط عام في دقيقة.",
              "No pages yet.",
            )}
          </p>
        </div>
      )}
      {creating && (
        <PageEditor
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void load();
          }}
        />
      )}
      {bookings && (
        <Modal
          title={`${tr("طلبات", "Requests")} · ${bookings.page.title}`}
          onClose={() => setBookings(null)}
        >
          {bookings.rows.length ? (
            <div className="studio-grid">
              {bookings.rows.map((row) => (
                <div key={row.id} className="studio-card">
                  <h4>{row.name}</h4>
                  <small dir="auto">{row.contact}</small>
                  {row.preferredAt && (
                    <small>
                      {tr("الموعد المفضل", "Preferred")}: {row.preferredAt}
                    </small>
                  )}
                  {row.message && <small>{row.message}</small>}
                  <small>{new Date(row.createdAt).toLocaleString("ar")}</small>
                </div>
              ))}
            </div>
          ) : (
            <p>{tr("لا طلبات بعد.", "No requests yet.")}</p>
          )}
        </Modal>
      )}
    </>
  );
}

function PageEditor({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { tr } = useAppearance();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [kind, setKind] = useState<PageKind>("bio");
  const [content, setContent] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!title.trim() || !content.trim()) {
      setError(tr("العنوان والمحتوى مطلوبان.", "Title and content are required."));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/studio/pages", {
        title: title.trim(),
        slug: slug.trim() || undefined,
        kind,
        content,
        contactEmail: contactEmail.trim(),
      });
      onSaved();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={tr("صفحة جديدة", "New page")} onClose={onClose}>
      <div className="studio-form">
        <label>
          {tr("العنوان", "Title")}
          <input
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          {tr("الرابط", "Address")}
          <input
            dir="ltr"
            maxLength={60}
            value={slug}
            placeholder={pageSlug(title) || "my-page"}
            onChange={(event) => setSlug(pageSlug(event.target.value))}
          />
        </label>
        <label>
          {tr("النوع", "Kind")}
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as PageKind)}
          >
            {PAGE_KINDS.map((value) => (
              <option key={value} value={value}>
                {value === "booking"
                  ? tr("صفحة حجز", "Booking")
                  : value === "landing"
                    ? tr("صفحة هبوط", "Landing")
                    : tr("صفحة تعريف", "Bio")}
              </option>
            ))}
          </select>
        </label>
        {kind === "booking" && (
          <label>
            {tr("بريد استقبال الطلبات", "Inbox for requests")}
            <input
              dir="ltr"
              type="email"
              maxLength={160}
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
            />
          </label>
        )}
        <label>
          {tr("المحتوى (HTML أو نص)", "Content (HTML or text)")}
          <textarea
            rows={10}
            maxLength={150000}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </label>
        {error && <Notice>{error}</Notice>}
        <button
          className="button primary"
          disabled={busy}
          onClick={() => void save()}
        >
          <Save size={15} />{" "}
          {busy ? tr("جارٍ النشر…", "Publishing…") : tr("نشر الصفحة", "Publish")}
        </button>
      </div>
    </Modal>
  );
}
