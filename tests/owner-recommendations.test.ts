import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as policy from "../shared/commerce.ts";
import { dockVisible } from "../shared/smart-dock.ts";
import { appRoute } from "../src/lib/routes.ts";
import type { OriginalProduct } from "../shared/storefront.ts";
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
    require: (id: string) =>
      Object.hasOwn(mocks, id)
        ? mocks[id]
        : id.startsWith("node:")
          ? require(id)
          : (() => {
              throw new Error(`Unmocked dependency: ${id}`);
            })(),
    Request,
    Response,
    URL,
    URLSearchParams,
    crypto,
    AbortSignal,
    performance,
    setTimeout,
    clearTimeout,
    ...globals,
  });
  return exports;
}
class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "REQUEST_FAILED") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const details = (
  type = "fixed",
  billingCycle = "one_time",
  status = "ready_to_sell",
) =>
  ({
    pricing: { type, billingCycle, amount: 125, currency: "SAR" },
    status,
  }) as OriginalProduct;
const phone = () => `+${Math.floor(2e10 + Math.random() * 7e10)}`;
const input = () => ({
  customerName: "Customer",
  email: "customer@example.com",
  phone: phone(),
  notes: "Photography project scope",
  language: "en",
  kind: "service",
  productId: "photo",
});
const request = (
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
  key = crypto.randomUUID(),
) =>
  new Request(`https://www.1shotcam.com${path}`, {
    method,
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

// Database boundary double: application routing, validation, pricing and idempotency
// run unchanged. SQL migrations and real gateway acceptance remain deployment checks.
function fixture() {
  type Row = Record<string, any>;
  const names = [
    "quoteRequests",
    "products",
    "orders",
    "businessSettings",
    "auditEvents",
    "vaultKeys",
    "webhookReceipts",
    "diagnosticEvents",
  ];
  const tables: Record<string, any> = {};
  const rows: Record<string, Row[]> = Object.fromEntries(
    names.map((name) => [name, []]),
  );
  names.forEach((name) => {
    tables[name] = new Proxy(
      { $name: name },
      {
        get: (target, key) =>
          key === "$name" ? target.$name : { table: name, key },
      },
    );
  });
  const sql = (strings: TemplateStringsArray, ...values: any[]) => ({
    sql: strings.join(""),
    values,
  });
  function matches(row: Row, p: any): boolean {
    if (!p) return true;
    if (p.op === "and") return p.values.every((x: any) => matches(row, x));
    if (p.op === "eq") return row[p.field.key] === p.value;
    if (p.op === "ne") return row[p.field.key] !== p.value;
    if (p.sql?.includes("lower("))
      return ["paid", "captured"].includes(row.status?.toLowerCase());
    if (p.sql?.includes("'sku'"))
      return row.catalogDetails?.sku === p.values.at(-1);
    throw new Error("Unhandled predicate");
  }
  const orm = {
    eq: (field: any, value: any) => ({ op: "eq", field, value }),
    ne: (field: any, value: any) => ({ op: "ne", field, value }),
    and: (...values: any[]) => ({ op: "and", values: values.filter(Boolean) }),
    desc: (x: any) => x,
    sql,
  };
  let chain = Promise.resolve();
  const db: any = {
    select(projection?: Row) {
      let table: any, predicate: any;
      let cap = Infinity,
        offset = 0;
      const query: any = {
        from(t: any) {
          table = t;
          return query;
        },
        where(p: any) {
          predicate = p;
          return query;
        },
        for() {
          return query;
        },
        orderBy() {
          return query;
        },
        limit(n: number) {
          cap = n;
          return query;
        },
        offset(n: number) {
          offset = n;
          return query;
        },
        then(resolve: any, reject: any) {
          try {
            let result = rows[table.$name]
              .filter((r) => matches(r, predicate))
              .slice(offset, offset + cap);
            if (projection?.paidOrders) {
              result = [
                {
                  paidOrders: result.length,
                  revenueCents: String(
                    result.reduce((n, r) => n + r.amountCents, 0),
                  ),
                },
              ];
            } else if (projection) {
              result = result.map((r) =>
                Object.fromEntries(
                  Object.entries(projection).map(([key, col]) => [
                    key,
                    r[col.key],
                  ]),
                ),
              );
            }
            return Promise.resolve(structuredClone(result)).then(
              resolve,
              reject,
            );
          } catch (e) {
            return Promise.reject(e).then(resolve, reject);
          }
        },
      };
      return query;
    },
    insert(table: any) {
      let values: Row;
      let conflict: any;
      const query: any = {
        values(v: Row) {
          values = v;
          return query;
        },
        onConflictDoNothing(c: any) {
          conflict = c;
          return query;
        },
        onConflictDoUpdate(c: any) {
          conflict = c;
          return query;
        },
        returning() {
          return query;
        },
        then(resolve: any, reject: any) {
          try {
            const target = rows[table.$name];
            const found =
              conflict &&
              target.find(
                (r) => r[conflict.target.key] === values[conflict.target.key],
              );
            if (found) {
              if (conflict.set) Object.assign(found, conflict.set);
              return Promise.resolve([]).then(resolve, reject);
            }
            const row = {
              id: crypto.randomUUID(),
              createdAt: new Date(),
              updatedAt: new Date(),
              status: "new",
              ...values,
            };
            if (table.$name === "orders" && !values.status)
              row.status = "pending";
            target.push(row);
            return Promise.resolve(structuredClone([row])).then(
              resolve,
              reject,
            );
          } catch (e) {
            return Promise.reject(e).then(resolve, reject);
          }
        },
      };
      return query;
    },
    update(table: any) {
      let value: Row, predicate: any;
      const query: any = {
        set(v: Row) {
          value = v;
          return query;
        },
        where(p: any) {
          predicate = p;
          return query;
        },
        then(resolve: any, reject: any) {
          rows[table.$name]
            .filter((r) => matches(r, predicate))
            .forEach((r) => Object.assign(r, value));
          return Promise.resolve([]).then(resolve, reject);
        },
      };
      return query;
    },
    transaction(fn: any) {
      const pending = chain.then(async () => {
        const before = structuredClone(rows);
        try {
          return await fn(db);
        } catch (e) {
          Object.assign(rows, before);
          throw e;
        }
      });
      chain = pending.catch(() => {});
      return pending;
    },
  };
  const state = {
    user: {
      id: "owner",
      email: "customer@example.com",
      confirmedAt: new Date().toISOString(),
      roles: ["admin"],
    } as any,
    limits: 0,
    providerCalls: 0,
    providerFailure: false,
    latePaid: false,
  };
  const security = {
    ApiError,
    authenticate: async (_req: any, admin: boolean) => {
      if (!state.user) throw new ApiError(401, "Sign in");
      if (admin && !state.user.roles.includes("admin"))
        throw new ApiError(403, "Admin required");
      return state.user;
    },
    limit: async () => {
      state.limits++;
    },
    payload: async (req: Request) => req.json(),
    stringField: (v: unknown, _label: string, max: number) => {
      if (typeof v !== "string" || !v.trim() || v.length > max)
        throw new ApiError(400, "Invalid field");
      return v.trim();
    },
    uuid: (v: string) => {
      if (!/^[a-f0-9-]{36}$/i.test(v)) throw new ApiError(400, "Invalid ID");
      return v;
    },
    decrypt: () => ({}),
    env: () => undefined,
    audit: async () => {},
    webhookReady: () => true,
  };
  const mocks: any = {
    "drizzle-orm": orm,
    "../../db/index.js": { database: () => db },
    "../../db/schema.js": tables,
    "../../shared/commerce.js": policy,
    "./security.js": security,
    "../../shared/tools/catalog.ts": {
      findTool: (slug: string) =>
        slug === "known-tool" ? { slug } : undefined,
    },
    "./revenue.js": { verifiedRevenue: async () => ({}) },
  };
  const commerce = isolated("netlify/lib/commerce.ts", mocks, {
    Netlify: { context: { ip: "test-client" } },
  });
  const revenue = isolated("netlify/lib/revenue.ts", mocks);
  const payments = isolated("netlify/lib/payments.ts", {
    ...mocks,
    "../../shared/contracts.js": {
      gateways: [["stripe"]],
      topologies: [["HOSTED_PAGE"]],
      regions: [["SA-SAR"]],
    },
    "./upstream.js": {
      checkoutUrl: (v: string) => v,
      coreHealth: async () => ({}),
    },
    "./payment-providers.js": {
      assertNativePayment: () => {},
      assertStripeCredentials: () => {},
      nativeGateways: ["stripe"],
      nativeTopologies: ["HOSTED_PAGE"],
      createHostedCheckout: async () => {
        state.providerCalls++;
        if (state.latePaid) rows.orders[0].status = "paid";
        if (state.providerFailure)
          throw new ApiError(502, "Unknown", "UPSTREAM_UNCONFIRMED");
        return {
          redirectUrl: "https://checkout.stripe.com/fixture",
          transactionId: "fixture",
        };
      },
      verifyHostedCheckout: async () => "paid",
    },
  });
  rows.products.push({
    id: "photo",
    name: "Photography",
    priceCents: 12500,
    currency: "SAR",
    active: true,
    catalogDetails: { ...details(), sku: "PHOTO", nameEn: "Photography" },
  });
  rows.vaultKeys.push({
    gateway: "stripe",
    environment: "live",
    encrypted: "fixture",
  });
  return { rows, state, commerce, revenue, payments, mocks };
}

test("pricing policy distinguishes fixed, starting and monthly; unknown scopes cannot checkout", () => {
  assert.equal(policy.priceKind(details()), "fixed");
  assert.equal(policy.instantCheckout(details()), true);
  assert.equal(policy.priceKind(details("starts_at")), "starting");
  assert.equal(policy.instantCheckout(details("starts_at")), false);
  assert.equal(policy.priceKind(details("fixed", "monthly")), "monthly");
  assert.equal(policy.instantCheckout(details("fixed", "monthly")), false);
  assert.equal(policy.instantCheckout(details("unknown")), false);
  assert.equal(
    policy.instantCheckout(details("fixed", "one_time", "testing")),
    false,
  );
});
test("SAR parsing preserves cents and rejects exponent, negatives, excess precision and over-limit offers", () => {
  assert.equal(policy.sarCents("125.05"), 12505);
  assert.equal(policy.sarCents("1000000"), 100000000);
  for (const amount of [
    "0",
    "0.99",
    "1.001",
    "1e3",
    "-1",
    "Infinity",
    "1000000.01",
    " 1",
    1,
  ])
    assert.equal(policy.sarCents(amount), null);
});
test("quote validation requires contact details, bounded scope and an explicit supported language", () => {
  const f = fixture();
  const base = input();
  const valid = f.commerce.quoteInput({
    ...base,
    email: " CUSTOMER@EXAMPLE.COM ",
  });
  assert.equal(valid.email, "customer@example.com");
  for (const patch of [
    { email: "invalid" },
    { phone: "local" },
    { notes: "" },
    { notes: "x".repeat(4001) },
    { language: "fr" },
    { kind: "subscription" },
    { website: "spam" },
    { customerName: "" },
  ])
    assert.throws(() => f.commerce.quoteInput({ ...base, ...patch }), ApiError);
});
test("guest quote persists service ID, language, time and a unique reference without creating an order", async () => {
  const f = fixture();
  f.state.user = null;
  const body = input();
  const result = await f.commerce.commerceRoute(
    request("/api/quotes", body),
    "/api/quotes",
  );
  assert.match(result.reference, /^Q-1SHOT-[A-F0-9]{16}$/);
  assert.ok(result.createdAt);
  assert.equal(f.rows.quoteRequests.length, 1);
  assert.equal(f.rows.quoteRequests[0].productId, "photo");
  assert.equal(f.rows.quoteRequests[0].language, "en");
  assert.equal(f.rows.orders.length, 0);
  assert.equal(
    Object.keys(result).sort().join(","),
    "createdAt,reference,status",
  );
});
test("a repeated quote request recovers one receipt even if the catalog is renamed; changed payload conflicts", async () => {
  const f = fixture();
  const body = input(),
    key = crypto.randomUUID();
  const send = (data: any) =>
    f.commerce.commerceRoute(
      request("/api/quotes", data, "POST", key),
      "/api/quotes",
    );
  const a = await send(body);
  f.rows.products[0].name = "Changed";
  f.rows.products[0].catalogDetails.nameEn = "Changed";
  const b = await send(body);
  assert.equal(a.reference, b.reference);
  assert.equal(f.rows.quoteRequests.length, 1);
  await assert.rejects(
    send({ ...body, notes: "Different scope" }),
    (e: any) => e.status === 409,
  );
});
test("invalid catalog and Pro choices do not persist; known Pro inquiries cannot become paid offers", async () => {
  const f = fixture();
  await assert.rejects(
    f.commerce.commerceRoute(
      request("/api/quotes", { ...input(), productId: "missing" }),
      "/api/quotes",
    ),
    (e: any) => e.status === 404,
  );
  await assert.rejects(
    f.commerce.commerceRoute(
      request("/api/quotes", { ...input(), kind: "pro", toolSlug: "missing" }),
      "/api/quotes",
    ),
    (e: any) => e.status === 400,
  );
  await f.commerce.commerceRoute(
    request("/api/quotes", { ...input(), kind: "pro", toolSlug: "known-tool" }),
    "/api/quotes",
  );
  const row = f.rows.quoteRequests[0];
  assert.equal(row.kind, "pro");
  assert.equal(row.productId, null);
  await assert.rejects(
    f.commerce.commerceRoute(
      request(`/api/admin/quotes/${row.id}/convert`, {
        amount: "125",
        scope: "Approved",
      }),
      `/api/admin/quotes/${row.id}/convert`,
    ),
    (e: any) => e.code === "PRO_INQUIRY_ONLY",
  );
  assert.equal(f.rows.orders.length, 0);
});
test("quote CRM, contact settings and revenue require administrator authorization", async () => {
  const f = fixture();
  for (const user of [null, { id: "member", roles: [] }]) {
    f.state.user = user;
    for (const path of [
      "/api/admin/quotes",
      "/api/admin/contact",
      "/api/admin/revenue",
    ])
      await assert.rejects(
        f.commerce.commerceRoute(request(path), path),
        (e: any) => [401, 403].includes(e.status),
      );
  }
});
async function published(f: ReturnType<typeof fixture>) {
  await f.commerce.commerceRoute(
    request("/api/quotes", input()),
    "/api/quotes",
  );
  const row = f.rows.quoteRequests[0];
  const path = `/api/admin/quotes/${row.id}/convert`;
  const result = await f.commerce.commerceRoute(
    request(path, { amount: "250.25", scope: "Approved deliverables" }),
    path,
  );
  return { row, result, path };
}
test("concurrent conversions return the same immutable offer and emit one audit record", async () => {
  const f = fixture();
  await f.commerce.commerceRoute(
    request("/api/quotes", input()),
    "/api/quotes",
  );
  const row = f.rows.quoteRequests[0];
  const path = `/api/admin/quotes/${row.id}/convert`;
  const [a, b] = await Promise.all([
    f.commerce.commerceRoute(
      request(path, { amount: "250.25", scope: "Approved" }),
      path,
    ),
    f.commerce.commerceRoute(
      request(path, { amount: "1", scope: "Changed" }),
      path,
    ),
  ]);
  assert.equal(a.offerId, b.offerId);
  assert.equal(row.amountCents, 25025);
  assert.equal(row.approvedScope, "Approved");
  assert.equal(row.status, "quoted");
  assert.equal(f.rows.auditEvents.length, 1);
  assert.equal(f.rows.orders.length, 0);
});
test("public offer shows approved terms only; expired or closed offers are unavailable", async () => {
  const f = fixture();
  const { row, result } = await published(f);
  const path = `/api/quotes/offers/${result.offerId}`;
  const data = await f.commerce.commerceRoute(request(path), path);
  assert.equal(data.amountCents, 25025);
  for (const field of [
    "email",
    "customerName",
    "phone",
    "notes",
    "submissionHash",
    "fingerprint",
  ])
    assert.equal(Object.hasOwn(data, field), false);
  row.expiresAt = new Date(0);
  await assert.rejects(
    f.commerce.commerceRoute(request(path), path),
    (e: any) => e.status === 404,
  );
});
test("quote checkout binds verified email, ignores browser amounts and creates one server-priced order", async () => {
  const f = fixture();
  const { result } = await published(f);
  const body = {
    quoteOffer: result.offerId,
    amount: 1,
    executionMode: "SANDBOX",
  };
  await assert.rejects(
    f.payments.executePayment(
      body,
      { id: "customer", email: "other@example.com", confirmedAt: "confirmed" },
      crypto.randomUUID(),
    ),
    (e: any) => e.code === "QUOTE_EMAIL_REQUIRED",
  );
  await assert.rejects(
    f.payments.executePayment(
      body,
      { id: "customer", email: "customer@example.com" },
      crypto.randomUUID(),
    ),
    (e: any) => e.code === "QUOTE_EMAIL_REQUIRED",
  );
  const user = {
    id: "customer",
    email: "customer@example.com",
    confirmedAt: "confirmed",
  };
  const first = await f.payments.executePayment(
    body,
    user,
    crypto.randomUUID(),
  );
  const second = await f.payments.executePayment(
    body,
    user,
    crypto.randomUUID(),
  );
  assert.equal(first.order.id, second.order.id);
  assert.equal(first.order.amountCents, 25025);
  assert.equal(first.order.executionMode, "PRODUCTION");
  assert.equal(f.rows.orders.length, 1);
  assert.equal(f.state.providerCalls, 1);
});
test("concurrent customer checkout requests reserve a single order and invoke the provider once", async () => {
  const f = fixture();
  const { result } = await published(f);
  const user = {
    id: "customer",
    email: "customer@example.com",
    confirmedAt: "confirmed",
  };
  await Promise.all([
    f.payments.executePayment(
      { quoteOffer: result.offerId },
      user,
      crypto.randomUUID(),
    ),
    f.payments.executePayment(
      { quoteOffer: result.offerId },
      user,
      crypto.randomUUID(),
    ),
  ]);
  assert.equal(f.rows.orders.length, 1);
  assert.equal(f.state.providerCalls, 1);
});
test("unknown provider outcomes remain unconfirmed and cannot be retried as a new quote payment", async () => {
  const f = fixture();
  const { result } = await published(f);
  f.state.providerFailure = true;
  const user = {
    id: "customer",
    email: "customer@example.com",
    confirmedAt: "confirmed",
  };
  const first = await f.payments.executePayment(
    { quoteOffer: result.offerId },
    user,
    crypto.randomUUID(),
  );
  assert.equal(first.order.status, "unconfirmed");
  const second = await f.payments.executePayment(
    { quoteOffer: result.offerId },
    user,
    crypto.randomUUID(),
  );
  assert.equal(second.order.id, first.order.id);
  assert.equal(f.state.providerCalls, 1);
});
test("late checkout response cannot replace callback-confirmed paid status", async () => {
  const f = fixture();
  const { result } = await published(f);
  f.state.latePaid = true;
  const paid = await f.payments.executePayment(
    { quoteOffer: result.offerId },
    f.state.user,
    crypto.randomUUID(),
  );
  assert.equal(paid.order.status, "paid");
});
test("customer may checkout fixed products; starting, monthly and testing products require a quote", async () => {
  const f = fixture();
  await f.payments.executePayment(
    { productId: "photo", amount: 1 },
    f.state.user,
    crypto.randomUUID(),
  );
  assert.equal(f.rows.orders[0].amountCents, 12500);
  for (const d of [
    details("starts_at"),
    details("fixed", "monthly"),
    details("fixed", "one_time", "testing"),
  ]) {
    f.rows.products[0].catalogDetails = d;
    await assert.rejects(
      f.payments.executePayment(
        { productId: "photo" },
        f.state.user,
        crypto.randomUUID(),
      ),
      (e: any) => e.code === "SERVICE_QUOTE_REQUIRED",
    );
  }
});
test("CRM cannot label a request quoted without approved terms or close an unresolved payment", async () => {
  const f = fixture();
  const { row, result } = await published(f);
  const path = `/api/admin/quotes/${row.id}`;
  await assert.rejects(
    f.commerce.commerceRoute(
      request(path, { status: "quoted" }, "PATCH"),
      path,
    ),
    (e: any) => e.status === 409,
  );
  await f.payments.executePayment(
    { quoteOffer: result.offerId },
    f.state.user,
    crypto.randomUUID(),
  );
  await assert.rejects(
    f.commerce.commerceRoute(
      request(path, { status: "closed" }, "PATCH"),
      path,
    ),
    (e: any) => e.code === "RECONCILIATION_REQUIRED",
  );
});
test("verified revenue excludes sandbox, pending, failed, refunded and non-SAR orders", async () => {
  const f = fixture();
  f.rows.orders.push(
    ...["paid", "PAID", "CAPTURED", "pending", "failed", "refunded"].map(
      (status) => ({
        status,
        amountCents: 12500,
        currency: "SAR",
        executionMode: "PRODUCTION",
      }),
    ),
    {
      status: "paid",
      amountCents: 90000,
      currency: "USD",
      executionMode: "PRODUCTION",
    },
    {
      status: "paid",
      amountCents: 90000,
      currency: "SAR",
      executionMode: "SANDBOX",
    },
  );
  const result = await f.revenue.verifiedRevenue();
  assert.equal(result.revenueCents, 37500);
  assert.equal(result.paidOrders, 3);
  assert.equal(result.kind, "verified_paid");
  assert.equal(result.currency, "SAR");
  assert.equal(
    f.rows.orders.filter((row) =>
      policy.isPaidRevenue({
        status: row.status,
        executionMode: row.executionMode,
        currency: row.currency,
      }),
    ).length,
    3,
  );
});
test("official settings enforce the business email domain and explicit owner attestation", async () => {
  const f = fixture();
  const path = "/api/admin/contact";
  for (const body of [
    { email: "support@example.com", confirmOfficial: true },
    { email: "support@1shotcam.com", phone: "local", confirmOfficial: true },
    { email: "support@1shotcam.com" },
  ])
    await assert.rejects(
      f.commerce.commerceRoute(request(path, body, "PATCH"), path),
      (e: any) => e.status === 400,
    );
  const data = await f.commerce.commerceRoute(
    request(
      path,
      {
        email: "support@1shotcam.com",
        phone: "",
        whatsapp: "",
        confirmOfficial: true,
      },
      "PATCH",
    ),
    path,
  );
  assert.equal(data.phone, null);
  assert.equal(data.whatsapp, null);
  assert.equal(f.rows.businessSettings.length, 1);
});
test("mobile dock yields to dialogs, forms, chat inputs and bottom navigation at 320, 375, 390 and 768px", () => {
  for (const width of [320, 375, 390, 768]) {
    const dock = { left: width - 72, right: width - 16, top: 700, bottom: 756 };
    const state = {
      width,
      dock,
      modal: false,
      editing: false,
      keyboard: false,
      obstacles: [],
    };
    assert.equal(dockVisible(state), true);
    for (const property of ["modal", "editing", "keyboard"])
      assert.equal(dockVisible({ ...state, [property]: true }), false);
    assert.equal(
      dockVisible({
        ...state,
        obstacles: [{ left: 0, right: width, top: 720, bottom: 780 }],
      }),
      false,
    );
  }
  assert.equal(
    dockVisible({
      width: 769,
      dock: { left: 0, right: 56, top: 0, bottom: 56 },
      modal: false,
      editing: false,
      keyboard: false,
      obstacles: [],
    }),
    false,
  );
});
test("commerce routes are explicit and unknown quote paths do not fall through to a storefront", () => {
  assert.equal(
    appRoute(new URL("https://www.1shotcam.com/checkout?service=PHOTO")),
    "commerce",
  );
  assert.equal(
    appRoute(new URL(`https://www.1shotcam.com/quote/${crypto.randomUUID()}`)),
    "commerce",
  );
  assert.equal(
    appRoute(new URL("https://www.1shotcam.com/quote/not-valid")),
    "missing",
  );
});
test("privacy-safe diagnostic transport discards all event messages and sends only allowlisted fields", async () => {
  const sent: any[] = [];
  const module = isolated(
    "src/lib/diagnostics.ts",
    { "../../shared/commerce": policy },
    {
      fetch: async (_url: string, init: any) => {
        sent.push(JSON.parse(init.body));
        return Response.json({});
      },
    },
  );
  module.reportClientDiagnostic(
    "API_NETWORK",
    "/api/quotes/offers/private-reference?email=private",
  );
  await Promise.resolve();
  assert.equal(sent.length, 1);
  assert.equal(
    JSON.stringify(sent[0]),
    JSON.stringify({ code: "API_NETWORK", area: "quotes" }),
  );
});

test("product checkout recovery keeps the original amount after a catalog edit and rejects another owner", async () => {
  const f = fixture();
  const key = crypto.randomUUID();
  const first = await f.payments.executePayment(
    { productId: "photo" },
    f.state.user,
    key,
  );
  f.rows.products[0].priceCents = 30000;
  f.rows.products[0].active = false;
  const recovered = await f.payments.executePayment(
    { productId: "photo" },
    f.state.user,
    key,
  );
  assert.equal(recovered.order.id, first.order.id);
  assert.equal(recovered.order.amountCents, 12500);
  assert.equal(f.state.providerCalls, 1);
  await assert.rejects(
    f.payments.executePayment(
      { productId: "photo" },
      { id: "someone-else" },
      key,
    ),
    (e: any) => e.status === 409,
  );
});

test("diagnostics authorization, source attribution and field allowlists prevent sensitive error ingestion", async () => {
  const f = fixture();
  const diagnostics = isolated("netlify/lib/diagnostics.ts", {
    ...f.mocks,
    "./ecosystem.js": { ecosystemRoute: async () => ({ apps: [] }) },
    "./commerce.js": { clientAddress: () => "test-client" },
  });
  f.state.user = null;
  await assert.rejects(
    diagnostics.diagnosticsRoute(
      request("/api/admin/diagnostics"),
      "/api/admin/diagnostics",
    ),
    (e: any) => e.status === 401,
  );
  await diagnostics.diagnosticsRoute(
    request("/api/diagnostics/client", {
      code: "CLIENT_ERROR",
      area: "application",
      source: "server",
      message: "private form text",
      stack: "private trace",
      email: "customer@example.com",
    }),
    "/api/diagnostics/client",
  );
  const saved = f.rows.diagnosticEvents[0];
  assert.equal(saved.source, "client");
  assert.equal(saved.code, "CLIENT_ERROR");
  assert.equal(saved.message, undefined);
  assert.equal(saved.stack, undefined);
  assert.equal(saved.email, undefined);
  await assert.rejects(
    diagnostics.diagnosticsRoute(
      request("/api/diagnostics/client", { code: "SSO_GRANT" }),
      "/api/diagnostics/client",
    ),
    (e: any) => e.status === 400,
  );
});

test("expired or closed quotes recover the owned order without invoking the provider again", async () => {
  for (const status of ["quoted", "closed"]) {
    const f = fixture();
    const { row, result } = await published(f);
    f.state.providerFailure = true;
    const user = {
      id: "customer",
      email: "customer@example.com",
      confirmedAt: "confirmed",
    };
    const body = { quoteOffer: result.offerId };
    const first = await f.payments.executePayment(
      body,
      user,
      crypto.randomUUID(),
    );
    row.status = status;
    row.expiresAt = new Date(0);
    const recovered = await f.payments.executePayment(
      body,
      user,
      crypto.randomUUID(),
    );
    assert.equal(recovered.order.id, first.order.id);
    assert.equal(recovered.order.status, "unconfirmed");
    assert.equal(recovered.replayed, true);
    assert.equal(f.rows.orders.length, 1);
    assert.equal(f.state.providerCalls, 1);
    await assert.rejects(
      f.payments.executePayment(
        body,
        { ...user, id: "another-account" },
        crypto.randomUUID(),
      ),
      (e: any) => e.status === 409,
    );
    await assert.rejects(
      f.payments.executePayment(
        body,
        { ...user, email: "other@example.com" },
        crypto.randomUUID(),
      ),
      (e: any) => e.code === "QUOTE_EMAIL_REQUIRED",
    );
  }
});

test("expired quotes without an order cannot create a checkout or be returned as fresh offers", async () => {
  const f = fixture();
  const { row, result, path } = await published(f);
  row.expiresAt = new Date(0);
  await assert.rejects(
    f.payments.executePayment(
      { quoteOffer: result.offerId },
      f.state.user,
      crypto.randomUUID(),
    ),
    (e: any) => e.code === "QUOTE_UNAVAILABLE",
  );
  await assert.rejects(
    f.commerce.commerceRoute(
      request(path, { amount: "250.25", scope: "Approved" }),
      path,
    ),
    (e: any) => e.code === "QUOTE_UNAVAILABLE",
  );
  assert.equal(f.state.providerCalls, 0);
  assert.equal(f.rows.orders.length, 0);
});
