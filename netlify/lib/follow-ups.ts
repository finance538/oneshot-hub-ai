import { and, desc, eq, inArray, lte, or, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import { followUps } from "../../db/schema.js";
import {
  ApiError,
  audit,
  authenticate,
  limit,
  payload,
  stringField,
  uuid,
} from "./security.js";
import {
  FOLLOW_UP_STATUSES,
  defaultDraft,
  isDue,
  reminderDays,
} from "../../shared/follow-ups.js";
import { mailable } from "./follow-up-mail.js";

/**
 * متابعة العروض — تتذكّر العرض المرسل وتُنبّه عند موعده، ولا تُرسل شيئاً.
 *
 * لا نقرأ بريد المالك ولا نستنتج أن العميل ردّ: المنصة لا تملك هذا العلم،
 * وتخمينه يعني إسكات تنبيه عن عرض لم يُردّ عليه. المالك يُعلّم «ردّ» بنفسه،
 * والمسودة جاهزة أمامه ينسخها ويرسلها كما يراه.
 */

export async function followUpsRoute(req: Request, path: string) {
  const user = await authenticate(req);
  const db = database();
  const rest = path.replace(/^\/api\/follow-ups\/?/, "");
  const method = req.method;

  if (!rest) {
    if (method === "GET") {
      const rows = await db
        .select()
        .from(followUps)
        .where(
          and(
            eq(followUps.ownerId, user.id),
            inArray(followUps.status, ["waiting", "due"]),
          ),
        )
        .orderBy(desc(followUps.sentAt))
        .limit(80);
      return {
        followUps: rows.map((row) => ({
          ...row,
          due: row.status === "due" || isDue(row.sentAt, row.remindAfterDays),
        })),
      };
    }
    if (method === "POST") {
      await limit(user.id, "follow-up", 30);
      const body = await payload(req, 20000);
      const subject = stringField(body.subject, "موضوع العرض", 200);
      const contact = stringField(body.contact, "جهة الاتصال", 200);
      // العنوان يأتي صريحاً أو من جهة الاتصال إن كانت بريداً.
      const candidate = String(body.contactEmail || contact).trim();
      const contactEmail = mailable(candidate) ? candidate.slice(0, 200) : "";
      if (body.contactEmail && !contactEmail)
        throw new ApiError(400, "بريد العميل غير صالح للمراسلة.");
      const wantsMail = body.autoSend === true || body.autoReply === true;
      if (wantsMail && !contactEmail)
        throw new ApiError(
          400,
          "المتابعة التلقائية تحتاج بريد العميل.",
          "FOLLOW_UP_EMAIL_REQUIRED",
        );
      const [created] = await db
        .insert(followUps)
        .values({
          ownerId: user.id,
          contact,
          contactEmail,
          subject,
          remindAfterDays: reminderDays(body.remindAfterDays),
          sentAt: body.sentAt ? new Date(String(body.sentAt)) : new Date(),
          draft: defaultDraft(subject, "ar"),
          autoSend: body.autoSend === true,
          autoReply: body.autoReply === true,
        })
        .returning();
      await audit(user.id, "follow_up_started", created.id);
      return { followUp: created };
    }
    throw new ApiError(405, "طريقة الطلب غير مدعومة.");
  }

  const id = uuid(rest.split("/")[0]);
  const scope = and(eq(followUps.id, id), eq(followUps.ownerId, user.id));
  const [owned] = await db.select().from(followUps).where(scope);
  if (!owned) throw new ApiError(404, "المتابعة غير موجودة.");

  if (method === "DELETE") {
    await db.delete(followUps).where(scope);
    return { deleted: true };
  }
  if (method === "PATCH") {
    const body = await payload(req, 20000);
    const changes: {
      status?: string;
      draft?: string;
      remindAfterDays?: number;
      autoSend?: boolean;
      autoReply?: boolean;
    } = {};
    if (typeof body.autoSend === "boolean") changes.autoSend = body.autoSend;
    if (typeof body.autoReply === "boolean") changes.autoReply = body.autoReply;
    if (
      (changes.autoSend || changes.autoReply) &&
      !mailable(owned.contactEmail)
    )
      throw new ApiError(
        400,
        "المتابعة التلقائية تحتاج بريد العميل.",
        "FOLLOW_UP_EMAIL_REQUIRED",
      );
    if (typeof body.status === "string") {
      if (!(FOLLOW_UP_STATUSES as readonly string[]).includes(body.status))
        throw new ApiError(400, "حالة المتابعة غير معروفة.");
      changes.status = body.status;
    }
    if (typeof body.draft === "string")
      changes.draft = stringField(body.draft, "المسودة", 4000);
    if (body.remindAfterDays !== undefined)
      changes.remindAfterDays = reminderDays(body.remindAfterDays);
    if (!Object.keys(changes).length) throw new ApiError(400, "لا يوجد تغيير.");
    const [updated] = await db
      .update(followUps)
      .set({ ...changes, updatedAt: new Date() })
      .where(scope)
      .returning();
    return { followUp: updated };
  }
  throw new ApiError(405, "طريقة الطلب غير مدعومة.");
}

/**
 * الدفعة المجدولة: تُعلّم ما حلّ موعده فقط. لا إرسال، ولا قراءة بريد، ولا
 * استنتاج ردّ — تغيير الحالة الوحيد هو waiting ← due، وهو مبني على تاريخ
 * الإرسال وعدد الأيام الذي اختاره المالك نفسه.
 */
export async function markDueFollowUps() {
  const db = database();
  const now = new Date();
  const marked = await db
    .update(followUps)
    .set({ status: "due", checkedAt: now, updatedAt: now })
    .where(
      and(
        eq(followUps.status, "waiting"),
        lte(
          followUps.sentAt,
          sql`now() - (${followUps.remindAfterDays} || ' days')::interval`,
        ),
      ),
    )
    .returning({ id: followUps.id });
  return { marked: marked.length };
}
