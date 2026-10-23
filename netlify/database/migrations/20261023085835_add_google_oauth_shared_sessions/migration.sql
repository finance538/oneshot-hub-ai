CREATE TABLE "google_oauth_states" (
	"state_hash" text PRIMARY KEY,
	"browser_hash" text NOT NULL,
	"owner_id" text,
	"purpose" text NOT NULL,
	"return_to" text NOT NULL,
	"encrypted_verifier" text NOT NULL,
	"nonce_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_workspace_connections" (
	"owner_id" text PRIMARY KEY,
	"google_subject" text NOT NULL,
	"email" text NOT NULL,
	"scopes" text NOT NULL,
	"encrypted_tokens" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_sessions" (
	"token_hash" text PRIMARY KEY,
	"owner_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "google_oauth_states_expiry" ON "google_oauth_states" ("expires_at");--> statement-breakpoint
CREATE INDEX "shared_sessions_owner" ON "shared_sessions" ("owner_id");--> statement-breakpoint
CREATE INDEX "shared_sessions_expiry" ON "shared_sessions" ("expires_at");