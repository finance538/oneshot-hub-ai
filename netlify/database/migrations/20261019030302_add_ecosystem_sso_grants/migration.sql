CREATE TABLE "ecosystem_grants" (
	"code_hash" text PRIMARY KEY,
	"owner_id" text NOT NULL,
	"audience" text NOT NULL,
	"challenge" text NOT NULL,
	"encrypted_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"session_hash" text UNIQUE,
	"session_expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "ecosystem_grants_owner" ON "ecosystem_grants" ("owner_id");