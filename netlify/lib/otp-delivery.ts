import nodemailer from "nodemailer";
import { ApiError, env } from "./security.js";
import { publicHost } from "./workforce-network.js";

export type OtpChannel = "email" | "sms";

// ---------------------------------------------------------------------------
// Destination parsing
// ---------------------------------------------------------------------------

// Saudi mobile numbers arrive in many shapes (05…, 5…, +9665…, ٠٥…). Normalise
// to E.164 so one account cannot be split across spellings of one phone.
const arabicDigits = /[٠-٩۰-۹]/g;
const latinise = (value: string) =>
  value.replace(arabicDigits, (digit) =>
    String(
      (digit.charCodeAt(0) - (digit.charCodeAt(0) >= 0x06f0 ? 0x06f0 : 0x0660)),
    ),
  );

export function normalisePhone(value: string): string | null {
  const raw = latinise(value).replace(/[\s()\-.]/g, "");
  const digits = raw.replace(/^(\+|00)/, "");
  if (!/^\d{7,15}$/.test(digits)) return null;
  // A bare 05xxxxxxxx or 5xxxxxxxx is Saudi; anything already carrying a
  // country code is left as the caller wrote it.
  if (/^0?5\d{8}$/.test(digits) && !raw.startsWith("+") && !raw.startsWith("00"))
    return `+966${digits.replace(/^0/, "")}`;
  return `+${digits}`;
}

export function normaliseEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length > 254) return null;
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email) ? email : null;
}

// Decides which channel the person is asking for from what they typed, so the
// sign-in screen needs one field rather than a channel switch.
export function readDestination(
  value: unknown,
): { channel: OtpChannel; destination: string } | null {
  if (typeof value !== "string" || !value.trim() || value.length > 254)
    return null;
  if (value.includes("@")) {
    const email = normaliseEmail(value);
    return email ? { channel: "email", destination: email } : null;
  }
  const phone = normalisePhone(value);
  return phone ? { channel: "sms", destination: phone } : null;
}

// What the person sees echoed back on the code screen. Never the full address:
// a shoulder-surfer should not learn the account from the confirmation line.
export function maskDestination(channel: OtpChannel, destination: string) {
  if (channel === "sms") return `••• ${destination.slice(-3)}`;
  const [name, domain] = destination.split("@");
  const head = name.slice(0, 2),
    tail = name.length > 3 ? name.slice(-1) : "";
  return `${head}${"•".repeat(Math.max(2, name.length - 3))}${tail}@${domain}`;
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

export function emailReady() {
  return (
    !!env("OTP_SMTP_HOST") &&
    !!env("OTP_SMTP_USER") &&
    !!env("OTP_SMTP_PASSWORD") &&
    !!env("OTP_MAIL_FROM")
  );
}

async function transport() {
  const host = env("OTP_SMTP_HOST")!;
  const port = Number(env("OTP_SMTP_PORT") || 465);
  if (port !== 465 && port !== 587)
    throw new ApiError(503, "إعداد بريد الرموز غير صالح.", "OTP_SMTP_INVALID");
  // publicHost refuses private and link-local addresses, so a misconfigured
  // host cannot turn the mailer into a probe of the internal network.
  const address = await publicHost(host);
  return nodemailer.createTransport({
    host: address.address,
    port,
    secure: port === 465,
    requireTLS: true,
    auth: { user: env("OTP_SMTP_USER"), pass: env("OTP_SMTP_PASSWORD") },
    tls: { servername: host, rejectUnauthorized: true },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
  });
}

// The OneShot theme, inlined: email clients strip <style> and external CSS.
const theme = {
  bg: "#101211",
  panel: "#171b17",
  raised: "#22271f",
  text: "#f0ede5",
  muted: "#a3ab9a",
  border: "#30392b",
  accent: "#cfbc97",
  onAccent: "#20231c",
};

function codeEmail(code: string, minutes: number) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  return `<!doctype html><html dir="rtl" lang="ar"><body style="margin:0;padding:0;background:${theme.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${theme.bg};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${theme.panel};border:1px solid ${theme.border};border-radius:12px;overflow:hidden;">
<tr><td style="padding:28px 28px 8px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:${theme.accent};font-size:13px;letter-spacing:.14em;text-transform:uppercase;">oneShot</td></tr>
<tr><td style="padding:0 28px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:${theme.text};font-size:21px;font-weight:600;">رمز الدخول إلى حسابك</td></tr>
<tr><td style="padding:14px 28px 0;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:${theme.muted};font-size:14px;line-height:1.8;">أدخل هذا الرمز في الصفحة التي طلبته منها. صالح لمدة ${minutes} دقائق.</td></tr>
<tr><td style="padding:20px 28px;">
<div style="background:${theme.raised};border:1px solid ${theme.border};border-radius:10px;padding:18px;text-align:center;font-family:'Courier New',monospace;color:${theme.accent};font-size:34px;font-weight:700;letter-spacing:.22em;direction:ltr;">${spaced}</div>
</td></tr>
<tr><td style="padding:0 28px 28px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:${theme.muted};font-size:12.5px;line-height:1.8;border-top:1px solid ${theme.border};padding-top:18px;">
لم تطلب هذا الرمز؟ تجاهل الرسالة ولا تشاركه مع أحد — موظفو oneShot لن يطلبوه منك أبداً.
</td></tr>
</table>
<div style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:${theme.muted};font-size:11.5px;padding-top:16px;">oneShot · 1shotcam.com</div>
</td></tr></table></body></html>`;
}

