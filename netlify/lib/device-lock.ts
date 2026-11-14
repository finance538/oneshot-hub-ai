import {
  createHash,
  createPublicKey,
  createVerify,
  randomBytes,
  randomInt,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  verify as verifySignature,
} from "node:crypto";
import { promisify } from "node:util";
import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";
import { database } from "../../db/index.js";
import {
  authCodes,
  deviceLocks,
  devicePasskeys,
  passkeyChallenges,
} from "../../db/schema.js";
import { deliverCode, maskDestination, normaliseEmail } from "./otp-delivery.js";
import { ApiError, authenticate, limit, payload } from "./security.js";
import { digest } from "./shared-session.js";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const CHALLENGE_MINUTES = 5;

// Forgot-PIN recovery. The code goes to the account's verified email, so a
// forgotten PIN is never a permanent lockout — while the lockout itself stays
// enforced, because resetting needs the inbox, not a guess.
const RESET_MINUTES = 10;
const RESET_MAX_ATTEMPTS = 5;
// Codes live in the shared auth_codes table under a namespaced destination, so
// no migration is needed and a reset code can never be redeemed as a sign-in.
const RESET_PREFIX = "lock-reset:";
const newResetCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

// Six digits is what people will actually use on a phone. The brute-force
// ceiling is not the digit count — it is the attempt limit and the lockout
// below, which is why both are enforced server-side rather than in the app.
const PIN_PATTERN = /^\d{6}$/;

// Obvious sequences would make the whole six-digit space irrelevant.
const WEAK_PINS = new Set([
  "000000", "111111", "222222", "333333", "444444", "555555", "666666",
  "777777", "888888", "999999", "123456", "654321", "012345", "543210",
  "121212", "123123", "112233", "696969", "101010", "111222",
]);

const hashPin = async (pin: string, salt: string) =>
  (await scrypt(pin, salt, 32)).toString("base64url");

