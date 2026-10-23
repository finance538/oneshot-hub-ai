ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "business_name_ar" text DEFAULT 'مؤسسة يحيى احمد يحيى الهوساوي للتصوير الفوتوغرافي' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "trade_name_ar" text DEFAULT 'مؤسسة يحيى للتصوير الفوتوغرافي (OneShot)' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "business_name_en" text DEFAULT 'Yahya Ahmed Yahya Al-Hawsawi Photography Establishment (1ShotCam)' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "cr_number" text DEFAULT '7038244914' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "issue_date" text DEFAULT '06/02/2024' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "entity_type" text DEFAULT 'مؤسسة (Establishment)' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'نشط (Active)' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "ownership_attested" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ALTER COLUMN "email" SET DEFAULT 'finance@1shotcam.com';--> statement-breakpoint
ALTER TABLE "business_settings" ALTER COLUMN "updated_by" SET DEFAULT 'system';