# AGENTS.anti-failure.md — AI self-correction checklist

Load **at the end of every task** before reporting completion.

---

## 1. Context Amnesia

Forgot earlier decisions / project conventions.
**Prevention**: Re-read 3–5 relevant files; use todos; record key decisions.

## 2. Stale Snapshot

Edited file based on outdated version.
**Prevention**: If any bash command ran since last read, re-read before editing.

## 3. Not Searching Before Creating

Built duplicate components.
**Prevention**: Grep/find first. Reuse → Refactor → Extend.

## 4. Partial or Inconsistent Changes

Updated one file, missed related sites.
**Prevention**: `lsp_references` before renames; grep for old name after edits; update `next.config.ts` allowlists; document new env vars.

## 5. Skipping Verification

Claimed done without running tsc/lint/build.
**Prevention**: TS changes → `npx tsc --noEmit`. Style changes → `npm run lint`.

## 6. Over-Engineering

Generic system for simple need.
**Prevention**: Solve exact problem; generalize only after 3rd duplication. No new libs unless asked.

## 7. Performance Regression

N+1 queries, unoptimized images, blocking loads.
**Prevention**: `unstable_cache` + correct tags; paginate unbounded reads; `Image` + `next/font`; lazy-load heavy components; profile bundle.

## 8. Cache Invalidation Bugs

DB writes that don't bust `unstable_cache`.
**Prevention**: Import `revalidateTag` from `@/lib/revalidate`; invalidate matching tags on every write; for direct DB writes (seed/migration), call action or `revalidatePath`.

## 9. Security Leaks

Stack traces, env values, raw DB errors to users.
**Prevention**: Standard `{ success: false, error: { code, message } }` shape; validate/sanitize; use `requireUser` / `requireRole` / `requireAdmin` / `requireSuperAdmin` / `requireAuthor`; keep secrets out of client / `NEXT_PUBLIC_*`.

## 10. Unsafe Database Changes

Destructive migrations, missing indexes, N+1.
**Prevention**: Reversible migrations or rollback plan; never drop populated column without backup; index FKs and filtered columns; review Prisma queries.

## 11. Accessibility Blind Spots

Missing labels, alt, focus, contrast.
**Prevention**: Semantic HTML + Radix; don't rely on color alone; respect `prefers-reduced-motion`.

## 12. Inconsistent Naming / Language Mix

Persian vars, English UI copy mixed.
**Prevention**: English in code/commands/paths/filenames; Persian only in user-facing copy.

## 13. Not Cleaning Up

Temp files, unused imports, dead branches, debug logs.
**Prevention**: Remove at task end; `git status` and stage only intended files; never `git add -A`.

## 14. Scope Creep

Doing too much or too little.
**Prevention**: Confirm acceptance criteria before building; update todos as scope shifts.

## 15. Wrong Tool for the Job

Bash for reading, sed for editing, destructive git.
**Prevention**: `read` for reading, `edit` for editing, `grep` for searching. Avoid `git reset --hard`, `push --force`, `clean -f` on protected branches.

## 16. Ignoring Project Conventions

Breaking RTL, logical props, response shape, cache tags, auth helpers.
**Prevention**: Read 2–3 representative files before writing in that area; follow conventions.

---

## اشتباهات رایج AI — لیست اضافه‌شده (2026-07)

این بخش اشتباهاتی را که AI مکرراً در نوشتن کد مرتکب می‌شود پوشش می‌دهد.

### 17. Hallucinated API / Fabricated Behavior

AI یک تابع، prop، یا رفتار کتابخانه را اختراع می‌کند که وجود ندارد.
**نشانه**: کد کامپایل می‌شود ولی runtime error می‌دهد (`TypeError: x is not a function`).
**Prevention**: قبل از استفاده از هر API ناآشنا، **فایل واقعی** را در node_modules یا داک رسمی بخوان. هرگز از حافظه فرض نکن که تابع X وجود دارد. اگر مطمئن نیستی، در کد comment بگذار «نیاز به تأیید» و به کاربر اطلاع بده.

### 18. Silent Logic Error (کد اجرا می‌شود، نتیجه غلط است)