function sameSecret(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function readPin(value: unknown) {
  const pin = String(value ?? "").trim();
  if (!PIN_PATTERN.test(pin))
    throw new ApiError(
      400,
      "الرمز يجب أن يكون ٦ أرقام.",
      "PIN_FORMAT",
    );
  if (WEAK_PINS.has(pin))
    throw new ApiError(
      400,
      "هذا الرمز سهل التخمين. اختر رمزاً آخر.",
      "PIN_WEAK",
    );
  return pin;
}

// ---------------------------------------------------------------------------
// PIN
// ---------------------------------------------------------------------------

async function lockState(ownerId: string) {
  const [row] = await database()
    .select()
    .from(deviceLocks)
    .where(eq(deviceLocks.ownerId, ownerId));
  return row || null;
}

async function setPin(req: Request, ownerId: string): Promise<Response> {
  const body = await payload(req, 2000);
  const pin = readPin(body.pin);
  await limit(ownerId, "pin_set", 10);

  const current = await lockState(ownerId);
  // Changing an existing PIN requires the old one: a borrowed unlocked phone
  // must not be enough to lock the real owner out.
  if (current) {
    const old = String(body.currentPin ?? "").trim();
    if (
      !PIN_PATTERN.test(old) ||
      !sameSecret(await hashPin(old, current.pinSalt), current.pinHash)
    )
      throw new ApiError(401, "الرمز الحالي غير صحيح.", "PIN_INVALID");
  }

  const salt = randomBytes(16).toString("base64url");
  const values = {
    ownerId,
    pinHash: await hashPin(pin, salt),
    pinSalt: salt,
    failedAttempts: 0,
    lockedUntil: null,
    updatedAt: new Date(),
  };
  await database()
    .insert(deviceLocks)
    .values(values)
    .onConflictDoUpdate({ target: deviceLocks.ownerId, set: values });
  return Response.json({ configured: true });
}

async function unlock(req: Request, ownerId: string): Promise<Response> {
  const body = await payload(req, 2000);
  const pin = String(body.pin ?? "").trim();
  await limit(ownerId, "pin_unlock", 20);

  const row = await lockState(ownerId);
  if (!row)
    throw new ApiError(409, "لم يُعيَّن رمز قفل بعد.", "PIN_NOT_CONFIGURED");
  if (row.lockedUntil && row.lockedUntil > new Date())
    throw new ApiError(
      423,
      `أُوقف الإدخال مؤقتاً. حاول بعد ${Math.ceil((row.lockedUntil.getTime() - Date.now()) / 60000)} دقيقة.`,
      "PIN_LOCKED",
    );

  if (
    !PIN_PATTERN.test(pin) ||
    !sameSecret(await hashPin(pin, row.pinSalt), row.pinHash)
  ) {
    const failed = row.failedAttempts + 1;
    const locked = failed >= MAX_PIN_ATTEMPTS;
    await database()
      .update(deviceLocks)
      .set({
        failedAttempts: locked ? 0 : failed,
        lockedUntil: locked
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
          : null,
      })
      .where(eq(deviceLocks.ownerId, ownerId));
    throw locked
      ? new ApiError(
          423,
          `أُوقف الإدخال ${LOCKOUT_MINUTES} دقيقة بعد محاولات خاطئة متتالية.`,
          "PIN_LOCKED",
        )
      : new ApiError(
          401,
          `الرمز غير صحيح. بقي لك ${MAX_PIN_ATTEMPTS - failed} محاولات.`,
          "PIN_INVALID",
        );
  }

  await database()
    .update(deviceLocks)
    .set({ failedAttempts: 0, lockedUntil: null })
    .where(eq(deviceLocks.ownerId, ownerId));
  return Response.json({ unlocked: true });
}

// ---------------------------------------------------------------------------
// Forgot PIN — reset over the verified email
// ---------------------------------------------------------------------------

// "Forgot PIN" is not a hole in the lock: the code goes to the address on the
// account, so recovering needs the inbox. It also cannot be used to *enter* an
// account — every route here still requires the existing session, and the code
// is namespaced so the sign-in verifier never sees it.

type LockUser = { id: string; email?: string | null };

async function requestPinReset(req: Request, user: LockUser): Promise<Response> {
  await limit(user.id, "pin_reset_request", 5);
  const email = normaliseEmail(String(user.email ?? ""));
  if (!email)
    throw new ApiError(
      409,
      "لا يوجد بريد موثّق على هذا الحساب. أضف بريداً موثّقاً ثم أعد المحاولة.",
      "EMAIL_MISSING",
    );

  const db = database();
  const destination = RESET_PREFIX + user.id;
  // A fresh request retires every earlier code, so an old email cannot be
  // replayed after the owner asks for a new one.
  await db
    .update(authCodes)
    .set({ consumedAt: new Date() })
    .where(
      and(eq(authCodes.destination, destination), isNull(authCodes.consumedAt)),
    );
  await db.delete(authCodes).where(lt(authCodes.expiresAt, new Date()));

  const id = randomUUID();
  const code = newResetCode();
  await db.insert(authCodes).values({
    id,
    channel: "email",
    destination,
    // The row id doubles as the per-code salt, the same way the sign-in codes
    // are salted per row: a database read yields no working reset code.
    codeHash: await hashPin(code, id),
    browserHash: "pin-reset",
    expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000),
  });

  await deliverCode("email", email, code, RESET_MINUTES);
  return Response.json({
    sent: true,
    destination: maskDestination("email", email),
    expiresInSeconds: RESET_MINUTES * 60,
  });
}

