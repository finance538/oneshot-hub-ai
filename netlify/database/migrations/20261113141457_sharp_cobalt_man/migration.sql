ALTER TABLE "follow_ups" ADD COLUMN "contact_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "thread_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "auto_send" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "auto_reply" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "messages_sent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "last_reply_at" timestamp with time zone;