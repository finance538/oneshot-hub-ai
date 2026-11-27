// The signed-in account lives in an HttpOnly cookie shared by every OneShot app, so the browser
// never holds a token it could refresh. The server answers who is signed in.
export type SignedInUser = { id: string; name?: string; email?: string; roles: string[] } | null;

export async function fetchCurrentUser(): Promise<SignedInUser> {
  const response = await fetch("/api/session", {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { user: SignedInUser };
  return body.user ?? null;
}

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

export function prepareIdentitySession() {
  // Shared sessions last 30 days and need no client-side refresh; nothing to prepare.
  return Promise.resolve();
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
