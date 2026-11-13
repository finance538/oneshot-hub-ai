import type { OAuth2Client } from "google-auth-library";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import { followUps } from "../../db/schema.js";
import { ownerMailClient } from "./google-workspace.js";
import { geminiClient } from "./gemini.js";
import { defaultDraft } from "../../shared/follow-ups.js";
import { stripSystemNotices } from "./output-hygiene.js";

/**
 * متابعة العروض عبر بريد المالك — تستقبل، ترسل، وتردّ عنه حين يسمح بذلك.
 *
 * الحدود التي لا تُكسر:
 * - لا شيء يُرسل إلا إذا فعّل المالك ذلك على العرض نفسه (autoSend / autoReply).
 * - لا يُرسل إلا إلى عنوان العميل المحفوظ في السجل — لا إلى من ظهر في رسالة.
 * - MAX_MESSAGES سقف لعدد رسائل المنصة في العرض الواحد، فلا تتحوّل المتابعة
 *   إلى إزعاج ولا تدخل حلقة ردّ آلي مع ردّ آلي.
 * - لا نرسل إلى عناوين لا تستقبل رداً (no-reply, mailer-daemon…).
 * - الردّ يُكتب من نص العميل وموضوع العرض فقط، وتُنقّى مخرجاته قبل الإرسال.
 */

const MAX_MESSAGES = 3;
const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;
const UNREPLYABLE = /(^|[.\-_+])(no[-_.]?reply|donotreply|mailer[-_]?daemon|postmaster|bounce)/i;

export const mailable = (address: string) =>
  EMAIL.test(address) && !UNREPLYABLE.test(address.split("@")[0]);

interface GmailMessage {
  id: string;
  threadId: string;
  payload?: { headers?: { name: string; value: string }[] };
  snippet?: string;
  internalDate?: string;
}

const header = (message: GmailMessage, name: string) =>
  message.payload?.headers?.find(
    (item) => item.name.toLowerCase() === name.toLowerCase(),
  )?.value || "";

/** ترميز عنوان الرسالة: العربية لا تمرّ في ترويسة إلا مُرمَّزة. */
const encodeSubject = (value: string) =>
  /^[\x20-\x7e]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;

function rfc822(options: {
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
}) {
  const lines = [
    `From: ${options.from}`,
    `To: ${options.to}`,
    `Subject: ${encodeSubject(options.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];
  if (options.inReplyTo) {
    lines.push(`In-Reply-To: ${options.inReplyTo}`);
    lines.push(`References: ${options.inReplyTo}`);
  }
  const body = Buffer.from(options.body, "utf8").toString("base64");
  return Buffer.from(`${lines.join("\r\n")}\r\n\r\n${body}`, "utf8").toString(
    "base64url",
  );
}

async function send(
  client: OAuth2Client,
  raw: string,
  threadId?: string,
): Promise<{ id: string; threadId: string }> {
  const response = await client.request<{ id: string; threadId: string }>({
    url: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    method: "POST",
    data: threadId ? { raw, threadId } : { raw },
    timeout: 20000,
  });
  return response.data;
}

/** محادثة العرض في Gmail، إن كان المالك أرسله من بريده. */
async function findThread(
  client: OAuth2Client,
  contact: string,
  subject: string,
) {
  const query = `to:${contact} subject:"${subject.replace(/"/g, "")}" newer_than:90d`;
  const response = await client.request<{ messages?: GmailMessage[] }>({
    url: "https://gmail.googleapis.com/gmail/v1/users/me/messages",
    params: { q: query, maxResults: 1 },
    timeout: 15000,
  });
  return response.data.messages?.[0]?.threadId || "";
}

/** آخر رسالة من العميل في المحادثة بعد تاريخ إرسالنا. */
async function clientReply(
  client: OAuth2Client,
  threadId: string,
  ownerEmail: string,
  after: Date,
) {
  const response = await client.request<{ messages?: GmailMessage[] }>({
    url: `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}`,
    params: { format: "metadata", metadataHeaders: ["From", "Subject", "Message-ID"] },
    timeout: 15000,
  });
  const messages = response.data.messages || [];
  for (const message of messages.reverse()) {
    const when = Number(message.internalDate || 0);
    if (!when || when <= after.getTime()) continue;
    const from = header(message, "From").toLowerCase();
    if (from.includes(ownerEmail.toLowerCase())) continue;
    return {
      snippet: (message.snippet || "").slice(0, 1500),
      messageId: header(message, "Message-ID"),
      at: new Date(when),
    };
  }
  return null;
}

/** نص المتابعة أو الردّ. النموذج يكتبه، وإن تعذّر فالمسودة المكتوبة تكفي. */
async function compose(options: {
  subject: string;
  kind: "nudge" | "reply";
  clientText?: string;
  ownerEmail: string;
}) {
  const brief =
    options.kind === "nudge"
      ? `اكتب رسالة متابعة قصيرة ومهذّبة بالعربية بخصوص «${options.subject}». لا تضغط على العميل، ولا تخترع سعراً ولا موعداً ولا تفاصيل لم تُذكر، ولا تعتذر كثيراً. اذكر أنك جاهز لأي استفسار أو تعديل. بلا عنوان رسالة وبلا توقيع باسم شخص.`
      : `ردّ بالعربية على رسالة عميل وصلت بخصوص «${options.subject}». نص رسالته:\n"""${options.clientText || ""}"""\nاجب عمّا سأل عنه بما تعرفه من موضوع العرض فقط. إن سأل عن سعر أو موعد أو تفصيل لا تعرفه، قل إنك ستعود إليه بالتفصيل بدل أن تخترعه. بلا عنوان رسالة وبلا توقيع باسم شخص.`;
  try {
    const response = await geminiClient().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: brief }] }],
      config: { maxOutputTokens: 700, httpOptions: { timeout: 20000 } },
    });
    const text = stripSystemNotices((response.text || "").trim());
    if (text.length > 30) return text.slice(0, 2500);
  } catch {
    // لا شيء: المسودة المكتوبة أدناه هي الأرضية.
  }
  return defaultDraft(options.subject, "ar");
}

