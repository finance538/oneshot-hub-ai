-- Passwordless accounts shared by every OneShot app (www first). Additive only: it creates one
-- new table and never touches the tables the ai project already owns on the same database.
CREATE TABLE IF NOT EXISTS "oneshot_accounts" (
	"id" text PRIMARY KEY,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"channel" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "oneshot_accounts_email" ON "oneshot_accounts" ("email");
