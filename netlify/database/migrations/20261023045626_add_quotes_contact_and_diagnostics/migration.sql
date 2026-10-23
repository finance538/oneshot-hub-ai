CREATE TABLE "business_settings" (
	"id" text PRIMARY KEY,
	"email" text DEFAULT 'support@1shotcam.com' NOT NULL,
	"phone" text,
	"whatsapp" text,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagnostic_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"source" text NOT NULL,
	"code" text NOT NULL,
	"area" text NOT NULL,
	"status" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"reference" text NOT NULL UNIQUE,
	"submission_hash" text NOT NULL UNIQUE,
	"fingerprint" text NOT NULL,
	"kind" text DEFAULT 'service' NOT NULL,
	"customer_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"product_id" text,
	"service_name" text NOT NULL,
	"notes" text NOT NULL,
	"language" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"amount_cents" integer,
	"approved_scope" text,
	"offer_id" uuid UNIQUE,
	"expires_at" timestamp with time zone,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_status_valid" CHECK ("status" in ('new', 'in_review', 'quoted', 'closed')),
	CONSTRAINT "quote_language_valid" CHECK ("language" in ('ar', 'en')),
	CONSTRAINT "quote_kind_valid" CHECK ("kind" in ('service', 'pro')),
	CONSTRAINT "quote_amount_valid" CHECK ("amount_cents" is null or "amount_cents" between 100 and 100000000)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "quote_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_quote_id_key" UNIQUE("quote_id");--> statement-breakpoint
CREATE INDEX "diagnostic_created" ON "diagnostic_events" ("created_at");--> statement-breakpoint
CREATE INDEX "quote_status_created" ON "quote_requests" ("status","created_at");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_quote_id_quote_requests_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quote_requests"("id");--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");