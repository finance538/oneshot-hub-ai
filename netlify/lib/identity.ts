// ============================================================================
// OneShot Identity — the single session shared by every *.1shotcam.com app
//
// Before this file, each site had its own cookie on its own host: signing in on
// ai did nothing for pay. Identity fixes that with one cookie on the parent domain,
// `Domain=1shotcam.com`, holding an HMAC-signed token that any OneShot app can
// verify with the same key — no round trip, no extra service to keep alive.
//
// Deliberate limits:
//   • identity says WHO you are; each app still owns its own roles, plans and data;
//   • the token carries no permission claims, so a stolen cookie cannot escalate;
//   • the token is stored server-side (hash only) and can be revoked instantly;
//   • existing per-app sessions keep working — this is additive, never a migration
//     that invalidates anyone already signed in.
// ============================================================================

import { createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { eq } from 'drizzle-orm';
import { database } from '../../db/index.js';
import * as schema from '../../db/schema.js';

const env = (key: string): string | undefined => process.env[key];
import { ApiError } from './security.js';
import { ownerRoles } from '../../shared/auth-policy.js';

/** Parent-domain cookie: readable by every OneShot subdomain, by nobody else. */
export const identityCookie = 'oneshot_sid';
export const identityCookieDomain = '1shotcam.com';
export const identitySessionSeconds = 60 * 60 * 24 * 30; // 30 days
export const identityTokenTtlSeconds = 60 * 15; // access lifetime inside the cookie

const VERSION = 'id1';

function signingKey(purpose: 'session' | 'refresh' = 'session') {
  const secret = env('ONESHOT_IDENTITY_SECRET');
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new ApiError(503, 'Unified sign-in is not configured on this deployment.', 'identity_unavailable');
  }
  return Buffer.from(hkdfSync('sha256', secret, 'oneshot-identity-v1', purpose, 32));
}

export function identityConfigured() {
  return Buffer.byteLength(env('ONESHOT_IDENTITY_SECRET') || '') >= 32;
}

export type IdentityClaims = {
  /** Stable account id — the same value in every app. */
  sub: string;
  email: string;
  name: string;
  /** Issued-at / expires-at, seconds since epoch. */
  iat: number;
  exp: number;
  /** Random token id, used to revoke one session without touching the rest. */
  jti: string;
};

const b64 = (value: Buffer | string) => Buffer.from(value).toString('base64url');
const nowSeconds = () => Math.floor(Date.now() / 1000);

/** `id1.<payload>.<signature>` — compact, verifiable with one HMAC. */
export function signIdentityToken(claims: Omit<IdentityClaims, 'iat' | 'exp' | 'jti'> & Partial<Pick<IdentityClaims, 'iat' | 'exp' | 'jti'>>) {
  const payload: IdentityClaims = {
    ...claims,
    iat: claims.iat ?? nowSeconds(),
    exp: claims.exp ?? nowSeconds() + identityTokenTtlSeconds,
    jti: claims.jti ?? randomBytes(12).toString('base64url'),
  };
  const body = b64(JSON.stringify(payload));
  const signature = createHmac('sha256', signingKey('session')).update(`${VERSION}.${body}`).digest('base64url');
  return { token: `${VERSION}.${body}.${signature}`, claims: payload };
}

/** Verifies signature and expiry. Returns null for anything untrusted. */
export function verifyIdentityToken(token: string | null | undefined): IdentityClaims | null {
  if (!token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) return null;
  const [, body, signature] = parts;

  const expected = createHmac('sha256', signingKey('session')).update(`${VERSION}.${body}`).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  let claims: IdentityClaims;
  try {
    claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!claims?.sub || !claims?.exp || claims.exp < nowSeconds()) return null;
  return claims;
}

export function identityCookieHeader(token: string, maxAgeSeconds = identitySessionSeconds) {
  return [
    `${identityCookie}=${token}`,
    'Path=/',
    `Domain=${identityCookieDomain}`,
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

export function clearIdentityCookieHeader() {
  return [
    `${identityCookie}=`,
    'Path=/',
    `Domain=${identityCookieDomain}`,
    'Max-Age=0',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

/** Reads the shared cookie from an incoming request. */
export function readIdentityCookie(request: Request): string {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === identityCookie) return rest.join('=');
  }
  return '';
}

/**
 * Creates a revocable identity session. The token is stored as a hash, exactly
 * like the per-app sessions, so the table is useless to an attacker.
 */
export async function issueIdentitySession(user: { ownerId?: string; id?: string; email: string; name: string }) {
  const sub = String(user.ownerId || user.id || user.email);
  const { token, claims } = signIdentityToken({ sub, email: user.email, name: user.name });
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(claims.exp * 1000);

  await database()
    .insert(schema.identitySessions)
    .values({ tokenHash, sessionId: claims.jti, accountId: sub, email: user.email, name: user.name, expiresAt });

  return { token, claims, cookie: identityCookieHeader(token), expiresAt: expiresAt.getTime() };
}

/** Verifies + checks the session still exists (revocation without rotating keys). */
export async function resolveIdentitySession(request: Request) {
  const token = readIdentityCookie(request);
  const claims = verifyIdentityToken(token);
  if (!claims) return null;

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const rows = await database()
    .select()
    .from(schema.identitySessions)
    .where(eq(schema.identitySessions.tokenHash, tokenHash))
    .limit(1);

  const session = rows[0];
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;
  return { claims, session };
}

/** Kills one session (this cookie) — other devices stay signed in. */
export async function revokeIdentitySession(request: Request) {
  const token = readIdentityCookie(request);
  if (!token) return { revoked: false };
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await database().delete(schema.identitySessions).where(eq(schema.identitySessions.tokenHash, tokenHash));
  return { revoked: true };
}

/** Kills every identity session for an account (used on password change). */
export async function revokeAllIdentitySessions(accountId: string) {
  await database().delete(schema.identitySessions).where(eq(schema.identitySessions.accountId, accountId));
  return { revoked: true };
}

/**
 * The signed-in account for this request, shaped like the fields callers read from a user
 * (id, email, name, roles, confirmedAt). Roles come from the same policy every app uses.
 */
export async function resolveIdentityUser(request: Request) {
  const resolved = await resolveIdentitySession(request);
  if (!resolved) return null;
  const { session } = resolved;
  const roles = ownerRoles({ email: session.email, confirmedAt: new Date(session.createdAt).toISOString(), roles: [] });
  return {
    id: session.accountId,
    email: session.email,
    name: session.name,
    roles,
    confirmedAt: new Date(session.createdAt).toISOString(),
    user_metadata: { full_name: session.name },
    app_metadata: { roles },
  };
}
