import { and, desc, eq } from "drizzle-orm";
import { database } from "../../db/index.js";
import { pageBookings, publishedPages, templates } from "../../db/schema.js";
import {
  ApiError,
  audit,
  authenticate,
  limit,
  payload,
  stringField,
  uuid,
} from "./security.js";
import { templateVariables } from "../../shared/templates.js";
import { PAGE_KINDS, pageSlug, type PageKind } from "../../shared/page-html.js";

/**
 * أدوات المالك: القوالب المحفوظة والصفحات الفورية.
 *
 * القوالب مخرجات يُعاد استخدامها، أجزاؤها المتغيّرة {{متغيّرات}} تُقرأ من
 * المحتوى نفسه. الصفحات الفورية صفحة تعريف أو حجز على رابط عام، وما يصل من
 * طلبات حجز يُقرأ هنا. العرض العام نفسه في دالة page.mts، لا هنا.
 */

const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

export async function studioRoute(req: Request, path: string) {
  const user = await authenticate(req);
  const db = database();
  const method = req.method;
  const rest = path.replace(/^\/api\/studio\//, "");

  // ---------------------------------------------------------------- القوالب
  if (rest === "templates") {
    if (method === "GET") {
      const rows = await db
        .select()
        .from(templates)
        .where(eq(templates.ownerId, user.id))
        .orderBy(desc(templates.updatedAt))
        .limit(60);
      return {
        templates: rows.map((row) => ({
          ...row,
          variables: templateVariables(row.content),
        })),
      };
    }
    if (method === "POST") {
      await limit(user.id, "template", 20);
      const body = await payload(req, 120000);
      const [created] = await db
        .insert(templates)
        .values({
          ownerId: user.id,
          title: stringField(body.title, "عنوان القالب", 120),
          kind: ["html", "svg", "code", "document"].includes(String(body.kind))
            ? String(body.kind)
            : "document",
          language:
            typeof body.language === "string" ? body.language.slice(0, 40) : "",
          content: stringField(body.content, "محتوى القالب", 100000),
        })
        .returning();
      await audit(user.id, "template_saved", created.id);
      return {
        template: { ...created, variables: templateVariables(created.content) },
      };
    }
    throw new ApiError(405, "طريقة الطلب غير مدعومة.");
  }

  if (rest.startsWith("templates/")) {
    const id = uuid(rest.split("/")[1]);
    const scope = and(eq(templates.id, id), eq(templates.ownerId, user.id));
    const [template] = await db.select().from(templates).where(scope);
    if (!template) throw new ApiError(404, "القالب غير موجود.");
    if (method === "GET")
      return {
        template: {
          ...template,
          variables: templateVariables(template.content),
        },
      };
    if (method === "DELETE") {
      await db.delete(templates).where(scope);
      return { deleted: true };
    }
    if (method === "PATCH") {
      const body = await payload(req, 120000);
      const changes: { title?: string; content?: string } = {};
      if (typeof body.title === "string")
        changes.title = stringField(body.title, "عنوان القالب", 120);
      if (typeof body.content === "string")
        changes.content = stringField(body.content, "محتوى القالب", 100000);
      if (!Object.keys(changes).length)
        throw new ApiError(400, "لا يوجد تغيير.");
      const [updated] = await db
        .update(templates)
        .set({ ...changes, updatedAt: new Date() })
        .where(scope)
        .returning();
      return {
        template: { ...updated, variables: templateVariables(updated.content) },
      };
    }
    throw new ApiError(405, "طريقة الطلب غير مدعومة.");
  }

  // ---------------------------------------------------------------- الصفحات
  if (rest === "pages") {
    if (method === "GET")
      return {
        pages: await db
          .select()
          .from(publishedPages)
          .where(eq(publishedPages.ownerId, user.id))
          .orderBy(desc(publishedPages.updatedAt))
          .limit(40),
      };
    if (method === "POST") {
      await limit(user.id, "page", 10);
      const body = await payload(req, 200000);
      const title = stringField(body.title, "عنوان الصفحة", 120);
      const content = stringField(body.content, "محتوى الصفحة", 150000);
      const kind = (PAGE_KINDS as readonly string[]).includes(String(body.kind))
        ? (String(body.kind) as PageKind)
        : "bio";
      const wanted = pageSlug(
        typeof body.slug === "string" && body.slug.trim() ? body.slug : title,
      );
      if (!wanted)
        throw new ApiError(
          400,
          "اختر عنواناً للرابط من حروف أو أرقام.",
          "PAGE_SLUG_INVALID",
        );
      const contactEmail =
        typeof body.contactEmail === "string" &&
        EMAIL.test(body.contactEmail.trim())
          ? body.contactEmail.trim().slice(0, 160)
          : "";
      if (kind === "booking" && !contactEmail)
        throw new ApiError(
          400,
          "صفحة الحجز تحتاج بريداً تصل إليه الطلبات.",
          "PAGE_CONTACT_REQUIRED",
        );
      // الرابط عام: من سبق إليه فهو له.
      const [existing] = await db
        .select({ id: publishedPages.id })
        .from(publishedPages)
        .where(eq(publishedPages.slug, wanted));
      if (existing)
        throw new ApiError(
          409,
          "هذا العنوان محجوز. اختر غيره.",
          "PAGE_SLUG_TAKEN",
        );
      const [created] = await db
        .insert(publishedPages)
        .values({
          ownerId: user.id,
          slug: wanted,
          title,
          kind,
          content,
          contactEmail,
        })
        .returning();
      await audit(user.id, "page_published", created.id);
      return { page: created };
    }
    throw new ApiError(405, "طريقة الطلب غير مدعومة.");
  }

  if (rest.startsWith("pages/")) {
    const [, rawId, section] = rest.split("/");
    const id = uuid(rawId);
    const scope = and(
      eq(publishedPages.id, id),
      eq(publishedPages.ownerId, user.id),
    );
    const [owned] = await db.select().from(publishedPages).where(scope);
    if (!owned) throw new ApiError(404, "الصفحة غير موجودة.");
    if (section === "bookings" && method === "GET")
      return {
        bookings: await db
          .select()
          .from(pageBookings)
          .where(
            and(eq(pageBookings.pageId, id), eq(pageBookings.ownerId, user.id)),
          )
          .orderBy(desc(pageBookings.createdAt))
          .limit(100),
      };
    if (method === "GET") return { page: owned };
    if (method === "DELETE") {
      await db.delete(publishedPages).where(scope);
      return { deleted: true };
    }
    if (method === "PATCH") {
      const body = await payload(req, 200000);
      const changes: {
        title?: string;
        content?: string;
        published?: boolean;
        contactEmail?: string;
      } = {};
      if (typeof body.title === "string")
        changes.title = stringField(body.title, "عنوان الصفحة", 120);
      if (typeof body.content === "string")
        changes.content = stringField(body.content, "محتوى الصفحة", 150000);
      if (typeof body.published === "boolean") changes.published = body.published;
      if (typeof body.contactEmail === "string")
        changes.contactEmail = EMAIL.test(body.contactEmail.trim())
          ? body.contactEmail.trim().slice(0, 160)
          : "";
      if (!Object.keys(changes).length)
        throw new ApiError(400, "لا يوجد تغيير.");
      if (owned.kind === "booking" && changes.contactEmail === "")
        throw new ApiError(
          400,
          "صفحة الحجز تحتاج بريداً تصل إليه الطلبات.",
          "PAGE_CONTACT_REQUIRED",
        );
      const [updated] = await db
        .update(publishedPages)
        .set({ ...changes, updatedAt: new Date() })
        .where(scope)
        .returning();
      return { page: updated };
    }
    throw new ApiError(405, "طريقة الطلب غير مدعومة.");
  }

  throw new ApiError(404, "المسار غير موجود.");
}
