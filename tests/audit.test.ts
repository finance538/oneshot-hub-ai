import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { appRoute, safeReturnPath } from "../src/lib/routes.ts";
import { normalizeAdDraft } from "../shared/ad-draft.ts";

const require = createRequire(import.meta.url);
// Run the real modules with explicitly replaced network/runtime boundaries.
// No database, Identity account, email or payment provider is contacted.
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
    setTimeout,
    clearTimeout,
    URL,
    URLSearchParams,
    Response,
    Request,
    AbortSignal,
    performance,
    crypto,
    ...globals,
  });
  return exports;
}
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const bootstrap = html.match(
  /<script id="oneshot-lang">([\s\S]*?)<\/script>/,
)![1];
function languageBoot(
  search: string,
  saved: string | null,
  cookie: string,
  blocked = false,
) {
  const writes: string[] = [];
  const root = { lang: "", dir: "" };
  const storage = new Map(saved ? [["oneshot.lang", saved]] : []);
  runInNewContext(bootstrap, {
    URLSearchParams,
    location: { search, protocol: "https:", hostname: "www.1shotcam.com" },
    localStorage: {
      getItem: (k: string) => {
        if (blocked) throw Error("blocked");
        return storage.get(k);
      },
      setItem: (k: string, v: string) => {
        if (blocked) throw Error("blocked");
        storage.set(k, v);
      },
    },
    document: {
      documentElement: root,
      get cookie() {
        return cookie;
      },
      set cookie(v: string) {
        writes.push(v);
      },
    },
  });
  return { root, storage, writes };
}

test("language is locked before render from URL, local storage or cookie", () => {
  const first = languageBoot("?lang=en", "ar", "oneshot_lang=ar");
  assert.deepEqual(first.root, { lang: "en", dir: "ltr" });
  assert.equal(first.storage.get("oneshot.lang"), "en");
  assert.ok(
    first.writes.some(
      (v) => v.includes("domain=1shotcam.com") && v.includes("oneshot_lang=en"),
    ),
  );
  assert.deepEqual(languageBoot("", "ar", "oneshot_lang=en").root, {
    lang: "ar",
    dir: "rtl",
  });
  assert.deepEqual(
    languageBoot("?lang=invalid", null, "oneshot_lang=en").root,
    { lang: "en", dir: "ltr" },
  );
  assert.deepEqual(languageBoot("", null, "").root, { lang: "ar", dir: "rtl" });
});

test("blocked local storage cannot override the URL or saved language cookie", () => {
  assert.deepEqual(
    languageBoot("?lang=en", null, "oneshot_lang=ar", true).root,
    { lang: "en", dir: "ltr" },
  );
  assert.deepEqual(languageBoot("", null, "oneshot_lang=en", true).root, {
    lang: "en",
    dir: "ltr",
  });
});

test("routes preserve tools, private work, checkout returns and missing-page behavior", () => {
  const route = (path: string) =>
    appRoute(new URL(path, "https://www.1shotcam.com"));
  for (const path of ["/", "/hub/", "/sign-in", "/sso/authorize"])
    assert.equal(route(path), "hub");
  for (const path of [
    "/?order=fixture",
    "/?module=gateway",
    "/?module=ai",
    "/workforce",
    "/products/SKU",
    "/privacy",
    "/guides/payment-gateways",
  ])
    assert.equal(route(path), "workspace");
  assert.equal(route("/admin/radar"), "tools");
  assert.equal(route("/tools/ecommerce/example"), "tools");
  assert.equal(route("/sso/callback/"), "receiver");
  assert.equal(route("/missing/page"), "missing");
});

test("SSO return paths cannot leave the app or restart a callback loop", () => {
  const origin = "https://workflow.1shotcam.com";
  for (const path of [
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "/sso/start",
    "/sso/callback",
  ])
    assert.equal(safeReturnPath(path, origin), null);
  assert.equal(
    safeReturnPath("/workforce?lang=en#mail", origin),
    "/workforce?lang=en#mail",
  );
});

test("auth waits finish on success and stop a hanging spinner on timeout", async () => {
  const auth = isolated("src/lib/auth-session.ts", { "@netlify/identity": {} });
  assert.equal(await auth.waitForAuth(Promise.resolve("done"), 50), "done");
  await assert.rejects(
    auth.waitForAuth(new Promise(() => {}), 5),
    auth.AuthTimeoutError,
  );
});

test("simultaneous API callers share one Identity session refresh", async () => {
  let refreshes = 0,
    reads = 0;
  const auth = isolated("src/lib/auth-session.ts", {
    "@netlify/identity": {
      getUser: async () => {
        reads++;
        return { id: "fixture" };
      },
      refreshSession: async () => {
        refreshes++;
        await new Promise((r) => setTimeout(r, 5));
      },
    },
  });
  await Promise.all([
    auth.prepareIdentitySession(),
    auth.prepareIdentitySession(),
    auth.prepareIdentitySession(),
  ]);
  assert.equal(reads, 1);
  assert.equal(refreshes, 1);
});

