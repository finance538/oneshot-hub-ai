CREATE TABLE "experience_push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"endpoint_hash" text NOT NULL UNIQUE,
	"encrypted_subscription" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "experience_push_owner" ON "experience_push_subscriptions" ("owner_id");