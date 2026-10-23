CREATE TABLE "growth_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"platform" text DEFAULT 'google' NOT NULL,
	"business_name" text DEFAULT '' NOT NULL,
	"product" text DEFAULT '' NOT NULL,
	"draft" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "growth_campaigns_owner" ON "growth_campaigns" ("owner_id");