function apiModule(fetch: typeof globalThis.fetch, prepare = async () => {}) {
  return isolated(
    "src/lib/api.ts",
    {
      "./ecosystem-session": {
        receiverApp: () => null,
        ecosystemSession: () => null,
      },
      "../../shared/ecosystem": { hubOrigin: "https://www.1shotcam.com" },
      "./auth-session": { prepareIdentitySession: prepare },
      "./preferences": { storedLanguage: () => "en" },
      "./diagnostics": { reportClientDiagnostic: () => {} },
    },
    { fetch },
  );
}

test("financial transport errors and HTML responses never trigger an alias retry", async () => {
  for (const mode of ["html", "timeout"]) {
    let calls = 0;
    const api = apiModule(async () => {
      calls++;
      if (mode === "timeout") throw new Error("network");
      return new Response("<!doctype html><html></html>", { status: 502 });
    });
    await assert.rejects(
      api.callBackendApi(
        ["/api/payment/execute", "/api/loader/execute"],
        { amount: 1 },
        { idempotencyKey: "fixture-operation" },
      ),
    );
    assert.equal(calls, 1);
  }
});

test("alias fallback requires an explicit JSON route-not-found response and keeps the operation ID", async () => {
  const sent: string[] = [];
  const api = apiModule(async (_url, init) => {
    sent.push(new Headers(init?.headers).get("Idempotency-Key") || "");
    return sent.length === 1
      ? Response.json({ code: "ROUTE_NOT_FOUND" }, { status: 404 })
      : Response.json({ order: { id: "fixture" } });
  });
  const result = await api.callBackendApi(
    ["/api/old", "/api/new"],
    { amount: 1 },
    { idempotencyKey: "fixture-operation" },
  );
  assert.equal(result.order.id, "fixture");
  assert.deepEqual(sent, ["fixture-operation", "fixture-operation"]);
});

test("private replies from a previous account are discarded", async () => {
  let deliver!: (r: Response) => void;
  const api = apiModule(
    () =>
      new Promise((resolve) => {
        deliver = resolve;
      }),
  );
  const result = api.api("/api/orders");
  await new Promise((resolve) => setTimeout(resolve, 0));
  api.clearApiSession();
  deliver(Response.json({ orders: [{ id: "private" }] }));
  await assert.rejects(result, (e: any) => e.code === "SESSION_CHANGED");
});

test("session preparation completes before private requests; public catalog does not wait for Identity", async () => {
  const sequence: string[] = [];
  const api = apiModule(
    async () => {
      sequence.push("fetch");
      return Response.json({});
    },
    async () => {
      sequence.push("refresh");
    },
  );
  await api.api("/api/orders");
  assert.deepEqual(sequence, ["refresh", "fetch"]);
  sequence.length = 0;
  await api.api("/api/products");
  assert.deepEqual(sequence, ["fetch"]);
});

class FakeApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "REQUEST_FAILED") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const order = {
  id: "fixture-order",
  amountCents: 12500,
  currency: "SAR",
  description: "Test order",
  gateway: "stripe",
  executionMode: "SANDBOX",
  idempotencyKey: "fixture-operation",
};
const session = {
  id: "cs_test_fixture",
  url: "https://checkout.stripe.com/c/pay/fixture",
  client_reference_id: order.id,
  metadata: { oneshot_order_id: order.id },
  amount_total: 12500,
  currency: "sar",
  livemode: false,
  mode: "payment",
};
const credentials = { secretKey: "sk_test_nonsecret_fixture" };
function stripe(fetch: typeof globalThis.fetch) {
  return isolated(
    "netlify/lib/payment-providers.ts",
    { "./security.js": { ApiError: FakeApiError } },
    { fetch },
  );
}

test("Stripe checkout uses the official parameter, stable idempotency and a customer-accessible return", async () => {
  let calls = 0;
  const provider = stripe(async (_url, init) => {
    calls++;
    const form = new URLSearchParams(String(init?.body));
    assert.equal(form.get("payment_method_types[0]"), "card");
    assert.equal(form.has("allowed_payment_method_types[0]"), false);
    assert.equal(
      new Headers(init?.headers).get("Idempotency-Key"),
      order.idempotencyKey,
    );
    assert.equal(
      form.get("payment_method_options[card][request_three_d_secure]"),
      "any",
    );
    assert.equal(
      form.get("success_url"),
      "https://www.1shotcam.com/?order=fixture-order",
    );
    return Response.json(session);
  });
  const result = await provider.createHostedCheckout(
    order,
    credentials,
    "https://www.1shotcam.com",
  );
  assert.equal(result.redirectUrl, session.url);
  assert.equal(calls, 1);
});

