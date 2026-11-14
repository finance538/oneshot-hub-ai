import { OAuth2Client, type Credentials } from "google-auth-library";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { admin, getSettings, type User } from "@netlify/identity";
import { and, eq, gt, lt } from "drizzle-orm";
import { database } from "../../db/index.js";
import {
  googleOAuthStates,
  googleWorkspaceConnections,
} from "../../db/schema.js";
import {
  authReturnUrl,
  productionOrigin,
  registeredSsoClients,
  sharedCookieAttributes,
} from "../../shared/auth-policy.js";
import { ecosystemApps, hubOrigin } from "../../shared/ecosystem.js";
import { ApiError, authenticate, env, limit, payload } from "./security.js";
import { cookieValue, createSharedSession, digest } from "./shared-session.js";
import { persistOwnerRole } from "./identity-owner.js";

const driveScope = "https://www.googleapis.com/auth/drive.metadata.readonly";
const baseScopes = ["openid", "email", "profile"];
// البريد للمتابعات: قراءة الرد، وإرسال رسالة واحدة في نفس المحادثة. لا حذف
// ولا تعديل ولا وصول كامل للصندوق.
export const gmailReadScope = "https://www.googleapis.com/auth/gmail.readonly";
export const gmailSendScope = "https://www.googleapis.com/auth/gmail.send";
function tokenKey() {
  const value = env("GOOGLE_TOKEN_KEY");
  if (!value || !/^[a-f0-9]{64}$/i.test(value))
    throw new ApiError(
      503,
      "تشفير اتصال Google بانتظار الإعداد.",
      "GOOGLE_NOT_CONFIGURED",
    );
  return Buffer.from(value, "hex");
}
export function googleReady() {
  return (
    !!env("GOOGLE_CLIENT_ID") &&
    !!env("GOOGLE_CLIENT_SECRET") &&
    /^[a-f0-9]{64}$/i.test(env("GOOGLE_TOKEN_KEY") || "")
  );
}
function seal(value: unknown, aad: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  cipher.setAAD(Buffer.from(aad));
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), data]
    .map((part) => part.toString("base64url"))
    .join(".");
}
function open<T>(value: string, aad: string): T {
  const [iv, tag, data] = value
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", tokenKey(), iv);
  cipher.setAAD(Buffer.from(aad));
  cipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8"),
  ) as T;
}
function google(req: Request) {
  if (!googleReady())
    throw new ApiError(
      503,
      "اتصال Google بانتظار الإعداد.",
      "GOOGLE_NOT_CONFIGURED",
    );
  const origin = new URL(req.url).origin;
  // All production apps use one registered Google callback, then return home.
  const issuer = productionOrigin(origin) ? hubOrigin : origin;
  return new OAuth2Client({
    clientId: env("GOOGLE_CLIENT_ID"),
    clientSecret: env("GOOGLE_CLIENT_SECRET"),
    redirectUri: `${issuer}/api/auth/google/callback`,
  });
}
function checkedReturn(req: Request, value: unknown) {
  const issuer = new URL(req.url).origin;
  const destination = authReturnUrl(value, issuer);
  if (!destination) throw new ApiError(400, "رابط العودة غير مسموح.");
  const app = ecosystemApps.find(
    (app) => app.origin === new URL(destination).origin && app.id !== "hub",
  );
  if (app && !registeredSsoClients(env("ONESHOT_SSO_CLIENTS")).includes(app.id))
    throw new ApiError(
      409,
      "الدخول المشترك غير مفعّل لهذا التطبيق.",
      "SSO_NOT_ENABLED",
    );
  return destination;
}
function redirect(location: string, cookies: string[] = []) {
  const headers = new Headers({
    Location: location,
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}
async function start(
  req: Request,
  purpose: "login" | "workspace" | "gmail",
  returnTo: unknown,
  ownerId?: string,
) {
  const destination = checkedReturn(req, returnTo),
    client = google(req);
  await limit(
    ownerId || `google:${Netlify.context?.ip || "unknown"}`,
    "google_start",
    12,
  );
  const state = randomBytes(32).toString("base64url"),
    browser = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url"),
    nonce = randomBytes(32).toString("base64url");
  const stateHash = digest(state);
  await database()
    .delete(googleOAuthStates)
    .where(lt(googleOAuthStates.expiresAt, new Date()));
  await database()
    .insert(googleOAuthStates)
    .values({
      stateHash,
      browserHash: digest(browser),
      ownerId,
      purpose,
      returnTo: destination,
      nonceHash: digest(nonce),
      encryptedVerifier: seal({ verifier }, `google-state:${stateHash}`),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });
  const authorization = client.generateAuthUrl({
    state,
    nonce,
    scope:
      purpose === "gmail"
        ? [...baseScopes, driveScope, gmailReadScope, gmailSendScope]
        : purpose === "workspace"
          ? [...baseScopes, driveScope]
          : baseScopes,
    // الموافقة تراكمية: ما مُنح سابقاً لا يُفقد عند طلب نطاق جديد.
    include_granted_scopes: purpose === "login" ? undefined : true,
    access_type: purpose === "login" ? "online" : "offline",
    prompt: purpose === "login" ? "select_account" : "consent",
    code_challenge: digest(verifier),
    code_challenge_method:
      "S256" as import("google-auth-library").CodeChallengeMethod,
  });
  const cookie = `__Secure-oneshot_google_${state.slice(0, 16)}=${browser}; ${sharedCookieAttributes(new URL(req.url).origin)}; Max-Age=600`;
  return purpose === "login"
    ? redirect(authorization, [cookie])
    : Response.json(
        { authorization },
        { headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" } },
      );
}

async function googleIdentity(
  email: string,
  subject: string,
  name?: string,
): Promise<User> {
  // Identity owns account IDs and server-controlled roles for both sign-in methods.
  for (let page = 1; page <= 100; page++) {
    const users = await admin.listUsers({ page, perPage: 100 });
    const existing = users.find((user) => user.email?.toLowerCase() === email);
    if (existing) {
      // Do not attach Google to an unverified password account created by someone else.
      if (!existing.confirmedAt) {
        // Google أثبت ملكية البريد (email_verified === true أعلاه)، وصاحب الحساب لم يستلم
        // رسالة التأكيد لأن SMTP غير مضبوط على Identity. نتبنّى الحساب بدل قفله في وجه صاحبه.
        const adopted = await admin.updateUser(existing.id, { confirm: true });
        return persistOwnerRole(adopted);
      }
      return persistOwnerRole(existing);
    }
    if (users.length < 100) {
      if ((await getSettings()).disableSignup)
        throw new ApiError(403, "التسجيل يتطلب دعوة.");
      const user = await admin.createUser({
        email,
        password: randomBytes(48).toString("base64url"),
        data: {
          app_metadata: { provider: "google", google_subject: subject },
          user_metadata: { full_name: name || "" },
        },
      });
      // Email confirmation is justified only by the verified Google ID token below.
      const confirmed = user.confirmedAt
        ? user
        : await admin.updateUser(user.id, { confirm: true });
      return persistOwnerRole(confirmed);
    }
  }
  throw new ApiError(503, "تعذّر مطابقة حساب Google حالياً.");
}

export async function googleRoute(
  req: Request,
  path: string,
): Promise<Response> {
  // Signing in with Google is retired: accounts are opened with a one-time
  // code and reopened with the device lock. Connecting Google Workspace for
  // Drive is a separate, still-supported feature below.
  if (path.startsWith("/api/auth/google/"))
    return Response.json(
      {
        enabled: false,
        error: "الدخول عبر Google لم يعد مستخدماً. استخدم رمز التحقق.",
        code: "GOOGLE_LOGIN_RETIRED",
        destination: "/api/auth/otp/request",
      },
      { status: path.endsWith("/settings") ? 200 : 410, headers: { "Cache-Control": "no-store" } },
    );
  // The callback stays for Google Workspace (Drive) connections only.
  if (path === "/api/auth/google/callback" && req.method === "GET") {
    const params = new URL(req.url).searchParams,
      state = params.get("state") || "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(state))
      throw new ApiError(400, "رابط Google غير صالح.");
    const name = `__Secure-oneshot_google_${state.slice(0, 16)}`,
      browser = cookieValue(req, name);
    if (!browser)
      throw new ApiError(401, "انتهت محاولة الدخول. ابدأ مجدداً من التطبيق.");
    // Consume once, bound to this browser; concurrent callback replays cannot succeed.
    const [pending] = await database()
      .delete(googleOAuthStates)
      .where(
        and(
          eq(googleOAuthStates.stateHash, digest(state)),
          eq(googleOAuthStates.browserHash, digest(browser)),
          gt(googleOAuthStates.expiresAt, new Date()),
        ),
      )
      .returning();
    if (!pending)
      throw new ApiError(401, "انتهت محاولة الدخول أو استُخدمت سابقاً.");
    // A sign-in grant minted before Google login was retired must not still
    // be redeemable for a session.
    if (pending.purpose !== "workspace" && pending.purpose !== "gmail")
      throw new ApiError(
        410,
        "الدخول عبر Google لم يعد مستخدماً. استخدم رمز التحقق.",
        "GOOGLE_LOGIN_RETIRED",
      );
    const destination = checkedReturn(req, pending.returnTo);
    const clear = `${name}=; ${sharedCookieAttributes(new URL(req.url).origin)}; Max-Age=0`;
    try {
      if (params.has("error") || !params.get("code"))
        throw new Error("consent");
      // كل غرض باقٍ هنا مملوك لصاحبه: نتأكد أن الجلسة لنفس المالك.
      const owner = pending.ownerId || "";
      if (!owner) throw new Error("owner missing");
      const session = await authenticate(req);
      if (session.id !== owner) throw new Error("account changed");
      const client = google(req);
      const { verifier } = open<{ verifier: string }>(
        pending.encryptedVerifier,
        `google-state:${pending.stateHash}`,
      );
      const { tokens } = await client.getToken({
        code: params.get("code")!,
        codeVerifier: verifier,
      });
      if (!tokens.id_token) throw new Error("identity missing");
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: env("GOOGLE_CLIENT_ID"),
      });
      const claims = ticket.getPayload();
      if (
        claims?.email_verified !== true ||
        !claims.email ||
        !claims.sub ||
        digest(
          String((claims as unknown as { nonce?: string }).nonce || ""),
        ) !== pending.nonceHash
      )
        throw new Error("identity invalid");
      {
        const scopes = tokens.scope || "";
        const granted = scopes.split(" ");
        const enough =
          pending.purpose === "gmail"
            ? granted.includes(gmailSendScope) &&
              granted.includes(gmailReadScope)
            : granted.includes(driveScope);
        if (!enough || !tokens.refresh_token)
          throw new Error("consent incomplete");
        await database()
          .insert(googleWorkspaceConnections)
          .values({
            ownerId: owner,
            googleSubject: claims.sub,
            email: claims.email,
            scopes,
            encryptedTokens: seal(
              tokens,
              `google-workspace:${owner}:${claims.sub}`,
            ),
          })
          .onConflictDoUpdate({
            target: googleWorkspaceConnections.ownerId,
            set: {
              googleSubject: claims.sub,
              email: claims.email,
              scopes,
              encryptedTokens: seal(
                tokens,
                `google-workspace:${owner}:${claims.sub}`,
              ),
              updatedAt: new Date(),
            },
          });
        return redirect(destination, [clear]);
      }
      // لا فرع دخول هنا: الدخول عبر Google متقاعد، والمنح الباقية للربط فقط.
    } catch {
      // No provider error, authorization code or credential enters the browser/logs.
      const failed = new URL(destination);
      failed.searchParams.set("google_error", "sign_in_failed");
      return redirect(failed.href, [clear]);
    }
  }
  const user = await authenticate(req);
  if (path === "/api/google/workspace/connect" && req.method === "POST") {
    const body = await payload(req, 5000);
    // الطلب نفسه يحدّد ما يُطلب: Drive وحده، أو Drive والبريد للمتابعات.
    return start(
      req,
      body.purpose === "gmail" ? "gmail" : "workspace",
      body.return_to,
      user.id,
    );
  }
  const [connection] = await database()
    .select()
    .from(googleWorkspaceConnections)
    .where(eq(googleWorkspaceConnections.ownerId, user.id));
  if (path === "/api/google/workspace" && req.method === "GET")
    return Response.json({
      enabled: googleReady(),
      connected: !!connection,
      email: connection?.email,
      mail: !!connection?.scopes
        ?.split(" ")
        .includes(gmailSendScope),
      updatedAt: connection?.updatedAt,
    });
  if (path === "/api/google/workspace" && req.method === "DELETE") {
    await limit(user.id, "google_disconnect", 10);
    if (connection) {
      const client = google(req);
      client.setCredentials(
        open<Credentials>(
          connection.encryptedTokens,
          `google-workspace:${user.id}:${connection.googleSubject}`,
        ),
      );
      try {
        await client.revokeCredentials();
      } catch {
        throw new ApiError(
          502,
          "تعذّر تأكيد إلغاء صلاحية Google. حاول مجدداً.",
        );
      }
      await database()
        .delete(googleWorkspaceConnections)
        .where(eq(googleWorkspaceConnections.ownerId, user.id));
    }
    return Response.json({ disconnected: true });
  }
  if (path === "/api/google/workspace/files" && req.method === "GET") {
    await limit(user.id, "google_files", 20);
    if (!connection) throw new ApiError(409, "اربط Google Workspace أولاً.");
    const client = google(req);
    const saved = open<Credentials>(
      connection.encryptedTokens,
      `google-workspace:${user.id}:${connection.googleSubject}`,
    );
    client.setCredentials(saved);
    try {
      const result = await client.request<{
        files?: { id: string; name: string; mimeType: string }[];
      }>({
        url: "https://www.googleapis.com/drive/v3/files",
        params: {
          pageSize: 20,
          fields: "files(id,name,mimeType)",
          q: "trashed = false",
          orderBy: "modifiedTime desc",
        },
        timeout: 15000,
      });
      await database()
        .update(googleWorkspaceConnections)
        .set({
          encryptedTokens: seal(
            { ...saved, ...client.credentials },
            `google-workspace:${user.id}:${connection.googleSubject}`,
          ),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(googleWorkspaceConnections.ownerId, user.id),
            eq(googleWorkspaceConnections.updatedAt, connection.updatedAt),
          ),
        );
      return Response.json({ files: result.data.files || [] });
    } catch {
      throw new ApiError(
        502,
        "تعذّر قراءة Google Drive. تحقق من الاتصال أو أعد الربط.",
      );
    }
  }
  throw new ApiError(404, "مسار Google غير متاح.");
}

/**
 * عميل Google جاهز لمالك محدّد، للعمل في الخلفية حيث لا طلب وارد.
 *
 * يُعيد null بهدوء حين لا يوجد ربط أو حين لم يُمنح نطاق البريد: الدفعة
 * المجدولة تمرّ على مالكين كثيرين، وغياب الربط حالة طبيعية لا خطأ.
 * التوكنات تُعاد إلى الحفظ مختومة بعد أي تحديث، فلا يسقط الربط بانتهاء مهلة.
 */
export async function ownerMailClient(ownerId: string) {
  if (!googleReady()) return null;
  const [connection] = await database()
    .select()
    .from(googleWorkspaceConnections)
    .where(eq(googleWorkspaceConnections.ownerId, ownerId));
  if (!connection) return null;
  const granted = connection.scopes.split(" ");
  if (!granted.includes(gmailSendScope) || !granted.includes(gmailReadScope))
    return null;
  const aad = `google-workspace:${ownerId}:${connection.googleSubject}`;
  const saved = open<Credentials>(connection.encryptedTokens, aad);
  const client = new OAuth2Client({
    clientId: env("GOOGLE_CLIENT_ID"),
    clientSecret: env("GOOGLE_CLIENT_SECRET"),
    redirectUri: `${hubOrigin}/api/auth/google/callback`,
  });
  client.setCredentials(saved);
  const persist = async () => {
    await database()
      .update(googleWorkspaceConnections)
      .set({
        encryptedTokens: seal({ ...saved, ...client.credentials }, aad),
        updatedAt: new Date(),
      })
      .where(eq(googleWorkspaceConnections.ownerId, ownerId));
  };
  return { client, email: connection.email, persist };
}
