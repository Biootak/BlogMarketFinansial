# Workspace Conventions — FinancialMarket

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

## Auto-Journal (خودکار)
- هر `Edit`/`Write` خودکار یه خط توی `.harness/.journal.log` می‌نویسه (hook سیستمی).
- Format: `<ISO8601>  <TOOL>  <REL_PATH>  (+A -B)`
- journal = memory real-time برای resume. **هیچ‌وقت دستی پاکش نکن.**

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
