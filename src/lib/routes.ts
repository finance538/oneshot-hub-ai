export function safeReturnPath(value: unknown, origin: string): string | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return null;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || /^\/sso(?:\/|$)/.test(url.pathname))
      return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function appRoute(
  url: URL,
): "receiver" | "tools" | "hub" | "workspace" | "missing" {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (["/sso/start", "/sso/callback"].includes(path)) return "receiver";
  if (/^\/(tools|solutions)(\/|$)/.test(path) || path === "/admin/radar")
    return "tools";
  if (
    [
      "/hub",
      "/sso/authorize",
      "/studio",
      "/ai-studio",
      "/brand-studio",
      "/sign-in",
    ].includes(path)
  )
    return "hub";
  if (path === "/") {
    if (
      url.hostname === "pay.1shotcam.com" ||
      url.searchParams.has("order") ||
      ["gateway", "vault", "ceo", "ai"].includes(
        url.searchParams.get("module") || "",
      )
    )
      return "workspace";
    return "hub";
  }
  if (
    /^\/(workforce(?:\/[^/]+)?|products(?:\/[^/]+)?|guides(?:\/[^/]+)?|about|vision|privacy|refund|terms|support|accounts|api-integration)$/.test(
      path,
    )
  )
    return "workspace";
  return "missing";
}
