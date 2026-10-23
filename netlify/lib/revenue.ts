import { and, eq, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import { orders } from "../../db/schema.js";
import type { RevenueSummary } from "../../shared/commerce.js";

export const paidOrderPredicate = () =>
  and(
    eq(orders.executionMode, "PRODUCTION"),
    sql`lower(${orders.status}) in ('paid', 'captured')`,
  );
export async function verifiedRevenue(): Promise<RevenueSummary> {
  const [row] = await database()
    .select({
      paidOrders: sql<number>`count(*)::int`,
      revenueCents: sql<string>`coalesce(sum(${orders.amountCents}), 0)::text`,
    })
    .from(orders)
    .where(and(paidOrderPredicate(), eq(orders.currency, "SAR")));
  return {
    kind: "verified_paid",
    currency: "SAR",
    paidOrders: Number(row.paidOrders),
    revenueCents: Number(row.revenueCents),
    checkedAt: new Date().toISOString(),
  };
}