async function confirmPinReset(
  req: Request,
  user: LockUser,
): Promise<Response> {
  const body = await payload(req, 2000);
  const code = String(body.code ?? "").trim();
  const pin = readPin(body.pin);
  await limit(user.id, "pin_reset_confirm", 10);
  if (!PIN_PATTERN.test(code))
    throw new ApiError(400, "الرمز المرسل إلى بريدك غير صالح.", "CODE_FORMAT");

  const db = database();
  const destination = RESET_PREFIX + user.id;
  const [row] = await db
    .select()
    .from(authCodes)
    .where(
      and(
        eq(authCodes.destination, destination),
        isNull(authCodes.consumedAt),
        gt(authCodes.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(authCodes.createdAt))
    .limit(1);
  if (!row)
    throw new ApiError(
      401,
      "انتهت صلاحية الرمز. اطلب رمزاً جديداً.",
      "CODE_EXPIRED",
    );

  if (row.attempts >= RESET_MAX_ATTEMPTS) {
    await db
      .update(authCodes)
      .set({ consumedAt: new Date() })
      .where(eq(authCodes.id, row.id));
    throw new ApiError(
      429,
      "أُلغي هذا الرمز بعد محاولات كثيرة. اطلب رمزاً جديداً.",
      "CODE_LOCKED",
    );
  }

  if (!sameSecret(await hashPin(code, row.id), row.codeHash)) {
    await db
      .update(authCodes)
      .set({ attempts: row.attempts + 1 })
      .where(eq(authCodes.id, row.id));
    throw new ApiError(401, "الرمز غير صحيح.", "CODE_INVALID");
  }

  // Consume first: the same code can never set a second PIN.
  await db
    .update(authCodes)
    .set({ consumedAt: new Date() })
    .where(eq(authCodes.id, row.id));

  // New PIN and cleared lockout in one write, so a reset always ends the
  // 15-minute wait it was asked for in the middle of.
  const salt = randomBytes(16).toString("base64url");
  const values = {
    ownerId: user.id,
    pinHash: await hashPin(pin, salt),
    pinSalt: salt,
    failedAttempts: 0,
    lockedUntil: null,
    updatedAt: new Date(),
  };
  await db
    .insert(deviceLocks)
    .values(values)
    .onConflictDoUpdate({ target: deviceLocks.ownerId, set: values });
  return Response.json({ configured: true, reset: true });
}

// ---------------------------------------------------------------------------
// Biometric (WebAuthn) — Face ID, Touch ID, fingerprint
// ---------------------------------------------------------------------------

// The browser hands us the credential's public key as SPKI DER, so the server
// never has to parse CBOR attestation to register a device.
const ES256 = -7,
  RS256 = -257;

function relyingParty(req: Request) {
  const host = new URL(req.url).hostname;
  // Apps across *.1shotcam.com share one relying party, so a passkey made in
  // the hub also unlocks the AI app.
  return host.endsWith(".1shotcam.com") || host === "1shotcam.com"
    ? "1shotcam.com"
    : host;
}

async function newChallenge(ownerId: string, purpose: "register" | "assert") {
  const challenge = randomBytes(32).toString("base64url");
  const db = database();
  await db
    .delete(passkeyChallenges)
    .where(lt(passkeyChallenges.expiresAt, new Date()));
  await db.insert(passkeyChallenges).values({
    challengeHash: digest(challenge),
    ownerId,
    purpose,
    expiresAt: new Date(Date.now() + CHALLENGE_MINUTES * 60_000),
  });
  return challenge;
}

// Consumed once: a challenge replayed from a captured response is refused.
async function takeChallenge(
  ownerId: string,
  purpose: "register" | "assert",
  challenge: string,
) {
  const [row] = await database()
    .delete(passkeyChallenges)
    .where(
      and(
        eq(passkeyChallenges.challengeHash, digest(challenge)),
        eq(passkeyChallenges.ownerId, ownerId),
        eq(passkeyChallenges.purpose, purpose),
        gt(passkeyChallenges.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!row)
    throw new ApiError(
      401,
      "انتهت صلاحية الطلب. حاول مجدداً.",
      "PASSKEY_EXPIRED",
    );
}

function readClientData(req: Request, encoded: string, expected: string) {
  let parsed: { type?: string; challenge?: string; origin?: string };
  try {
    parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw new ApiError(400, "استجابة الجهاز غير صالحة.", "PASSKEY_INVALID");
  }
  const origin = new URL(req.url).origin;
  if (
    parsed.type !== expected ||
    typeof parsed.challenge !== "string" ||
    parsed.origin !== origin
  )
    throw new ApiError(400, "استجابة الجهاز غير صالحة.", "PASSKEY_INVALID");
  return parsed.challenge;
}

// authenticatorData: rpIdHash(32) | flags(1) | signCount(4) | …
function readAuthenticatorData(req: Request, encoded: string) {
  const data = Buffer.from(encoded, "base64url");
  if (data.length < 37)
    throw new ApiError(400, "استجابة الجهاز غير صالحة.", "PASSKEY_INVALID");
  const expected = createHash("sha256").update(relyingParty(req)).digest();
  const flags = data[32];
  if (
    !timingSafeEqual(data.subarray(0, 32), expected) ||
    // User-present and user-verified: the point of this flow is that the
    // person actually put a finger or face to the sensor.
    (flags & 0x01) === 0 ||
    (flags & 0x04) === 0
  )
    throw new ApiError(
      401,
      "لم يتم التحقق من بصمتك على الجهاز.",
      "PASSKEY_UNVERIFIED",
    );
  return { data, signCount: data.readUInt32BE(33) };
}

async function registerOptions(req: Request, user: { id: string; email?: string }) {
  const challenge = await newChallenge(user.id, "register");
  const existing = await database()
    .select({ id: devicePasskeys.credentialId })
    .from(devicePasskeys)
    .where(eq(devicePasskeys.ownerId, user.id));
  return Response.json({
    challenge,
    rpId: relyingParty(req),
    rpName: "oneShot",
    userId: Buffer.from(user.id).toString("base64url"),
    userName: user.email || "oneShot",
    algorithms: [ES256, RS256],
    excludeCredentials: existing.map((row) => row.id),
  });
}

async function registerVerify(req: Request, ownerId: string) {
  const body = await payload(req, 20000);
  await limit(ownerId, "passkey_register", 10);
  const credentialId = String(body.credentialId ?? "");
  const publicKey = String(body.publicKey ?? "");
  const algorithm = Number(body.algorithm);
  if (
    !/^[A-Za-z0-9_-]{16,512}$/.test(credentialId) ||
    !/^[A-Za-z0-9_-]{32,2048}$/.test(publicKey) ||
    ![ES256, RS256].includes(algorithm)
  )
    throw new ApiError(400, "بيانات الجهاز غير صالحة.", "PASSKEY_INVALID");

  const challenge = readClientData(
    req,
    String(body.clientDataJSON ?? ""),
    "webauthn.create",
  );
  await takeChallenge(ownerId, "register", challenge);
  const { signCount } = readAuthenticatorData(
    req,
    String(body.authenticatorData ?? ""),
  );

  // Reject a key the runtime will not load, rather than storing something
  // that only fails later at unlock time.
  try {
    createPublicKey({
      key: Buffer.from(publicKey, "base64url"),
      format: "der",
      type: "spki",
    });
  } catch {
    throw new ApiError(400, "مفتاح الجهاز غير صالح.", "PASSKEY_INVALID");
  }

  await database()
    .insert(devicePasskeys)
    .values({
      credentialId,
      ownerId,
      publicKey,
      algorithm,
      signCount,
      label: String(body.label ?? "").slice(0, 60) || null,
    })
    .onConflictDoUpdate({
      target: devicePasskeys.credentialId,
      set: { ownerId, publicKey, algorithm, signCount },
    });
  return Response.json({ registered: true });
}

async function assertOptions(req: Request, ownerId: string) {
  const credentials = await database()
    .select({ id: devicePasskeys.credentialId })
    .from(devicePasskeys)
    .where(eq(devicePasskeys.ownerId, ownerId));
  if (!credentials.length)
    throw new ApiError(
      409,
      "لا توجد بصمة مسجّلة على هذا الحساب.",
      "PASSKEY_NONE",
    );
  return Response.json({
    challenge: await newChallenge(ownerId, "assert"),
    rpId: relyingParty(req),
    credentials: credentials.map((row) => row.id),
  });
}

async function assertVerify(req: Request, ownerId: string) {
  const body = await payload(req, 20000);
  await limit(ownerId, "passkey_assert", 20);
  const credentialId = String(body.credentialId ?? "");
  const [credential] = await database()
    .select()
    .from(devicePasskeys)
    .where(
      and(
        eq(devicePasskeys.credentialId, credentialId),
        eq(devicePasskeys.ownerId, ownerId),
      ),
    );
  if (!credential)
    throw new ApiError(401, "بصمة غير معروفة.", "PASSKEY_UNKNOWN");

  const challenge = readClientData(
    req,
    String(body.clientDataJSON ?? ""),
    "webauthn.get",
  );
  await takeChallenge(ownerId, "assert", challenge);
  const { data, signCount } = readAuthenticatorData(
    req,
    String(body.authenticatorData ?? ""),
  );

  const signed = Buffer.concat([
    data,
    createHash("sha256")
      .update(Buffer.from(String(body.clientDataJSON ?? ""), "base64url"))
      .digest(),
  ]);
  const key = createPublicKey({
    key: Buffer.from(credential.publicKey, "base64url"),
    format: "der",
    type: "spki",
  });
  const signature = Buffer.from(String(body.signature ?? ""), "base64url");
  const valid =
    credential.algorithm === ES256
      ? // WebAuthn ES256 signatures are DER-encoded, which is what
        // crypto.verify expects by default.
        verifySignature("sha256", signed, key, signature)
      : createVerify("sha256").update(signed).verify(key, signature);
  if (!valid)
    throw new ApiError(401, "تعذّر التحقق من البصمة.", "PASSKEY_INVALID");

  // A counter that fails to advance is the signature of a cloned
  // authenticator. Zero on both sides means the device does not count at all.
  if (signCount !== 0 && signCount <= credential.signCount) {
    await database()
      .delete(devicePasskeys)
      .where(eq(devicePasskeys.credentialId, credentialId));
    throw new ApiError(
      401,
      "أُلغيت هذه البصمة لأسباب أمنية. استخدم الرمز السري.",
      "PASSKEY_REPLAY",
    );
  }

  await database()
    .update(devicePasskeys)
    .set({ signCount, lastUsedAt: new Date() })
    .where(eq(devicePasskeys.credentialId, credentialId));
  return Response.json({ unlocked: true });
}

// ---------------------------------------------------------------------------

export async function deviceLockRoute(
  req: Request,
  path: string,
): Promise<Response> {
  // Every route below needs a signed-in session: the lock protects a session
  // that already exists, it does not create one.
  const user = await authenticate(req);

  if (path === "/api/auth/lock" && req.method === "GET") {
    const [row] = await database()
      .select({ ownerId: deviceLocks.ownerId })
      .from(deviceLocks)
      .where(eq(deviceLocks.ownerId, user.id));
    const passkeys = await database()
      .select({ id: devicePasskeys.credentialId })
      .from(devicePasskeys)
      .where(eq(devicePasskeys.ownerId, user.id));
    return Response.json({
      pin: !!row,
      biometric: passkeys.length > 0,
    });
  }
  if (path === "/api/auth/lock/pin" && req.method === "POST")
    return setPin(req, user.id);
  if (path === "/api/auth/lock/unlock" && req.method === "POST")
    return unlock(req, user.id);
  if (path === "/api/auth/lock/pin/reset/request" && req.method === "POST")
    return requestPinReset(req, user);
  if (path === "/api/auth/lock/pin/reset/confirm" && req.method === "POST")
    return confirmPinReset(req, user);
  if (path === "/api/auth/lock/pin" && req.method === "DELETE") {
    await limit(user.id, "pin_clear", 10);
    // Biometric alone would leave no way back in after a failed sensor, so it
    // goes with the PIN it falls back to.
    await database()
      .delete(devicePasskeys)
      .where(eq(devicePasskeys.ownerId, user.id));
    await database().delete(deviceLocks).where(eq(deviceLocks.ownerId, user.id));
    return Response.json({ cleared: true });
  }
  if (path === "/api/auth/lock/biometric/options" && req.method === "POST")
    return registerOptions(req, user);
  if (path === "/api/auth/lock/biometric" && req.method === "POST") {
    // Biometric is a shortcut over the PIN, never a replacement: without a PIN
    // a broken sensor or a new phone would lock the owner out for good.
    const [row] = await database()
      .select({ ownerId: deviceLocks.ownerId })
      .from(deviceLocks)
      .where(eq(deviceLocks.ownerId, user.id));
    if (!row)
      throw new ApiError(
        409,
        "عيّن الرمز السري أولاً، ثم فعّل البصمة.",
        "PIN_REQUIRED",
      );
    return registerVerify(req, user.id);
  }
  if (path === "/api/auth/lock/biometric/challenge" && req.method === "POST")
    return assertOptions(req, user.id);
  if (path === "/api/auth/lock/biometric/verify" && req.method === "POST")
    return assertVerify(req, user.id);
  if (path === "/api/auth/lock/biometric" && req.method === "DELETE") {
    await limit(user.id, "passkey_clear", 10);
    await database()
      .delete(devicePasskeys)
      .where(eq(devicePasskeys.ownerId, user.id));
    return Response.json({ cleared: true });
  }
  throw new ApiError(404, "مسار القفل غير متاح.");
}
