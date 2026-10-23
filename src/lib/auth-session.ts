import { getUser, refreshSession } from "@netlify/identity";

export class AuthTimeoutError extends Error {
  constructor() {
    super("Authentication response timed out");
  }
}

// The SDK does not expose an AbortSignal for browser account operations.
// Bound the UI wait, do not automatically repeat a mutation, and ignore late
// completions in callers. The SDK remains the only owner of auth credentials.
export async function waitForAuth<T>(
  operation: Promise<T>,
  milliseconds = 20000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AuthTimeoutError()), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

let refreshing: Promise<void> | undefined;
export function prepareIdentitySession() {
  // Coalesce requests after tab suspension so a refresh token is not exchanged
  // concurrently by every data panel. Refresh before sending, never replay API mutations.
  if (!refreshing) {
    refreshing = waitForAuth(
      (async () => {
        const user = await getUser();
        if (user) await refreshSession();
      })(),
    ).finally(() => {
      refreshing = undefined;
    });
  }
  return refreshing;
}

const returnKey = "oneshot.auth.return";
export function saveAuthReturn(path: string) {
  try {
    sessionStorage.setItem(returnKey, path);
  } catch {
    /* Optional navigation hint. */
  }
}
export function takeAuthReturn(): string | null {
  try {
    const path = sessionStorage.getItem(returnKey);
    sessionStorage.removeItem(returnKey);
    if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
    const url = new URL(path, location.origin);
    return url.origin === location.origin
      ? url.pathname + url.search + url.hash
      : null;
  } catch {
    return null;
  }
}
