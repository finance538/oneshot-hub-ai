import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import {
  auditEvents,
  orders,
  pageBookings,
  publishedPages,
  quoteRequests,
  workforceTasks,
} from "../../db/schema.js";
import { ApiError, authenticate, limit } from "./security.js";
import { geminiClient } from "./gemini.js";

/**
 * نبض الأعمال — قراءة أسبوعية واحدة للمنشأة.
 *
 * كل رقم هنا محسوب من شيء سجّلته المنصة فعلاً. وما ليس متاحاً — عائد
 * الإعلانات، نسبة الاحتفاظ، أفضل وقت للنشر — يغيب ولا يُقدَّر، لأن رقماً
 * مختلقاً في ملخص أسبوعي أسوأ من رقم ناقص: يُبنى عليه قرار.
 *
 * السرد مكتوب من هذه الأعداد ولا شيء غيرها.
 */

const WINDOW_DAYS = 7;

export async function pulseRoute(req: Request) {
  if (req.method !== "GET") throw new ApiError(405, "طريقة الطلب غير مدعومة.");
  const user = await authenticate(req);
  const db = database();
  await limit(user.id, "pulse", 6);

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

  const [paid, quotes, pages, bookings, tasks, trail] = await Promise.all([
    db
      .select({
        currency: orders.currency,
        value: count(),
        revenueCents: sql<string>`coalesce(sum(${orders.amountCents}),0)::text`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.executionMode, "PRODUCTION"),
          sql`lower(${orders.status}) in ('paid','captured')`,
          gte(orders.createdAt, since),
        ),
      )
      .groupBy(orders.currency),
    db
      .select({ value: count() })
      .from(quoteRequests)
      .where(gte(quoteRequests.createdAt, since)),
    db
      .select({
        views: sql<number>`coalesce(sum(${publishedPages.views}),0)`,
        pages: count(),
      })
      .from(publishedPages)
      .where(eq(publishedPages.ownerId, user.id)),
    db
      .select({ value: count() })
      .from(pageBookings)
      .where(
        and(
          eq(pageBookings.ownerId, user.id),
          gte(pageBookings.createdAt, since),
        ),
      ),
    db
      .select({ status: workforceTasks.status, value: count() })
      .from(workforceTasks)
      .where(gte(workforceTasks.createdAt, since))
      .groupBy(workforceTasks.status),
    db
      .select({ action: auditEvents.action, value: count() })
      .from(auditEvents)
      .where(and(eq(auditEvents.actor, user.id), gte(auditEvents.createdAt, since)))
      .groupBy(auditEvents.action)
      .orderBy(desc(count()))
      .limit(5),
  ]);

  const byTask = Object.fromEntries(
    tasks.map((row) => [row.status, Number(row.value)]),
  );

  const summary = {
    windowDays: WINDOW_DAYS,
    sales: paid.map((row) => ({
      currency: row.currency,
      orders: Number(row.value),
      revenueCents: Number(row.revenueCents),
    })),
    quoteRequests: Number(quotes[0]?.value || 0),
    pages: {
      published: Number(pages[0]?.pages || 0),
      views: Number(pages[0]?.views || 0),
      bookings: Number(bookings[0]?.value || 0),
    },
    tasks: {
      open: byTask.open || byTask.pending || 0,
      done: byTask.done || byTask.completed || 0,
    },
    mostUsed: trail.map((row) => ({
      action: row.action,
      count: Number(row.value),
    })),
  };

  // السرد قراءة للأرقام أعلاه — ولا يُعطى غيرها.
  let narrative = "";
  try {
    const response = await geminiClient().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `اكتب قراءة أسبوعية للأعمال بالعربية السعودية المباشرة، ٧٠ كلمة كحد أقصى، من هذه الأعداد لآخر ${WINDOW_DAYS} أيام. قل ما يلفت النظر وخطوة واحدة مفيدة بعدها. استخدم هذه الأرقام فقط — لا تخترع رقماً ولا اتجاهاً ولا مقارنة بأسبوع سابق، ولا تذكر مؤشراً غير موجود هنا.\n\n${JSON.stringify(summary)}`,
            },
          ],
        },
      ],
      config: { maxOutputTokens: 512, httpOptions: { timeout: 20000 } },
    });
    narrative = (response.text || "").trim().slice(0, 1200);
  } catch {
    // قراءة بلا سرد أفضل من سرد مختلق.
    narrative = "";
  }

  return { ...summary, narrative };
}
