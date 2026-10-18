-- Catalog configuration for the V6 sales role; not a subscription or activity record.
INSERT INTO workforce_employees (id, title, bio, skills, category, instructions, availability)
VALUES ('sales', '{"ar":"مستشار المبيعات","en":"Sales advisor"}'::jsonb,
  '{"ar":"أجهز عروض المبيعات والردود وفق المعلومات والسياسات التي تقدمها.","en":"Prepare sales drafts using supplied product information and policies."}'::jsonb,
  '["sales","proposals","customer_follow_up"]'::jsonb, 'operations',
  'Draft sales proposals and follow-up messages from supplied facts. Do not invent pricing, discounts, customers, delivery promises or completed sales. No execution tools are available.', 'advisory')
ON CONFLICT (id) DO NOTHING;
