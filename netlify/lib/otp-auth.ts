import { admin, getSettings, type User } from "@netlify/identity";
import {
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import { authCodes } from "../../db/schema.js";
import { sharedCookieAttributes } from "../../shared/auth-policy.js";
import { ApiError, limit, payload } from "./security.js";
import { cookieValue, createSharedSession, digest } from "./shared-session.js";
import { persistOwnerRole } from "./identity-owner.js";
import {
  channelReady,
  deliverCode,
  emailReady,
  maskDestination,
  readDestination,
  smsReady,
  type OtpChannel,
} from "./otp-delivery.js";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const BROWSER_COOKIE = "__Secure-oneshot_otp";

// A code is only ever stored hashed, salted per row by the row's own id, so a
// database read does not hand an attacker a working sign-in.
const hashCode = async (code: string, salt: string) =>
  (await scrypt(code, salt, 32)).toString("base64url");

function sameSecret(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// Six digits, uniformly drawn. randomInt is rejection-sampled, so no digit is
// more likely than another the way `random() % 1000000` would make it.
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

function browserCookie(issuer: string, value: string, maxAge: number) {
  return `${BROWSER_COOKIE}=${value}; ${sharedCookieAttributes(issuer)}; Max-Age=${maxAge}`;
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

// One account per verified destination. Identity stays the owner of account
// ids and of server-controlled roles, exactly as the password path left it.
async function identityFor(
  channel: OtpChannel,
  destination: string,
): Promise<User> {
  // A phone sign-in still needs an address Identity will accept as the key.
  const email =
    channel === "email"
      ? destination
      : `${destination.replace(/^\+/, "")}@phone.1shotcam.com`;
  for (let page = 1; page <= 100; page++) {
    const users = await admin.listUsers({ page, perPage: 100 });
    const existing = users.find((user) => user.email?.toLowerCase() === email);
    if (existing) {
      // The code proved control of the destination; that is the confirmation
      // Identity's own email never delivered.
      const confirmed = existing.confirmedAt
        ? existing
        : await admin.updateUser(existing.id, { confirm: true });
      return persistOwnerRole(confirmed);
    }
    if (users.length < 100) {
      if ((await getSettings()).disableSignup)
        throw new ApiError(403, "التسجيل يتطلب دعوة.", "SIGNUP_DISABLED");
      // The account never signs in by password: a long random one is set so no
      // guessable credential exists, and it is never shown to anyone.
      const user = await admin.createUser({
        email,
        password: randomBytes(48).toString("base64url"),
        data: {
          app_metadata: { provider: "otp", otp_channel: channel },
          user_metadata:
            channel === "sms" ? { phone: destination } : { full_name: "" },
        },
      });
      const confirmed = user.confirmedAt
        ? user
        : await admin.updateUser(user.id, { confirm: true });
      return persistOwnerRole(confirmed);
    }
  }
  throw new ApiError(503, "تعذّر فتح الحساب حالياً. حاول مجدداً.");
}

// ---------------------------------------------------------------------------
// Request a code
// ---------------------------------------------------------------------------

async function requestCode(req: Request): Promise<Response> {
  const body = await payload(req, 2000);
  const target = readDestination(body.destination);
  if (!target)
    throw new ApiError(
      400,
      "أدخل بريداً إلكترونياً صحيحاً أو رقم جوال صحيحاً.",
      "OTP_DESTINATION_INVALID",
    );
  const { channel, destination } = target;
  if (!channelReady(channel))
    throw new ApiError(
      503,
      channel === "sms"
        ? "الدخول برسالة جوال غير مفعّل بعد. استخدم بريدك الإلكتروني."
        : "خدمة إرسال الرموز بانتظار الإعداد.",
      "OTP_CHANNEL_UNAVAILABLE",
    );

  const ip = Netlify.context?.ip || "unknown";
  // Two independent ceilings: one stops a flood from a single network, the
  // other stops one address being used to mail-bomb a person.
  await limit(`otp:ip:${ip}`, "otp_request", 10);
  await limit(`otp:to:${digest(destination)}`, "otp_request", 4);

  const issuer = new URL(req.url).origin;
  // Reuse this browser's marker when it already has one, so asking for a
  // second code in the same tab does not strand the first.
  const existing = cookieValue(req, BROWSER_COOKIE);
  const browser =
    existing && /^[A-Za-z0-9_-]{43}$/.test(existing)
      ? existing
      : randomBytes(32).toString("base64url");

  const code = newCode();
  const db = database();
  await db.delete(authCodes).where(lt(authCodes.expiresAt, new Date()));
  // Only the newest code for a destination may be redeemed: an older message
  // still sitting in an inbox stops working the moment a new one is asked for.
  await db.delete(authCodes).where(eq(authCodes.destination, destination));
  const [row] = await db
    .insert(authCodes)
    .values({
      channel,
      destination,
      codeHash: "",
      browserHash: digest(browser),
      expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000),
    })
    .returning();
  await db
    .update(authCodes)
    .set({ codeHash: await hashCode(code, row.id) })
    .where(eq(authCodes.id, row.id));

  try {
    await deliverCode(channel, destination, code, CODE_MINUTES);
  } catch (error) {
    // Nothing was delivered, so leave no redeemable row behind.
    await db.delete(authCodes).where(eq(authCodes.id, row.id));
    throw error;
  }

  return Response.json(
    {
      sent: true,
      channel,
      destination: maskDestination(channel, destination),
      expiresInSeconds: CODE_MINUTES * 60,
    },
    {
      headers: {
        "Set-Cookie": browserCookie(issuer, browser, CODE_MINUTES * 60),
        "Cache-Control": "no-store",
      },
    },
  );
}

// ---------------------------------------------------------------------------
// Verify a code
// ---------------------------------------------------------------------------

async function verifyCode(req: Request): Promise<Response> {
  const body = await payload(req, 2000);
  const target = readDestination(body.destination);
  const code = String(body.code ?? "")
    .replace(/[\s-]/g, "")
    .trim();
  if (!target || !/^\d{6}$/.test(code))
    throw new ApiError(400, "الرمز غير صحيح.", "OTP_INVALID");

  const ip = Netlify.context?.ip || "unknown";
  await limit(`otp:ip:${ip}`, "otp_verify", 20);

  const browser = cookieValue(req, BROWSER_COOKIE);
  if (!browser || !/^[A-Za-z0-9_-]{43}$/.test(browser))
    throw new ApiError(
      401,
      "انتهت محاولة الدخول. اطلب رمزاً جديداً.",
      "OTP_EXPIRED",
    );

  const db = database();
  const [pending] = await db
    .select()
    .from(authCodes)
    .where(
      and(
        eq(authCodes.destination, target.destination),
        eq(authCodes.browserHash, digest(browser)),
        isNull(authCodes.consumedAt),
        gt(authCodes.expiresAt, new Date()),
      ),
    );
  if (!pending)
    throw new ApiError(
      401,
      "انتهت صلاحية الرمز. اطلب رمزاً جديداً.",
      "OTP_EXPIRED",
    );
  if (pending.attempts >= MAX_ATTEMPTS) {
    await db.delete(authCodes).where(eq(authCodes.id, pending.id));
    throw new ApiError(
      429,
      "محاولات كثيرة خاطئة. اطلب رمزاً جديداً.",
      "OTP_LOCKED",
    );
  }

  if (!sameSecret(await hashCode(code, pending.id), pending.codeHash)) {
    await db
      .update(authCodes)
      .set({ attempts: sql`${authCodes.attempts} + 1` })
      .where(eq(authCodes.id, pending.id));
    throw new ApiError(
      401,
      `الرمز غير صحيح. بقي لك ${MAX_ATTEMPTS - pending.attempts - 1} محاولات.`,
      "OTP_INVALID",
    );
  }

  // Consume before issuing anything: two tabs racing the same code must not
  // both end up with a session.
  const consumed = await db
    .update(authCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(authCodes.id, pending.id), isNull(authCodes.consumedAt)))
    .returning();
  if (!consumed.length)
    throw new ApiError(
      401,
      "استُخدم هذا الرمز سابقاً. اطلب رمزاً جديداً.",
      "OTP_EXPIRED",
    );

  const user = await identityFor(pending.channel as OtpChannel, pending.destination);
  const issuer = new URL(req.url).origin;
  const response = Response.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles || [],
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.headers.append("Set-Cookie", await createSharedSession(req, user.id));
  response.headers.append("Set-Cookie", browserCookie(issuer, "", 0));
  // The password-era Identity cookies are not part of this session.
  for (const name of ["nf_jwt", "nf_refresh"])
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Secure; SameSite=Lax; Max-Age=0`,
    );
  return response;
}

// ---------------------------------------------------------------------------

export async function otpRoute(req: Request, path: string): Promise<Response> {
  if (path === "/api/auth/otp/settings" && req.method === "GET")
    return Response.json(
      { email: emailReady(), sms: smsReady() },
      { headers: { "Cache-Control": "no-store" } },
    );
  if (path === "/api/auth/otp/request" && req.method === "POST")
    return requestCode(req);
  if (path === "/api/auth/otp/verify" && req.method === "POST")
    return verifyCode(req);
  throw new ApiError(404, "مسار الدخول غير متاح.");
}
