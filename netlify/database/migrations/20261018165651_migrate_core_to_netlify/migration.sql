CREATE TABLE "core_employee_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"employee_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_policies" (
	"id" text PRIMARY KEY,
	"policy" jsonb NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "processor" text DEFAULT 'legacy_core' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "core_selection_org_employee" ON "core_employee_selections" ("organization_id","employee_id");--> statement-breakpoint
ALTER TABLE "core_employee_selections" ADD CONSTRAINT "core_employee_selections_rqTjsO3KRbi2_fkey" FOREIGN KEY ("organization_id") REFERENCES "workforce_organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "core_employee_selections" ADD CONSTRAINT "core_employee_selections_ZHM7yu73m88w_fkey" FOREIGN KEY ("employee_id") REFERENCES "workforce_employees"("id");