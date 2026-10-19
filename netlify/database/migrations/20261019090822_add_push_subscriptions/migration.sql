CREATE TABLE "push_subscriptions" (
	"endpoint_hash" text PRIMARY KEY,
	"owner_id" text NOT NULL,
	"encrypted_subscription" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "push_subscriptions_owner" ON "push_subscriptions" ("owner_id");