AI کدی می‌نویسد که compile و run می‌شود ولی اشتباه حساب می‌کند.
**نشانه‌های رایج در این پروژه**: divisor اشتباه (ریال/تومان)، priority chain معکوس، buy/sell جابجا.
**Prevention**: برای هر محاسبه مالی یک مثال عددی در comment بنویس. مثلاً `// 610,000 rial ÷ 10 = 61,000 toman`. اگر فرمول از بیرون آمده (مثل bonbast cross-rate)، منبع را cite کن.

### 19. Stale Internal Knowledge (دانش قدیمی)

AI از pattern هایی استفاده می‌کند که در نسخه‌های قدیمی درست بود ولی الان deprecated یا تغییر کرده.
**نمونه‌های واقعی این پروژه**: `retail_sekee` → `sekee` (TGJU 2026-07)؛ `next/cache` → `@/lib/revalidate`.
**Prevention**: قبل از هر تسک non-trivial، داک رسمی را برای کلمات‌کلیدی مرتبط websearch کن. اگر version مهم است (Next.js 16، Prisma 6)، نسخه را در query بیاور.

### 20. Incomplete Cascade (آبشار ناقص)

AI یک فایل را تغییر می‌دهد ولی همه وابستگی‌هایش را آپدیت نمی‌کند.
**نشانه**: tsc می‌گذرد ولی runtime crash می‌کند، یا یک بخش از UI آپدیت نشد.
**Prevention — چک‌لیست cascade:**
- تغییر `interface`/`type` → همه caller ها grep شوند
- تغییر function signature → همه import sites بررسی شوند
- اضافه کردن symbol جدید → registry + seed + هر mapping جداگانه
- اضافه کردن cron جدید → cron-job.org (ر.ک deploy/HEROKU.md مرحله ۵)
- اضافه کردن env var → `AGENTS.env.md` + `.env.example`

### 21. Confident Wrong Answer (اشتباه با اطمینان)

AI چیزی را با اطمینان بیان می‌کند که نادرست است — و کاربر از صداقت اشتباه AI آگاه نیست.
**نشانه**: عبارات مثل «این pattern در React استاندارد است» یا «TGJU همیشه این ساختار را دارد».
**Prevention**: هر ادعای فاکتوال درباره رفتار خارجی (سایت‌های third-party، کتابخانه‌ها، API ها) با `websearch` یا خواندن فایل واقعی تأیید شود. اگر قابل تأیید نیست، صریح بگو «نیاز به تأیید دارد».

### 22. Regex Over-confidence (اعتماد بیش از حد به regex)

AI regex می‌نویسد که روی مثال‌های ساده کار می‌کند ولی edge case ها را miss می‌کند.
**نشانه‌های رایج**: فارسی/عربی digits، whitespace نامرئی، CRLF vs LF، encoding مختلف.
**Prevention**: برای هر regex scraper، حداقل ۳ نمونه واقعی از HTML خروجی را تست کن (با `TGJU_DEBUG_DUMP=1` یا مستقیم `curl`). همیشه `parseLocalizedNumber()` یا `parsePrice()` موجود را reuse کن — دوباره نساز.

### 23. Comment/Code Mismatch (comment دروغ)

AI comment ای می‌نویسد که با کد واقعی مطابقت ندارد — خطرناک‌ترین نوع bug.
**نمونه واقعی**: comment گفت `x-cron-secret` مجاز است، ولی کد فقط Bearer می‌پذیرفت.
**Prevention**: comment ها را بعد از هر تغییر کد بخوان و sync کن. اگر comment از رفتار خارجی یا auth mechanism حرف می‌زند، آن را با کد واقعی مقایسه کن.

### 24. Premature Optimization / Wrong Priority

AI به‌جای حل مشکل اصلی، چیزهای فرعی را بهینه می‌کند.
**نمونه**: وقتی بخواهد یک bug fix کند، به‌جایش refactor بزرگ می‌زند.
**Prevention**: همیشه از «minimal change that solves the problem» شروع کن. اگر بهبود بزرگ‌تری می‌بینی، **NOTE** کن و پیشنهاد بده — بدون اجرا.

