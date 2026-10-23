# مراجعة الإطلاق النهائية — OneShot / Final launch review

**التاريخ: 23 أكتوبر 2026. النتيجة: أُصلحت الأعطال المؤكدة في المستودع ونجحت الاختبارات وفحص الأنواع؛ الاعتماد النهائي للإطلاق ما زال مشروطاً بنشر التغييرات وتجربة الخدمات الخارجية بحسابات المالك.** لا تعني هذه المراجعة أن جميع السيناريوهات الحية خالية من الأخطاء بنسبة 100%.

## 1. ما فُحص وأُصلح تلقائياً

| المجال             | العطل أو الملاحظة                                                                                               | الإصلاح المنفّذ                                                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google والحسابات   | Google مفعّل في إعدادات الهوية، لكن الواجهة لا تعرض زر الدخول                                                   | أُضيف زر Google وفق الإعداد الفعلي، مع حفظ وجهة العودة ومعالجة إلغاء الدخول، والتعامل مع سلوك إعادة التوجيه في إصدار SDK المثبت                                              |
| التسجيل والاستعادة | انتظار غير محدود لبعض استدعاءات الهوية، وفشل تحميل الإعدادات يُخفي التسجيل بصمت                                 | أُضيف حد زمني لانتظار الواجهة، وإعادة تحقق مرئية، ورسائل دعوات/تأكيد بريد/فشل واضحة؛ أُزيل قيد طول كلمة المرور من نموذج الدخول للحسابات القديمة وبقي عند إنشاء كلمة جديدة    |
| الجلسات والصلاحيات | الطلبات الخاصة قد تصل قبل تجديد الهوية، وتغيّر الصلاحيات أثناء التجديد لا يُبطل الردود السابقة دائماً           | جُهّزت جلسة الهوية قبل الطلبات الخاصة مع توحيد طلب التجديد المتزامن، وأُبقي حجب الردود المرتبطة بالحساب السابق؛ أُعيد تركيب استوديو الحملات عند تبديل الحساب                 |
| SSO                | انتهاء جلسة التطبيق بصمت، وفقد اللغة ووجهة العمل عند العودة                                                     | أُضيف إشعار انتهاء وعودة داخل نفس النطاق، وتحقق إضافي من زمن طلب الربط؛ بقي PKCE أحادي الاستخدام والجلسة المحددة بعشر دقائق دون إضعاف الحماية                                |
| اللغة              | منع localStorage كان يجعل سكربت البداية يتجاهل حتى لغة الرابط/الكوكي؛ بعض الشاشات خارج مزود اللغة               | وُحّد مزود المظهر، وفُصلت مسارات الاستعادة، وحُفظ اختيار الرابط، وضُبط `lang/dir` قبل العرض؛ أُضيفت مزامنة التبويبات وكوكي تفضيل مشتركة بين نطاقات المنظومة                  |
| الترجمة            | نصوص ثابتة في الدخول والإدارة والبريد والبحث، وتوليد إعلانات/ردود تنفيذية بالعربية حتى عند اختيار الإنجليزية    | أُضيفت ترجمة 284 عبارة أساسية وأسماء المسارات/المناطق ورسائل الطلبات، وتبعت مسودات الإعلانات والمستشار التنفيذي اختيار العربية/الإنجليزية؛ أصبح الدليل دون اتصال ثنائي اللغة |
| التنقل             | `/sign-in` لا يفتح نافذة الحساب، و`/dashboard` لا يصل إلى بوابة التاجر مباشرة، وصفحات مجهولة تقع في مسار المتجر | صُحّحت الوجهات والأسماء القديمة والشرطة النهائية، وأُضيف عرض واضح للصفحة المفقودة، ووُجّهت أدلة `.html` إلى نسخها التفاعلية ثنائية اللغة                                     |
| الدفع              | اسم حقل Stripe غير صحيح، واختيار Telr افتراضياً رغم أن المعالج الجديد يدعم Stripe                               | صُحّح حقل طريقة الدفع والافتراضي، وأصبحت العودة إلى عرض طلب مملوك للعميل، مع النطاق الرئيسي كعنوان عودة افتراضي                                                              |
| متابعة الدفع       | تحديث تلقائي وآخر يدوي قد يتداخلان، ورابط دفع فاشل قد يبقى ظاهراً                                               | مُنع تداخل استعلامات الحالة وتحديث طلب مختلف، وأُخفي رابط الدفع للحالات النهائية؛ لم تُضف أي إعادة خصم آلية                                                                  |
| التواصل وPro       | رقم واتساب تجريبي، ووعد «فتح Pro بالدفع» دون ربط صلاحيات الشراء                                                 | أُزيل الرقم غير المتحقق واستُخدم بريد الدعم الموجود؛ استُبدل وعد الشراء باستفسار عن التوفر                                                                                   |
| النوافذ والأزرار   | الضغط داخل مساحة نافذة الحساب الفارغة يغلقها، وفشل بعض أزرار النسخ صامت                                         | صُحّح تمييز الخلفية واستعادة التركيز، وأُضيفت رسائل فشل النسخ؛ حُسّن التفاف عناصر الحساب على الهواتف                                                                         |
| AI الاختياري       | JSON غير صالح من مولّد الإعلانات قد يصل إلى `.map` فيُسقط الواجهة                                               | أُضيف تطبيع نصي محدود قبل العرض والحفظ، وقالب عربي/إنجليزي واضح عند تعذّر AI، دون اختلاق خصومات أو ضمانات أو وسائل دفع؛ تعطل المرشد يعرض رسالة توفر بدلاً من خطأ عام         |
| API وCORS          | فحص الخدمة المتقاعدة يسبق OPTIONS، وخيار أصل `*` قابل للاستخدام مع طلبات تحمل جلسة                              | نُقل فحص preflight إلى موضعه الصحيح، وأُلغي قبول wildcard، واقتصر localhost على غير الإنتاج؛ بقيت الأصول المحددة مسموحة                                                      |
| PWA والأداء        | manifest المنشور يُرسل بنوع octet-stream، والتخزين المؤقت معطّل حتى للملفات ذات الأسماء المجزأة                 | أُضيف النوع الصحيح للـmanifest وسياسة العامل، وتخزين طويل للملفات العامة تحت assets؛ رُفعت نسخة ذاكرة الدليل دون اتصال وبقيت APIs والهوية والمدفوعات خارجها                  |
| قاعدة البيانات     | يلزم حفظ جميع الترحيلات المطبقة                                                                                 | تأكد وجود الترحيلات الـ18 بأسماء فريدة. لم تُعدّل أو تُحذف ترحيلات ولم يُطبّق أي ترحيل يدوياً؛ لا تغيير في المخطط أو السجلات                                                 |

