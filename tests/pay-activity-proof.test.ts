import assert from "node:assert/strict";
import { createHmac, createPrivateKey, createPublicKey, sign } from "node:crypto";
import test from "node:test";
import { hubOrigin, paySignupOrigin, readPayActivity, signedInput, validPaySignature, validPayTimestamp } from "../netlify/lib/pay-activity-proof.ts";

test("verifies the Pay signature and rejects tampering, expiry, and unknown event types", () => {
  const seed = createHmac("sha256", "unit-test").update("oneshot/pay/activity-notices/ed25519/v1").digest();
  const der = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]);
  const privateKey = createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  const publicKey = createPublicKey(privateKey);
  const now = Date.now();
  const timestamp = String(now);
  const body = JSON.stringify({ kind: "visit", id: "1ebc4df1-4db6-4f13-9293-66ec3dabca67", page: "/" });
  const signature = sign(null, signedInput(timestamp, body), privateKey).toString("base64url");
  assert.equal(validPaySignature(publicKey, timestamp, body, signature), true);
  assert.equal(validPaySignature(publicKey, timestamp, body.replace('"/"', '"/hub"'), signature), false);
  assert.equal(validPayTimestamp(timestamp, now + 120_001), false);
  assert.equal(readPayActivity(body)?.kind, "visit");
  assert.equal(readPayActivity('{"kind":"registration","source":"sso","id":"external"}'), null);
  assert.equal(readPayActivity('{"kind":"email","id":"custom","recipient":"someone@example.com"}'), null);
});

test("associates shared registration only with the Pay SSO entry", () => {
  const state = "a".repeat(43);
  const url = `${hubOrigin}/sso/authorize?appId=pay&state=${state}&challenge=${state}`;
  assert.equal(paySignupOrigin(url), true);
  assert.equal(paySignupOrigin(url.replace("appId=pay", "appId=ai")), false);
  assert.equal(paySignupOrigin(url.replace(hubOrigin, "https://example.com")), false);
  assert.equal(paySignupOrigin(hubOrigin + "/sso/authorize?appId=pay"), false);
  assert.equal(paySignupOrigin(null), false);
});
