import type { Config, Context } from "@netlify/functions";
import { and, eq, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import { pageBookings, publishedPages } from "../../db/schema.js";
import { ApiError, limit, safeError, stringField } from "../lib/security.js";
import { noticesReady, sendNotice } from "../lib/notices.js";
import { sanitizePageHtml } from "../../shared/page-html.js";

/**
 * الصفحات المنشورة — الوجه العام لعمل المالك.
 *
 * GET  /p/:slug        يعرض الصفحة
 * POST /p/:slug/book   يستقبل طلب حجز من نموذج الصفحة نفسها
 *
 * لا جلسة هنا: هذه صفحات يفتحها الغرباء. الـ HTML المخزَّن من تأليف المالك،
 * فيُقدَّم بسياسة لا تسمح بأي سكربت ويُنقّى أيضاً عند الخروج. نموذج الحجز
 * يُرسل لنفس الأصل، محدود المعدل لكل عنوان، ويُحفظ قبل أن يُرسل بالبريد،
 * ولا يُعاد ما كتبه الزائر إلى الصفحة أبداً.
 */

const POLICY =
  "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:; form-action 'self'; frame-ancestors 'self'; base-uri 'none'";

function escape(value: string) {
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

function shell(title: string, body: string) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title></head><body>${body}</body></html>`;
}

function page(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": POLICY,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": status === 200 ? "public, max-age=60" : "no-store",
    },
  });
}

/** نموذج الحجز: من تأليفنا نحن، لا من الصفحة المخزَّنة. */
function bookingForm(slug: string) {
  const field =
    "padding:10px;border:1px solid #ccc;border-radius:8px;font-size:15px";
  const label = "display:grid;gap:4px;font-size:13px";
  return `<section style="max-width:640px;margin:32px auto;padding:24px;border:1px solid #d9d9d9;border-radius:12px;font-family:system-ui,sans-serif">
  <h2 style="margin:0 0 16px;font-size:18px">اطلب حجزاً</h2>
  <form method="post" action="/p/${encodeURIComponent(slug)}/book" style="display:grid;gap:12px">
    <label style="${label}">اسمك<input name="name" required maxlength="120" style="${field}"></label>
    <label style="${label}">بريدك أو جوالك<input name="contact" required maxlength="160" style="${field}"></label>
    <label style="${label}">الموعد المفضل<input name="preferredAt" maxlength="120" style="${field}"></label>
    <label style="${label}">ما الذي تحتاجه؟<textarea name="message" rows="4" maxlength="2000" style="${field}"></textarea></label>
    <button type="submit" style="padding:12px;border:0;border-radius:8px;background:#111;color:#fff;font-size:15px">إرسال الطلب</button>
  </form>
</section>`;
}

export default async (req: Request, context: Context) => {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean); // ['p', slug] أو ['p', slug, 'book']
    const slug = decodeURIComponent(parts[1] || "").slice(0, 60);
    const booking = parts[2] === "book";
    if (!slug) throw new ApiError(404, "الصفحة غير موجودة.");

    const db = database();
    const [found] = await db
      .select()
      .from(publishedPages)
      .where(
        and(eq(publishedPages.slug, slug), eq(publishedPages.published, true)),
      );
    if (!found)
      return page(
        shell(
          "غير متاحة",
          '<p style="font-family:system-ui,sans-serif;text-align:center;margin:64px auto">هذه الصفحة غير متاحة · This page is not available</p>',
        ),
        404,
      );

    if (booking) {
      if (req.method !== "POST")
        throw new ApiError(405, "طريقة الطلب غير مدعومة.");
      if (found.kind !== "booking")
        throw new ApiError(404, "هذه الصفحة لا تستقبل حجوزات.");
      const ip =
        context.ip ||
        req.headers.get("x-nf-client-connection-ip") ||
        "unknown";
      await limit(`booking-ip:${ip}`, "page-booking", 5);

      const form = await req.formData();
      const name = stringField(form.get("name"), "الاسم", 120);
      const contact = stringField(form.get("contact"), "وسيلة التواصل", 160);
      const preferredAt = String(form.get("preferredAt") || "")
        .slice(0, 120)
        .trim();
      const message = String(form.get("message") || "")
        .slice(0, 2000)
        .trim();

      // يُحفظ أولاً: الطلب يجب أن ينجو من بريد غير مضبوط أو فاشل.
      await db.insert(pageBookings).values({
        pageId: found.id,
        ownerId: found.ownerId,
        name,
        contact,
        preferredAt,
        message,
      });

      const inbox = found.contactEmail.trim();
      if (inbox && noticesReady())
        await sendNotice({
          to: inbox,
          subject: `طلب حجز جديد · ${found.title}`,
          text: [
            `الاسم: ${name}`,
            `التواصل: ${contact}`,
            preferredAt ? `الموعد المفضل: ${preferredAt}` : "",
            message ? `الرسالة: ${message}` : "",
            `الصفحة: ${found.title} (/p/${found.slug})`,
          ]
            .filter(Boolean)
            .join("\n"),
        }).catch(() => {
          /* محفوظ أصلاً، والمالك يراه داخل المنصة. */
        });

      return page(
        shell(
          found.title,
          `<section style="max-width:560px;margin:64px auto;padding:28px;border:1px solid #d9d9d9;border-radius:12px;font-family:system-ui,sans-serif;text-align:center">
        <h1 style="font-size:20px;margin:0 0 12px">تم استلام طلبك</h1>
        <p style="color:#555;line-height:1.9;margin:0">سنعود إليك قريباً على وسيلة التواصل التي تركتها.</p>
      </section>`,
        ),
      );
    }

    if (req.method !== "GET") throw new ApiError(405, "طريقة الطلب غير مدعومة.");
    // عدّاد بأفضل جهد: الصفحة تُعرض حتى لو فشلت الكتابة.
    await db
      .update(publishedPages)
      .set({ views: sql`${publishedPages.views} + 1` })
      .where(eq(publishedPages.id, found.id))
      .catch(() => {});

    const safe = sanitizePageHtml(found.content);
    const form = found.kind === "booking" ? bookingForm(found.slug) : "";
    // مستند كامل من المالك يُقدَّم كما هو، والمقتطف يُغلَّف. وفي الحالتين
    // نموذج الحجز من عندنا وينتهي داخل الـ body.
    const html = /<html[\s>]/i.test(safe)
      ? form
        ? /<\/body>/i.test(safe)
          ? safe.replace(/<\/body>/i, `${form}</body>`)
          : safe + form
        : safe
      : shell(found.title, safe + form);
    return page(html);
  } catch (error) {
    const body = safeError(error);
    const status = error instanceof ApiError ? error.status : 500;
    return page(
      shell(
        "تعذّر إتمام الطلب",
        `<p style="font-family:system-ui,sans-serif;text-align:center;margin:64px auto">${escape(body.error)}</p>`,
      ),
      status,
    );
  }
};

export const config: Config = { path: ["/p/:slug", "/p/:slug/book"] };
