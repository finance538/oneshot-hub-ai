import type { Config } from "@netlify/functions";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import { orders } from "../../db/schema.js";
import { reconcilePayment } from "../lib/payments.js";

// Netlify invokes this schedule on production. Each query is read-only at the
// provider; no checkout creation, retry, native webhook or public event input.
export default async () => {
  const db = database();
  const pending = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.processor, "netlify"),
        eq(orders.gateway, "stripe"),
        inArray(orders.status, ["awaiting_payment", "unconfirmed"]),
        isNotNull(orders.upstreamId),
        sql`${orders.updatedAt} < now() - interval '1 minute'`,
      ),
    )
    .orderBy(asc(orders.updatedAt))
    .limit(3);
  for (const order of pending) {
    try {
      await reconcilePayment(order.id);
    } catch {
      /* Remain unconfirmed; no raw provider logs. */
    }
    // Rotate pending/unavailable requests so one order cannot starve the queue.
    await db
      .update(orders)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(orders.id, order.id),
          inArray(orders.status, ["awaiting_payment", "unconfirmed"]),
        ),
      );
  }
};
export const config: Config = { schedule: "*/5 * * * *" };
