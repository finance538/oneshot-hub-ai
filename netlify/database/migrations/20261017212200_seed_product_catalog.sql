INSERT INTO products (id,name,description,badge,category,price_cents,currency,image) VALUES
('oneshot-pro-4k','كاميرا OneShot Pro 4K AI','كاميرا احترافية ذكية بدقة 4K مع تتبع تلقائي بالذكاء الاصطناعي وبث فوري.','الأكثر مبيعاً','cameras',19900,'USD','camera'),
('oneshot-studio-kit','باقة OneShot Studio Kit','طقم الإضاءة والتصوير المتكامل لصناع المحتوى والبث المباشر الاحترافي.','باقة استوديو','studio',34900,'USD','studio-kit'),
('oneshot-cloud-ai','عضوية OneShot Cloud AI','مساحة سحابية غير محدودة مع معالجة فيديو فورية بالذكاء الاصطناعي. عضوية شهرية.','اشتراك رقمي','digital',2900,'USD',NULL),
('gateway-verification','عملية تحقق بوابة الدفع','منتج مخصص لفحص استجابة بوابة الدفع الحية وشاشة 3D Secure بمبلغ 1 دولار.','فحص سريع','digital',100,'USD',NULL)
ON CONFLICT (id) DO NOTHING;
