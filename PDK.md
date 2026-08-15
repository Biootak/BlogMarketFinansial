# PDK v2 — Product Development Kit

> **ریپو:** `financialmarket.page` (Heroku) — بلاگ مالی فارسی + پلتفرم صرافی/فین‌تک  
> **Stack:** Next.js 16 + Prisma 6 + PostgreSQL + NextAuth v5 + Tailwind v4  
> **زبان UI:** فارسی (اصلی). کد/دستور/مسیر: انگلیسی.  
> **Workflow:** AGENTS.md حاکم است — PDK مرجع فنی/دامنه است، نه جایگزین AGENTS.md.
> **اجرای مکانیکی (2026-08-14):** `npm run rules:check` گام صفر هر تسک؛ مهر = `npm run rules:stamp -- --files "..."`؛ `npm run verify` شامل gate؛ بدون مهر تازه، کامیت هم بلاک می‌شود (pre-commit). جزئیات: AGENTS.md §Pre-Code Rule Reading.

---

## ماژول‌ها

| موضوع | فایل | بارگذاری |
|-------|------|---------|
| واقعیت ریپو + صفحات موجود | [`pdk/project-reality.md`](pdk/project-reality.md) | اول هر تسک جدید |
| قوانین دائمی (C1–C14) | [`pdk/constitution.md`](pdk/constitution.md) | هر تسک |
| معماری + stack | [`pdk/architecture.md`](pdk/architecture.md) | تغییر ساختار/DB/auth |
| امنیت + RBAC | [`pdk/security.md`](pdk/security.md) | هر endpoint مالی |
| دیتابیس — مدل‌های واقعی | [`pdk/database.md`](pdk/database.md) | query/migration |
| API — شکل پاسخ + خطا | [`pdk/api.md`](pdk/api.md) | هر route/action |
| کدنویسی | [`pdk/coding-standards.md`](pdk/coding-standards.md) | هر کد |
| Design System | [`pdk/design-system.md`](pdk/design-system.md) | هر UI |
| چرخه طراحی + Anti-Slop | [`pdk/design-cycle.md`](pdk/design-cycle.md) | هر صفحه جدید |
| Blueprints | [`pdk/blueprints/`](pdk/blueprints/) | ساختن صفحه |
| MVP + اولویت‌ها | [`pdk/prd/mvp.md`](pdk/prd/mvp.md) | برنامه‌ریزی |
| Anti-Failure checklist | [`pdk/anti-failure.md`](pdk/anti-failure.md) | قبل از «تمام» |
| بنچمارک رقبا | [`pdk/benchmarks.md`](pdk/benchmarks.md) | UX/feature comparison |

---

## قوانین سریع (C1–C14 خلاصه)

| # | قانون | اجرا |
|---|-------|------|
| C1 | تحلیل قبل از کد | grep + read_file قبل از هر تغییر |
| C2 | کیفیت > سرعت | no tech debt |
| C4 | ممنوع‌ها | no any/TODO/placeholder/AI-slop/duplicate |
| C5 | زبان/RTL | فارسی UI، انگلیسی کد، logical props، `useDirection` |
| C6 | TS strict | no any, no ts-ignore |
| C7 | امنیت = زیربنا | auth+RBAC+validation روی هر endpoint |
| C9 | API shape | `{success,data}` / `{success:false,error:{code,msg}}` |
| C10 | AuditLog | هر عملیات حساس → `AuditLog` |
| C12 | Reuse | `ui/*` + `lib/db` + `lib/auth` + `lib/ratelimit` |
| C13 | Anti-Slop | design-cycle برای هر UI جدید |

---

## تضاد PDK ↔ AGENTS.md — قانون حل‌کننده

| موضوع | حاکم |
|-------|------|
| Workflow (Build→Show→Improve) | **AGENTS.md** |
| تأیید مرحله‌ای (process.md) | فقط برای قابلیت‌های P0 جدید |
| مدل‌های DB / schema | **pdk/database.md** (از روی prisma/schema.prisma) |
| نقش‌ها / RBAC | **pdk/security.md** |
| UI tokens | **pdk/design-system.md** → `tokens.css` |

> **PDK v2 — 2026-07** — هماهنگ با AGENTS.md. تضاد‌های نسخه قبل حل شد.