/**
 * دورة واحدة على متابعات مالك واحد: تلتقط الردود، وترسل ما حلّ موعده إن أذن
 * المالك. تُعيد ما فعلته لتُسجَّل في لوحة المالك لا في رأس أحد.
 */
export async function runOwnerFollowUps(ownerId: string, deadline = 0) {
  const mail = await ownerMailClient(ownerId);
  if (!mail) return { skipped: "mail_not_connected" as const };
  const db = database();
  const rows = await db
    .select()
    .from(followUps)
    .where(
      and(
        eq(followUps.ownerId, ownerId),
        inArray(followUps.status, ["waiting", "due"]),
        ne(followUps.contactEmail, ""),
      ),
    )
    .orderBy(desc(followUps.sentAt))
    .limit(10);

  let replies = 0,
    sent = 0;
  for (const row of rows) {
    // مهلة الدالة المجدولة قصيرة: ما لم يُفحص الآن يُفحص في الدورة القادمة،
    // وترتيب الفحص يبدأ بأقدم ما فُحص فلا يُهمل عرض.
    if (deadline && Date.now() > deadline) break;
    if (!mailable(row.contactEmail)) continue;
    try {
      let threadId = row.threadId;
      if (!threadId)
        threadId = await findThread(mail.client, row.contactEmail, row.subject);

      // أولاً: هل ردّ العميل؟ ردّ واحد يُسكت كل تنبيه.
      const reply = threadId
        ? await clientReply(mail.client, threadId, mail.email, row.sentAt)
        : null;
      if (reply) {
        replies += 1;
        let draft = row.draft;
        if (row.autoReply && row.messagesSent < MAX_MESSAGES) {
          const text = await compose({
            subject: row.subject,
            kind: "reply",
            clientText: reply.snippet,
            ownerEmail: mail.email,
          });
          await send(
            mail.client,
            rfc822({
              from: mail.email,
              to: row.contactEmail,
              subject: `Re: ${row.subject}`,
              body: text,
              inReplyTo: reply.messageId,
            }),
            threadId,
          );
          sent += 1;
          draft = text;
        } else {
          // بلا إذن بالردّ: نجهّز النص ليقرأه المالك ويرسله بنفسه.
          draft = await compose({
            subject: row.subject,
            kind: "reply",
            clientText: reply.snippet,
            ownerEmail: mail.email,
          });
        }
        await db
          .update(followUps)
          .set({
            status: "replied",
            threadId,
            draft,
            lastReplyAt: reply.at,
            checkedAt: new Date(),
            messagesSent: row.messagesSent + (row.autoReply ? 1 : 0),
            updatedAt: new Date(),
          })
          .where(eq(followUps.id, row.id));
        continue;
      }

      const due =
        Date.now() - row.sentAt.getTime() >=
        row.remindAfterDays * 86_400_000;
      if (!due) {
        if (threadId !== row.threadId)
          await db
            .update(followUps)
            .set({ threadId, checkedAt: new Date() })
            .where(eq(followUps.id, row.id));
        continue;
      }

      if (!row.autoSend || row.messagesSent >= MAX_MESSAGES) {
        await db
          .update(followUps)
          .set({ status: "due", threadId, checkedAt: new Date() })
          .where(eq(followUps.id, row.id));
        continue;
      }

      const text = await compose({
        subject: row.subject,
        kind: "nudge",
        ownerEmail: mail.email,
      });
      const result = await send(
        mail.client,
        rfc822({
          from: mail.email,
          to: row.contactEmail,
          subject: threadId ? `Re: ${row.subject}` : row.subject,
          body: text,
        }),
        threadId || undefined,
      );
      sent += 1;
      await db
        .update(followUps)
        .set({
          // أُرسلت متابعة: العدّاد يبدأ من جديد وتعود الحالة إلى الانتظار.
          status: "waiting",
          threadId: result.threadId || threadId,
          draft: text,
          sentAt: new Date(),
          messagesSent: row.messagesSent + 1,
          checkedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(followUps.id, row.id));
    } catch (error) {
      // عرض واحد يفشل لا يوقف الباقي؛ ولا نكرر الإرسال على شكّ.
      console.error("follow-up", row.id, (error as Error)?.message);
      await db
        .update(followUps)
        .set({ checkedAt: new Date() })
        .where(eq(followUps.id, row.id));
    }
  }
  return { replies, sent, checked: rows.length };
}

/** المالكون الذين لديهم متابعات قائمة الآن. */
export async function ownersWithFollowUps(max = 20) {
  const rows = await database()
    .select({ ownerId: followUps.ownerId })
    .from(followUps)
    .where(inArray(followUps.status, ["waiting", "due"]))
    .groupBy(followUps.ownerId)
    .orderBy(sql`min(${followUps.checkedAt}) nulls first`)
    .limit(max);
  return rows.map((row) => row.ownerId);
}
