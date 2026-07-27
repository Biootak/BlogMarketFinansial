# طراحی مجدد داشبورد Exchange

> **Workspace:** /mnt/FinancialMarket

---

**User**

رنگ های جیع و ایموجی استفاده نکن رنگ اصلی سایت باشه 
 اینکه طراحی که بقیه هوش مصنوعی میزنن رو نزن چون همه یک شکل میشن چون از منابع قدیمی اموزش دیدی و خلاقیت نداری پس خلاقیت تو فعال کن ببنم چیکار میکنی 
 ,و هماهنگ باشه و تمام قوانین گفته شده در فایل ها رعایت بشه 
 پرفورمنس بهینه باشه و تا 95 درصد و  سنگین نباشه ولی ظاهر جذاب باشه 
 بک اند هم هماهنگ باشه 
 ریسپانسیو باشه موبایل فرست 
 داد ها واقعی باشه 
 امنیت عالی باشه 
 و دیزاین ظاهری فرانت اند خفن باشه  از نظر چیدمان و کامپلیکس  باشه و ساختار عوض بشه 
 
 
 و هر چیزی که نیاز این داشبورد هستش اصافه بکن از کامپونتت ها مختلف و صفحات که دیگه تکمیل طراحی از نو بشه همون ها قبلی رو تحویل ندی ظاهرشو 
 
 همه رو کامل تکمیل کن با زیر مسیر ها و زیر کامپونتت ها 
 
 
 بریم سراغ طراحی ظاهری از نو این  صفحه که من رو شگفت زده بکنه http://localhost:3000/exchange/dashboard

**Assistant**

AGENTS.md و PDK.md را خواندم — مستقیم می‌سازم (Build → Show → Improve).

اول یه نگاه به ساختار پروژه و فایل‌های قوانین می‌اندازم تا دقیق بدونم با چی کار می‌کنم.

📍 وضعیت: [همه قوانین و فایل‌های مرتبط مطالعه شد | آماده نوشتن data layer + page + 10+ sub-component].

حالا دیتای واقعی و action جدید را می‌سازم. اول وضعیت dev server را چک می‌کنم.

شروع به ساخت می‌کنم. اول data layer که همه چیز real باشه.

## UI VISION GATE ✓

| چک | پاسخ |
|---|---|
| **👁️ UQ1 Vision** | «حس cockpit صراف در لحظه پایان روز — Wise × Bloomberg × Linear، یک بانک مرکزی دیجیتال» |
| **✨ UQ2 Signature** | (1) system-breath SVG polyline 7 روز اخیر (2) CountUp ease-out-expo (3) Kinetic rotating dot real-time |
| **🏦 UQ3 Domain** | از «جریان پول»: lanes برای currency، rhythmic bars برای هفته، conic-gradient donut برای mix — نه pie chart کلیشه |
| **⚠️ Risk** | UQ7 (real data — 8 parallel aggregate)؛ UQ13 (tokens only)؛ UQ10 (transform/opacity only) |
| **🏗️ Comp Map** | Hero=custom SVG+CountUp · KPI=custom tile (not StatCard) · CurrencyFlow=CSS bars · Weekly=relative bars · Mix=conic-gradient · TopCustomers=list · Pending=timeline · Alerts=dot+link · Quick=4 magnetic card · Recent=rich row |

## PRE-CODE GATE ✓

| چک | پاسخ |
|---|---|
| Research | Linear 2026 + Bloomberg + Wise Sigma — high info density + low chrome |
| Reuse | `CountUp` (primitive) · `KindBadge/StatusBadge` · `formatJalali*` · existing `--at-*` tokens |
| Scope | 1 action + 10 sub-components + 1 module.css + 1 page rewrite |
| Security | `requireExchangeAccess` + BigInt→string + no PII leak |
| Rules | RTL logical-only · no hex · no `any` · no `globals.css` additions |
| Better? | No — `/exchange/dashboard` is the right surface (not `/dashboard/exchange/dashboard`) |

📍 وضعیت: [data layer + 10 component + page rewrite]

حالا verify می‌کنم تا ببینم همه چیز درست type می‌شود.

---

**User**

کامپایل نکن محیط سند باکسی کامپایل نمیشه

**Assistant**

کامپایل نکن محیط سندباکسی کامپایل نمیشه. دستی review می‌کنم.

---

**User**

گفتم کامپایل نکن من خودم کامپایل میکنم تو فقط کد نوشت انجام بده

**Assistant**

متوجه شدم، کد فقط می‌نویسم بدون اجرا. الان چند تا چیز نهایی اضافه می‌کنم تا ساختار asymmetric بشه و چند component دیگه برای richness.

اول data action رو enrich می‌کنم با rate snapshot و customer segmentation.

---

