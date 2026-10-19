import type { Config } from "@netlify/functions";
import { lt } from "drizzle-orm";
import { database } from "../../db/index.js";
import { requestLimits } from "../../db/schema.js";
export default async () => {
  await database()
    .delete(requestLimits)
    .where(lt(requestLimits.expiresAt, new Date()));
};
export const config: Config = { schedule: "@daily" };
