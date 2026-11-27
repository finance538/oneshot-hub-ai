// Passwordless accounts for the shared OneShot sign-in. A code sent to an address proves control of
// it, so the first successful code creates the account already confirmed.
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { database } from "../../db/index.js";
import { oneshotAccounts } from "../../db/schema.js";
import { ownerRoles } from "../../shared/auth-policy.js";
import { ApiError } from "./security.js";

export type AccountUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
};

type AccountRow = typeof oneshotAccounts.$inferSelect;

function toAccountUser(row: AccountRow): AccountUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    roles: ownerRoles({
      email: row.email,
      confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : undefined,
      roles: [],
    }),
  };
}

export async function findOrCreateAccount(
  rawEmail: string,
  channel: "email" | "sms",
): Promise<{ user: AccountUser; created: boolean }> {
  const email = rawEmail.trim().toLowerCase();
  const db = database();
  const [existing] = await db
    .select()
    .from(oneshotAccounts)
    .where(eq(oneshotAccounts.email, email))
    .limit(1);
  if (existing) {
    if (!existing.confirmedAt) {
      const [confirmed] = await db
        .update(oneshotAccounts)
        .set({ confirmedAt: new Date() })
        .where(eq(oneshotAccounts.id, existing.id))
        .returning();
      return { user: toAccountUser(confirmed), created: false };
    }
    return { user: toAccountUser(existing), created: false };
  }

  if (process.env.ONESHOT_SIGNUP_DISABLED === "true")
    throw new ApiError(403, "التسجيل يتطلب دعوة.", "SIGNUP_DISABLED");

  const [inserted] = await db
    .insert(oneshotAccounts)
    .values({ id: randomUUID(), email, channel, confirmedAt: new Date() })
    .onConflictDoNothing({ target: oneshotAccounts.email })
    .returning();
  if (inserted) return { user: toAccountUser(inserted), created: true };

  // A concurrent first sign-in won the insert; the account now exists.
  const [winner] = await db
    .select()
    .from(oneshotAccounts)
    .where(eq(oneshotAccounts.email, email))
    .limit(1);
  if (!winner) throw new ApiError(503, "تعذّر فتح الحساب حالياً. حاول مجدداً.", "ACCOUNT_UNAVAILABLE");
  return { user: toAccountUser(winner), created: false };
}
