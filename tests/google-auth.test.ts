import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { createHash } from "node:crypto";
import ts from "typescript";
import * as policy from "../shared/auth-policy.ts";
import { ecosystemApps, hubOrigin } from "../shared/ecosystem.ts";

const require = createRequire(import.meta.url);
function isolated(
  file: string,
  mocks: Record<string, unknown>,
  globals: Record<string, unknown> = {},
) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports: Record<string, any> = {};
  runInNewContext(js, {
    exports,
    require: (name: string) =>
      Object.hasOwn(mocks, name)
        ? mocks[name]
        : name.startsWith("node:")
          ? require(name)
          : (() => {
              throw new Error(`Unmocked dependency: ${name}`);
            })(),
    URL,
    URLSearchParams,
    Request,
    Response,
    Headers,
    Buffer,
    AbortSignal,
    ...globals,
  });
  return exports;
}

test("Google return URLs retain every app's page, query and fragment, and isolate previews", () => {
  for (const app of ecosystemApps) {
    const destination = `${app.origin}/workforce?tab=accounts&lang=ar#drive`;
    assert.equal(policy.authReturnUrl(destination, hubOrigin), destination);
  }
  for (const bad of [
    "https://evil.example/",
    "https://ai.1shotcam.com.evil.example/",
    "https://user@ai.1shotcam.com/",
    "http://ai.1shotcam.com/",
    "https://www.1shotcam.com/api/evil",
    "//evil.example/",
  ])
    assert.equal(policy.authReturnUrl(bad, hubOrigin), null);
  const preview = "https://preview--1shotcam-ecosystem.netlify.app";
  assert.equal(
    policy.authReturnUrl(`${preview}/?lang=ar#home`, preview),
    `${preview}/?lang=ar#home`,
  );
  assert.equal(policy.authReturnUrl(hubOrigin, preview), null);
  assert.equal(policy.authReturnUrl(preview, hubOrigin), null);
});

test("session cookies are shared only in production; owner roles require verified server identity", () => {
  assert.match(
    policy.sharedCookieAttributes(hubOrigin),
    /Secure; HttpOnly; SameSite=Lax; Domain=\.1shotcam\.com/,
  );
  assert.doesNotMatch(
    policy.sharedCookieAttributes("https://preview.netlify.app"),
    /Domain=/,
  );
  assert.deepEqual(policy.ownerRoles({ email: policy.OWNER_EMAIL }), []);
  assert.deepEqual(
    policy.ownerRoles({
      email: policy.OWNER_EMAIL.toUpperCase(),
      confirmedAt: "2026-01-01",
      roles: ["member"],
    }),
    ["member", "admin"],
  );
  assert.deepEqual(
    policy.ownerRoles({
      email: "someone@example.test",
      confirmedAt: "2026-01-01",
    }),
    [],
  );
  assert.deepEqual(policy.registeredSsoClients(undefined), []);
  assert.deepEqual(policy.registeredSsoClients("ai,pay,evil,ai,workflow"), [
    "ai",
    "pay",
    "workflow",
  ]);
});

const hash = (value: string) =>
  createHash("sha256").update(value).digest("base64url");
function oauthHarness() {
  let row: any,
    options: any,
    claimsOverride: Record<string, unknown> = {};
  let sessions = 0,
    identities = 0,
    exchanges = 0;
  const columns = Object.fromEntries(
    ["stateHash", "browserHash", "expiresAt"].map((key) => [key, key]),
  );
  const db = {
    insert: () => ({
      values: async (value: unknown) => {
        row = value;
      },
    }),
    delete: () => ({
      where: (predicate: (value: any) => boolean) => {
        const found = row && predicate(row) ? row : null;
        if (found) row = null;
        return { returning: async () => (found ? [found] : []) };
      },
    }),
  };
  class OAuth2Client {
    generateAuthUrl(value: unknown) {
      options = value;
      return "https://accounts.google.com/o/oauth2/v2/auth";
    }
    async getToken() {
      exchanges++;
      return { tokens: { id_token: "synthetic-test-token" } };
    }
    async verifyIdToken(args: any) {
      assert.equal(args.audience, "test-client-id");
      return {
        getPayload: () => ({
          email_verified: true,
          email: "person@example.test",
          sub: "google-person",
          nonce: options.nonce,
          ...claimsOverride,
        }),
      };
    }
  }
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  const module = isolated(
    "netlify/lib/google-workspace.ts",
    {
      "google-auth-library": { OAuth2Client },
      "@netlify/identity": {
        admin: {
          listUsers: async () => {
            identities++;
            return [
              {
                id: "identity-person",
                email: "person@example.test",
                confirmedAt: "2026-01-01",
                roles: [],
              },
            ];
          },
        },
      },
      "drizzle-orm": {
        eq: (key: string, value: unknown) => (entry: any) =>
          entry[key] === value,
        gt: (key: string, value: Date) => (entry: any) => entry[key] > value,
        lt: (key: string, value: Date) => (entry: any) => entry[key] < value,
        and:
          (...predicates: ((entry: any) => boolean)[]) =>
          (entry: any) =>
            predicates.every((predicate) => predicate(entry)),
      },
      "../../db/index.js": { database: () => db },
      "../../db/schema.js": { googleOAuthStates: columns },
      "../../shared/auth-policy.js": policy,
      "../../shared/ecosystem.js": { ecosystemApps, hubOrigin },
      "./security.js": {
        ApiError,
        limit: async () => {},
        env: (name: string) =>
          ({
            GOOGLE_CLIENT_ID: "test-client-id",
            GOOGLE_CLIENT_SECRET: "synthetic-test-only",
            GOOGLE_TOKEN_KEY: "00".repeat(32),
            ONESHOT_SSO_CLIENTS: "ai,pay,workflow,brand,loader",
          })[name],
      },
      "./identity-owner.js": {
        persistOwnerRole: async (user: unknown) => user,
      },
      "./shared-session.js": {
        digest: hash,
        cookieValue: (req: Request, name: string) =>
          req.headers
            .get("cookie")
            ?.split(";")
            .map((item) => item.trim())
            .find((item) => item.startsWith(name + "="))
            ?.slice(name.length + 1),
        createSharedSession: async () => {
          sessions++;
          return "__Secure-oneshot_session=synthetic; Secure; HttpOnly";
        },
      },
    },
    { Netlify: { context: { ip: "test" } } },
  );
  const destination = "https://ai.1shotcam.com/workforce?tab=accounts#drive";
  return {
    async start() {
      const url = new URL("/api/auth/google/start", hubOrigin);
      url.searchParams.set("return_to", destination);
      const response = await module.googleRoute(
        new Request(url),
        "/api/auth/google/start",
      );
      assert.equal(response.status, 303);
      assert.match(
        response.headers.get("set-cookie"),
        /Domain=\.1shotcam\.com/,
      );
      assert.equal(options.code_challenge_method, "S256");
      assert.notEqual(row.encryptedVerifier, options.code_challenge);
      return response.headers.get("set-cookie").split(";")[0];
    },
    callback(cookie: string) {
      const url = new URL("/api/auth/google/callback", hubOrigin);
      url.searchParams.set("state", options.state);
      url.searchParams.set("code", "synthetic-code");
      return module.googleRoute(
        new Request(url, { headers: { Cookie: cookie } }),
        "/api/auth/google/callback",
      );
    },
    claims(value: Record<string, unknown>) {
      claimsOverride = value;
    },
    expire() {
      row.expiresAt = new Date(0);
    },
    counts: () => ({ sessions, identities, exchanges }),
    destination,
  };
}

