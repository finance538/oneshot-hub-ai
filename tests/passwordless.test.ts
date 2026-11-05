import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function isolated(file: string, mocks: Record<string, unknown>) {
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
    fetch,
  });
  return exports;
}

const env: Record<string, string> = {};
const delivery = () =>
  isolated("netlify/lib/otp-delivery.ts", {
    nodemailer: { createTransport: () => ({}) },
    "./security.js": {
      ApiError: class extends Error {
        status: number;
        code?: string;
        constructor(status: number, message: string, code?: string) {
          super(message);
          this.status = status;
          this.code = code;
        }
      },
      env: (key: string) => env[key],
    },
    "./workforce-network.js": {
      publicHost: async (host: string) => ({ address: host }),
    },
  });

test("Saudi mobile numbers reach one account however they are written", () => {
  const { normalisePhone } = delivery();
  for (const written of [
    "0501234567",
    "050 123 4567",
    "+966501234567",
    "00966501234567",
    "501234567",
    "٠٥٠١٢٣٤٥٦٧",
    "(050) 123-4567",
  ])
    assert.equal(
      normalisePhone(written),
      "+966501234567",
      `${written} should resolve to one canonical number`,
    );
  // A number that already carries another country code keeps it.
  assert.equal(normalisePhone("+14155550123"), "+14155550123");
  for (const bad of ["abc", "", "12", "+", "05012345678901234567"])
    assert.equal(normalisePhone(bad), null);
});

test("a typed destination is routed to the channel it belongs to", () => {
  const { readDestination } = delivery();
  // Compared field by field: the module runs in its own context, so the
  // object it returns is structurally equal but not of this realm's Object.
  const email = readDestination("Owner@1ShotCam.com ");
  assert.equal(email.channel, "email");
  assert.equal(email.destination, "owner@1shotcam.com");
  const phone = readDestination("0501234567");
  assert.equal(phone.channel, "sms");
  assert.equal(phone.destination, "+966501234567");
  for (const bad of ["", "not-an-address", "a@b", "@1shotcam.com", 42, null])
    assert.equal(readDestination(bad as unknown), null);
});

test("the confirmation line never echoes the full address back", () => {
  const { maskDestination } = delivery();
  const masked = maskDestination("email", "finance@1shotcam.com");
  assert.ok(!masked.includes("finance"), "the local part must not be readable");
  assert.ok(masked.endsWith("@1shotcam.com"));
  assert.equal(maskDestination("sms", "+966501234567"), "••• 567");
});

test("a channel stays closed until its provider is actually configured", async () => {
  for (const key of Object.keys(env)) delete env[key];
  const closed = delivery();
  assert.equal(closed.emailReady(), false);
  assert.equal(closed.smsReady(), false);
  // Asking to send over an unconfigured channel fails loudly rather than
  // reporting a code was sent that never left the building.
  await assert.rejects(
    closed.deliverCode("email", "owner@1shotcam.com", "123456", 10),
    { code: "OTP_CHANNEL_UNAVAILABLE" },
  );

  Object.assign(env, {
    OTP_SMTP_HOST: "smtp.example.com",
    OTP_SMTP_USER: "user",
    OTP_SMTP_PASSWORD: "secret",
    OTP_MAIL_FROM: "oneShot <no-reply@1shotcam.com>",
  });
  const open = delivery();
  assert.equal(open.emailReady(), true);
  assert.equal(open.smsReady(), false, "SMS waits for its own provider");

  Object.assign(env, {
    UNIFONIC_APP_SID: "sid",
    UNIFONIC_SENDER_ID: "oneShot",
  });
  assert.equal(delivery().smsReady(), true);
  for (const key of Object.keys(env)) delete env[key];
});
