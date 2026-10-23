INSERT INTO "business_settings" (
  "id", "business_name_ar", "trade_name_ar", "business_name_en", "cr_number", "issue_date", "entity_type", "status", "email", "ownership_attested", "updated_by", "updated_at"
) VALUES (
  'official',
  'مؤسسة يحيى احمد يحيى الهوساوي للتصوير الفوتوغرافي',
  'مؤسسة يحيى للتصوير الفوتوغرافي (OneShot)',
  'Yahya Ahmed Yahya Al-Hawsawi Photography Establishment (1ShotCam)',
  '7038244914',
  '06/02/2024',
  'مؤسسة (Establishment)',
  'نشط (Active)',
  'finance@1shotcam.com',
  true,
  'system',
  now()
) ON CONFLICT ("id") DO UPDATE SET
  "business_name_ar" = EXCLUDED."business_name_ar",
  "trade_name_ar" = EXCLUDED."trade_name_ar",
  "business_name_en" = EXCLUDED."business_name_en",
  "cr_number" = EXCLUDED."cr_number",
  "issue_date" = EXCLUDED."issue_date",
  "entity_type" = EXCLUDED."entity_type",
  "status" = EXCLUDED."status",
  "email" = EXCLUDED."email",
  "ownership_attested" = true,
  "updated_at" = now();
