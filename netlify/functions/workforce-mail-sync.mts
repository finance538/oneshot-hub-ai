import type { Config } from "@netlify/functions";
import { and, asc, eq, sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import { workforceConnections as connections } from "../../db/schema.js";
import { syncMailbox } from "../lib/workforce-mail.js";

export default async () => {
  // One bounded mailbox per minute, oldest first. No AI invocation or unsolicited sending.
  const [row] = await database()
    .select({ id: connections.id, organizationId: connections.organizationId })
    .from(connections)
    .where(
      and(
        eq(connections.kind, "mail"),
        eq(connections.syncEnabled, true),
        sql`(${connections.leaseUntil} is null or ${connections.leaseUntil} < now())`,
        sql`(${connections.lastSyncAt} is null or ${connections.lastSyncAt} < now() - interval '5 minutes')`,
      ),
    )
    .orderBy(
      sql`${connections.lastSyncAt} asc nulls first`,
      asc(connections.createdAt),
    )
    .limit(1);
  if (row) {
    try {
      await syncMailbox(row.organizationId, row.id);
    } catch {
      /* State recorded by syncMailbox; never log provider payloads. */
    }
  }
};
export const config: Config = { schedule: "* * * * *" };
