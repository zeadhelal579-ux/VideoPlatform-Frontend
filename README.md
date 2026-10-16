# VideoPlatform — Frontend (جاهز للنشر على Vercel)

React 19 + TypeScript + Tailwind CSS v4 + Video.js. ده مشروع **مستقل**: بيتبني لملفات ثابتة (`dist/`)
وبيتنشر على Vercel. الباك اند (Api + Worker + الداتابيز) حزمة تانية بتشتغل على سيرفر — دليلها `DEPLOYMENT.md`.

---

## 1. تشغيل محلي

```bash
npm install
npm run dev          # http://localhost:5173 — بيكلم الـ Api على http://localhost:5000
```

| الأمر | بيعمل إيه |
|---|---|
| `npm run dev` | سيرفر التطوير (البورت ثابت 5173 عشان الـ CORS بتاع الـ Api) |
| `npm run build` | بيبني `dist/` (بيشغّل `check-config` الأول — قسم 4) |
| `npm run typecheck` | فحص TypeScript كامل (strict) من غير bundling |
| `npm run preview` | يشغّل نسخة الـ build محليًا |
| `npm run check-config` | يفحص إعدادات الوصول للـ Api (بيحذّر محليًا، وبيمنع الـ deploy على Vercel لو ناقصة) |

للتطوير ضد الباك اند بتاع الـ compose (بدل `dotnet run`): اعمل ملف `.env.local` فيه
`VITE_API_BASE_URL=http://localhost:8080` (البورت `API_PORT` في `.env` بتاع الباك).

---

## 2. النشر على Vercel خطوة بخطوة

**قبل ما تبدأ:** الباك اند لازم يكون شغال على **HTTPS** (Vercel بيخدم الموقع بـ HTTPS، والمتصفح بيرفض ينده على `http://`).
شوف `DEPLOYMENT.md` في حزمة الباك اند.

1. **ثبّت الحزم مرة على جهازك** عشان يتولّد `package-lock.json`، وارفعه مع الكود (بيخلي كل build بنفس الإصدارات بالظبط):
   ```bash
   npm install
   npm run typecheck      # لازم يخلص من غير أخطاء
   ```
2. **اختار طريقة الوصول للـ Api** (قسم 3) وظبّط الإعداد بتاعها.
3. ارفع المشروع على GitHub — **جذر الـ repo هو الفولدر ده** (اللي فيه `package.json` و`vercel.json`).
4. في Vercel: **Add New → Project →** اختار الـ repo. هيتعرف **Vite** تلقائي. سيب الـ Build/Output/Install زي ما هم
   (`vercel.json` محددهم: `npm run build` ← `dist`).
5. **Environment Variables:** لو اخترت الطريقة B أو C ضيف `VITE_API_BASE_URL` (قسم 3). متغيرات `VITE_*` بتتحط في الكود وقت الـ build،
   يعني لو غيّرتها لازم **Redeploy**.
6. **Deploy.**
7. خد عنوان الموقع (`https://اسم-المشروع.vercel.app`) وحطه في `APP_URL` في `.env` بتاع الباك (B/C بس)، وبعدين `docker compose up -d` هناك.
8. اتأكد بقايمة قسم 6.

---

## 3. اختار طريقة الوصول للـ Api (واحدة بس)

| الطريقة | امتى | الإعداد في الفرونت |
|---|---|---|
| **A — Rewrite على Vercel** | عندك `*.vercel.app` بس، من غير دومين | في `vercel.json` غيّر `REPLACE-WITH-YOUR-API-HOST.invalid` لدومين الـ Api، وسيب `VITE_API_BASE_URL` فاضي |
| **B — مباشر + دومين خاص** *(الأفضل للإنتاج)* | `app.example.com` على Vercel و`api.example.com` على السيرفر | `VITE_API_BASE_URL=https://api.example.com` |
| **C — مباشر + دومين مختلف** | الفرونت `*.vercel.app` والـ Api دومين تاني، من غير rewrite | `VITE_API_BASE_URL=https://api.other.com` + `AUTH_COOKIE_SAMESITE=None` في الباك (Safari/iOS بيضيّع الجلسة مع كل reload) |

الشرح الكامل (وليه الاختيار مهم، وإعداد الباك لكل طريقة): `DEPLOYMENT.md` قسم 3 في حزمة الباك اند.

**لو نسيت تظبّط حاجة:** الـ build على Vercel بيقف برسالة واضحة (`DEPLOY BLOCKED`) بدل ما ينشر موقع مكسور.
القيمة لازم تبقى: `https://` · من غير `/` في الآخر · من غير `/api` في الآخر.

