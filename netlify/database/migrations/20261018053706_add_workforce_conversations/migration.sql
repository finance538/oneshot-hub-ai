CREATE TABLE "workforce_chat_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"employee_id" text NOT NULL,
	"meeting_id" uuid,
	"request_key" uuid NOT NULL UNIQUE,
	"input" text NOT NULL,
	"output" text DEFAULT '' NOT NULL,
	"output_language" text NOT NULL,
	"status" text DEFAULT 'generating' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "workforce_chat_scope" ON "workforce_chat_turns" ("organization_id","employee_id","meeting_id","created_at");--> statement-breakpoint
ALTER TABLE "workforce_chat_turns" ADD CONSTRAINT "workforce_chat_turns_UScLGvhJVxMq_fkey" FOREIGN KEY ("organization_id") REFERENCES "workforce_organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workforce_chat_turns" ADD CONSTRAINT "workforce_chat_turns_employee_id_workforce_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "workforce_employees"("id");--> statement-breakpoint
ALTER TABLE "workforce_chat_turns" ADD CONSTRAINT "workforce_chat_turns_meeting_id_workforce_meetings_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "workforce_meetings"("id") ON DELETE CASCADE;