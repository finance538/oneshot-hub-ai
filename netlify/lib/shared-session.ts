import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { database } from "../../db/index.js";
import { oneshotAccounts } from "../../db/schema.js";
import { ownerRoles } from "../../shared/auth-policy.js";
import type { User } from "./security.js";

export const digest = (value: string) =>
  createHash("sha256").update(value).digest("base64url");

export function cookieValue(req: Request, name: string) {
  return req.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

/**
 * Loads a confirmed account by id from the shared accounts table. Ecosystem grants and
 * signed-in sessions both name the account this way.
 */
export async function verifiedIdentityUser(ownerId: string): Promise<User | null> {
  const [row] = await database()
    .select()
    .from(oneshotAccounts)
    .where(eq(oneshotAccounts.id, ownerId))
    .limit(1);
  if (!row || !row.confirmedAt) return null;
  const confirmedAt = row.confirmedAt.toISOString();
  const roles = ownerRoles({ email: row.email, confirmedAt, roles: [] });
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    roles,
    confirmedAt,
    createdAt: row.createdAt.toISOString(),
    userMetadata: { full_name: row.name },
    appMetadata: { roles },
  };
}
