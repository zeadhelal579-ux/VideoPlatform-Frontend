# تغييرات جولة الفحص والإصلاح (QA) — الفرونت اند

كل بند له اختبار بيفشل قبل الإصلاح وينجح بعده (وحدة، أو Chromium حقيقي، أو فحص ثابت). تفاصيل الأدلة في `VideoPlatform-QA-Report.md`.

| # | الملف | المشكلة | الإصلاح | الاختبار |
|---|---|---|---|---|
| F1 | `src/utils/formatters.ts` | `createdAt` تالف من الـ Api بيرمي `RangeError` فالداشبورد كلها بتقع في الـ Error Boundary؛ و`formatFileSize(-5)` بيطبع `NaN undefined` | الدوال بترجّع النص الأصلي / `0 B` بدل ما ترمي | unit (2) · e2e "malformed createdAt" |
| F2 | `src/utils/videoFiles.ts` (جديد) + `VideoUploader.tsx` | منطقة الـ drop بتتجاوز `accept="video/*"` فأي ملف كان بيترفع | allow-list بنفس قايمة الباك (16 امتداد) + رسالة `role="alert"` قبل أي طلب شبكة | unit · e2e · عقد `CONTRACT-EXT` |
| F3 | `VideoUploader.tsx`, `RegisterPage.tsx` | مفيش حدود طول (title 200 / اسم 100 / إيميل 254) زي الباك | `maxLength` | `CONTRACT-LIMITS` · e2e |
| F4 | `LoginPage`, `RegisterPage`, `DashboardPage`, `WatchPage`, `VideoUploader` | رسائل الخطأ مش بتتقرأ لقارئ الشاشة | `role="alert"` | e2e accessibility |
| F5 | `vercel.json`, `README.md` | مفيش CSP | `Content-Security-Policy-Report-Only` (مبيحجبش حاجة) + شرح التحويل لـ enforcing | `SEC-FE-HEADERS` |
| F6 | 43 دالة/كومبوننت/hook | مفيش تعليق إنجليزي فوقها | تعليق سطر واحد | `CONF-METHOD-COMMENT` = 0 |
| F7 | `src/demo/*`, `DemoBanner.tsx`, `main.tsx`, `.env.production`, `scripts/check-deploy-config.mjs` | الفرونت مكانش ينفع يتعرض من غير باك (الدخول والرفع والقايمة كلها بتكلّم الـ API) | **وضع Demo**: باك وهمي جوه المتصفح (دخول بأي إيميل/باسورد، فيديوهات عينة، رفع بتقدّم حقيقي ومعالجة وهمية Queued→Processing→Ready، تشغيل HLS عام). مفعّل بـ `VITE_DEMO_MODE=true` في `.env.production`، والحارس بيسمح بيه. البناء العادي مفيهوش أي كود demo | `run_demo_e2e.mjs` (10 سيناريوهات) · unit للحارس · `DEMO-READY` |

## اللي اتأكد منه ومبقاش فيه مشاكل (بالمتصفح الحقيقي)
XSS في عناوين الفيديو (بتتعرض كنص خام)، التوكنات مش في storage، الـ CSRF header على كل طلب، الـ double-click، الـ offline، فشل التخزين، ترقيم الصفحات، الرجوع للصفحة المطلوبة بعد الدخول، نهاية الجلسة، ميزانية حجم الـ JS (< 160KB gzip للتحميل الأول).
