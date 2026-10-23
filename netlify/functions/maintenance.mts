import type { Config } from "@netlify/functions";
import { lt } from "drizzle-orm";
import { database } from "../../db/index.js";
import { requestLimits, diagnosticEvents } from "../../db/schema.js";
export default async () => {
  await database()
    .delete(diagnosticEvents)
    .where(
      lt(diagnosticEvents.createdAt, new Date(Date.now() - 14 * 86400000)),
    );
  await database()
    .delete(requestLimits)
    .where(lt(requestLimits.expiresAt, new Date()));
};
export const config: Config = { schedule: "@daily" };