---

## 4. ملفات النشر

- **`vercel.json`**
  - `rewrites`: (1) `/api/:path*` ← للـ Api (بيتستخدم في الطريقة A بس). (2) أي مسار تاني من غير نقطة ← `index.html`
    (بدونها أي reload على `/watch/...` كان هيدي 404). المسارات `/api/*` و`/assets/*` مستثناة من الـ fallback عن قصد:
    لو ملف JavaScript قديم اتمسح بعد deploy جديد بيرجع 404 صريح بدل صفحة HTML تبوّظ الـ parser.
  - `headers`: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`،
    و`Cache-Control: immutable` لملفات `/assets/*` (أسماءها فيها hash)، و`no-store` لردود `/api/*`.
- **`scripts/check-deploy-config.mjs`** — بيشتغل لوحده قبل كل `npm run build` (hook اسمه `prebuild`) وبيفرض الفحص على Vercel بس.
  للتخطي في حالة خاصة: `SKIP_CONFIG_CHECK=1`.
- **`.nvmrc`** و`"engines": { "node": "22.x" }` — بيثبّتوا إصدار Node على Vercel.
- **`.env.example`** — شرح `VITE_API_BASE_URL`. (متغيرات `VITE_*` **علنية** — ماتحطش فيها أي سر.)

الـ build نفسه هو `vite build` من غير `tsc` عن قصد: أول نشر ماينفعش يقف على تفصيلة typing. الفحص بقى أمر منفصل
(`npm run typecheck`). لو عايز Vercel نفسه يفحص الأنواع، غيّر Build Command في إعدادات المشروع لـ `npm run typecheck && npm run build`.

---

## 5. الهيكل

```
src/
  main.tsx  App.tsx  index.css
  types/        video.ts  user.ts                    ← نفس شكل VideoDto.cs
  api/          client.ts  auth.ts  videos.ts        ← الجزء الوحيد اللي بيعرف إن فيه HTTP
  hooks/        useAuth  useVideoUpload  useVideoStatus
  components/   layout/ (Navbar Footer ProtectedRoute ErrorBoundary)
                video/  (VideoCard VideoUploader VideoPlayer ProcessingStatusBadge)
                ui/     (Button ButtonLink Spinner)
  pages/        Home Login Register Dashboard Upload Watch
  context/      AuthContext.tsx
  utils/        formatters.ts  jwt.ts  chunkRecovery.ts
scripts/        check-deploy-config.mjs
vercel.json  .env.example  .nvmrc  package.json
```

الاتجاه واحد: `pages → hooks → api → backend`. مفيش component بينده `fetch` مباشرة.
**`VideoPlayer` (وكل Video.js معاه) بيتحمّل lazy** — بس لما تفتح فيديو `Ready` فعلًا. باقي الصفحات مش بتنزّله.

---

## 6. اختبار بعد النشر (5 دقايق)

1. افتح الموقع → اعمل حساب → سجّل دخول.
2. **اعمل Reload** → لازم تفضل مسجّل. (لو رجعك لصفحة login: الـ cookie مش بتتخزن — `DEPLOYMENT.md` قسم 3.)
3. ارفع فيديو MP4 صغير → الحالة `Queued` ← `Processing` ← `Ready` لوحدها (من غير refresh) → المشغّل بيشتغل.
4. افتح `/watch/أي-id` بـ Reload كامل → مفيش 404.
5. DevTools → Network/Console: مفيش CORS، مفيش Mixed Content، ومفيش طلبات `/api/auth/refresh` وإنت مش مسجّل.

## 7. أعراض شائعة

| العَرَض | السبب الغالب |
|---|---|
| `DEPLOY BLOCKED` في لوج الـ build | `VITE_API_BASE_URL` فاضي و`vercel.json` لسه فيه الـ placeholder |
| "The server sent an unexpected response" عند تسجيل الدخول | طلبات `/api` مش بتوصل للـ Api (host الـ rewrite غلط أو `VITE_API_BASE_URL` غلط). غيّره وعمل **Redeploy** |
| بيرجعني لـ login بعد كل Reload | الـ cookie مش بتتخزن (دومينات مختلفة مع `Strict`، أو Safari مع الطريقة C) |
| خطأ CORS | `APP_URL` في الباك مش مطابق لعنوان الموقع بالظبط |
| Mixed Content | عنوان `http://` في `VITE_API_BASE_URL` أو في `S3_ENDPOINT_PUBLIC` / `MEDIA_BASE_URL` |
| الفيديو `Ready` والمشغّل بيقول network error | CORS على التخزين/الـ CDN (`deploy/s3-cors.json` في حزمة الباك) |

## 8. (اختياري) Content-Security-Policy

مش متضافة تلقائي لأن عنوان التخزين/الـ API بيتغير من نشر لنشر وأي غلطة فيها ممكن تكسر المشغّل. لو عايزها، ضيف الـ header ده
في `vercel.json` (تحت `headers` ← `source: "/(.*)"`) **بصيغة `Report-Only` الأول** وراقب الـ Console، وبعدين شيل `-Report-Only`:

```json
{ "key": "Content-Security-Policy-Report-Only",
  "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; media-src 'self' blob: https:; connect-src 'self' https:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" }
```
وبعدين ضيّق `connect-src` لعناوين الـ Api والتخزين الفعلية.

---

## 9. العقد مع الباك اند (اللي الكود مبني عليه)

- **Auth response:** `{ accessToken, expiresAt }`. الـ refresh token مش بيظهر في أي JSON — cookie اسمها `refreshToken` (httpOnly، `Path=/api/auth`).
- **التوكن في الذاكرة بس** (مش `localStorage`). عشان كده `client.ts` بيعمل `POST /api/auth/refresh` واحد وقت فتح الصفحة — لكن **بس** لو المتصفح ده سجّل دخول قبل كده
  (علامة `vp.hasSession` في `localStorage`، مفيهاش أي سر)، فالزائر العادي ما بيبعتش طلب 401 ملوش لازمة.
- **`credentials: "include"`** على كل طلب، و**`X-Requested-With: XMLHttpRequest`** على كل طلب كمان (الـ Api بيطلبه على `/refresh` و`/logout` لما الـ cookie تكون `SameSite=None`).
- **شكلين للأخطاء:** نص JSON عادي من `/api/videos/*`، و`ValidationProblem` من `/api/auth/register`، و401 فاضي من login/refresh.
  أي رد HTML (صفحة خطأ من proxy مثلًا) **بيتجاهل ومابيتعرضش** كرسالة.
- **`status`** نص بالظبط: `Pending | Queued | Processing | Ready | Failed`.
- **الرفع** `PUT` خام مباشرة للتخزين بـ pre-signed URL (مفيش Content-Type مربوط في التوقيع).

## 10. اللي اتفحص واللي لأ

اتفحص (في البيئة اللي اتراجع فيها — مفيش إنترنت):
- **22 سيناريو في متصفح Chromium حقيقي** ضد نسخة مقلّدة من عقد الـ Api (تسجيل، دخول، refresh صامت، رفع، polling، فيديو Failed/Ready، موبايل 360px، الوضع المباشر cross-site بـ `SameSite=None` و`Strict`…) — كلهم نجحوا.
- **TypeScript حقيقي** (strict + `noUnused*`) على كل `src/` ضد typings بديلة — صفر أخطاء، وبعد حقن أخطاء متعمدة اتأكدت إن الفحص بيمسكها.
- محاكاة لقواعد `vercel.json` على 14 مسار، و17 حالة لسكريبت `check-deploy-config`.

**ماتشغلش:** `npm install` الحقيقي، `vite build` الحقيقي (Tailwind v4 + Video.js الحقيقي)، تشغيل HLS فعلي، ونشر فعلي على Vercel.
أول `npm install && npm run typecheck && npm run build` عندك هم الـ compile الحقيقي — راجع `CHANGES.md` للتفاصيل.


## Content-Security-Policy (Report-Only)

`vercel.json` sends `Content-Security-Policy-Report-Only`: the browser only logs violations in the console and blocks nothing.
Open the deployed site, use every page once, and when the console shows no violations rename the header to
`Content-Security-Policy` to enforce it. If your API or media host is not served over https, tighten or loosen `connect-src`/`media-src` accordingly.


## Demo without a backend (client presentations)

This project ships **ready for a backend-less demo**: `.env.production` sets `VITE_DEMO_MODE=true`, so a normal Vercel deploy needs **no API address at all**.

- Sign in with **any e-mail and any password** (a new demo account is created on the spot with a few sample videos).
- Uploading a video shows real progress, then the fake pipeline moves it through *Queued -> Processing -> Ready* in about 12 seconds.
- Every "Ready" video plays the public test stream `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8` (adaptive bitrate); set `VITE_DEMO_HLS_URL` to use your own stream.
- Data lives in the visitor's browser (`localStorage`); nothing is sent anywhere.
- A "Demo mode" strip is shown at the top of every page.

**Switching to the real backend:** delete `.env.production` (or set `VITE_DEMO_MODE=false`), then configure the API address as described above and redeploy.
