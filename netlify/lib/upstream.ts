import { sql } from "drizzle-orm";
import { database } from "../../db/index.js";
import { nativeGateways } from "./payment-providers.js";

// Compatibility shape for existing clients; this now reports the local Netlify
// application/database, never VPS availability or merchant-provider readiness.
export async function coreHealth() {
  const connected = await database()
    .execute(sql`select 1`)
    .then(() => true)
    .catch(() => false);
  return {
    connected,
    secure: true,
    databaseVerified: connected,
    runtime: "netlify",
    providerVerified: false,
    supportedGateways: nativeGateways,
  };
}
export function checkoutUrl(value: unknown, gateway?: string): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const domains =
      gateway === "stripe"
        ? ["checkout.stripe.com"]
        : [
            "telr.com",
            "paytabs.com",
            "stripe.com",
            "moyasar.com",
            "hyperpay.com",
            "oppwa.com",
            "tap.company",
            "checkout.com",
          ];
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      return null;
    return domains.some(
      (h) => url.hostname === h || url.hostname.endsWith(`.${h}`),
    )
      ? url.href
      : null;
  } catch {
    return null;
  }
}
