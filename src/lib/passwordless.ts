import { authOrigin } from "./ecosystem-session";
import type { SessionUser } from "../components/auth";

// Every call goes to the Hub, which issues the shared session cookie for the
// whole ecosystem, and carries cookies so the code and the browser that asked
// for it stay tied together.
async function post<T>(path: string, body?: unknown, timeoutMs = 20000) {
  const response = await fetch(`${authOrigin()}${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const value = await response.json().catch(() => null);
  if (!response.ok)
    throw new AuthRequestError(
      value?.error || "تعذّر إتمام الطلب. حاول مجدداً.",
      value?.code,
      response.status,
    );
  return value as T;
}

export class AuthRequestError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// One-time codes
// ---------------------------------------------------------------------------

export const otpSettings = () =>
  post<{ email: boolean; sms: boolean }>("/api/auth/otp/settings");

export const requestCode = (destination: string) =>
  post<{
    sent: true;
    channel: "email" | "sms";
    destination: string;
    expiresInSeconds: number;
  }>("/api/auth/otp/request", { destination });

export const verifyCode = (destination: string, code: string) =>
  post<{ user: SessionUser }>("/api/auth/otp/verify", { destination, code });

// ---------------------------------------------------------------------------
// Device lock
// ---------------------------------------------------------------------------

export const lockStatus = () =>
  post<{ pin: boolean; biometric: boolean }>("/api/auth/lock");

export const savePin = (pin: string, currentPin?: string) =>
  post<{ configured: true }>("/api/auth/lock/pin", { pin, currentPin });

export const unlockWithPin = (pin: string) =>
  post<{ unlocked: true }>("/api/auth/lock/unlock", { pin });

// Forgot PIN: a six-digit code goes to the account's verified email, then the
// same call sets the new PIN. Resetting also clears a 15-minute lockout, which
// is the one case where waiting for the timer helps nobody.
export const requestPinReset = () =>
  post<{ sent: true; destination: string; expiresInSeconds: number }>(
    "/api/auth/lock/pin/reset/request",
    {},
  );

export const confirmPinReset = (code: string, pin: string) =>
  post<{ configured: true; reset: true }>("/api/auth/lock/pin/reset/confirm", {
    code,
    pin,
  });

// ---------------------------------------------------------------------------
// Biometric — Face ID, Touch ID, fingerprint
// ---------------------------------------------------------------------------

const fromBase64Url = (value: string) =>
  Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    (character) => character.charCodeAt(0),
  );
const toBase64Url = (value: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

// Registration needs getPublicKey(), which hands the server an SPKI key and
// saves it parsing CBOR attestation. Where it is missing, the PIN still works.
export function biometricSupported() {
  return (
    typeof PublicKeyCredential !== "undefined" &&
    typeof AuthenticatorAttestationResponse !== "undefined" &&
    "getPublicKey" in AuthenticatorAttestationResponse.prototype
  );
}

// Whether this device actually has a sensor, as opposed to the browser merely
// knowing the API. Used to decide whether to offer biometric at all.
export async function biometricAvailable() {
  if (!biometricSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerBiometric(label?: string) {
  const options = await post<{
    challenge: string;
    rpId: string;
    rpName: string;
    userId: string;
    userName: string;
    algorithms: number[];
    excludeCredentials: string[];
  }>("/api/auth/lock/biometric/options", {});

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: fromBase64Url(options.challenge),
      rp: { id: options.rpId, name: options.rpName },
      user: {
        id: fromBase64Url(options.userId),
        name: options.userName,
        displayName: options.userName,
      },
      pubKeyCredParams: options.algorithms.map((alg) => ({
        type: "public-key" as const,
        alg,
      })),
      authenticatorSelection: {
        // The built-in sensor, not a security key, and the person must
        // actually present a finger or face rather than just tap.
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      excludeCredentials: options.excludeCredentials.map((id) => ({
        type: "public-key" as const,
        id: fromBase64Url(id),
      })),
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new AuthRequestError("لم يكتمل تسجيل البصمة.");

  const response = credential.response as AuthenticatorAttestationResponse;
  const publicKey = response.getPublicKey?.();
  if (!publicKey)
    throw new AuthRequestError(
      "هذا المتصفح لا يدعم تسجيل البصمة. استخدم الرمز السري.",
      "PASSKEY_UNSUPPORTED",
    );

  return post<{ registered: true }>("/api/auth/lock/biometric", {
    credentialId: credential.id,
    publicKey: toBase64Url(publicKey),
    algorithm: response.getPublicKeyAlgorithm(),
    clientDataJSON: toBase64Url(response.clientDataJSON),
    authenticatorData: toBase64Url(response.getAuthenticatorData()),
    label,
  });
}

export async function unlockWithBiometric() {
  const options = await post<{
    challenge: string;
    rpId: string;
    credentials: string[];
  }>("/api/auth/lock/biometric/challenge", {});

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: fromBase64Url(options.challenge),
      rpId: options.rpId,
      allowCredentials: options.credentials.map((id) => ({
        type: "public-key" as const,
        id: fromBase64Url(id),
      })),
      userVerification: "required",
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  if (!assertion) throw new AuthRequestError("لم يكتمل التحقق من البصمة.");

  const response = assertion.response as AuthenticatorAssertionResponse;
  return post<{ unlocked: true }>("/api/auth/lock/biometric/verify", {
    credentialId: assertion.id,
    clientDataJSON: toBase64Url(response.clientDataJSON),
    authenticatorData: toBase64Url(response.authenticatorData),
    signature: toBase64Url(response.signature),
  });
}

export const clearBiometric = () =>
  fetch(`${authOrigin()}/api/auth/lock/biometric`, {
    method: "DELETE",
    credentials: "include",
  });
