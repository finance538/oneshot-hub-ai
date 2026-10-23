import { productionOrigin } from "../../shared/auth-policy";
import { ecosystemApps, hubOrigin } from "../../shared/ecosystem";
import type { SessionUser } from "../components/auth";
const sessionKey = "oneshot.ecosystem.session.v1";
export const receiverApp = () =>
  ecosystemApps.find(
    (app) => app.id !== "hub" && app.origin === location.origin,
  );
export function ecosystemSession(): {
  sessionToken: string;
  expiresAt: string;
} | null {
  if (!receiverApp()) return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(sessionKey) || "null");
    if (
      value &&
      /^osh_[A-Za-z0-9_-]{43}$/.test(value.sessionToken) &&
      Date.parse(value.expiresAt) > Date.now()
    )
      return value;
    sessionStorage.removeItem(sessionKey);
  } catch {
    /* Storage may be unavailable. A new sign-in is required. */
  }
  return null;
}
export function saveEcosystemSession(value: {
  sessionToken: string;
  expiresAt: string;
}) {
  if (
    !receiverApp() ||
    !/^osh_[A-Za-z0-9_-]{43}$/.test(value.sessionToken) ||
    !(Date.parse(value.expiresAt) > Date.now())
  )
    throw new Error("Invalid ecosystem session.");
  sessionStorage.setItem(
    sessionKey,
    JSON.stringify({
      sessionToken: value.sessionToken,
      expiresAt: value.expiresAt,
    }),
  );
}
export function clearEcosystemSession() {
  try {
    sessionStorage.removeItem(sessionKey);
  } catch {
    /* No stored session. */
  }
}
export const authOrigin = () =>
  productionOrigin(location.origin) ? hubOrigin : location.origin;
export function googleLoginUrl(returnTo = location.href) {
  const url = new URL("/api/auth/google/start", authOrigin());
  url.searchParams.set("return_to", returnTo);
  return url.href;
}
let sharedCookieSession = false;
export const hasSharedCookieSession = () => sharedCookieSession;
export async function ecosystemUser(): Promise<SessionUser | null> {
  const response = await fetch(`${authOrigin()}/api/session`, {
    credentials: "include",
    signal: AbortSignal.timeout(10000),
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/json")
  )
    throw new Error("Shared account service unavailable.");
  const body = await response.json();
  sharedCookieSession = body.shared === true;
  if (body.user) clearEcosystemSession();
  const legacy = ecosystemSession();
  if (!body.user && !sharedCookieSession && legacy) {
    const existing = await fetch(`${hubOrigin}/api/ecosystem/me`, {
      headers: { Authorization: `Bearer ${legacy.sessionToken}` },
      credentials: "omit",
      signal: AbortSignal.timeout(10000),
    });
    if (existing.status === 401 || existing.status === 403)
      clearEcosystemSession();
    else {
      if (!existing.ok) throw new Error("Shared account service unavailable.");
      return (await existing.json()).user || null;
    }
  }
  return body.user || null;
}
let syncingIdentity: Promise<SessionUser | null> | undefined;
export function syncIdentitySession(): Promise<SessionUser | null> {
  if (!syncingIdentity)
    syncingIdentity = syncIdentity().finally(() => {
      syncingIdentity = undefined;
    });
  return syncingIdentity;
}
async function syncIdentity(): Promise<SessionUser | null> {
  const response = await fetch(`${location.origin}/api/auth/session`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Could not synchronize sign-in.");
  sharedCookieSession = true;
  return (await response.json()).user || null;
}
export async function logoutSharedSession() {
  await syncingIdentity?.catch(() => {});
  const response = await fetch(`${authOrigin()}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error("Could not sign out of the shared session.");
  sharedCookieSession = false;
}
