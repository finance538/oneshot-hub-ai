import { createPublicKey, verify } from "node:crypto";

export const payOrigin = "https://pay.1shotcam.com";
export const hubOrigin = "https://www.1shotcam.com";
const signaturePattern = /^[A-Za-z0-9_-]{86}$/;
const ssoProof = /^[A-Za-z0-9_-]{43}$/;
const payVisitId = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export type PayActivity =
  | { kind: "visit"; id: string; page: "/" | "/hub" }
  | { kind: "registration"; id: string; source: "local" | "hub" | "identity" | "sso"; email?: string };

export function signedInput(timestamp: string, body: string) {
  return Buffer.from(`oneshot-pay-notice:v1\n${timestamp}\n${body}`);
}

export function validPayTimestamp(timestamp: string, now = Date.now()) {
  return /^\d{13}$/.test(timestamp) && Math.abs(now - Number(timestamp)) <= 120_000;
}

export function validPaySignature(key: ReturnType<typeof createPublicKey>, timestamp: string, body: string, signature: string) {
  return signaturePattern.test(signature) && verify(null, signedInput(timestamp, body), key, Buffer.from(signature, "base64url"));
}

export function paySignupOrigin(referrer: string | null) {
  if (!referrer) return false;
  try {
    const url = new URL(referrer);
    return [hubOrigin, "https://1shotcam.com"].includes(url.origin) && url.pathname === "/sso/authorize" &&
      url.searchParams.get("appId") === "pay" &&
      ssoProof.test(url.searchParams.get("state") || "") && ssoProof.test(url.searchParams.get("challenge") || "");
  } catch { return false; }
}

export function readPayActivity(body: string): PayActivity | null {
  let event: Record<string, unknown>;
  try { event = JSON.parse(body); } catch { return null; }
  if (!event || typeof event.id !== "string" || event.id.length < 1 || event.id.length > 254) return null;
  if (event.kind === "visit" && payVisitId.test(event.id) && ["/", "/hub"].includes(event.page as string)) {
    return { kind: "visit", id: event.id.toLowerCase(), page: event.page as "/" | "/hub" };
  }
  if (event.kind === "registration" && ["local", "hub", "identity"].includes(event.source as string)) {
    const email = typeof event.email === "string" && event.email.length <= 254 && emailPattern.test(event.email) ? event.email : undefined;
    return { kind: "registration", id: event.id, source: event.source as "local" | "hub" | "identity", email };
  }
  return null;
}
