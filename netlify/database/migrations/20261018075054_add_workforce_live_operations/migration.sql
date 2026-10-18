CREATE TABLE "workforce_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"origin" text DEFAULT '' NOT NULL,
	"encrypted_config" text NOT NULL,
	"encrypted_session" text,
	"session_expires_at" timestamp with time zone,
	"keep_session" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'saved' NOT NULL,
	"sync_enabled" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp with time zone,
	"lease_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_mail" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"dedupe_key" text NOT NULL UNIQUE,
	"direction" text NOT NULL,
	"sender" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"message_id" text,
	"in_reply_to" text,
	"status" text NOT NULL,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_research" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"connection_id" uuid,
	"request_key" uuid NOT NULL UNIQUE,
	"query" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"pages" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workforce_chat_turns" ADD COLUMN "action" jsonb;--> statement-breakpoint
CREATE INDEX "workforce_connections_org" ON "workforce_connections" ("organization_id");--> statement-breakpoint
CREATE INDEX "workforce_mail_org" ON "workforce_mail" ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "workforce_research_org" ON "workforce_research" ("organization_id","created_at");--> statement-breakpoint
ALTER TABLE "workforce_connections" ADD CONSTRAINT "workforce_connections_mRlqe0dBB3l4_fkey" FOREIGN KEY ("organization_id") REFERENCES "workforce_organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workforce_mail" ADD CONSTRAINT "workforce_mail_organization_id_workforce_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "workforce_organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workforce_mail" ADD CONSTRAINT "workforce_mail_connection_id_workforce_connections_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "workforce_connections"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workforce_research" ADD CONSTRAINT "workforce_research_xJaH128K50Mk_fkey" FOREIGN KEY ("organization_id") REFERENCES "workforce_organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workforce_research" ADD CONSTRAINT "workforce_research_connection_id_workforce_connections_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "workforce_connections"("id") ON DELETE SET NULL;