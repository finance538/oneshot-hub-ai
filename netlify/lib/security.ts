import { getUser } from "@netlify/identity";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";
import { sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import { requestLimits, auditEvents } from "../../db/schema.js";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "REQUEST_FAILED",
  ) {
    super(message);
  }
}
export const env = (key: string) => Netlify.env.get(key);
export async function authenticate(admin = false) {
  const user = await getUser();
  if (!user) throw new ApiError(401, "سجّل الدخول للمتابعة.", "AUTH_REQUIRED");
  if (admin && !user.roles?.includes("admin"))
    throw new ApiError(403, "هذه المساحة متاحة للمسؤول فقط.", "ADMIN_REQUIRED");
  return user;
}
export function assertOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    throw new ApiError(403, "مصدر الطلب غير مسموح.");
}
export function stringField(value: unknown, name: string, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new ApiError(400, `تحقق من حقل ${name}.`);
  return value.trim();
}
export function uuid(value: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new ApiError(400, "المعرّف غير صالح.");
  return value;
}
export async function payload(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "يتطلب الطلب JSON.");
  const raw = await req.text();
  if (raw.length > 32000)
    throw new ApiError(413, "حجم الطلب أكبر من الحد المسموح.");
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw 0;
    return data as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "تعذّر قراءة بيانات الطلب.");
  }
}
export async function limit(actor: string, action: string, max = 20) {
  const window = Math.floor(Date.now() / 60000),
    key = createHash("sha256")
      .update(`${actor}:${action}:${window}`)
      .digest("hex");
  const [row] = await database()
    .insert(requestLimits)
    .values({ key, expiresAt: new Date((window + 2) * 60000) })
    .onConflictDoUpdate({
      target: requestLimits.key,
      set: { count: sql`${requestLimits.count} + 1` },
    })
    .returning();
  if (row.count > max)
    throw new ApiError(
      429,
      "وصلت إلى الحد المؤقت للطلبات. حاول بعد دقيقة.",
      "RATE_LIMIT",
    );
}
function encryptionKey() {
  const value = env("VAULT_ENCRYPTION_KEY");
  if (!value || !/^[0-9a-f]{64}$/i.test(value))
    throw new ApiError(
      503,
      "خزنة المفاتيح بانتظار إعداد التشفير لدى مسؤول المشروع.",
      "VAULT_NOT_CONFIGURED",
    );
  return Buffer.from(value, "hex");
}
export function vaultReady() {
  const v = env("VAULT_ENCRYPTION_KEY");
  return !!v && /^[0-9a-f]{64}$/i.test(v);
}
export function webhookReady() {
  return (env("ONESHOT_WEBHOOK_SECRET")?.length || 0) >= 32;
}
export function encrypt(value: unknown, aad: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((x) => x.toString("base64"))
    .join(".");
}
export function decrypt(value: string, aad: string) {
  const [iv, tag, ciphertext] = value
    .split(".")
    .map((x) => Buffer.from(x, "base64"));
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(aad));
  cipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([cipher.update(ciphertext), cipher.final()]).toString("utf8"),
  );
}
export async function audit(actor: string, action: string, resource: string) {
  await database().insert(auditEvents).values({ actor, action, resource });
}
export function safeError(error: unknown) {
  return error instanceof ApiError
    ? { error: error.message, code: error.code }
    : {
        error: "تعذّر إتمام الطلب. أعد المحاولة لاحقاً أو راجع مسؤول المشروع.",
        code: "SERVICE_ERROR",
      };
}
