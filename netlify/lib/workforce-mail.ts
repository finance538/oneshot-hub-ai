import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { and, desc, eq, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import {
  workforceConnections as connections,
  workforceMail as mail,
} from "../../db/schema.js";
import { ApiError, payload, stringField, uuid } from "./security.js";
import {
  claimConnection,
  connectionConfig,
  emailAddress,
  ownedConnection,
  type MailConfig,
} from "./workforce-connections.js";
import { publicHost } from "./workforce-network.js";

async function imap(config: MailConfig) {
  const address = await publicHost(config.imapHost);
  const client = new ImapFlow({
    host: address.address,
    port: 993,
    secure: true,
    auth: { user: config.imapUser, pass: config.imapPassword },
    tls: { servername: config.imapHost, rejectUnauthorized: true },
    logger: false,
    emitLogs: false,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    disableAutoIdle: true,
  });
  client.on("error", () => {});
  return client;
}
async function smtp(config: MailConfig) {
  const address = await publicHost(config.smtpHost);
  return nodemailer.createTransport({
    host: address.address,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    requireTLS: true,
    auth: { user: config.smtpUser, pass: config.smtpPassword },
    tls: { servername: config.smtpHost, rejectUnauthorized: true },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}
export async function syncMailbox(org: string, id: string) {
  const row = await ownedConnection(org, id, "mail"),
    config = connectionConfig<MailConfig>(row),
    db = database();
  await claimConnection(id);
  let client: ImapFlow | undefined;
  // Bound scheduled work below the platform's 30-second window. Mark the
  // attempt before connecting so one interrupted mailbox cannot starve others.
  await db
    .update(connections)
    .set({ lastSyncAt: new Date() })
    .where(eq(connections.id, id));
  const deadline = setTimeout(() => client?.close(), 21000);
  try {
    client = await imap(config);
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    let imported = 0;
    try {
      const box = client.mailbox;
      if (box && box.exists) {
        // Bounded initial/current window; UIDVALIDITY prevents UID collisions after a mailbox reset.
        for await (const item of client.fetch(
          `${Math.max(1, box.exists - 29)}:*`,
          {
            uid: true,
            envelope: true,
            internalDate: true,
            source: { start: 0, maxLength: 120000 },
          },
        )) {
          if (!item.source) continue;
          const parsed = await simpleParser(item.source, {
            skipHtmlToText: false,
            skipTextToHtml: true,
            skipImageLinks: true,
          });
          const inserted = await db
            .insert(mail)
            .values({
              organizationId: org,
              connectionId: id,
              dedupeKey: `${id}:${box.uidValidity}:${item.uid}`,
              direction: "inbound",
              sender: parsed.from?.value[0]?.address || "unknown",
              recipient: config.email,
              subject: (parsed.subject || "(بلا عنوان)").slice(0, 500),
              body: (
                parsed.text ||
                "لا يوجد نص قابل للعرض؛ افتح الرسالة في مزود البريد."
              ).slice(0, 20000),
              messageId:
                parsed.messageId &&
                /^<[^<>\r\n]{1,480}>$/.test(parsed.messageId)
                  ? parsed.messageId
                  : null,
              status: "received",
              createdAt:
                item.internalDate instanceof Date &&
                Number.isFinite(item.internalDate.getTime())
                  ? item.internalDate
                  : new Date(),
            })
            .onConflictDoNothing()
            .returning({ id: mail.id });
          imported += inserted.length;
        }
      }
    } finally {
      lock.release();
    }
    await db
      .update(connections)
      .set({ status: "receiving", lastSyncAt: new Date() })
      .where(eq(connections.id, id));
    return { imported };
  } catch {
    await db
      .update(connections)
      .set({ status: "connection_error", lastSyncAt: new Date() })
      .where(eq(connections.id, id));
    throw new ApiError(
      502,
      "تعذر جلب البريد. تحقق من IMAP وكلمة مرور التطبيق وإتاحة الاتصال.",
      "MAIL_CONNECTION_FAILED",
    );
  } finally {
    clearTimeout(deadline);
    client?.close();
    await db
      .update(connections)
      .set({ leaseUntil: null })
      .where(eq(connections.id, id));
  }
}
export async function createMailDraft(
  org: string,
  body: Record<string, unknown>,
  key: string,
) {
  const db = database(),
    connection = await ownedConnection(org, String(body.connectionId), "mail"),
    config = connectionConfig<MailConfig>(connection);
  const recipient = emailAddress(body.recipient),
    subject = stringField(body.subject, "عنوان الرسالة", 500),
    content = stringField(body.body, "نص الرسالة", 20000);
  if (/[\r\n]/.test(subject))
    throw new ApiError(400, "عنوان الرسالة يجب أن يكون سطراً واحداً.");
  let inReplyTo: string | null = null;
  if (body.replyId) {
    const [source] = await db
      .select()
      .from(mail)
      .where(
        and(
          eq(mail.id, uuid(String(body.replyId))),
          eq(mail.organizationId, org),
          eq(mail.connectionId, connection.id),
          eq(mail.direction, "inbound"),
        ),
      );
    if (!source || source.sender !== recipient)
      throw new ApiError(400, "الرد لا يطابق الرسالة الأصلية.");
    inReplyTo = source.messageId;
  }
  const [row] = await db
    .insert(mail)
    .values({
      organizationId: org,
      connectionId: connection.id,
      dedupeKey: `${org}:draft:${key}`,
      direction: "outbound",
      sender: config.email,
      recipient,
      subject,
      body: content,
      inReplyTo,
      status: "draft",
      updatedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();
  if (row) return row;
  const [existing] = await db
    .select()
    .from(mail)
    .where(eq(mail.dedupeKey, `${org}:draft:${key}`));
  if (
    !existing ||
    existing.recipient !== recipient ||
    existing.subject !== subject ||
    existing.body !== content ||
    existing.connectionId !== connection.id ||
    existing.inReplyTo !== inReplyTo
  )
    throw new ApiError(409, "هذا الطلب محفوظ بمحتوى مختلف.");
  return existing;
}
export async function mailRoute(req: Request, path: string, org: string) {
  const db = database();
  if (path === "/api/workforce/mail" && req.method === "GET") {
    // A process that vanished after SMTP might already have sent the message. Never retry it automatically.
    await db
      .update(mail)
      .set({ status: "unknown", updatedAt: new Date() })
      .where(
        and(
          eq(mail.organizationId, org),
          eq(mail.status, "sending"),
          sql`${mail.updatedAt} < now() - interval '2 minutes'`,
        ),
      );
    return {
      messages: await db
        .select()
        .from(mail)
        .where(eq(mail.organizationId, org))
        .orderBy(desc(mail.createdAt))
        .limit(100),
    };
  }
  if (path === "/api/workforce/mail/draft" && req.method === "POST") {
    const body = await payload(req);
    return {
      message: await createMailDraft(org, body, uuid(String(body.requestKey))),
    };
  }
  const edit = path.match(/\/mail\/([^/]+)\/draft$/);
  if (edit && req.method === "PATCH") {
    const body = await payload(req),
      recipient = emailAddress(body.recipient),
      subject = stringField(body.subject, "عنوان الرسالة", 500);
    if (/[\r\n]/.test(subject))
      throw new ApiError(400, "العنوان يجب أن يكون سطراً واحداً.");
    const [message] = await db
      .update(mail)
      .set({
        recipient,
        subject,
        body: stringField(body.body, "نص الرسالة", 20000),
        inReplyTo: sql`case when ${mail.recipient} = ${recipient} then ${mail.inReplyTo} else null end`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(mail.id, uuid(edit[1])),
          eq(mail.organizationId, org),
          eq(mail.status, "draft"),
          sql`${mail.updatedAt} = ${String(body.updatedAt)}::timestamptz`,
        ),
      )
      .returning();
    if (!message) throw new ApiError(409, "تغيرت المسودة؛ حدّثها قبل التعديل.");
    return { message };
  }
  const sync = path.match(/\/mail\/sync\/([^/]+)$/);
  if (sync && req.method === "POST") return syncMailbox(org, uuid(sync[1]));
  const verify = path.match(/\/mail\/verify\/([^/]+)$/);
  if (verify && req.method === "POST") {
    const row = await ownedConnection(org, verify[1], "mail"),
      transport = await smtp(connectionConfig<MailConfig>(row));
    try {
      await transport.verify();
    } catch {
      throw new ApiError(
        502,
        "تعذر الاتصال بخادم الإرسال. تحقق من SMTP وكلمة مرور التطبيق.",
      );
    } finally {
      transport.close();
    }
    const result = await syncMailbox(org, row.id);
    await db
      .update(connections)
      .set({ status: "connected" })
      .where(eq(connections.id, row.id));
    return { ...result, verified: true };
  }
  const match = path.match(/\/mail\/([^/]+)\/(send|reconcile)$/);
  if (!match || req.method !== "POST")
    throw new ApiError(404, "مسار البريد غير متاح.");
  const [row] = await db
    .select()
    .from(mail)
    .where(
      and(
        eq(mail.id, uuid(match[1])),
        eq(mail.organizationId, org),
        eq(mail.direction, "outbound"),
      ),
    );
  if (!row) throw new ApiError(404, "الرسالة غير متاحة.");
  const connection = await ownedConnection(org, row.connectionId, "mail"),
    config = connectionConfig<MailConfig>(connection);
  if (match[2] === "reconcile") {
    if (row.status !== "unknown" || !row.messageId) return { message: row };
    const client = await imap(config);
    try {
      await client.connect();
      const boxes = await client.list();
      const sent = boxes.find((b) => b.specialUse === "\\Sent");
      if (!sent)
        throw new ApiError(
          409,
          "لا يوجد مجلد مرسل يمكن مطابقته. راجع مزود البريد؛ لا تُعد الإرسال تلقائياً.",
        );
      const lock = await client.getMailboxLock(sent.path);
      try {
        const found = await client.search(
          { header: { "message-id": row.messageId } },
          { uid: true },
        );
        if (found && found.length) {
          const [updated] = await db
            .update(mail)
            .set({ status: "sent", updatedAt: new Date() })
            .where(and(eq(mail.id, row.id), eq(mail.status, "unknown")))
            .returning();
          return { message: updated || row };
        }
        return {
          message: row,
          note: "لم يظهر تأكيد في مجلد المرسل. بعض خوادم SMTP لا تحفظ نسخة؛ النتيجة تبقى غير مؤكدة.",
        };
      } finally {
        lock.release();
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, "تعذر التحقق من المرسل؛ بقيت النتيجة غير مؤكدة.");
    } finally {
      client.close();
    }
  }
  const body = await payload(req);
  if (body.approved !== true)
    throw new ApiError(400, "اعتمد الرسالة المعروضة قبل الإرسال.");
  if (row.status !== "draft") return { message: row };
  if (
    body.recipient !== row.recipient ||
    body.subject !== row.subject ||
    body.body !== row.body
  )
    throw new ApiError(
      409,
      "تغير محتوى الرسالة؛ راجع النسخة الحالية قبل اعتمادها.",
    );
  await claimConnection(connection.id);
  let transport: Awaited<ReturnType<typeof smtp>> | undefined;
  try {
    transport = await smtp(config);
    try {
      await transport.verify();
    } catch {
      throw new ApiError(
        502,
        "لم يبدأ الإرسال. تعذر الاتصال بخادم SMTP؛ المسودة محفوظة.",
      );
    }
    const messageId = `<${row.id}@${config.email.split("@")[1]}>`;
    const [claimed] = await db
      .update(mail)
      .set({
        status: "sending",
        approvedAt: new Date(),
        updatedAt: new Date(),
        messageId,
      })
      .where(
        and(
          eq(mail.id, row.id),
          eq(mail.status, "draft"),
          eq(mail.updatedAt, row.updatedAt),
        ),
      )
      .returning();
    if (!claimed)
      throw new ApiError(409, "الرسالة قيد الإرسال أو سبق تنفيذها.");
    let status = "unknown";
    try {
      const info = await transport.sendMail({
        from: config.email,
        to: row.recipient,
        subject: row.subject,
        text: row.body,
        messageId,
        ...(row.inReplyTo
          ? { inReplyTo: row.inReplyTo, references: [row.inReplyTo] }
          : {}),
      });
      if (info.accepted?.length) status = "sent";
      else if (info.rejected?.length) status = "rejected";
    } catch {
      /* SMTP can accept DATA before a timeout: preserve uncertainty. */
    }
    const [updated] = await db
      .update(mail)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(mail.id, row.id), eq(mail.status, "sending")))
      .returning();
    return { message: updated || claimed };
  } finally {
    transport?.close();
    await db
      .update(connections)
      .set({ leaseUntil: null })
      .where(eq(connections.id, connection.id));
  }
}
