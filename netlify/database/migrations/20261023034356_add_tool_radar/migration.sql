CREATE TABLE "tool_metrics" (
	"slug" text,
	"day" text,
	"cluster" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	"funnels" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tool_metrics_pkey" PRIMARY KEY("slug","day")
);
--> statement-breakpoint
CREATE TABLE "tool_offers" (
	"slug" text PRIMARY KEY,
	"pro" boolean DEFAULT false NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tool_metrics_day" ON "tool_metrics" ("day");