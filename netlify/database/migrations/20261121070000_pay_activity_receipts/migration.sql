CREATE TABLE IF NOT EXISTS "pay_activity_receipts" (
  "key" text PRIMARY KEY,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
