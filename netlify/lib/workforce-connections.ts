import { and, eq, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import { workforceConnections as connections } from "../../db/schema.js";
import {
  ApiError,
  decrypt,
  encrypt,
  payload,
  stringField,
  uuid,
  vaultReady,
} from "./security.js";
import { publicHost, publicUrl } from "./workforce-network.js";
export type MailConfig = {
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
};
export type PortalConfig = { url: string; username: string; password: string };
export const aad = (org: string, id: string, kind: string) =>
  `workforce:${org}:${id}:${kind}:v1`;
export function emailAddress(value: unknown) {
  const address = stringField(value, "البريد", 254);
  if (
    !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(address) ||
    /[\r\n]/.test(address)
  )
    throw new ApiError(400, "عنوان البريد غير صالح.");
  return address;
}
function secret(value: unknown) {
  if (typeof value !== "string" || !value || value.length > 2048)
    throw new ApiError(400, "أدخل كلمة المرور.");
  return value;
}
export async function ownedConnection(org: string, id: string, kind?: string) {
  const [row] = await database()
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.id, uuid(id)),
        eq(connections.organizationId, org),
        kind ? eq(connections.kind, kind) : undefined,
      ),
    );
  if (!row) throw new ApiError(404, "الحساب غير متاح.");
  return row;
}
export function connectionConfig<T>(row: typeof connections.$inferSelect): T {
  return decrypt(
    row.encryptedConfig,
    aad(row.organizationId, row.id, row.kind),
  ) as T;
}
export async function claimConnection(id: string, seconds = 55) {
  const [row] = await database()
    .update(connections)
    .set({ leaseUntil: new Date(Date.now() + seconds * 1000) })
    .where(
      and(
        eq(connections.id, id),
        sql`(${connections.leaseUntil} is null or ${connections.leaseUntil} < now())`,
      ),
    )
    .returning({ id: connections.id });
  if (!row)
    throw new ApiError(409, "الحساب ينفذ عملية حالياً. انتظر تحديث الحالة.");
}
export async function connectionsRoute(
  req: Request,
  path: string,
  org: string,
) {
  const db = database(),
    match = path.match(/\/connections\/([^/]+)(?:\/(disconnect))?$/);
  if (req.method === "GET") {
    await db
      .update(connections)
      .set({
        encryptedSession: null,
        sessionExpiresAt: null,
        status: "session_closed",
      })
      .where(
        and(
          eq(connections.organizationId, org),
          sql`${connections.sessionExpiresAt} < now()`,
          sql`(${connections.leaseUntil} is null or ${connections.leaseUntil} < now())`,
        ),
      );
    return {
      vaultReady: vaultReady(),
      connections: await db
        .select({
          id: connections.id,
          kind: connections.kind,
          label: connections.label,
          origin: connections.origin,
          status: connections.status,
          keepSession: connections.keepSession,
          syncEnabled: connections.syncEnabled,
          lastSyncAt: connections.lastSyncAt,
          sessionExpiresAt: connections.sessionExpiresAt,
        })
        .from(connections)
        .where(eq(connections.organizationId, org)),
    };
  }
  if (match) {
    const row = await ownedConnection(org, match[1]);
    if (match[2] && req.method === "POST") {
      await claimConnection(row.id);
      await db
        .update(connections)
        .set({
          encryptedSession: null,
          sessionExpiresAt: null,
          keepSession: false,
          leaseUntil: null,
          status: "saved",
        })
        .where(eq(connections.id, row.id));
      return { disconnected: true };
    }
    if (req.method === "DELETE") {
      await claimConnection(row.id);
      await db.delete(connections).where(eq(connections.id, row.id));
      return { deleted: true };
    }
    throw new ApiError(405, "إجراء غير مدعوم.");
  }
  if (req.method !== "POST") throw new ApiError(405, "إجراء غير مدعوم.");
  const body = await payload(req),
    id = crypto.randomUUID(),
    kind = String(body.kind);
  let config: MailConfig | PortalConfig,
    origin = "";
  if (kind === "mail") {
    config = {
      email: emailAddress(body.email),
      smtpHost: stringField(body.smtpHost, "SMTP"),
      smtpPort: Number(body.smtpPort),
      smtpUser: stringField(body.smtpUser, "المستخدم"),
      smtpPassword: secret(body.smtpPassword),
      imapHost: stringField(body.imapHost, "IMAP"),
      imapPort: 993,
      imapUser: stringField(body.imapUser, "المستخدم"),
      imapPassword: secret(body.imapPassword),
    };
    if (![465, 587].includes(config.smtpPort))
      throw new ApiError(400, "اختر SMTP 465 أو 587 مع TLS.");
    await Promise.all([
      publicHost(config.smtpHost),
      publicHost(config.imapHost),
    ]);
    origin = config.email;
  } else if (kind === "portal") {
    const url = publicUrl(stringField(body.url, "رابط المنصة", 1500));
    await publicHost(url.hostname);
    config = {
      url: url.href,
      username: stringField(body.username, "المستخدم", 254),
      password: secret(body.password),
    };
    origin = url.origin;
  } else throw new ApiError(400, "نوع حساب غير مدعوم.");
  await db.insert(connections).values({
    id,
    organizationId: org,
    kind,
    label: stringField(body.label, "اسم الحساب", 80),
    origin,
    encryptedConfig: encrypt(config, aad(org, id, kind)),
    keepSession: kind === "portal" && body.keepSession === true,
    syncEnabled: kind === "mail" && body.syncEnabled !== false,
  });
  return { id, status: "saved" };
}
