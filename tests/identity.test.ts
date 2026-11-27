import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as policy from "../shared/auth-policy.ts";

const require = createRequire(import.meta.url);
const SECRET = "test-only-identity-secret-with-more-than-32-bytes";

function loadIdentity() {
  const source = readFileSync(new URL("../netlify/lib/identity.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mocks: Record<string, unknown> = {
    "../../db/index.js": { database: () => ({}) },
    "../../db/schema.js": { identitySessions: {} },
    "drizzle-orm": { eq: () => ({}) },
    "./security.js": {
      ApiError: class ApiError extends Error {
        status: number;
        code: string;
        constructor(status: number, message: string, code = "REQUEST_FAILED") {
          super(message);
          this.status = status;
          this.code = code;
        }
      },
    },
    "../../shared/auth-policy.js": policy,
  };
  const exports: Record<string, any> = {};
  runInNewContext(js, {
    exports,
    process: { env: { ONESHOT_IDENTITY_SECRET: SECRET } },
    require: (name: string) =>
      Object.hasOwn(mocks, name)
        ? mocks[name]
        : name.startsWith("node:")
          ? require(name)
          : (() => {
              throw new Error(`Unmocked dependency: ${name}`);
            })(),
    Date,
    Promise,
    Error,
    URL,
    Request,
    Response,
    Headers,
    console,
  });
  return exports;
}

test("a signed identity token verifies and carries the account, not any permission", () => {
  const identity = loadIdentity();
  const { token, claims } = identity.signIdentityToken({ sub: "acc-1", email: "buyer@example.com", name: "Buyer" });
  const verified = identity.verifyIdentityToken(token);
  assert.equal(verified.sub, "acc-1");
  assert.equal(verified.email, "buyer@example.com");
  assert.equal(verified.jti, claims.jti);
  assert.equal("roles" in verified, false);
});

test("a tampered identity token is rejected", () => {
  const identity = loadIdentity();
  const { token } = identity.signIdentityToken({ sub: "acc-1", email: "buyer@example.com", name: "Buyer" });
  const tampered = token.slice(0, -2) + (token.endsWith("AA") ? "BB" : "AA");
  assert.equal(identity.verifyIdentityToken(tampered), null);
  assert.equal(identity.verifyIdentityToken(""), null);
  assert.equal(identity.verifyIdentityToken(null), null);
});

test("the shared cookie is scoped to the parent domain and cleared correctly", () => {
  const identity = loadIdentity();
  const header = identity.identityCookieHeader("token-value");
  assert.match(header, /Domain=1shotcam\.com/);
  assert.match(header, /HttpOnly/);
  assert.match(header, /Secure/);
  const cleared = identity.clearIdentityCookieHeader();
  assert.match(cleared, /Max-Age=0/);
  assert.match(cleared, /Domain=1shotcam\.com/);
});

test("reading the shared cookie ignores other cookies", () => {
  const identity = loadIdentity();
  const request = new Request("https://www.1shotcam.com/", {
    headers: { Cookie: "a=1; oneshot_sid=abc.def; b=2" },
  });
  assert.equal(identity.readIdentityCookie(request), "abc.def");
});