async function sendEmail(destination: string, code: string, minutes: number) {
  const mailer = await transport();
  await mailer.sendMail({
    from: env("OTP_MAIL_FROM"),
    to: destination,
    subject: `رمز الدخول: ${code}`,
    text: `رمز الدخول إلى oneShot: ${code}\nصالح لمدة ${minutes} دقائق.\nإن لم تطلبه، تجاهل الرسالة ولا تشاركه مع أحد.`,
    html: codeEmail(code, minutes),
  });
  mailer.close();
}

// ---------------------------------------------------------------------------
// SMS — dormant until a provider is configured, then live with no code change
// ---------------------------------------------------------------------------

export function smsReady() {
  return (
    (!!env("TWILIO_ACCOUNT_SID") &&
      !!env("TWILIO_AUTH_TOKEN") &&
      !!env("TWILIO_FROM")) ||
    (!!env("UNIFONIC_APP_SID") && !!env("UNIFONIC_SENDER_ID"))
  );
}

async function sendSms(destination: string, code: string, minutes: number) {
  const body = `رمز الدخول إلى oneShot: ${code}\nصالح ${minutes} دقائق. لا تشاركه مع أحد.`;
  if (env("UNIFONIC_APP_SID")) {
    const response = await fetch(
      "https://el.cloud.unifonic.com/rest/SMS/messages",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          AppSid: env("UNIFONIC_APP_SID")!,
          SenderID: env("UNIFONIC_SENDER_ID")!,
          Recipient: destination.replace(/^\+/, ""),
          Body: body,
        }),
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!response.ok) throw new Error("unifonic rejected the message");
    return;
  }
  const sid = env("TWILIO_ACCOUNT_SID")!;
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${env("TWILIO_AUTH_TOKEN")}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: destination,
        From: env("TWILIO_FROM")!,
        Body: body,
      }),
      signal: AbortSignal.timeout(12000),
    },
  );
  if (!response.ok) throw new Error("twilio rejected the message");
}

// ---------------------------------------------------------------------------

export const channelReady = (channel: OtpChannel) =>
  channel === "email" ? emailReady() : smsReady();

export async function deliverCode(
  channel: OtpChannel,
  destination: string,
  code: string,
  minutes: number,
) {
  if (!channelReady(channel))
    throw new ApiError(
      503,
      channel === "sms"
        ? "الدخول برسالة جوال غير مفعّل بعد. استخدم بريدك الإلكتروني."
        : "خدمة إرسال الرموز بانتظار الإعداد.",
      "OTP_CHANNEL_UNAVAILABLE",
    );
  try {
    if (channel === "email") await sendEmail(destination, code, minutes);
    else await sendSms(destination, code, minutes);
  } catch {
    // The provider's own wording may name the address; keep it out of the
    // response so a failed send cannot confirm whether an account exists.
    throw new ApiError(
      502,
      "تعذّر إرسال الرمز الآن. حاول بعد قليل.",
      "OTP_SEND_FAILED",
    );
  }
}
