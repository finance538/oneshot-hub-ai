CREATE TABLE "page_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"page_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"contact" text NOT NULL,
	"preferred_at" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "published_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"title" text NOT NULL,
	"kind" text DEFAULT 'bio' NOT NULL,
	"content" text NOT NULL,
	"contact_email" text DEFAULT '' NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "published_pages_kind" CHECK ("kind" in ('bio','booking','landing'))
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'document' NOT NULL,
	"language" text DEFAULT '' NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "page_bookings_owner" ON "page_bookings" ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "published_pages_owner" ON "published_pages" ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "templates_owner" ON "templates" ("owner_id","updated_at");--> statement-breakpoint
ALTER TABLE "page_bookings" ADD CONSTRAINT "page_bookings_page_id_published_pages_id_fkey" FOREIGN KEY ("page_id") REFERENCES "published_pages"("id") ON DELETE CASCADE;