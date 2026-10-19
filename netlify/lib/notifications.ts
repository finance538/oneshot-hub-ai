import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import webpush from "web-push";
import { database } from "../../db/index.js";
import { pushSubscriptions } from "../../db/schema.js";
import {
  ApiError,
  authenticate,
  decrypt,
  encrypt,
  limit,
  payload,
  vaultReady,
} from "./security.js";

function settings() {
  const publicKey = Netlify.env.get("ONESHOT_PUSH_PUBLIC_KEY") || "";
  const privateKey = Netlify.env.get("ONESHOT_PUSH_PRIVATE_KEY") || "";
  const subject =
    Netlify.env.get("ONESHOT_PUSH_SUBJECT") || "mailto:support@1shotcam.com";
  const ready =
    /^[A-Za-z0-9_-]{87}$/.test(publicKey) &&
    /^[A-Za-z0-9_-]{43}$/.test(privateKey) &&
    /^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject) &&
    vaultReady();
  return { publicKey, privateKey, subject, ready };
}
function endpoint(value: unknown) {
  if (typeof value !== "string" || value.length > 2048)
    throw new ApiError(400, "اشتراك غير صالح.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError(400, "اشتراك غير صالح.");
  }
  // Never send requests to a client-supplied general URL or follow redirects.
  const trusted =
    /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
  if (
    url.protocol !== "https:" ||
    !trusted.test(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new ApiError(400, "مزود الإشعارات غير مدعوم.");
  return url.href;
}
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export async function notificationRoute(req: Request, path: string) {
  if (path === "/api/notifications/config" && req.method === "GET") {
    const config = settings();
    return {
      enabled: config.ready,
      publicKey: config.ready ? config.publicKey : null,
    };
  }
  const user = await authenticate(req);
  await limit(user.id, "push-settings", 12);
  const body = await payload(req, 6000);
  const url = endpoint(body.endpoint),
    endpointHash = hash(url);
  const owner = and(
    eq(pushSubscriptions.endpointHash, endpointHash),
    eq(pushSubscriptions.ownerId, user.id),
  );
  const db = database();
  if (path === "/api/notifications/status" && req.method === "POST") {
    const [row] = await db
      .select({ expiresAt: pushSubscriptions.expiresAt })
      .from(pushSubscriptions)
      .where(and(owner, gt(pushSubscriptions.expiresAt, new Date())));
    return { subscribed: !!row };
  }
  if (path === "/api/notifications/subscription" && req.method === "DELETE") {
    await db.delete(pushSubscriptions).where(owner);
    return { subscribed: false };
  }
  const config = settings();
  if (!config.ready)
    throw new ApiError(
      503,
      "الإشعارات بانتظار تهيئة الخدمة.",
      "PUSH_NOT_CONFIGURED",
    );
  if (path === "/api/notifications/subscription" && req.method === "POST") {
    const keys = body.keys as Record<string, unknown> | undefined;
    if (
      !keys ||
      typeof keys.p256dh !== "string" ||
      typeof keys.auth !== "string" ||
      !/^[A-Za-z0-9_-]{87}=?$/.test(keys.p256dh) ||
      !/^[A-Za-z0-9_-]{22}={0,2}$/.test(keys.auth)
    )
      throw new ApiError(400, "مفاتيح الاشتراك غير صالحة.");
    const encryptedSubscription = encrypt(
      { endpoint: url, keys: { p256dh: keys.p256dh, auth: keys.auth } },
      `push:${user.id}:${endpointHash}`,
    );
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const rows = await db
      .insert(pushSubscriptions)
      .values({
        endpointHash,
        ownerId: user.id,
        encryptedSubscription,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpointHash,
        set: { encryptedSubscription, expiresAt, updatedAt: new Date() },
        setWhere: eq(pushSubscriptions.ownerId, user.id),
      })
      .returning({ endpointHash: pushSubscriptions.endpointHash });
    if (!rows.length)
      throw new ApiError(
        409,
        "ألغِ إذن الإشعارات السابق في المتصفح ثم أعد الاشتراك بهذا الحساب.",
      );
    return { subscribed: true };
  }
  if (path === "/api/notifications/test" && req.method === "POST") {
    await limit(user.id, "push-test", 2);
    const [row] = await db
      .select()
      .from(pushSubscriptions)
      .where(and(owner, gt(pushSubscriptions.expiresAt, new Date())));
    if (!row) throw new ApiError(404, "أعد تفعيل إشعارات هذا الجهاز.");
    const subscription = decrypt(
      row.encryptedSubscription,
      `push:${user.id}:${endpointHash}`,
    ) as webpush.PushSubscription;
    endpoint(subscription.endpoint);
    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: "OneShot",
          body: "إشعارات ون شوت جاهزة على هذا الجهاز. Your device is connected.",
          url: "/hub",
        }),
        {
          TTL: 60,
          urgency: "normal",
          timeout: 8000,
          vapidDetails: {
            subject: config.subject,
            publicKey: config.publicKey,
            privateKey: config.privateKey,
          },
        },
      );
      return { accepted: true };
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await db.delete(pushSubscriptions).where(owner);
        throw new ApiError(410, "انتهى اشتراك هذا الجهاز. أعد تفعيله.");
      }
      throw new ApiError(
        502,
        "لم نتمكن من تأكيد تسليم الإشعار إلى مزود الخدمة.",
      );
    }
  }
  throw new ApiError(404, "مسار غير موجود.");
}