### 25. False Completion (تمام اعلام کردن بدون تمام بودن)

AI «تمام شد» می‌گوید ولی:
- تسک فقط تحلیل بود نه پیاده‌سازی
- یا tsc سبز است ولی runtime test نشده
- یا یک شاخه نیمه‌کاره است
**Prevention — Gate اجباری قبل از «تمام»:**
1. آیا کد واقعی نوشته شدم؟ (نه فقط توضیح)
2. آیا `npx tsc --noEmit` سبز است؟
3. آیا همه callers و وابستگی‌ها آپدیت شدند؟
4. آیا گزارش post-task را نوشتم؟
→ برای چک‌لیست کامل: `AGENTS.19dqg.md §Lite` یا `§Standard` یا `§Full` (بسته به سطح تسک)

---

## 🛡️ بُعدهای ۱۹‌گانهٔ کیفیت — اشتباهات رایج (2026-07)

این بخش تکمیل‌کنندهٔ **19DQG** در `AGENTS.19dqg.md §Full` است.
برای هر بُعد، نشانه و جلوگیری ذکر شده.

### 26. Missing Dependency Update (بُعد 2 — وابستگی فراموش شده)

AI کد را تغییر می‌دهد ولی caller ها، registry ها، یا config ها را فراموش می‌کند.
**نشانه**: `tsc` می‌گذرد ولی runtime یا page دیگری crash می‌کند.
**Prevention**: قبل از اعلام تمام، برای هر فایل تغییریافته `grep` کن که چه چیزهایی از آن import می‌کنند. اگر interface/type تغییر کرد → همه call sites بررسی شوند.

### 27. Silent Security Hole (بُعد 3 — سوراخ امنیتی ساکت)

AI endpoint را می‌سازد بدون auth middleware یا input validation.
**نشانه**: route بدون `requireUser` / `requireRole`؛ `req.body` بدون parse و validate.
**Prevention**: هر `route.ts` جدید باید اول auth check داشته باشد. هر input از کاربر باید با zod یا معادل آن parse شود. هرگز raw `req.body` مستقیم به DB نرود.

### 28. Frontend/Backend Mismatch (بُعد 4 — عدم هماهنگی)

فرانت‌اند shape پاسخ را اشتباه expect می‌کند یا بعد از schema change هماهنگ نمی‌شود.
**نشانه**: `data.x is undefined`؛ loading spinner که هرگز تمام نمی‌شود.
**Prevention**: هر بار که یک API response shape تغییر کرد، همه `fetch()` و `useQuery()` و Server Component استفاده‌کننده را grep کن. shape استاندارد `{ success, data }` / `{ success, error }` همیشه.

### 29. Rule Violation (بُعد 5 — نقض قوانین پروژه)

AI قوانین RTL، tokens، یا TypeScript strict را نادیده می‌گیرد.
**نشانه**: `left:` در CSS؛ `#hex` hardcode؛ `any` در TypeScript؛ import مستقیم از `next/cache`.
**Prevention**: قبل از هر ویرایش، فایل `AGENTS.md §Critical conventions` را re-anchor کن. بعد از ویرایش `grep -n "left:\|right:\|#[0-9a-f]\{3,6\}\|: any"` روی فایل‌های تغییریافته.

### 30. Incomplete Code (بُعد 6 — کد ناقص)

AI شاخه‌هایی می‌سازد که فقط `console.log` یا `throw new Error("TODO")` دارند.
**نشانه**: feature کلیک می‌شود ولی هیچ اتفاقی نمی‌افتد یا console پر می‌شود.
**Prevention**: هر handler باید یک عمل واقعی انجام دهد. اگر backend ناقص است → صریح به کاربر بگو و فقط interface را stub کن، نه logic را.

### 31. Better Solution Existed But Not Mentioned (بُعد 7 — راهکار بهتر پنهان شد)

