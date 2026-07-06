# Workspace Conventions — FinancialMarket

> ## ⛔ EMERGENCY-FOR-FRESH-SESSION: HOOKS OFFLINE
>
> **چرا journal خودکار کار نمی‌کنه:**
> - Mavis daemon توسط MiniMax desktop app manage می‌شه؛ از CLI **نمی‌شه** restartش کرد.
> - `mavis hook create` ثبت می‌کنه ولی تا وقتی کاربر daemon رو از app restart نکرده، trigger نمی‌شه.
> - یعنی: هر `Edit`/`Write` الان journal entry خودکار نمی‌نویسه.
>
> **چیکار کنی (و چیکار نکنی):**
> - ❌ تلاش نکن `mavis hook create` یا daemon restart یا `mavis hook fire test` — وقت تلف می‌کنه.
> - ✅ بعد از هر `Edit`/`Write` موفق، **silent و immediate** این رو اجرا کن:
>
> ```bash
> node "E:/FinancialMarket/.harness/hooks/journal-write.cjs" <TOOL> "<REL_PATH>" "(+A -B)"
> ```
>
> - ✅ اگه کار نیمه‌کاره قطع شد، `.harness/.journal.log` + `.harness/HANDOFF.md` + `.harness/.last-build.log` سه source of truth هستن.
> - ✅ `.next/` اگه fresh باشه (`dev`/`start` فوری بالا میاد، rebuild لازم نیست). وضعیت build در HANDOFF ثبت می‌شه.
> - ✅ Build رو **ته تسک** بگیر، نه اول — هم برای durability و هم برای سرعت.
>
> این بخش عمداً بالای فایل اومده تا session بعدی سریع بفهمه و گیر نکنه.

## Mandatory declaration (هر تسک)
قبل از هر کار:
> «AGENTS.md را خواندم — مستقیم می‌سازم (Build → Show → Improve).»

## Resume Protocol (وقتی fresh session شدی)
1. اگه `.harness/HANDOFF.md` هست → بخون قبل از هر چیز.
2. `.harness/.journal.log` رو هم نگاه کن — خط زمانی real-time از تغییراته.
3. وضعیت رو خلاصه بگو، بپرس از کجا ادامه بدیم، **خودت شروع نکن**.

Trigger ها:
- کاربر: «ادامه بده»، «/resume»، «از کجا بودیم»، «resume»، «از آخرین ناتمام»
- یا اول پیام fresh session: «`HANDOFF.md` رو بخون و ادامه بده»

Status flow: `PENDING` → `IN_PROGRESS` → `DONE`.
وقتی تموم شد، status رو در HANDOFF به `DONE` ببر و در صورت نیاز commit.

## Auto-Journal (خودکار / fallback)
- ایده‌آل: هر `Edit`/`Write` خودکار یه خط توی `.harness/.journal.log` می‌نویسه (hook سیستمی).
- **واقعیت: hook ها load نیستن** (به ابتدای فایل مراجعه کن). فعلاً manual می‌نویسیم.
- Format: `<ISO8601>  <TOOL>  <REL_PATH>  (+A -B)`
- journal = memory real-time برای resume. **هیچ‌وقت دستی پاکش نکن.**

### Manual contract — **CRITICAL** (تا وقتی hook ها load نشدن)

**Hook ها ثبت شدن ولی load نیستن** چون:
- Mavis daemon توسط MiniMax desktop app manage می‌شه و از CLI restart نمی‌پذیرد.
- تا وقتی user خودش daemon رو از app restart نکرده، `mavis hook create` ثبت می‌کنه ولی trigger نمی‌شه.

**راه‌حل فعلی: helper script.** بعد از هر `Write`/`Edit` موفق، **بلافاصله و silent** این رو اجرا کن:

```bash
node "E:/FinancialMarket/.harness/hooks/journal-write.cjs" <TOOL> "<REL_PATH>" "(+A -B)"
```

نمونه‌ها:
```bash
node "E:/FinancialMarket/.harness/hooks/journal-write.cjs" EDIT  "src/components/Foo.tsx"  "(+12 -3)"
node "E:/FinancialMarket/.harness/hooks/journal-write.cjs" WRITE ".harness/NEW.md"
node "E:/FinancialMarket/.harness/hooks/journal-write.cjs" HOOK  "mavis hook create X" "(registered)"
```

**قوانین سفت**:
- Output این command رو **هرگز** توی reply به کاربر include نکن.
- "journaled" متن رو نگو. silent اجرا کن.
- اگه script fail شد، error رو swallow کن و ادامه بده. parent tool call نباید break شه.
- TODO Manual-cron: بعد از restart daemon، این manual contract رو حذف کن و فقط به hook ها تکیه کن.

**اگه journal ننویسی، session بعدی نمی‌فهمه چی شده. این critical failure پروتکل رزومه است. همیشه رعایت کن.**

## Handoff Files (این‌ها رو به‌روز نگه‌دار)
- `.harness/HANDOFF.md` — اصلی، کامل، source of truth.
- `docs/STATUS.md` — خلاصه‌ی سریع (backup).
- `.harness/.journal.log` — خط زمانی (auto-generated).
- `.harness/.pending.md` — تسک‌های ناتمام (auto-managed اگه hook فعال باشه).

## RTL / Persian
- `html dir="rtl" lang="fa-IR"` در root.
- فقط logical property (`ms-*`, `ps-*`, `start`/`end`) — هرگز `left/right` هاردکد.
- هر Editor1 shell/portal → `useDirection('rtl')` از `@/hooks/useDirection`.

## Code
- TypeScript strict، بدون `any`، بدون `ts-ignore`، بدون TODO.
- API shape: `{ success: true, data }` یا `{ success: false, error: { code, message } }`.
- Cache tags لیست‌شده در AGENTS.md. `revalidateTag` فقط از `@/lib/revalidate`.
- Prisma: `@/lib/db` (singleton). هرگز `new PrismaClient()`.

## Language
- **فارسی** در user-facing copy.
- **انگلیسی** در code, paths, comments (technical), CLI.

## Workflow
- Search fast (Reuse) → Edit → `npx tsc --noEmit` (اگه TS جدید) → user visual test → Improve.
- Build رو ته تسک بگیر، نه اول. کاربر ترجیح می‌ده سریع پیش بریم.
- تغییرات بزرگ: اول خلاصه‌ی plan، بعد کد.