test("Google callback binds browser state, verifies identity, consumes once and returns to the original app", async () => {
  const h = oauthHarness(),
    cookie = await h.start();
  await assert.rejects(h.callback(cookie.replace(/=.*/, "=wrong-browser")), {
    status: 401,
  });
  assert.equal(h.counts().exchanges, 0);
  const response = await h.callback(cookie);
  assert.equal(response.headers.get("location"), h.destination);
  assert.equal(h.counts().sessions, 1);
  await assert.rejects(h.callback(cookie), { status: 401 });
  assert.equal(h.counts().sessions, 1);
});

test("Google callbacks reject expired state, unverified email and wrong nonce without creating a session", async () => {
  const expired = oauthHarness(),
    oldCookie = await expired.start();
  expired.expire();
  await assert.rejects(expired.callback(oldCookie), { status: 401 });
  for (const claims of [{ email_verified: false }, { nonce: "wrong-nonce" }]) {
    const h = oauthHarness(),
      cookie = await h.start();
    h.claims(claims);
    const response = await h.callback(cookie);
    assert.equal(
      new URL(response.headers.get("location")!).origin,
      "https://ai.1shotcam.com",
    );
    assert.equal(h.counts().sessions, 0);
    assert.equal(h.counts().identities, 0);
    assert.equal(
      response.headers.get("location")!.includes("synthetic-code"),
      false,
    );
  }
});

test("Gemini resolves runtime aliases without routing a direct Google key through the gateway", () => {
  const values: Record<string, string> = {};
  const module = isolated(
    "netlify/lib/gemini.ts",
    {
      "@google/genai": {
        GoogleGenAI: class {
          options: unknown;
          constructor(options: unknown) {
            this.options = options;
          }
        },
      },
    },
    { Netlify: { env: { get: (name: string) => values[name] } } },
  );
  assert.equal(Object.keys(module.geminiClient().options).length, 0);
  values.GEMINI_API_KEY = "synthetic-gateway";
  values.GOOGLE_GEMINI_BASE_URL = "https://gateway.example.test";
  assert.equal(
    module.geminiClient().options.httpOptions.baseUrl,
    values.GOOGLE_GEMINI_BASE_URL,
  );
  values.GOOGLE_GENERATIVE_AI_API_KEY = "synthetic-direct";
  assert.equal(
    module.geminiClient().options.httpOptions.baseUrl,
    "https://generativelanguage.googleapis.com",
  );
  assert.equal(
    module.geminiClient().options.apiKey,
    values.GOOGLE_GENERATIVE_AI_API_KEY,
  );
});

test("an expired shared session and explicit bearer never fall back to a different Identity account", async () => {
  let identityReads = 0,
    sharedReads = 0;
  const security = isolated("netlify/lib/security.ts", {
    "./identity-owner.js": { persistOwnerRole: async (user: unknown) => user },
    "./shared-session.js": {
      cookieValue: (req: Request) => req.headers.get("cookie"),
      sharedSessionUser: async () => {
        sharedReads++;
        return null;
      },
    },
    "../../shared/auth-policy.js": policy,
    "@netlify/identity": {
      getUser: async () => {
        identityReads++;
        return { id: "another-account" };
      },
    },
    "drizzle-orm": {},
    "../../db/index.js": {},
    "../../db/schema.js": {},
  });
  assert.equal(
    await security.resolveUser(
      new Request(`${hubOrigin}/api/session`, {
        headers: { Cookie: "expired-shared-session" },
      }),
    ),
    null,
  );
  assert.equal(identityReads, 0);
  assert.equal(sharedReads, 1);
  assert.equal(
    await security.resolveUser(
      new Request(`${hubOrigin}/api/session`, {
        headers: { Authorization: "Basic invalid", Cookie: "shared-session" },
      }),
    ),
    null,
  );
  assert.equal(identityReads, 0);
  assert.equal(sharedReads, 1);
});