AI می‌داند راهکار بهتری وجود دارد ولی ساکت پیش می‌رود.
**نشانه**: کاربر بعداً می‌پرسد «چرا X را انجام دادی؟ Y بهتر نبود؟»
**Prevention**: قبل از کد نوشتن، نتیجهٔ Research Gate را **صریحاً** در همان پیام به کاربر بگو. اگر راهکار بهتری وجود داشت ولی به دلایل scope/time اعمال نشد → در گزارش `⚠️ ناقص` ذکر کن.
**AGENTS.md patch**: هر بار این اتفاق افتاد، مثال واقعی را به `🚦 PRE-CODE GATE` در `AGENTS.md` اضافه کن (ردیف Research).

### 32. Cross-section Inconsistency (بُعد 8 — ناهماهنگی بین بخش‌ها)

AI تغییری می‌دهد که در بخش خودش درست است ولی با بخش دیگری تضاد دارد.
**نشانه**: cron در cron-job.org به‌روز نشده و endpoint قدیمی را صدا می‌زند؛ یا دو component یک state را متفاوت نمایش می‌دهند.
**Prevention**: قبل از هر تسک، بخش‌های مرتبط را شناسایی کن (data pipeline، UI، config). بعد از تغییر، آن بخش‌ها را cross-check کن.

### 33. Outdated Pattern (بُعد 9 — الگوی قدیمی)

AI از pattern هایی استفاده می‌کند که در نسخه‌های جدید deprecated شده‌اند.
**نشانه‌های رایج**: `getServerSideProps` در App Router؛ `unstable_cache` بدون بررسی `use cache`؛ `pages/api/*` به‌جای `app/api/route.ts`.
**Prevention**: برای هر تسک non-trivial، `websearch` با نام pattern + "Next.js 16 2026" انجام بده. داک رسمی منبع اول است، Stack Overflow منبع آخر.

### 34. Internet-first Gate Skipped (D7 + D9 — تحقیق اینترنت skip شد)

AI مستقیم کد می‌نویسد بدون `websearch` یا بررسی داک رسمی.
**نشانه**: راهکار compile می‌شود ولی یک alternative واضح‌تر در داک رسمی وجود داشت.
**Prevention**: قانون مکانیکی — قبل از نوشتن هر کد غیر-trivial، `🔍 Research:` block را **در همان پیام** قبل از کد بنویس. اگر این block نوشته نشده → تسک هنوز شروع نشده است.

---

## 🆕 بُعدهای D10–D15 — اشتباهات رایج (2026-07)

### 35. Performance Blindness (D10 — کورچشمی performance)

AI کد می‌نویسد بدون توجه به N+1، cache، یا bundle size.
**نشانه‌های رایج**: صفحه dashboard در هر request ده‌ها query می‌زند؛ تصاویر با `<img>` (نه `next/image`)؛ component سنگین بدون lazy-load.
**Prevention**:
- هر Prisma query جدید: آیا `include` بدون `select` است؟ → اضافه کن
- هر read جدید: آیا `unstable_cache` با tag درست دارد؟
- هر `<img>`: جایگزین با `next/image`؛ هر font: از `next/font`
- هر list بدون limit/pagination: unbounded read = خطر

### 36. Accessibility Blindness (D11 — a11y نادیده گرفته شد)

AI UI می‌سازد که با keyboard یا screen reader قابل استفاده نیست.
**نشانه‌های رایج**: دکمه بدون label؛ modal بدون focus trap؛ اطلاعات فقط با رنگ؛ `div` با `onClick` بدون `role="button"`.
**Prevention**:
- قبل از هر interactive element: `<button>` با label، نه `<div onClick>`
- Modal/Dialog: از Radix `Dialog` استفاده کن — focus trap داخلی دارد
- کنتراست: اعداد مالی باید ≥ 7:1 باشند (نه فقط 4.5:1)
- grep روی فایل برای `<div onClick` و `<span onClick` — هر hit مشکوک است

### 37. Responsive/Dark mode Break (D12 — شکستن در موبایل یا dark mode)

