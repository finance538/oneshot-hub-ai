import { createHash, createPublicKey, type KeyObject } from "node:crypto";
import { eq } from "drizzle-orm";
import { database } from "../../db/index.js";
import { payActivityReceipts } from "../../db/schema.js";
import { escapeHtml, noticeEmail, noticesReady, sendNotice } from "./notices.js";
import { hubOrigin, payOrigin, readPayActivity, validPaySignature, validPayTimestamp, type PayActivity } from "./pay-activity-proof.js";

const support = "support@1shotcam.com";
let cachedKey: { value: KeyObject; expiresAt: number } | undefined;
let keyRequest: Promise<KeyObject> | undefined;

async function payPublicKey() {
  if (cachedKey && cachedKey.expiresAt > Date.now()) return cachedKey.value;
  keyRequest ??= (async () => {
    const response = await fetch(`${payOrigin}/api/pay-activity/key`, { redirect: "error", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("pay_notice_key_unavailable");
    const value = await response.json();
    if (value?.kty !== "OKP" || value.crv !== "Ed25519" || typeof value.x !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value.x))
      throw new Error("pay_notice_invalid_key");
    const key = createPublicKey({ key: { kty: value.kty, crv: value.crv, x: value.x }, format: "jwk" });
    cachedKey = { value: key, expiresAt: Date.now() + 5 * 60_000 };
    return key;
  })().finally(() => { keyRequest = undefined; });
  return keyRequest;
}

export async function deliverPayActivity(event: PayActivity) {
  if (!noticesReady()) throw new Error("pay_notice_mail_unconfigured");
  const store = database();
  const source = event.kind === "registration" ? event.source : "browser";
  const key = createHash("sha256").update(`pay:${event.kind}:${source}:${event.id}`).digest("hex");
  const [claim] = await store.insert(payActivityReceipts).values({ key }).onConflictDoNothing().returning({ key: payActivityReceipts.key });
  if (!claim) return false;
  const visit = event.kind === "visit";
  const subject = visit ? "زيارة جديدة لرابط OneShot Pay" : "حساب جديد في OneShot Pay";
  const time = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh", calendar: "gregory" }).format(new Date());
  const lines = visit
    ? ["تم فتح رابط OneShot Pay في المتصفح.", new URL(event.page, payOrigin).href]
    : ["تم إنشاء حساب جديد في OneShot Pay.", ...(event.email ? [`البريد المسجّل: ${event.email}`] : [])];
  lines.push(`${time} (بتوقيت الرياض)`);
  try {
    await sendNotice({ to: support, subject, text: lines.join("\n"), html: noticeEmail(subject, lines.map(line => `<p>${escapeHtml(line)}</p>`).join("")) });
    console.info("pay_activity_notice_sent", event.kind);
    return true;
  } catch (error) {
    await store.delete(payActivityReceipts).where(eq(payActivityReceipts.key, key));
    throw error;
  }
}

const status = (code: number) => new Response(null, { status: code, headers: { "Cache-Control": "no-store" } });

export async function handlePayActivity(req: Request) {
  if (req.method !== "POST") return status(405);
  if (new URL(req.url).origin !== hubOrigin) return status(404);
  const sentAt = req.headers.get("x-oneshot-pay-timestamp") || "";
  const signature = req.headers.get("x-oneshot-pay-signature") || "";
  if (!validPayTimestamp(sentAt) || !/^[A-Za-z0-9_-]{86}$/.test(signature)) return status(403);
  if (Number(req.headers.get("content-length") || 0) > 1024) return status(413);
  const body = await req.text();
  if (Buffer.byteLength(body) > 1024) return status(413);
  const event = readPayActivity(body);
  if (!event) return status(400);
  try {
    if (!validPaySignature(await payPublicKey(), sentAt, body, signature)) return status(403);
  } catch {
    console.error("pay_activity_key_unavailable");
    return status(503);
  }
  try {
    return status(await deliverPayActivity(event) ? 201 : 208);
  } catch {
    console.error("pay_activity_hub_delivery_failed", event.kind);
    return status(502);
  }
}
