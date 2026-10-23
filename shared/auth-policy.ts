import { ecosystemApps } from "./ecosystem.ts";

export const OWNER_EMAIL = "finance@1shotcam.com";
export const SESSION_COOKIE = "__Secure-oneshot_session";

export function productionOrigin(origin: string) {
  return (
    ecosystemApps.some((app) => app.origin === origin) ||
    ["https://1shotcam.com", "https://app.1shotcam.com"].includes(origin)
  );
}

export function authReturnUrl(value: unknown, issuer: string): string | null {
  if (typeof value !== "string" || value.length > 4096) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.protocol !== "https:") return null;
    if (
      productionOrigin(issuer)
        ? !productionOrigin(url.origin)
        : url.origin !== issuer
    )
      return null;
    if (
      /^\/(api|\.netlify)(\/|$)/.test(url.pathname) ||
      (/^\/sso(?:\/|$)/.test(url.pathname) && url.pathname !== "/sso/authorize")
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export function sharedCookieAttributes(issuer: string) {
  return `Path=/; Secure; HttpOnly; SameSite=Lax${productionOrigin(issuer) ? "; Domain=.1shotcam.com" : ""}`;
}

export function registeredSsoClients(value: string | undefined): string[] {
  // Missing or malformed registry must not silently enable clients.
  if (!value?.trim()) return [];
  const ids = value.split(",").map((id) => id.trim());
  return [
    ...new Set(
      ids.filter((id) =>
        ecosystemApps.some((app) => app.id === id && id !== "hub"),
      ),
    ),
  ];
}

export function ownerRoles(user: {
  email?: string;
  confirmedAt?: string;
  roles?: string[];
}) {
  const roles = (user.roles || []).filter((role) => typeof role === "string");
  return user.confirmedAt && user.email?.trim().toLowerCase() === OWNER_EMAIL
    ? [...new Set([...roles, "admin"])]
    : roles;
}