## 2. التحقق ودرجته

| التحقق                                          | النتيجة                                                                                      | حدود الدليل                                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm test`                                      | **28/28 نجح**                                                                                | 11 اختباراً سابقاً و17 اختبار انحدار جديداً؛ ليست تجربة حية كاملة                        |
| `npm run typecheck`                             | **نجح**                                                                                      | لا أخطاء TypeScript في الملفات المشمولة بالإعداد                                         |
| `npm run build`                                 | **لم يُنفّذ**                                                                                | تعليمات المنصة تحظر تشغيل البناء في هذه الجلسة؛ البناء الآلي عند النشر هو المرجع         |
| الكتالوج المنشور                                | HTTP 200، **53 منتجاً**                                                                      | قراءة فعلية للواجهة العامة؛ لم تُغيّر الأسعار أو السجلات                                 |
| صحة التطبيق                                     | HTTP 200 وقاعدة البيانات متصلة                                                               | حقل core الحالي يقيس خدمات Netlify المحلية؛ لا يثبت TLS أو صحة VPS أو جاهزية التاجر      |
| إعدادات الهوية العامة                           | Google مفعّل، التسجيل مفتوح، تأكيد البريد مطلوب                                              | لا يثبت إكمال موافقة Google أو وصول البريد                                               |
| الطلبات والإدارة ومساحة العمل والرادار دون حساب | HTTP 401 بصيغة JSON                                                                          | أثبت رفض الوصول غير الموثق إلى المسارات المفحوصة                                         |
| API غير موجود                                   | HTTP 404 بصيغة JSON                                                                          | لا يتحول الخطأ إلى HTML في المسار المفحوص                                                |
| CORS المنشور                                    | أصل Pay أعاد 204 ومسموح؛ أصل غير موثوق أعاد 403                                              | تضاف إليه اختبارات الكود المعدل لرفض wildcard وlocalhost في الإنتاج                      |
| المتصفح على النسخة المنشورة                     | لا تجاوز أفقي في الرئيسية العربية 320px، الرئيسية الإنجليزية 375px، الكتالوج الإنجليزي 390px | اختبارات ضيف افتراضية؛ لا تشمل كل جهاز أو شاشة خاصة، ولا تثبت شكل التغييرات غير المنشورة |
| تعريفات الأزرار                                 | فُحصت 232 عقدة button وقت المسح الأول                                                        | لا زر بلا إجراء/نموذج/تعطيل مبرر في ذلك المسح؛ لم تُضغط جميع الأزرار بحساب حي            |
| SSO للتطبيقات الخمسة                            | **غير متحقق**                                                                                | واجهة الحالة العامة لم تؤكد handshake لأي تطبيق مستقل؛ لا يعني ذلك أن كل تطبيق متوقف     |
| الأصول دون اتصال والترحيلات                     | نجحت اختبارات وجود الملفات والعزل                                                            | لا تثبت تثبيت PWA فعلياً على iOS/Android أو تطابق سجل الإنتاج مع كل SQL                  |

غطت الاختبارات الجديدة استعادة اللغة عند حظر التخزين، وحصر وجهات SSO، وانتهاء انتظار الهوية، وتجديد الجلسة المتزامن، وحجب رد حساب سابق، وعدم تكرار الطلب المالي بعد HTML/انقطاع الاتصال، والاحتفاظ بمعرف العملية عند alias صريح غير موجود، وصيغة Stripe، ورفض اختلاف المبلغ/العملة/البيئة/الطلب، وتطبيع مسودات AI، وCORS وأصول PWA والترحيلات. لم تُرسل دفعة أو رسالة بريد أو طلب AI مدفوع أثناء المراجعة.

## 3. الأقسام والمميزات الحالية

| القسم/المسار                    | ما يراه المستخدم وكيف يعمل                                                                                                        | الاعتماد أو القيد                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| الرئيسية `/`                    | عرض الخدمات، مشهد زخرفي اختياري، روابط المنظومة، مقارنة الباقات، حاسبة العائد، مرشد الكتالوج، وضع الهدوء والمؤقت والصوت الاختياري | الأرقام في الحاسبة افتراضات قابلة للتعديل؛ المرشد توصية ولا ينفذ أعمالاً                                  |
| مساحة Hub `/hub`                | تعريف الخدمات الست والدخول إلى غرفة العمل الخفيفة                                                                                 | الحساب مطلوب للبيانات الخاصة                                                                              |
| الحساب `/sign-in`               | بريد/كلمة مرور، Google عند تفعيله، إنشاء حساب، تأكيد بريد، استعادة كلمة مرور وقبول الدعوات                                        | خدمة Identity وإعدادات Google وتسليم البريد                                                               |
| غرفة العمل الخفيفة              | إنشاء المنشأة، اختيار الموظف، المحادثات والصوت، تكليف المهام، عرض النتائج والطلبات، مراجعة نص البريد قبل إرساله، قراءة سياق ملف   | بيانات مملوكة للحساب؛ الصوت والملفات والتوليد مرتبطون بخدماتهم الفعلية                                    |
| المقر `/workforce`              | مكتب تفاعلي ثنائي ونصف الأبعاد، اختيار الموظفين، محادثات، اجتماعات، مهام وأحداث، شاشة العمل وعمليات البريد والبحث                 | ليس فريقاً مستقلاً ينفذ المدفوعات أو يتجاوز التحقق الأمني                                                 |
| البريد وخزنة الحسابات           | SMTP/IMAP، مزامنة وارد، مسودات، موافقة صريحة على المستلم والنص، تحقق من الإرسال، حسابات منصات مشفرة                               | إعداد التشفير والحسابات؛ قبول SMTP لا يثبت الوصول أو القراءة؛ لا تُعاد محاولة نتيجة إرسال مجهولة تلقائياً |
| البحث والمتصفح                  | بحث موثّق بالمصادر وقراءة صفحات عامة أو جلسة مصرح بها                                                                             | TLS مفروض، منع الشبكات الداخلية؛ MFA وCAPTCHA قد يمنعان إكمال الدخول                                      |
| الكتالوج `/products` والتفاصيل  | بحث وفئات وتصفح المنتجات، الأسعار والنطاق والمدة والشروط، تنزيل وصف الخدمة وطلب التواصل                                           | 53 سجلاً عاماً؛ الخدمات الأصلية تحتاج تأكيد النطاق وعرض السعر قبل دفع مخصص                                |
| بوابات الدفع `/?module=gateway` | مختبر مسؤول، بيئة اختبار/حية، صفحة مستضافة أو رابط دفع، فحص مسارات دون خصم، متابعة الاستجابة                                      | **Stripe فقط** لإنشاء دفعات جديدة؛ ظهور أسماء البوابات الأخرى لا يعني تكاملها                             |
| الخزنة `/?module=vault`         | حفظ بيانات التاجر مشفرة، إظهار قائمة البيانات المحفوظة دون قيمها، قائمة الجاهزية                                                  | مسؤول Identity وإعداد التشفير؛ نجاح حفظ المفتاح لا يثبت نجاح الدفع                                        |
| المكتب التنفيذي `/?module=ceo`  | إيرادات فعلية حسب العملة، طلبات، إدارة مساعدي الفريق ومحادثات استشارية                                                            | مسؤول فقط؛ توصيات وليست أوامر تنفيذ مالي أو إداري                                                         |
| الطلبات وعودة الدفع             | قائمة طلبات الحساب، صفحة الدفع الموثوقة، استعلام الحالة لدى المزود                                                                | العودة أو حدث iframe لا يؤكدان الدفع؛ تطابق المرجع والمبلغ والعملة والبيئة مطلوب                          |
| Growth Studio                   | توليد/قوالب إعلانات Google وSnap وTikTok، ميزانية وعائد تقديري، مقاسات بنرات وتوليد صورة، حفظ/حذف الحملات                         | لا ينشر حملات إعلانية ولا يضمن المبيعات؛ الحفظ مملوك للحساب                                               |
| موسوعة الأدوات `/tools`         | **500 صفحة** في خمس مجموعات ×100، و23 محرك حساب، بحث بخمس فئات، اختصار Ctrl/⌘K، أدلة وأسئلة ومقارنات                              | المدخلات الحسابية تبقى داخل المتصفح؛ الإحصاء يرسل اسم الأداة ونوع الحدث فقط                               |
| رادار المالك `/admin/radar`     | زيارات واستخدامات ونقرات تحويل فعلية، فرز وتحديد الأدوات الرابحة وتفعيل علامة Pro                                                 | مسؤول فقط؛ النقر ليس عملية بيع؛ Pro طلب توفر حتى ربط صلاحيات الشراء                                       |
| الأدلة `/guides`                | الدفع وأتمتة المتجر وموظفو AI والتصوير التجاري، مع حاسبات/قوائم تحقق                                                              | محتوى إرشادي عربي/إنجليزي؛ الروابط القديمة تعود لهذه النسخ                                                |
| السياسات والدعم                 | من نحن، الرؤية، الخصوصية، الاسترداد، الشروط، الدعم، الحسابات، ودليل التكامل                                                       | اسم المنشأة الأصلي وبريدا الدعم والمالية محفوظان؛ لم يُخترع سجل تجاري أو رقم ضريبي                        |
| التثبيت وPWA                    | طلب تثبيت أصلي عندما يدعمه المتصفح، إرشادات iPhone، دليل وحاسبة دون اتصال، إشعارات اختيارية                                       | بيانات الحساب والدفع لا تعمل دون اتصال؛ Web Push يحتاج إعداداً واختبار جهاز                               |
| تطبيقات iOS/Android             | مشاريع Capacitor ومساندة الروابط والشبكة وأزرار الرجوع                                                                            | ليست ملفات موقّعة معتمدة في المتاجر؛ روابط المتجر/APK مشروطة بإعدادها والتحقق منها                        |
| التطبيقات الخارجية              | Workflow وAI وPay وBrand وLoader عبر محدد التطبيقات                                                                               | مستودعات/نشرات مستقلة؛ هذه التعديلات لا تنشرها ولا تستكمل الربط بينها تلقائياً                            |

الاختيار العربي/الإنجليزي أصبح متصلاً عبر واجهات هذه المراجعة. تبقى اللغات الست الإضافية الموجودة في المنتج ذات تغطية متفاوتة وبدائل إنجليزية، ولا تُترجم محادثات المستخدم أو بياناته المحفوظة تلقائياً.

## 4. ماذا نحذف أو نبسّط؟

1. إبقاء مسار العميل الأساسي قصيراً: اختيار الخدمة ← مراجعة النطاق ← التواصل/الدفع بعد التأكيد. أسماء بيئات الاختبار وخيارات الخزنة والمراقب تخص المسؤول.
2. تقليل تكرار دليل التجار وروابط الخدمات في التذييل، وتجميع البحث وGrowth Studio في مدخل ثانوي واحد على الهاتف إذا رأى المالك أن الزرين العائمين مشتتان. لم تُحذف ميزات تجارية بهذه المراجعة.
3. إبقاء Pro خارج البيع إلى حين وجود صلاحيات شراء واسترداد مجرّبة. أُزيل وعد الفتح المباشر فعلاً.
4. إبقاء أسماء البوابات غير المدعومة ضمن قسم «قيد التكامل» للمسؤول؛ لا تُسوّق كسبع بوابات عاملة.

## 5. ماذا نعدّل؟

1. جعل زر «اطلب عرضاً» متسقاً في بطاقات الخدمات، مع تمييز «سعر ثابت» و«يبدأ من» و«شهرياً» قبل التواصل.
2. توجيه العميل إلى فريق واحد للدعم والمبيعات، وإضافة واتساب فقط بعد تأكيد رقم المنشأة. استُخدم البريد الموجود بدلاً من الرقم التجريبي.
3. فصل ادعاءات الإيرادات المؤكدة عن توقعات ROI وROAS؛ ونقرات الرادار عن المبيعات الفعلية. اختيار ترتيب العرض قرار للمالك.
4. وضع مؤشرات التكاملات غير المهيأة في إعدادات المسؤول، مع بديل واضح للعميل مثل تصفح الكتالوج أو التواصل.

## 6. ماذا نضيف قبل التوسع؟

1. سجل طلبات عروض أسعار وحالة متابعة داخل Netlify Database، مع موافقة واضحة على التواصل وقياس الانتقال من طلب عرض إلى بيع؛ يحتاج تحديد سير العمل التجاري.
2. إثباتات أعمال ومشاريع حقيقية وشهادات عميل مأذون بها، وسجل/رقم ضريبي وسياسات تسليم وفاتورة يقدمها المالك عند انطباقها.
3. تفعيل حقوق الوصول المدفوع لـPro وربطها بعملية موثقة واستردادها، قبل قبول أي ثمن مقابلها.
4. تجربة قبول دورية بحساب عميل ومسؤول: تسجيل Google، بريد التأكيد، F5، الاستعادة، تبديل الحساب، مهمة واحدة، بريد معتمد، دفعة اختبار ثم دفعة حية صغيرة وتسويتها واستردادها بإشراف المالك.
5. مراقبة أخطاء آمنة لا تسجل محتوى الحساب أو الأسرار، وإنذار عند فشل المسارات الحرجة؛ ومراجعة أجهزة iOS/Android حقيقية بعد نجاح نشر المنصة.

## 7. ما بقي قبل اعتماد الإطلاق

نجاح بناء ونشر هذه التغييرات، إكمال Google وبريد التأكيد/الاستعادة بحساب حقيقي، التحقق من دور المسؤول، إعداد أسرار الخزنة وبيانات التاجر وWeb Push والصوت والبريد حسب الميزات المستخدمة، تجربة الدفع والتسوية والاسترداد، وتفعيل/التحقق من SSO على كل تطبيق مستقل. تستمر جلسات التطبيقات المشتركة عشر دقائق؛ دوام اللغة لا يعني جعل رمز الدخول دائماً. لا يمكن ضمان بقاء المستخدم موثقاً عند إلغاء الحساب أو انتهاء الجلسة أو منع تخزين المتصفح.

لم تُنقل نطاقات أو DNS ولم يتغير مضيف API على VPS. تظل الموافقة السابقة على نقل النطاقات مشروطة بنجاح النشر والتحقق. لم تُنشأ حسابات أو دفعات أو رسائل اختبار فعلية، ولم يُعلن نجاح نشر جديد أو إصدار متجر تطبيقات.

---

# English executive review

**Outcome:** Confirmed repository defects were repaired. All 28 tests and TypeScript checking passed. This is a pre-launch code review with targeted production observations, not a guarantee of zero runtime defects or a completed deployment.

## Repairs delivered

Google sign-in now follows the live Identity settings, the sign-in route opens the account dialog, and account operations have bounded UI waits and actionable notices. OAuth return navigation, email confirmation/recovery handling, private-request session preparation and account/role isolation were corrected. Single-use PKCE and ten-minute shared app sessions remain intact, with visible expiry and safe return paths.

One appearance provider now covers every shell. URL, local storage and cookie restoration work independently when storage is blocked; language and direction are applied before rendering. The non-secret preference cookie spans the ecosystem domain. Authentication, legacy administration, mail/research tools, the offline guide and 284 audited workspace labels received Arabic/English coverage. Executive responses and advertising drafts follow the selected language. User-authored content is not automatically translated, and the other six offered languages still have varying coverage with English fallbacks.

Stripe checkout's incorrect payment-method parameter and unsupported default gateway were corrected. Checkout returns open the owned order, polling cannot overlap, failed links stay hidden, and unknown outcomes are never automatically charged again. Placeholder WhatsApp links were removed. Pro now offers an availability inquiry instead of an unsupported paid-unlock promise. Campaign state resets on account changes; malformed AI output is normalized before rendering or storage; unavailable AI retains a clearly identified template/catalog fallback. Dialog backdrop handling, copy failure feedback, legacy routes, CORS preflights and exact-origin checks, manifest MIME type, public asset caching and bilingual offline content were repaired. All 18 applied migrations were retained without schema or record changes.

## Evidence and limits

`npm test` passed **28/28** and `npm run typecheck` passed. Tests cover the 500 pages and 23 calculator engines, language boot under blocked storage, route selection, confined SSO returns, auth timeouts and refresh coalescing, stale-account reply rejection, non-retry behavior for financial failures, Stripe request construction and authoritative order matching, CORS, ad-draft normalization, PWA assets and migration presence.

Production read-only checks returned 53 products and connected local Netlify database health. Google was enabled, registration open and email confirmation required. Protected order, admin, workforce and radar endpoints returned JSON 401 without an account; an unknown API returned JSON 404. Pay's CORS preflight succeeded and an untrusted origin was refused. Guest Chromium observations found no horizontal overflow on the Arabic home at 320px, English home at 375px and English catalog at 390px. A static pass examined 232 button definitions at the time of the scan. These observations are about the already published version, not this patch.

`npm run build` was **not run**, because the platform prohibits agent-run builds and performs its own validation. No real Google consent/login, account recovery, payment/refund, email send, paid AI generation, complete cross-app SSO, physical-device installation or signed native release was performed. The public status endpoint did not verify any of the five standalone app handshakes. Local “core connected” health does not prove VPS or merchant readiness.

## Current product inventory

The public flagship contains services, optional visual/audio focus controls, catalog-based AI guidance, comparisons, ROI estimates and installation help. `/hub` contains the signed-in Lite command room: organization setup, employee conversations, voice, tasks, output review, owned orders and exact-content email approval. `/workforce` provides the illustrated headquarters, employees, meetings, task timelines, workstations, encrypted accounts, SMTP/IMAP mail and sourced research/browser tools.

The store exposes 53 catalog records, search/categories, product scopes and pricing, service-brief downloads and quote inquiries. The payment laboratory, encrypted gateway vault and advisory executive office require administrator access. New payments support Stripe hosted checkout/payment links only; other gateway names are configuration or pending integrations. Payment status is confirmed by authoritative provider queries, with legacy signed callbacks retained.

Growth Studio provides ad drafts/templates, budget estimates, banner sizes/image generation and owned saved campaigns. The tools directory contains 500 bilingual pages across five clusters using 23 local calculation engines; the owner radar reports measured views, uses and funnel clicks and controls Pro designation. Four merchant guides, seven business/legal pages, support and integration information remain available. PWA installation, a public offline guide and optional notifications coexist with unsigned Capacitor source projects. Workflow, AI, Pay, Brand and Loader remain separate deployments whose integrations require independent verification.

## Owner recommendations

**Simplify:** Keep the sales path to service → scope → inquiry/confirmed payment. Keep testing, vault and technical diagnostics in administration. Consider combining the two floating discovery controls on phones and reducing duplicated footer links. Keep Pro out of sale until entitlements and refunds work, and label unsupported gateways as pending.

**Modify:** Make quote actions and fixed/starting/monthly pricing consistent, use one verified contact channel, separate actual revenue from illustrative ROI/ROAS, and separate funnel clicks from sales. Present unavailable optional integrations with useful alternatives.

**Add:** A database-backed quote-follow-up workflow, real approved portfolio/client proof, owner-supplied applicable registration/tax/invoicing details, verified purchase entitlements, safe error monitoring and a repeatable owner-operated acceptance run. Commercial details and customer communications require the owner's chosen workflow.

**Release condition:** Successfully deploy this patch, verify customer/admin accounts, Google/email flows and refresh persistence, configure the integrations actually offered, complete payment reconciliation/refund acceptance, verify each standalone SSO receiver, and test PWA/native delivery on real devices. No domain, DNS or VPS API-host assignment changed. Previous domain-transfer authorization remains conditional on successful deployment and verification.
