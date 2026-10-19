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
export async function ecosystemUser(): Promise<SessionUser | null> {
  const session = ecosystemSession();
  if (!session) return null;
  const response = await fetch(`${hubOrigin}/api/ecosystem/me`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
    credentials: "omit",
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 401 || response.status === 403) {
    clearEcosystemSession();
    return null;
  }
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/json")
  )
    throw new Error("Shared account service unavailable.");
  const body = await response.json();
  return body.user || null;
}
