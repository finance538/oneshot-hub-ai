CREATE TABLE "auth_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"channel" text NOT NULL,
	"destination" text NOT NULL,
	"code_hash" text NOT NULL,
	"browser_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_codes_channel" CHECK ("channel" in ('email','sms'))
);
--> statement-breakpoint
CREATE TABLE "device_locks" (
	"owner_id" text PRIMARY KEY,
	"pin_hash" text NOT NULL,
	"pin_salt" text NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_passkeys" (
	"credential_id" text PRIMARY KEY,
	"owner_id" text NOT NULL,
	"public_key" text NOT NULL,
	"algorithm" integer NOT NULL,
	"sign_count" integer DEFAULT 0 NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "passkey_challenges" (
	"challenge_hash" text PRIMARY KEY,
	"owner_id" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "passkey_challenges_purpose" CHECK ("purpose" in ('register','assert'))
);
--> statement-breakpoint
CREATE INDEX "auth_codes_destination" ON "auth_codes" ("destination");--> statement-breakpoint
CREATE INDEX "auth_codes_expiry" ON "auth_codes" ("expires_at");--> statement-breakpoint
CREATE INDEX "device_passkeys_owner" ON "device_passkeys" ("owner_id");--> statement-breakpoint
CREATE INDEX "passkey_challenges_expiry" ON "passkey_challenges" ("expires_at");