AI desktop-only طراحی می‌کند یا رنگ‌های hardcoded که در dark mode شکسته می‌شوند.
**نشانه‌های رایج**: در 375px layout می‌شکند؛ در dark mode متن ناخوانا می‌شود.
**Prevention**:
- همه رنگ‌ها از `--ds-*` token باشند (نه `#hex`) — dark mode خودکار کار می‌کند
- همه breakpoint ها با mobile-first (`sm:`, `md:`, `lg:`) تعریف شوند
- بعد از UI task: در DevTools موبایل (375px) و dark mode بررسی کن

### 38. UI Design Gate Skipped (D13 — Craft Bar/AI-Slop رد نشد)

AI خروجی بصری می‌دهد که «کار می‌کند ولی معمولی/کسل‌کننده» است.
**نشانه‌های رایج**: Inter + گرادیان بنفش؛ ۳ کارت گرد یکسان؛ هیچ micro-interaction؛ بدون هویت.
**Prevention**:
- قبل از اعلام تمام روی UI task، روبربر §9.3 از `pdk/design-cycle.md` را چک کن
- Craft Bar را یک‌به‌یک مرور کن (→ `AGENTS.uidqg.md §Craft Bar`)
- UIDQG کامل را اجرا کن (→ `AGENTS.uidqg.md`)
- اگر خروجی را Wise یا Linear منتشر نمی‌کرد → شکست است، برگرد و redesign کن

### 39. Database Safety Skip (D14 — migration ناامن)

AI migration می‌نویسد که destructive است یا rollback plan ندارد.
**نشانه‌های رایج**: `ALTER TABLE DROP COLUMN` روی داده‌های زنده؛ migration بدون index؛ float برای پول.
**Prevention**:
- هر migration: ابتدا rollback script بنویس
- هرگز ستون populated را DROP نکن — ابتدا soft-delete با `deletedAt` پیاده کن
- پول = `Decimal` در Prisma (نه `Float` یا `Number`)
- قبل از `npx prisma migrate dev`: `npx prisma validate` + بررسی generated SQL

### 40. Observability Gap (D15 — audit log فراموش شد)

AI عملیات حساس می‌سازد بدون audit log یا error tracking.
**نشانه‌های رایج**: کاربر login/logout می‌کند ولی هیچ log نیست؛ transfer انجام می‌شود ولی audit trail ندارد.
**Prevention**:
- هر Server Action مالی/admin: باید `AuditLog` write داشته باشد
- هر `catch (error)`: با `logger.error` یا Sentry ثبت شود (نه فقط `console.log`)
- هر route جدید: بررسی کن آیا نیاز به audit دارد (login، transfer، admin action، KYC)

### 41. CSP / Config Allowlist Forget (D2 extension — allowlist فراموش شد)

AI domain خارجی یا تصویر host جدید اضافه می‌کند ولی `next.config.ts` را آپدیت نمی‌کند.
**نشانه**: در production تصویر block می‌شود یا script با CSP error رد می‌شود.
**Prevention**:
- هر `src` تصویر خارجی جدید → `images.remotePatterns` در `next.config.ts` آپدیت شود
- هر script/font خارجی جدید → `contentSecurityPolicy` در `next.config.ts` آپدیت شود
- این آیتم بخشی از D2 (cascade) است — فراموش شدنش از رایج‌ترین production bugs است

---

## 🆕 بُعدهای D16–D18 — اشتباهات رایج (2026-07)

### 42. Error Ignored Because "Not Our Code" (D16 — خطا با بهانه رد شد)

AI خطایی می‌بیند ولی با «pre-existing است» یا «مربوط به ما نیست» از کنارش رد می‌شود.
**نشانه**: tsc/lint خطا نشان می‌دهد، AI گزارش می‌دهد ولی fix نمی‌کند — و همان خطا در تسک بعدی دوباره ظاهر می‌شود.
**Prevention**:
- قانون جدید: هر خطا سه دسته است:
  1. **در scope** → fix همان لحظه، بدون سؤال
  2. **خارج از scope ولی کوچک (< 10 دقیقه)** → fix همان لحظه + در post-task note کن
  3. **خارج از scope و بزرگ** → صریح به کاربر بگو + آیتم در `⚠️ ناقص` ثبت کن
