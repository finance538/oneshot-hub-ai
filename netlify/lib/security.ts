import { getUser, type User } from "@netlify/identity";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import {
  requestLimits,
  auditEvents,
  ecosystemGrants,
} from "../../db/schema.js";
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

const tokenUserCache = new Map<string, { user: User; expires: number }>();

export async function resolveUserFromToken(req: Request): Promise<User | null> {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  let token = authHeader.slice(7).trim();
  if (token.startsWith("osh_")) {
    if (!/^osh_[A-Za-z0-9_-]{43}$/.test(token)) return null;
    // Ecosystem sessions are accepted only by the central backend, and only
    // from the exact browser origin to which the one-time grant was bound.
    if (new URL(req.url).origin !== "https://www.1shotcam.com") return null;
    try {
      const digest = createHash("sha256").update(token).digest("base64url");
      const [grant] = await database()
        .select()
        .from(ecosystemGrants)
        .where(
          and(
            eq(ecosystemGrants.sessionHash, digest),
            eq(ecosystemGrants.audience, req.headers.get("origin") || ""),
            gt(ecosystemGrants.sessionExpiresAt, new Date()),
          ),
        );
      if (!grant) return null;
      const saved = decrypt(
        grant.encryptedToken,
        `ecosystem:${grant.codeHash}:${grant.audience}`,
      );
      if (typeof saved?.token !== "string" || saved.token.startsWith("osh_"))
        return null;
      token = saved.token;
    } catch {
      return null;
    }
  }
  if (!token) return null;

  const now = Date.now();
  const cached = tokenUserCache.get(token);
  if (cached && cached.expires > now) {
    return cached.user;
  }

  try {
    const origin = new URL(req.url).origin;
    const identityUrl = `${origin}/.netlify/identity/user`;
    const res = await fetch(identityUrl, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      id?: string;
      email?: string;
      app_metadata?: { roles?: string[]; provider?: string };
      user_metadata?: { full_name?: string; name?: string };
      created_at?: string;
      updated_at?: string;
      confirmed_at?: string;
    };
    if (!data?.id) return null;

    const appMeta = data.app_metadata || {};
    const userMeta = data.user_metadata || {};
    const roles = Array.isArray(appMeta.roles)
      ? (appMeta.roles as string[])
      : typeof appMeta.roles === "string"
        ? [appMeta.roles]
        : [];
    const name =
      typeof userMeta.full_name === "string"
        ? userMeta.full_name
        : typeof userMeta.name === "string"
          ? userMeta.name
          : undefined;

    const user: User = {
      id: data.id,
      email: data.email,
      name,
      roles,
      userMetadata: userMeta,
      appMetadata: appMeta,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      confirmedAt: data.confirmed_at,
    };

    if (tokenUserCache.size > 200) {
      for (const [k, v] of tokenUserCache.entries()) {
        if (v.expires <= now) tokenUserCache.delete(k);
      }
    }
    tokenUserCache.set(token, { user, expires: now + 45000 });
    return user;
  } catch {
    return null;
  }
}

export async function resolveUser(req?: Request): Promise<User | null> {
  // Explicit bearer credentials must never fall back to a different cookie account.
  if (req?.headers.has("authorization")) return resolveUserFromToken(req);
  const cookieUser = await getUser();
  if (cookieUser) return cookieUser;
  if (req) return resolveUserFromToken(req);
  return null;
}

export async function authenticate(
  arg1?: Request | boolean,
  arg2?: Request | boolean,
): Promise<User> {
  const req =
    arg1 instanceof Request ? arg1 : arg2 instanceof Request ? arg2 : undefined;
  const admin =
    typeof arg1 === "boolean" ? arg1 : typeof arg2 === "boolean" ? arg2 : false;
  const user = await resolveUser(req);
  if (!user) throw new ApiError(401, "سجّل الدخول للمتابعة.", "AUTH_REQUIRED");
  if (admin && !user.roles?.includes("admin"))
    throw new ApiError(403, "هذه المساحة متاحة للمسؤول فقط.", "ADMIN_REQUIRED");
  return user;
}

const BUILTIN_ALLOWED_ORIGINS = new Set([
  "https://1shotcam.com",
  "https://www.1shotcam.com",
  "https://ai.1shotcam.com",
  "https://app.1shotcam.com",
  "https://portal.1shotcam.com",
  "https://pay.1shotcam.com",
  "https://admin.1shotcam.com",
  "https://workflow.1shotcam.com",
  "https://brand.1shotcam.com",
  "https://loader.1shotcam.com",
  "https://1shotcam-ecosystem.netlify.app",
]);

export function isAllowedOrigin(
  origin: string | null,
  reqUrl: string,
): boolean {
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const selfOrigin = new URL(reqUrl).origin;
    if (originUrl.origin === selfOrigin) return true;
    if (BUILTIN_ALLOWED_ORIGINS.has(originUrl.origin)) return true;

    const configured = env("ALLOWED_ORIGINS") || env("CORS_ALLOWED_ORIGINS");
    if (configured) {
      const list = configured.split(/[\s,]+/).filter(Boolean);
      if (list.includes(originUrl.origin)) return true;
    }

    if (
      originUrl.hostname.endsWith("--1shotcam-ecosystem.netlify.app") ||
      originUrl.hostname === "1shotcam-ecosystem.netlify.app"
    ) {
      return true;
    }

    if (
      env("CONTEXT") !== "production" &&
      (originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1")
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function assertOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !isAllowedOrigin(origin, req.url))
    throw new ApiError(403, "مصدر الطلب غير مسموح.");
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (origin && isAllowedOrigin(origin, req.url)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Idempotency-Key, X-Request-Id",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  }
  return {};
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
export async function payload(req: Request, maxLength = 32000) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "يتطلب الطلب JSON.");
  const raw = await req.text();
  if (raw.length > maxLength)
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
