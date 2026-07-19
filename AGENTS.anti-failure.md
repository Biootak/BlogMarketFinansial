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
- اضافه کردن cron جدید → vercel.json / scheduler config
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