test("provider verification refuses mismatched amount/currency/environment/order", async () => {
  for (const patch of [
    { amount_total: 1 },
    { currency: "usd" },
    { livemode: true },
    { client_reference_id: "another-order" },
  ]) {
    const provider = stripe(async () =>
      Response.json({
        ...session,
        status: "complete",
        payment_status: "paid",
        ...patch,
      }),
    );
    await assert.rejects(
      provider.verifyHostedCheckout(
        { ...order, upstreamId: session.id },
        credentials,
      ),
      (e: any) => e.code === "PAYMENT_VERIFICATION_MISMATCH",
    );
  }
  const provider = stripe(async () =>
    Response.json({ ...session, status: "complete", payment_status: "paid" }),
  );
  assert.equal(
    await provider.verifyHostedCheckout(
      { ...order, upstreamId: session.id },
      credentials,
    ),
    "paid",
  );
});

test("Stripe transport failure is not automatically repeated", async () => {
  let calls = 0;
  const provider = stripe(async () => {
    calls++;
    throw new Error("offline");
  });
  await assert.rejects(
    provider.createHostedCheckout(
      order,
      credentials,
      "https://www.1shotcam.com",
    ),
    (e: any) => e.code === "UPSTREAM_UNCONFIRMED",
  );
  assert.equal(calls, 1);
});

test("malformed AI drafts cannot pass objects or invalid lists to the renderer", () => {
  assert.equal(
    normalizeAdDraft({ headlines: [{}], keywords: ["store"] }),
    null,
  );
  assert.equal(
    normalizeAdDraft({ headlines: ["headline"], keywords: "not a list" }),
    null,
  );
  const draft = normalizeAdDraft({
    headlines: [" headline ", {}],
    keywords: ["store"],
    descriptions: { unexpected: true },
    audience: { description: {}, targeting: [{}, "Saudi Arabia"] },
    extra: "ignored",
  });
  assert.deepEqual(draft?.headlines, ["headline"]);
  assert.deepEqual(draft?.descriptions, []);
  assert.deepEqual(draft?.audience, {
    description: "",
    targeting: ["Saudi Arabia"],
  });
  assert.equal(Object.hasOwn(draft!, "extra"), false);
});

test("credentialed CORS accepts exact ecosystem origins and rejects wildcard configuration", () => {
  const security = isolated(
    "netlify/lib/security.ts",
    {
      "@netlify/identity": {},
      "drizzle-orm": {},
      "../../db/index.js": {},
      "../../db/schema.js": {},
    },
    {
      Netlify: {
        env: {
          get: (name: string) =>
            name === "CONTEXT"
              ? "production"
              : name === "ALLOWED_ORIGINS"
                ? "*"
                : undefined,
        },
      },
    },
  );
  const url = "https://www.1shotcam.com/api/orders";
  assert.equal(security.isAllowedOrigin("https://pay.1shotcam.com", url), true);
  assert.equal(
    security.isAllowedOrigin("https://pay.1shotcam.com.evil.example", url),
    false,
  );
  assert.equal(security.isAllowedOrigin("https://evil.example", url), false);
  assert.equal(security.isAllowedOrigin("http://localhost:8889", url), false);
});

test("PWA manifest and offline cache contain only existing public assets", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../public/manifest.webmanifest", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.scope, "/");
  for (const icon of manifest.icons)
    assert.ok(existsSync(new URL(`../public${icon.src}`, import.meta.url)));
  const worker = readFileSync(
    new URL("../public/hub-sw.js", import.meta.url),
    "utf8",
  );
  const assets = worker.match(/const PUBLIC = (\[[\s\S]*?\]);/)![1];
  for (const path of runInNewContext(assets)) {
    assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)));
    assert.ok(!/api|sso|identity/.test(path));
  }
});

test("all 18 applied migrations remain present with unique identifiers", () => {
  const files = readdirSync(
    new URL("../netlify/database/migrations", import.meta.url),
  );
  const applied = [
    "20261017212122_create_oneshot_ecosystem",
    "20261017212200_seed_product_catalog",
    "20261017221557_add_original_storefront_catalog",
    "20261017230000_import_original_catalog",
    "20261018035903_add_workforce_workspace",
    "20261018040000_seed_workforce_catalog",
    "20261018053706_add_workforce_conversations",
    "20261018054210_add_meeting_output_language",
    "20261018073311_workforce_collaboration",
    "20261018073400_expand_workforce_catalog",
    "20261018075054_add_workforce_live_operations",
    "20261018075055_expand_workforce_team",
    "20261018165651_migrate_core_to_netlify",
    "20261018165652_seed_core_sales_employee",
    "20261019030302_add_ecosystem_sso_grants",
    "20261019090436_add_experience_push_subscriptions",
    "20261023013904_sparkling_tempest",
    "20261023034356_add_tool_radar",
  ];
  const ids = files.map((f) => f.replace(/\.sql$/, ""));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of applied) assert.ok(ids.includes(id), id);
});
