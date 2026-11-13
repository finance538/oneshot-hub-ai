CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"contact" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"remind_after_days" integer DEFAULT 3 NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"draft" text DEFAULT '' NOT NULL,
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follow_ups_status" CHECK ("status" in ('waiting','due','replied','closed'))
);
--> statement-breakpoint
CREATE INDEX "follow_ups_owner" ON "follow_ups" ("owner_id","status");--> statement-breakpoint
CREATE INDEX "follow_ups_due" ON "follow_ups" ("status","checked_at");