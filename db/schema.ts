import { sql } from "drizzle-orm";
import type { OriginalProduct } from "../shared/storefront";
import {
  pgTable,
  check,
  jsonb,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export const sharedSessions = pgTable(
  "shared_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    ownerId: text("owner_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("shared_sessions_owner").on(t.ownerId),
    index("shared_sessions_expiry").on(t.expiresAt),
  ],
);

export const googleOAuthStates = pgTable(
  "google_oauth_states",
  {
    stateHash: text("state_hash").primaryKey(),
    browserHash: text("browser_hash").notNull(),
    ownerId: text("owner_id"),
    purpose: text("purpose").notNull(),
    returnTo: text("return_to").notNull(),
    encryptedVerifier: text("encrypted_verifier").notNull(),
    nonceHash: text("nonce_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("google_oauth_states_expiry").on(t.expiresAt)],
);

export const googleWorkspaceConnections = pgTable(
  "google_workspace_connections",
  {
    ownerId: text("owner_id").primaryKey(),
    googleSubject: text("google_subject").notNull(),
    email: text("email").notNull(),
    scopes: text("scopes").notNull(),
    encryptedTokens: text("encrypted_tokens").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  badge: text("badge").notNull(),
  category: text("category").notNull(),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  image: text("image"),
  catalogDetails: jsonb("catalog_details").$type<OriginalProduct>(),
  active: boolean("active").notNull().default(true),
});

// Browser push capabilities are encrypted; only endpoint digests are indexed.
export const pushSubscriptions = pgTable(
  "experience_push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    endpointHash: text("endpoint_hash").notNull().unique(),
    encryptedSubscription: text("encrypted_subscription").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("experience_push_owner").on(t.ownerId)],
);
export const vaultKeys = pgTable(
  "vault_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gateway: text("gateway").notNull(),
    environment: text("environment").notNull(),
    encrypted: text("encrypted").notNull(),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("vault_gateway_environment").on(t.gateway, t.environment),
  ],
);
export const quoteRequests = pgTable(
  "quote_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),
    submissionHash: text("submission_hash").notNull().unique(),
    fingerprint: text("fingerprint").notNull(),
    kind: text("kind").notNull().default("service"),
    customerName: text("customer_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    productId: text("product_id").references(() => products.id),
    serviceName: text("service_name").notNull(),
    notes: text("notes").notNull(),
    language: text("language").notNull(),
    status: text("status").notNull().default("new"),
    amountCents: integer("amount_cents"),
    approvedScope: text("approved_scope"),
    offerId: uuid("offer_id").unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("quote_status_created").on(t.status, t.createdAt),
    check(
      "quote_status_valid",
      sql`${t.status} in ('new', 'in_review', 'quoted', 'closed')`,
    ),
    check("quote_language_valid", sql`${t.language} in ('ar', 'en')`),
    check("quote_kind_valid", sql`${t.kind} in ('service', 'pro')`),
    check(
      "quote_amount_valid",
      sql`${t.amountCents} is null or ${t.amountCents} between 100 and 100000000`,
    ),
  ],
);
export const businessSettings = pgTable("business_settings", {
  id: text("id").primaryKey(),
  businessNameAr: text("business_name_ar")
    .notNull()
    .default("مؤسسة يحيى احمد يحيى الهوساوي للتصوير الفوتوغرافي"),
  tradeNameAr: text("trade_name_ar")
    .notNull()
    .default("مؤسسة يحيى للتصوير الفوتوغرافي (OneShot)"),
  businessNameEn: text("business_name_en")
    .notNull()
    .default(
      "Yahya Ahmed Yahya Al-Hawsawi Photography Establishment (1ShotCam)",
    ),
  crNumber: text("cr_number").notNull().default("7038244914"),
  issueDate: text("issue_date").notNull().default("06/02/2024"),
  entityType: text("entity_type").notNull().default("مؤسسة (Establishment)"),
  status: text("status").notNull().default("نشط (Active)"),
  email: text("email").notNull().default("finance@1shotcam.com"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  ownershipAttested: boolean("ownership_attested").notNull().default(true),
  updatedBy: text("updated_by").notNull().default("system"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const diagnosticEvents = pgTable(
  "diagnostic_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    code: text("code").notNull(),
    area: text("area").notNull(),
    status: integer("status"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("diagnostic_created").on(t.createdAt)],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    quoteId: uuid("quote_id")
      .unique()
      .references(() => quoteRequests.id),
    productId: text("product_id").references(() => products.id),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    gateway: text("gateway").notNull(),
    executionMode: text("execution_mode").notNull(),
    topology: text("topology").notNull(),
    // Existing orders retain their original verifier during the transition.
    processor: text("processor").notNull().default("legacy_core"),
    status: text("status").notNull().default("pending"),
    checkoutUrl: text("checkout_url"),
    upstreamId: text("upstream_id"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    fingerprint: text("fingerprint").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("orders_owner").on(t.ownerId)],
);
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("conversations_owner").on(t.ownerId)],
);
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("messages_conversation").on(t.conversationId)],
);
export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  instructions: text("instructions").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const webhookReceipts = pgTable("webhook_receipts", {
  eventId: text("event_id").primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const requestLimits = pgTable("request_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(1),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// Workforce is isolated from the existing administrator staff and payment tables.
export const organizations = pgTable("workforce_organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull().unique(),
  name: text("name").notNull(),
  outputLanguage: text("output_language").notNull().default("ar"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const aiEmployees = pgTable("workforce_employees", {
  id: text("id").primaryKey(),
  title: jsonb("title").$type<Record<string, string>>().notNull(),
  bio: jsonb("bio").$type<Record<string, string>>().notNull(),
  skills: jsonb("skills").$type<string[]>().notNull(),
  category: text("category").notNull(),
  instructions: text("instructions").notNull(),
  availability: text("availability").notNull().default("prototype"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const coreEmployeeSelections = pgTable(
  "core_employee_selections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => aiEmployees.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("core_selection_org_employee").on(
      t.organizationId,
      t.employeeId,
    ),
  ],
);

export const corePolicies = pgTable("core_policies", {
  id: text("id").primaryKey(),
  policy: jsonb("policy").$type<Record<string, unknown>>().notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const workforceTasks = pgTable(
  "workforce_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => aiEmployees.id),
    requestKey: uuid("request_key").notNull().unique(),
    mode: text("mode").notNull().default("live"),
    status: text("status").notNull().default("received"),
    input: text("input").notNull(),
    output: text("output").notNull().default(""),
    outputLanguage: text("output_language").notNull().default("ar"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("workforce_tasks_org").on(t.organizationId)],
);
export const workforceEvents = pgTable(
  "workforce_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => workforceTasks.id, { onDelete: "cascade" }),
    phase: text("phase").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("workforce_events_org").on(t.organizationId)],
);
export const workforceMeetings = pgTable(
  "workforce_meetings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    requestKey: uuid("request_key").notNull().unique(),
    status: text("status").notNull().default("generating"),
    topic: text("topic").notNull(),
    outputLanguage: text("output_language").notNull().default("ar"),
    minutes: text("minutes").notNull().default(""),
    reports: jsonb("reports")
      .$type<
        { employeeId: string; taskId: string; status: string; output: string }[]
      >()
      .notNull(),
    proposals: jsonb("proposals")
      .$type<{ id: string; employeeId: string; title: string }[]>()
      .notNull(),
    revision: text("revision").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("workforce_meetings_org").on(t.organizationId)],
);

export const workforceChatTurns = pgTable(
  "workforce_chat_turns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => aiEmployees.id),
    meetingId: uuid("meeting_id").references(() => workforceMeetings.id, {
      onDelete: "cascade",
    }),
    requestKey: uuid("request_key").notNull().unique(),
    input: text("input").notNull(),
    output: text("output").notNull().default(""),
    collaboration: jsonb("collaboration")
      .$type<{ employeeId: string; output: string }[]>()
      .notNull()
      .default([]),
    action: jsonb("action").$type<{
      kind: string;
      employeeId: string;
      resourceId?: string;
    }>(),
    outputLanguage: text("output_language").notNull(),
    status: text("status").notNull().default("generating"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("workforce_chat_scope").on(
      t.organizationId,
      t.employeeId,
      t.meetingId,
      t.createdAt,
    ),
  ],
);

export const workforceConnections = pgTable(
  "workforce_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    label: text("label").notNull(),
    origin: text("origin").notNull().default(""),
    encryptedConfig: text("encrypted_config").notNull(),
    encryptedSession: text("encrypted_session"),
    sessionExpiresAt: timestamp("session_expires_at", { withTimezone: true }),
    keepSession: boolean("keep_session").notNull().default(false),
    status: text("status").notNull().default("saved"),
    syncEnabled: boolean("sync_enabled").notNull().default(true),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("workforce_connections_org").on(t.organizationId)],
);

export const workforceMail = pgTable(
  "workforce_mail",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => workforceConnections.id, { onDelete: "cascade" }),
    dedupeKey: text("dedupe_key").notNull().unique(),
    direction: text("direction").notNull(),
    sender: text("sender").notNull(),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
    status: text("status").notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("workforce_mail_org").on(t.organizationId, t.createdAt)],
);

export const workforceResearch = pgTable(
  "workforce_research",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id").references(
      () => workforceConnections.id,
      { onDelete: "set null" },
    ),
    requestKey: uuid("request_key").notNull().unique(),
    query: text("query").notNull(),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("running"),
    summary: text("summary").notNull().default(""),
    pages: jsonb("pages")
      .$type<{ title: string; url: string; excerpt: string }[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("workforce_research_org").on(t.organizationId, t.createdAt)],
);

// Growth studio: merchant-owned AI campaign drafts. Copy is generated on
// demand; only the saved draft JSON persists here.
export const growthCampaigns = pgTable(
  "growth_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    platform: text("platform").notNull().default("google"),
    businessName: text("business_name").notNull().default(""),
    product: text("product").notNull().default(""),
    draft: jsonb("draft").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("growth_campaigns_owner").on(t.ownerId)],
);

// Single-use, PKCE-bound grants and short-lived ecosystem sessions. Tokens are
// encrypted at rest; neither authorization codes nor session secrets are stored.
export const ecosystemGrants = pgTable(
  "ecosystem_grants",
  {
    codeHash: text("code_hash").primaryKey(),
    ownerId: text("owner_id").notNull(),
    audience: text("audience").notNull(),
    challenge: text("challenge").notNull(),
    encryptedToken: text("encrypted_token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    sessionHash: text("session_hash").unique(),
    sessionExpiresAt: timestamp("session_expires_at", { withTimezone: true }),
  },
  (t) => [index("ecosystem_grants_owner").on(t.ownerId)],
);

// Owner radar for the public tool pages: anonymous daily counters only (no
// IPs, cookies or inputs), plus the owner's Pro designation per tool.
export const toolMetrics = pgTable(
  "tool_metrics",
  {
    slug: text("slug").notNull(),
    day: text("day").notNull(),
    cluster: text("cluster").notNull(),
    views: integer("views").notNull().default(0),
    uses: integer("uses").notNull().default(0),
    funnels: integer("funnels").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.slug, t.day] }),
    index("tool_metrics_day").on(t.day),
  ],
);

export const toolOffers = pgTable("tool_offers", {
  slug: text("slug").primaryKey(),
  pro: boolean("pro").notNull().default(false),
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
