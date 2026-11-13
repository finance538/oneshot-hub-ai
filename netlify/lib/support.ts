import {
  ApiError,
  limit,
  payload,
  stringField,
} from "./security.js";
import {
  escapeHtml,
  noticeEmail,
  noticeTheme,
  noticesReady,
  sendNotice,
  supportInbox,
} from "./notices.js";

/**
 * بلاغات المشاكل من داخل التطبيق خلال فترة البيتا.
 *
 * أي زائر — سجّل الدخول أو لا — يصف المشكلة ويُرفق لقطة شاشة واحدة، فيصل
 * البلاغ إلى صندوق الدعم بالبريد دون أن يحتاج الزائر إلى برنامج بريد عنده.
 * الطلب من نفس الأصل فقط ومحدود المعدل لكل عنوان. البلاغ يحمل ما كتبه الزائر
 * ومرجع الطلب الذي يراه على الشاشة فقط: لا محتوى محادثات ولا بيانات حساب.
 */

const MAX_SHOT_BASE64 = 4_200_000; // ≈ 3 ميغابايت صورة

const clientIp = (req: Request) =>
  req.headers.get("x-nf-client-connection-ip") ||
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  "unknown";

export async function supportRoute(req: Request, path: string) {
  if (path !== "/api/support/report")
    throw new ApiError(404, "المسار غير موجود.");
  if (req.method !== "POST") throw new ApiError(405, "طريقة الطلب غير مدعومة.");
  if (req.headers.get("sec-fetch-site") === "cross-site")
    throw new ApiError(403, "مصدر الطلب غير مسموح.");
  if (!noticesReady())
    throw new ApiError(
      503,
      "إرسال البلاغات بانتظار إعداد البريد لدى مسؤول المشروع.",
      "MAIL_UNCONFIGURED",
    );

  await limit(`report-ip:${clientIp(req)}`, "beta-report", 6);

  const body = await payload(req, MAX_SHOT_BASE64 + 20000);
  const note = stringField(body.message, "وصف المشكلة", 3000);
  const reference =
    typeof body.requestId === "string" ? body.requestId.slice(0, 80) : "";
  const screen = typeof body.page === "string" ? body.page.slice(0, 300) : "";
  const contact =
    typeof body.contact === "string" ? body.contact.trim().slice(0, 160) : "";
  const replyTo = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(contact)
    ? contact
    : undefined;
  const agent = (req.headers.get("user-agent") || "").slice(0, 300);

  let attachments:
    | { filename: string; content: Buffer; contentType: string }[]
    | undefined;
  if (body.screenshot !== undefined) {
    const shot = String(body.screenshot).replace(/^data:[^,]+,/, "");
    if (!shot || shot.length > MAX_SHOT_BASE64)
      throw new ApiError(413, "حجم اللقطة أكبر من 3 ميغابايت.");
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(shot))
      throw new ApiError(400, "بيانات اللقطة غير صالحة.");
    const mime = /^image\/(png|jpeg|webp)$/.test(String(body.mime))
      ? String(body.mime)
      : "image/png";
    attachments = [
      {
        filename: `oneshot-report.${mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png"}`,
        content: Buffer.from(shot, "base64"),
        contentType: mime,
      },
    ];
  }

  const row = (label: string, value: string) =>
    `<tr><td style="padding-inline-end:12px;white-space:nowrap">${label}</td><td style="color:${noticeTheme.text}">${escapeHtml(value || "—")}</td></tr>`;

  const html = noticeEmail(
    "بلاغ مشكلة من داخل التطبيق",
    `<div style="background:${noticeTheme.raised};border:1px solid ${noticeTheme.border};border-radius:10px;padding:18px;color:${noticeTheme.text};font-size:14px;line-height:1.9;white-space:pre-wrap">${escapeHtml(note)}</div>
     <table style="font-size:12.5px;line-height:1.9;margin-top:16px">
       ${row("للتواصل", contact)}
       ${row("مرجع الطلب", reference)}
       ${row("الشاشة", screen)}
       ${row("الجهاز", agent)}
       ${row("اللقطة", attachments ? "مرفقة" : "بدون")}
     </table>`,
  );

  await sendNotice({
    to: supportInbox(),
    subject: `بلاغ بيتا من oneShot${reference ? ` · ${reference}` : ""}`,
    text: [
      `البلاغ: ${note}`,
      `للتواصل: ${contact || "(غير مذكور)"}`,
      `مرجع الطلب: ${reference || "(بدون)"}`,
      screen ? `الشاشة: ${screen}` : "",
      `الجهاز: ${agent}`,
      `الوقت: ${new Date().toISOString()}`,
      attachments ? "اللقطة: مرفقة" : "اللقطة: بدون",
    ]
      .filter(Boolean)
      .join("\n"),
    html,
    replyTo,
    attachments,
  });

  return { delivered: true };
}
