import { admin, AuthError, type User } from "@netlify/identity";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { database } from "../../db/index.js";
import { sharedSessions } from "../../db/schema.js";
import {
  SESSION_COOKIE,
  sharedCookieAttributes,
} from "../../shared/auth-policy.js";
import { persistOwnerRole } from "./identity-owner.js";

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

export async function sharedSessionUser(req: Request): Promise<User | null> {
  const token = cookieValue(req, SESSION_COOKIE);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [session] = await database()
    .select()
    .from(sharedSessions)
    .where(
      and(
        eq(sharedSessions.tokenHash, digest(token)),
        gt(sharedSessions.expiresAt, new Date()),
      ),
    );
  if (!session) return null;
  return verifiedIdentityUser(session.ownerId);
}

export async function verifiedIdentityUser(
  ownerId: string,
): Promise<User | null> {
  try {
    const user = await admin.getUser(ownerId);
    return user.confirmedAt ? await persistOwnerRole(user) : null;
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) return null;
    // An Identity outage is not evidence that this account signed out.
    throw error;
  }
}

export async function createSharedSession(req: Request, ownerId: string) {
  const token = randomBytes(32).toString("base64url");
  const age = 7 * 24 * 60 * 60;
  await database().transaction(async (tx) => {
    const oldToken = cookieValue(req, SESSION_COOKIE);
    if (oldToken)
      await tx
        .delete(sharedSessions)
        .where(eq(sharedSessions.tokenHash, digest(oldToken)));
    await tx
      .delete(sharedSessions)
      .where(lt(sharedSessions.expiresAt, new Date()));
    await tx.insert(sharedSessions).values({
      tokenHash: digest(token),
      ownerId,
      expiresAt: new Date(Date.now() + age * 1000),
    });
  });
  return `${SESSION_COOKIE}=${token}; ${sharedCookieAttributes(new URL(req.url).origin)}; Max-Age=${age}`;
}

export async function revokeSharedSession(req: Request) {
  const token = cookieValue(req, SESSION_COOKIE);
  if (token)
    await database()
      .delete(sharedSessions)
      .where(eq(sharedSessions.tokenHash, digest(token)));
  return `${SESSION_COOKIE}=; ${sharedCookieAttributes(new URL(req.url).origin)}; Max-Age=0`;
}