- «گزارش بدون fix» = تضمین تکرار در تسک بعدی
- قانون قدیمی «اعلام کن و رد شو» **لغو شده** — D16 جایگزین آن است

### 43. Reuse-first Skipped (D17 — بدون جستجو ساختیم)

AI مستقیم شروع به نوشتن می‌کند بدون اینکه ببیند کد مشابه در پروژه وجود دارد.
**نشانه**: دو component با نام مختلف ولی کار یکسان؛ یک helper که در `lib/` موجود بود ولی دوباره نوشته شد.
**Prevention**:
- قانون مکانیکی پیش از هر کد جدید: `grep -r "نام عملکرد" src/` — حتی برای helper های کوچک
- Component Decision Protocol را مثل یک checklist اجرا کن:
  1. `grep "کلمه‌کلیدی" src/components/` → آیا چیزی هست؟
  2. `grep "کلمه‌کلیدی" src/lib/` → آیا helper موجود است؟
  3. اگر هست → reuse/extend؛ اگر نیست → create با دلیل مستند
- «مطمئنم که وجود ندارد» → کافی نیست؛ باید grep کنی و ثابت کنی

### 44. Undated Internet Research (D18 — تحقیق بدون تاریخ)

AI می‌گوید «از داک 2026 چک کردم» ولی هیچ منبع مشخصی با تاریخ ذکر نمی‌کند.
**نشانه**: گزارش Research فاقد تاریخ دقیق یا URL منبع است.
**Prevention**:
- فرمت اجباری Research block:
  ```
  🔍 Research (تاریخ: [روز ماه سال]):
  - [موضوع]: [نتیجه] — منبع: [URL یا "داک رسمی Next.js §X"]
  - Best practice 2026: [رویکرد انتخابی و دلیل]
  ```
- تاریخ باید «امروز» باشد (نه «اخیراً» یا «2026 کلی»)
- اگر websearch انجام نشد → صریح بنویس «N/A — تسک trivial بود، جستجو نیاز نداشت»

### 45. AGENTS.md Patch Deferred (D18 — patch به «آینده» موکول شد)

AI می‌گوید «باید AGENTS.md آپدیت شود» ولی آن را در همان سشن انجام نمی‌دهد.
**نشانه**: post-task report می‌گوید «⚠️ AGENTS.md نیاز به آپدیت دارد» ولی patch نوشته نشده.
**Prevention**:
- Rule Failure Loop = اقدام همان لحظه، نه «بعداً»
- اگر pattern جدیدی کشف شد → همان پیام: (۱) fix کد + (۲) patch AGENTS + (۳) گزارش
- «کشف کردم که X لازم است» + بدون patch = نقض مستقیم §Analysis≠Done

### 46. Project-wide Stale After Change (D19 — بخش‌های دیگر پروژه ناهماهنگ ماندند)

AI یک فایل را تغییر می‌دهد ولی فراموش می‌کند بقیهٔ پروژه که به آن وابسته‌اند را بررسی کند.
**نشانه‌های رایج**:
- feature جدید اضافه شد ولی در sidebar/navigation ظاهر نمی‌شود
- type تغییر کرد ولی فقط یک صفحه از دو صفحه consumer آپدیت شد
- env var جدید اضافه شد ولی `.env.example` و `AGENTS.env.md` آپدیت نشدند
- API response تغییر کرد ولی client-side code هنوز shape قدیمی را انتظار دارد

**Prevention — چک‌لیست project-wide scan:**
1. `grep -r "نام-فایل-تغییریافته" src/` → همه import کننده‌ها را پیدا کن
2. `grep -r "نام-تایپ-تغییریافته" src/` → همه consumer ها را بررسی کن
3. برای feature جدید: `grep -r "navigation\|sidebar\|menu\|routes" src/` → بررسی کن که entry اضافه شده
4. برای config جدید: `grep -r "env\|process.env" src/` + `AGENTS.env.md` + `.env.example`
5. هر consumer که یافتی → بررسی کن که با تغییر جدید سازگار است یا نیاز به آپدیت دارد

**قانون کلی:** «تغییر در ایزوله» وجود ندارد — هر تغییر باید با یک project-wide grep همراه شود.