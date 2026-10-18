CREATE TABLE "workforce_employees" (
	"id" text PRIMARY KEY,
	"title" jsonb NOT NULL,
	"bio" jsonb NOT NULL,
	"skills" jsonb NOT NULL,
	"category" text NOT NULL,
	"instructions" text NOT NULL,
	"availability" text DEFAULT 'prototype' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"output_language" text DEFAULT 'ar' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"phase" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"request_key" uuid NOT NULL UNIQUE,
	"status" text DEFAULT 'generating' NOT NULL,
	"topic" text NOT NULL,
	"minutes" text DEFAULT '' NOT NULL,
	"reports" jsonb NOT NULL,
	"proposals" jsonb NOT NULL,
	"revision" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"employee_id" text NOT NULL,
	"request_key" uuid NOT NULL UNIQUE,
	"mode" text DEFAULT 'live' NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"input" text NOT NULL,
	"output" text DEFAULT '' NOT NULL,
	"output_language" text DEFAULT 'ar' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "workforce_events_org" ON "workforce_events" ("organization_id");--> statement-breakpoint
CREATE INDEX "workforce_meetings_org" ON "workforce_meetings" ("organization_id");--> statement-breakpoint
CREATE INDEX "workforce_tasks_org" ON "workforce_tasks" ("organization_id");--> statement-breakpoint
ALTER TABLE "workforce_events" ADD CONSTRAINT "workforce_events_HVBWhl6Wb5yU_fkey" FOREIGN KEY ("organization_id") REFERENCES "workforce_organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workforce_events" ADD CONSTRAINT "workforce_events_task_id_workforce_tasks_id_fkey" FOREIGN KEY ("task_id") REFERENCES "workforce_tasks"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workforce_meetings" ADD CONSTRAINT "workforce_meetings_z2T8C6czKYrN_fkey" FOREIGN KEY ("organization_id") REFERENCES "workforce_organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workforce_tasks" ADD CONSTRAINT "workforce_tasks_organization_id_workforce_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "workforce_organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workforce_tasks" ADD CONSTRAINT "workforce_tasks_employee_id_workforce_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "workforce_employees"("id");