import nodemailer from "nodemailer";
import { ApiError, env } from "./security.js";
import { publicHost } from "./workforce-network.js";

/**
 * بريد الإشعارات التشغيلية: بلاغات المشاكل من داخل التطبيق وطلبات الحجز.
 *
 * رموز الدخول لها ناقلها الخاص في otp-delivery.ts ولا نلمسه حتى لا يتأثر
 * تسجيل الدخول بأي تغيير هنا، لكننا نستخدم نفس إعدادات SMTP المضبوطة أصلاً
 * (OTP_SMTP_*) حتى لا يحتاج المالك إلى ضبط بريد ثانٍ، مع قبول MAIL_SMTP_*
 * إن فُضّل فصل صندوق الإشعارات عن صندوق الرموز.
 */

const setting = (notice: string, otp: string) => env(notice) || env(otp);

const host = () => setting("MAIL_SMTP_HOST", "OTP_SMTP_HOST");
const user = () => setting("MAIL_SMTP_USER", "OTP_SMTP_USER");
const pass = () => setting("MAIL_SMTP_PASS", "OTP_SMTP_PASSWORD");
const from = () => setting("MAIL_FROM", "OTP_MAIL_FROM") || user();

/** هل يستطيع الخادم إرسال الإشعارات الآن؟ */
export const noticesReady = () => !!(host() && user() && pass() && from());

/** الصندوق الذي تصل إليه البلاغات والطلبات. */
export const supportInbox = () =>
  (env("SUPPORT_EMAIL") || "support@1shotcam.com").trim();

export interface NoticeAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

async function transport() {
  const address = host()!;
  const port = Number(setting("MAIL_SMTP_PORT", "OTP_SMTP_PORT") || 465);
  if (port !== 465 && port !== 587)
    throw new ApiError(503, "إعداد بريد الإشعارات غير صالح.", "MAIL_SMTP_INVALID");
  // publicHost يرفض العناوين الداخلية، فلا يتحوّل مضيف خاطئ إلى مسبار للشبكة.
  const resolved = await publicHost(address);
  return nodemailer.createTransport({
    host: resolved.address,
    port,
    secure: port === 465,
    requireTLS: true,
    auth: { user: user()!, pass: pass()! },
    tls: { servername: address, rejectUnauthorized: true },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
  });
}

export async function sendNotice(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: NoticeAttachment[];
}) {
  if (!noticesReady())
    throw new ApiError(503, "إرسال الإشعارات بانتظار إعداد البريد.", "MAIL_UNCONFIGURED");
  const mailer = await transport();
  try {
    await mailer.sendMail({
      from: from()!,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      attachments: options.attachments,
    });
  } finally {
    mailer.close();
  }
}

/** ألوان هوية oneShot مضمّنة: عملاء البريد يحذفون <style> والـ CSS الخارجي. */
export const noticeTheme = {
  bg: "#101211",
  panel: "#171b17",
  raised: "#22271f",
  text: "#f0ede5",
  muted: "#a3ab9a",
  border: "#30392b",
  accent: "#cfbc97",
};

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] as string,
  );
}

/** قالب موحّد لكل إشعار: ترويسة الهوية، ثم المحتوى، ثم التذييل. */
export function noticeEmail(title: string, body: string) {
  const c = noticeTheme;
  return `<!doctype html><html dir="rtl" lang="ar"><body style="margin:0;padding:0;background:${c.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${c.panel};border:1px solid ${c.border};border-radius:12px;overflow:hidden;">
<tr><td style="padding:28px 28px 8px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:${c.accent};font-size:13px;letter-spacing:.14em;text-transform:uppercase;">oneShot</td></tr>
<tr><td style="padding:0 28px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:${c.text};font-size:20px;font-weight:600;">${escapeHtml(title)}</td></tr>
<tr><td style="padding:18px 28px 26px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:${c.muted};font-size:14px;line-height:1.9;">${body}</td></tr>
</table>
<div style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:${c.muted};font-size:11.5px;padding-top:16px;">oneShot · 1shotcam.com</div>
</td></tr></table></body></html>`;
}
