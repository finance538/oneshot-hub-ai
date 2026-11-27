import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as policy from "../shared/auth-policy.ts";

const require = createRequire(import.meta.url);

type Row = {
  id: string;
  email: string;
  name: string;
  channel: string;
  createdAt: Date;
  confirmedAt: Date | null;
};

// An in-memory stand-in for the three query shapes accounts.ts uses.
function fakeDatabase(initial: Row[]) {
  const rows = [...initial];
  const matches = (cond: { col: string; val: unknown }) =>
    rows.filter((row) => (row as Record<string, unknown>)[cond.col] === cond.val);
  const db = {
    rows,
    select: () => ({
      from: () => ({
        where: (cond: { col: string; val: unknown }) => ({
          limit: async () => matches(cond).slice(0, 1),
        }),
      }),
    }),
    insert: () => ({
      values: (value: Row) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (rows.some((row) => row.email === value.email)) return [];
            const row = { name: "", createdAt: new Date(), confirmedAt: null, ...value } as Row;
            rows.push(row);
            return [row];
          },
        }),
      }),
    }),
    update: () => ({
      set: (patch: Partial<Row>) => ({
        where: (cond: { col: string; val: unknown }) => ({
          returning: async () =>
            matches(cond).map((row) => Object.assign(row, patch)),
        }),
      }),
    }),
  };
  return db;
}

function loadAccounts(db: ReturnType<typeof fakeDatabase>) {
  const file = "netlify/lib/accounts.ts";
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const mocks: Record<string, unknown> = {
    "../../db/index.js": { database: () => db },
    "../../db/schema.js": {
      oneshotAccounts: { id: "id", email: "email" },
    },
    "drizzle-orm": {
      eq: (col: string, val: unknown) => ({ col, val }),
    },
    "../../shared/auth-policy.js": policy,
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
  };
  const exports: Record<string, any> = {};
  runInNewContext(js, {
    exports,
    process: { env: { ...process.env } },
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
    console,
  });
  return exports as {
    findOrCreateAccount: (
      email: string,
      channel: "email" | "sms",
    ) => Promise<{ user: { id: string; email: string; roles: string[] }; created: boolean }>;
  };
}

test("a known confirmed account signs in without creating a new row", async () => {
  const db = fakeDatabase([
    { id: "acc-1", email: "buyer@example.com", name: "Buyer", channel: "email", createdAt: new Date(), confirmedAt: new Date() },
  ]);
  const { findOrCreateAccount } = loadAccounts(db);
  const result = await findOrCreateAccount("Buyer@Example.com ", "email");
  assert.equal(result.created, false);
  assert.equal(result.user.id, "acc-1");
  assert.equal(db.rows.length, 1);
});

test("a new address creates a confirmed account with a normalized email", async () => {
  const db = fakeDatabase([]);
  const { findOrCreateAccount } = loadAccounts(db);
  const result = await findOrCreateAccount("New.User@Example.com", "email");
  assert.equal(result.created, true);
  assert.equal(db.rows[0].email, "new.user@example.com");
  assert.ok(db.rows[0].confirmedAt, "a code proves control, so the account is confirmed");
});

test("signup disabled refuses a new address and writes nothing", async () => {
  process.env.ONESHOT_SIGNUP_DISABLED = "true";
  try {
    const db = fakeDatabase([]);
    const { findOrCreateAccount } = loadAccounts(db);
    await assert.rejects(findOrCreateAccount("late@example.com", "email"), (error: any) => {
      assert.equal(error.code, "SIGNUP_DISABLED");
      return true;
    });
    assert.equal(db.rows.length, 0);
  } finally {
    delete process.env.ONESHOT_SIGNUP_DISABLED;
  }
});

test("an unconfirmed existing account is confirmed by the code that reached it", async () => {
  const db = fakeDatabase([
    { id: "acc-2", email: "pending@example.com", name: "", channel: "sms", createdAt: new Date(), confirmedAt: null },
  ]);
  const { findOrCreateAccount } = loadAccounts(db);
  const result = await findOrCreateAccount("pending@example.com", "email");
  assert.equal(result.created, false);
  assert.ok(db.rows[0].confirmedAt);
});

test("the owner address receives the admin role once confirmed", async () => {
  const db = fakeDatabase([]);
  const { findOrCreateAccount } = loadAccounts(db);
  const result = await findOrCreateAccount(policy.OWNER_EMAIL, "email");
  assert.ok(result.user.roles.includes("admin"));
});
