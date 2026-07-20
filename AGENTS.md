# AGENTS.md

> Persian-first financial blog (`blogmarketfinansial.ir`) on Next.js 16 + Prisma + PostgreSQL + NextAuth v5.
> User-facing copy is Persian; user expects Persian in replies, English in code/commands/paths.

## Workflow — Build → Show → Improve

**phase.** Search fast (for Reuse) → Edit → User tests visually → Improve.

- Before code: only quick grep/find to avoid duplicates (Reuse → Refactor → Extend).
- After code: `npx tsc --noEmit` if new TypeScript written; skip for tiny CSS/UI tweaks.
- User tests visually and says "fix" or "good".

Only write a brief analysis (not a long plan) for: DB / migration / auth / security / caching / routing, or when user says "big" / "architecture changes".

### ⛔ Analysis ≠ Done (Anti-Pattern — learned 2026-07)
تحلیل بدون پیاده‌سازی = **شکست**. اگر در پاسخ «کارهایی که باید انجام شود» لیست کردی، آن کارها را همان لحظه بنویس — نه در چت بعدی. «کشف کردم که X لازم است» + اعلام تمام = نقض مستقیم Build→Show→Improve.

### 🔍 Pre-code Research Gate (اجباری — قبل از نوشتن هر کد غیر-trivial)
پیش از نوشتن کد برای هر تسک غیر-trivial (هر چیزی که بیشتر از یک fix یک‌خطی است)، این سؤال‌ها را با websearch یا داک رسمی بررسی کن و **صریحاً به کاربر بگو**:

1. **آیا راهکار بهتری در داک رسمی 2026 وجود دارد؟**
   - Next.js docs، Prisma docs، MDN، TypeScript handbook — همه آپدیت می‌شوند. آنچه ۶ ماه پیش best practice بود ممکن است الان deprecated باشد.
   - نمونه: `unstable_cache` → `use cache` در Next.js 15+؛ scraping با regex → `node-html-parser`؛ fetch با no retry → `p-retry` pattern.
2. **آیا روش من با best practice جاری تضاد دارد؟**
   - اگر تضاد وجود دارد، **قبل از کد به کاربر بگو** + جایگزین پیشنهاد بده. هرگز ساکت پیش نرو.
3. **آیا یک کتابخانه موجود این کار را بهتر انجام می‌دهد؟**
   - قبل از نوشتن helper جدید، بررسی کن آیا چیزی در `node_modules` یا استاندارد Web API آن را cover می‌کند.

فرمت گزارش pre-code (در همان پیام، قبل از کد) — **تاریخ اجباری است (learned 2026-07)**:
```
🔍 Research (تاریخ: [روز/ماه/سال امروز]):
- [چه چیزی بررسی شد]: [نتیجه] — منبع: [URL یا "داک رسمی X §Y"]
- Best practice 2026: [رویکرد انتخاب‌شده و دلیل]
- ⚠️ هشدار [اگر راهکار بهتری وجود دارد که نمی‌توان الان اعمال کرد]
```
اگر websearch نیاز نبود (تسک trivial) → صریح بنویس: `🔍 Research: N/A — [دلیل]`

### 📋 Post-task Report (اجباری — بعد از هر تسک)
پس از هر تسک که بیشتر از یک فایل تغییر داده، قبل از اعلام «تمام» این گزارش را بنویس:

```
## گزارش تسک

### ✅ انجام شد
- [فایل]: [چه تغییری — یک خط]

### ⚠️ ناقص / بعداً باید انجام شود
- [مورد]: [دلیل که الان نشد]

### 💡 پیشنهادات بهبود (اختیاری — فقط موارد واقعی)
- [پیشنهاد]: [چرا مفید است]

### 🐛 خطرات احتمالی
- [خطر]: [چطور پیشگیری شود]
```

اگر همه چیز کامل است و پیشنهادی نیست، همان را صریح بگو. گزارش را inflate نکن.

## Mandatory declaration (start of every task)

> "AGENTS.md و PDK.md را خواندم — مستقیم می‌سازم (Build → Show → Improve)."
>
> ⚠️ **این اعلام کافی نیست** — باید **PRE-CODE GATE** را هم در همان پیام پر کنی (ر.ک بخش بعدی).

---

## 🚦 PRE-CODE GATE — دروازهٔ قبل از کد (اجباری، visible در هر پیام)

> **⛔ قانون سختگیر — learned 2026-07:** این گیت باید **به صورت markdown table** در همان پیام، **قبل از اولین tool call کدنویسی** نوشته شود. نوشتن کد بدون این table = نقض مستقیم.

> **⛔ قانون COMPLETE ANSWERS — learned 2026-07-09:** هر سطر جدول باید پاسخ **کامل و واقعی** داشته باشد. نوشتن «بررسی می‌شود»، «باید grep شود»، یا هر placeholder دیگر = نقض مستقیم. این جدول باید **بعد از تحقیق واقعی** نوشته شود، نه قبل از آن. اگر هنوز grep نکردی، اول grep کن، بعد جدول را پر کن.

> **⛔ قانون UI-DESIGN GATE — learned 2026-07-28:** برای هر تسک UI/بصری، دو ردیف آخر جدول (`🎨 UI Design Check` و `🏗️ Component Map`) **اجباری** هستند و باید **قبل از نوشتن اولین خط کد** پر شوند — نه بعد از آن. «UIDQG را بعد اجرا می‌کنم» = نقض مستقیم. ترتیب صحیح: **۱. UQ1–UQ22 را مرور کن → ۲. component map را بساز → ۳. بعد کد بنویس → ۴. قبل از Show دوباره UIDQG کامل اجرا کن.**

هر تسک غیر-trivial باید این جدول را در پیام داشته باشد (قبل از کد):

```
| چک | سؤال | پاسخ |
|---|---|---|
| 🔍 Research | آیا best practice 2026 از داک‌های رسمی بررسی شد؟ | [نتیجه واقعی + منبع — نه "بررسی می‌شود"] |
| 🌐 Internet-first | آیا از اینترنت/داک رسمی 2026 استفاده شد؟ | [URL یا منبع واقعی — نه "بله"] |
| 🔁 Reuse | آیا کامپوننت/util مشابه در repo وجود دارد؟ | [نتیجه grep واقعی — نه "باید grep شود"] |
| 📐 Scope | چه فایل‌هایی تغییر می‌کنند؟ | [لیست دقیق فایل‌ها] |
| 🔗 Dependencies | آیا وابستگی‌های این فایل‌ها هم آپدیت می‌شوند؟ | [لیست callers/importers grep شده] |
| 🔒 Security | آیا auth/validation/rate-limit لازم است؟ | [پاسخ کامل: چه چک‌هایی اضافه می‌شود] |
| 🔄 Front↔Back sync | آیا فرانت و بک‌اند هماهنگند؟ | [API shape، cache tags، UI states] |
| 📏 Rules | آیا قوانین پروژه رعایت می‌شود؟ | [RTL/TSstrict/no-hex/Prisma-singleton] |
| ✅ Complete | آیا کد کامل است؟ | [نه stub/TODO/console.log] |
| 🗄️ DB | آیا schema/migration لازم است؟ | [پاسخ کامل با rollback plan] |
| 🧩 Integration | آیا با بخش‌های دیگر پروژه هماهنگ است؟ | [grep callers، sidebar، nav، sitemap] |
| 💡 Better way? | آیا راهکار بهتری وجود داشت؟ | [اگر بله → همین لحظه به کاربر بگو] |
| 🎨 UI Design Check | (فقط تسک UI) آیا UQ1–UQ22 مرور شد؟ کدام UQ ها ریسک دارند؟ | [N/A اگر تسک UI نیست — وگرنه: UQ ریسک‌دار فهرست شود] |
| 🏗️ Component Map | (فقط تسک UI) component map پر شده؟ | [N/A اگر تسک UI نیست — وگرنه: \| element \| existing impl \| decision \|] |
```

> **⚠️ قانون «راهکار بهتر» — learned 2026-07-09:** اگر در ردیف «Better way?» پاسخ «بله» است، **قبل از نوشتن اولین خط کد** باید به کاربر گفته شود و تأیید گرفته شود. ساکت پیش رفتن = نقض مستقیم Directive 0.

> **⚠️ قانون UI-DESIGN GATE — learned 2026-07-28:** ردیف‌های `🎨 UI Design Check` و `🏗️ Component Map` فقط برای تسک‌های UI اجباری هستند. برای تسک‌های pure backend/DB → صریح بنویس `N/A`. «بعداً چک می‌کنم» = نقض مستقیم. هدف: ریسک‌های طراحی را **قبل از نوشتن کد** شناسایی کن، نه بعد از آن.

**ترتیب اجباری (قبل از کد):**
1. ابزارهای grep/read_file را اجرا کن
2. داک‌های رسمی/اینترنت را چک کن
3. اگر تسک UI است → UQ1–UQ22 را سریع مرور کن، ریسک‌ها را یادداشت کن
4. جدول را با پاسخ‌های واقعی پر کن — هیچ placeholder مجاز نیست
5. اگر «راهکار بهتر» وجود دارد → به کاربر بگو و تأیید بگیر
6. بعد اولین tool call کدنویسی را بزن

اگر تسک trivial (یک‌خطی) است → صریح بنویس: `PRE-CODE GATE: N/A — [دلیل]`

---

## SELF-ENFORCING LOOP (بلا استثنا — حتی وسط چت)

قوانین وسط کار فراموش می‌شوند. پس نه با حافظه، با **دروازهٔ مکانیکی** اعمالشان کن:

1. **قبل از هر ویرایش دوباره لنگر بینداز:** `DESIGN.md` + `COMPONENTS.md` + `AGENTS.ui-design.md` + بخش Directives را بخوان. بعد از تحلیل به حافظه اعتماد نکن.
2. **به انگلیسی فکر کن، از منابع خارجی تحقیق کن** (internet-first). فارسی فقط در متن کاربر‑محور.
3. **Build → `npm run verify` → Show.** تسک تا وقتی `npm run verify` سبز نشده «تمام» نیست (tsc + biome + اسکن آنتی‌پترن).
4. **اگر verify قرمز شد، تا سبز شدن درستش کن.** هرگز با چک قرمز «تمام» نگو.
5. **CRAFT GATE (اجباری — سقف، نه کف):** خروجی باید استاندارد «بیلیون‌دلاری» را در `DESIGN.md §Craft & Composition` + `AGENTS.ui-design.md` رد کند. این سایت محصول فین‌تک در کلاس Stripe/Wise/Linear/Vercel است — «درسته ولی معمولی/کسل‌کننده/بی‌هویت» یک **شکست** است، نه یک خروجیِ ایمن. عبور از دروازه فقط با tsc نیست؛ با سطح کرفت است. قبل از اعلام پایان، **UIDQG (§UI Design Quality Gate) را اجرا کن** — هر ❌ = همان لحظه fix کن.
5.5. **UIDQG GATE — دو مرحله‌ای (اجباری — هر تسک UI):**
  - **مرحله اول (قبل از کد — در PRE-CODE GATE):** ردیف‌های `🎨 UI Design Check` + `🏗️ Component Map` را پر کن. UQ ریسک‌دار را شناسایی کن. این مرحله در PRE-CODE GATE جدول اجباری است.
  - **مرحله دوم (قبل از Show/Done):** UIDQG کامل (UQ1–UQ22) را اجرا کن و نتیجه را به صورت visible بنویس. هر ❌ = همان لحظه fix کن.
  - **⛔ «یک‌بار آخر چک می‌کنم» = نقض مستقیم.** چک باید دو بار باشد: یک‌بار قبل از کد، یک‌بار قبل از Show.
  - ر.ک §UIDQG برای فرمت کامل.
6. **Definition of Done** (پایین) را یک‌به‌یک چک کن پیش از اعلام پایان.
7. **🔁 Task Completion Loop** — قبل از اعلام «تمام»، چک‌لیست `§Task Completion Loop` را اجرا کن. اگر هر آیتم ناقص بود، **همان لحظه fix کن و ادامه بده — متوقف نشو.** فقط وقتی همه ۹ آیتم سبز شدند، «تمام» بگو.
8. **🛡️ 19DQG — Nineteen-Dimension Quality Gate** — آخرین دروازه قبل از «تمام». ۱۹ بُعد: [D1] کد نوشته شد · [D2] وابستگی‌ها · [D3] امنیت · [D4] sync front/back · [D5] قوانین پروژه · [D6] کامل/clean · [D7] internet-first · [D8] یکپارچگی · [D9] best practice 2026 · [D10] performance · [D11] a11y · [D12] responsive/dark · [D13] UI craft · [D14] DB safety · [D15] cleanup/observability · [D16] هر خطا fix شد · [D17] reuse-first · [D18] dated websearch+AGENTS patch · **[D19] بخش‌های دیگر پروژه آپدیت شدند**. هر [ ] باقی ماند → fix → از D1 شروع کن.

> **⚠️ قانون VISIBLE — learned 2026-07:** صرفاً «19DQG را خواندم» کافی نیست. باید نتیجهٔ هر بُعد را **در همان پیام** به صورت یک خط بنویسی: `[D1] ✅ کد نوشته شد / [D3] ✅ auth چک شد / [D14] N/A — بدون DB`. اگر نوشتی «تمام» ولی 19DQG visible نبود، تسک complete نیست.

> **⚠️ قانون ۸ سؤال کاربر — learned 2026-07-09:** قبل از «تمام»، این ۸ سؤال را صریحاً جواب بده:
> 1. آیا **وابستگی‌ها** آپدیت شدند؟
> 2. آیا **امنیت** درست است؟
> 3. آیا **هماهنگی front↔back** برقرار است؟
> 4. آیا **قوانین پروژه** رعایت شدند؟
> 5. آیا **کد کامل** است (نه stub/ناقص)?
> 6. آیا **راهکار بهتری** وجود داشت؟ اگر بله — **چرا قبلاً نگفتی؟** → AGENTS patch اجباری است
> 7. آیا از **اینترنت/داک رسمی 2026** استفاده شد؟ منبع ذکر شد؟
> 8. آیا **پروژه با بخش‌های دیگر هماهنگ** است؟

## Critical conventions (always-on)

- **RTL** global (`html dir="rtl" lang="fa-IR"`). Use logical properties — never hardcode `left/right`. Use `useDirection('rtl')` from `@/hooks/useDirection` in every Editor1 shell/portal component. See `AGENTS.gotchas.md` for the full RTL playbook.
- **TypeScript strict**; no `any`, `ts-ignore`, TODO, placeholder.
- **API response shape**: `{ success: true, data }` or `{ success: false, error: { code, message } }`.
- **Cache tags** (`unstable_cache`): `posts`, `archive`, `featured-posts`, `latest-posts`, `popular-posts`, `post-{id}`, `post-slug`, `post-by-slug`, `comments`, `categories`, `tags`, `sidebar-data`, `dashboard-stats`, `ticker`, `exchange-rates`, `header-ad`, `advertisements`, `rate-lists`, `dashboard-{section}`.
- **`revalidateTag`** must come from `@/lib/revalidate`, never `next/cache`.
- **Prisma** singleton: import from `@/lib/db`. Don't `new PrismaClient()`.
- **English** in code/commands/paths. **Persian** in user-facing copy only.

## Directives — Editing / Creating / UI appearance (always enforced)

Non-negotiable. Load `DESIGN.md` + `COMPONENTS.md` before ANY UI task. They exist because past output drifted into 14k-line global CSS, ~14 parallel modal systems, and hardcoded hex — the agent kept *inventing its own* instead of reusing.

### 0. Internet-first rule (mandatory for non-trivial UI/UX)
Before building or restyling any non-trivial UI surface you MUST:
1. `websearch` the current (2026) best practice for that specific pattern (e.g. "dashboard data table 2026 a11y", "shadcn modal focus trap").
2. Fetch 1–2 **professional, actively-maintained** open-source references ONLY: `shadcn-ui/ui`, `Layered-UI/Layered-UI`, `JohnCarter09/Durple` (and similar high-star UI libraries). Prefer reading their component *source*, not marketing pages.
3. **Extract the pattern** (structure, states, a11y, motion) and adapt it to OUR tokens/DS. Do NOT copy their theme colors, fonts, or config.
4. **Delete after use:** never fork/clone the reference repo into this project, never leave a `vendor/` copy, never `npm install` the reference as a dependency. The reference is read-only research, not a dependency.
5. **چالش با دستورالعمل موجود (mandate-challenge — اجباری):** اگر خودِ AGENTS.md / DESIGN.md / COMPONENTS.md یک تکنیک کل‌صفحه‌ای را اجباری کرده (مثل scale/zoom/transform روی `html`)، پیش از پیاده‌سازی حتماً با `websearch` چک کن که آیا آن رویکرد هنوز **best practice** است یا یک **anti-pattern**. اگر با بهترین رویهٔ سایت‌های حرفه‌ای (Supabase / Vercel / Stripe / Linear) تضاد دارد، **قبل از نوشتن کد به کاربر بگو** و جایگزینِ بهتر را پیشنهاد بده — هرگز ساکت و کورکورانه دنبال نکن. کاربر لزوماً از این تضاد خبر ندارد؛ وظیفهٔ تو **اطلاع‌رسانی** است، نه فقط اجرا. این قانون دقیقاً برای جلوگیری از تکرار موردی است که رویکردی (مثل `zoom`) اجرا شد بدون اینکه کاربر بداند با بهترین رویه تداخل دارد.
Trivial/mechanical tasks (one-line class fix) may skip the search but still follow tokens.

### 1. Directive: Editing existing code
- **Audit before change:** grep the repo for an existing component/util matching the need; reuse before modifying. Never introduce a parallel implementation.
- **Scope discipline:** change only what the task requires. Do not rewrite unrelated files or "improve" the design system mid-task. Spot a broader inconsistency? NOTE it (don't fix silently) and propose a separate cleanup task.
- **Never expand global CSS:** do not add rules to `globals.css`, `dashboard.css`, `setup.css`, `auth.css`, `atelier-archive.css`, or `money-transfer/styles.css`. Fix via the co-located CSS Module, or (for truly shared utilities) the global `anim-*` set.
- **Keep it modular:** if an edit would push a file past ~400 lines or mix a new concern, split it instead.
- **No stubs / no regressions:** no `console.log` debug, no `any`, no half-built branches.
- **Dependency audit (learned 2026-07):** هر بار که یک فایل `lib/` تغییر می‌کند، همه فایل‌هایی که از آن ایمپورت می‌کنند را grep کن و اطمینان حاصل کن که interface جدید با آن‌ها سازگار است. تغییر signature تابع بدون بررسی callers = رگرسیون تضمین‌شده.
- **Parallel data sources — synchronization rule (learned 2026-07):** اگر پروژه چند منبع داده دارد که یک هدف مشترک دارند (مثل `refresh-market-rates` و `sync-bazaar` هر دو نرخ می‌نویسند)، هنگام تغییر یکی، وضعیت دیگری را بررسی کن. اگر تکراری/متناقض باشند، به کاربر بگو و یکی را deprecated کن.

### 2. Directive: Creating code (components, pages, features)
Follow the **Component Decision Protocol** every time, in order:
1. **Search** the repo for an existing component with the same purpose.
2. **Search** for a similar structure/behavior.
3. Prefer: **reuse** → **extend** (backward-compatible variant) → **compose** primitives → new **shared** component → page-**specific** component.
4. Do NOT create a new component just because an existing one has a different name.
Before writing, fill a one-line component map: `| element | existing impl | decision (reuse/extend/compose/create) |`. Do not start until the main elements are classified.
**Rules for new code:**
- Max file ~400 lines; extract helpers/hooks/sub-components when exceeded. One concern per file. Business/data logic → `lib/` or a hook, never inline.
- **No `any`, no `@ts-ignore`, no TODO/placeholder/FIXME.** Type everything; if a type is unknown, model it.
- **No stubs:** every wired action must do something real (no `console.log`-only handlers, no fabricated metrics). If a backend piece is missing, say so and stub the *interface* only, marked clearly.
- Co-located `*.module.css` (see `AGENTS.style.md` › Component CSS Standard).

### 3. Directive: UI appearance (read `DESIGN.md` + `COMPONENTS.md` first)
- Read `DESIGN.md` (visual contract) and `COMPONENTS.md` (which component to use, when NOT to use it, required states) BEFORE writing UI.
- **Canonical components:** `src/components/ui/*` (shadcn) is the primary system — anchor on `button`, `input`, `dialog`, `card`, `skeleton`. Dashboard uses `src/components/Dashboard/primitives/*` (`EmptyState`, `StatCard`, `DataTable`). The `src/components/ds/*` set is **experimental/mostly-unused — do NOT route new code to it** except where already adopted (Archive, ExchangeRatesToolbar).
- **Forbidden duplicates:** never create another `Modal`/`EmptyState`/`Skeleton`/`Button`/`Card`/`Input`/`Table`. The deprecated `Dashboard/shared/DashboardTableWrapper` exports (`PageHeader`, `EmptyState`) are off-limits.
- **Tokens only:** use `--ds-*` (site) / `--ds-color-*` + `--nova-*` (dashboard) from `tokens.css`. shadcn `ui/*` carry their own `--color-*` Tailwind mapping — leave them; do not add NEW `--color-*` usage in custom code. **Never** hardcode hex/rgb; never introduce px-fixed spacing where a fluid `--ds-space-*` exists.
- **RTL:** logical properties only (`ps-/pe-/ms-/me-/inset-inline-*`), never `left/right`. Use `useDirection('rtl')` in Editor1 shells/portals.
- **Motion:** opacity/transform only; no per-component reduced-motion block (global clamp in `tokens.css:221` handles it).

### 3.5 Directive: Redesign mode (explicit redesign / "test the redesign" / "بازطراحی")
The loop above only ever pushes *reuse + tokens + never-expand-CSS*, which is correct for **edits** but gives NO path for a **redesign** — so on a redesign request the agent silently strips violations and stops, leaving the visual design untouched. That is a failure. A redesign task MUST produce a **visibly different** result, not just compliance fixes.

When the task is explicitly a redesign / restyle / "test the redesign":
1. **Audit + then change structure, not just classes.** Recompose sections (new hierarchy, new layout, new order), add the affordances the research surfaced (rate-lock/freshness, fee & received-amount transparency, prominence of the final number, mobile-first). Stripping a violation alone does NOT count as a redesign. The result MUST clear the **Craft Bar (§3.6)** — a redesign that is "clean but ordinary" is a failure.
2. **New styles go in a co-located `*.module.css`** (tokens only, logical properties, no hex). Adding a new `mt-*` rule to `globals.css` is still forbidden — introduce a module and migrate the touched section into it. This is the sanctioned way to *visibly* restyle within the "never expand global CSS" rule.
3. **Keep the data/logic intact** — reuse existing `lib/` helpers, props, and server data. Redesign is visual + structural, not a rewrite of the data layer.
4. **After build, run `npm run verify` then SHOW the diff/visual** so the user can say "fix" or "good". A redesign that only compiles but looks identical is not done.

### 3.6 Directive: Craft Bar — بیلیون‌دلاری سقف است، نه کف (همیشه اجباری)
این ریپو محصول فین‌تک در کلاس **Stripe / Wise / Linear / Vercel** است. «کار می‌کند + توکن رعایت شد + tsc سبز» یعنی **کف**؛ یعنی اجازه نمی‌دهد شکست کنی، نه اینکه موفق شده باشی. «معمولی / کسل‌کننده / بی‌هویت» یک **شکست** است. هر خروجی بصری باید همهٔ موارد زیر را رد کند:

- **عمق (Depth):** سطوح لایه‌ای از طریق hairline border + elevation tiers (`--ds-shadow-*`)؛ تخت و بی‌بافت نباشد. شیشه فقط در Header/Modal/Floating/Toolbar.
- **کُرئوگرافی حرکت (Motion):** spring micro-interactions + stagger (گام ۴۰ms) + enter/exit + scroll-reveal؛ خروجی نباید ایستا باشد. فقط opacity/transform/filter.
- **سلسله‌مراتب تایپوگرافی ادیتوریال:** مقیاس/وزن/leading مشخص، یک نقطهٔ کانونی (focal point)؛ عدم تختی بصری.
- **میکرو‑اینترکشن:** spring tap (scale روی press)، hover = translateY(-1px) + brighten border (بدون جهش رنگ)، kinetic SVG به‌جای کپی.
- **بازداری (Restraint):** هیچ‌کدام از ۲۰۲۶‑slop نباشد — neon / loud color / heavy glow / excessive glass / Stripe monoculture / ۳ کارت گرد یکسان / cubic‑bezier‑only مکانیکی.
- **یک لحظهٔ «واو» (Signature moment):** حداقل یک جزء به‌یاد‑ماندنی — ambient self‑illuminating SVG stroke، System‑breath (۰٫۵Hz)، view‑transition، یا کُرئوگرافی ورود بخش‌ها.
- **جزئیات پرمیوم:** touch target ≥ ۴۴px، focus ring دیدنی، tabular‑nums برای اعداد، سایز یکنواخت آیکون (۲۴ viewBox)، کنتراست ≥ ۴٫۵:۱ (اعداد ≥ ۷:۱) در هر دو تم.
- **هویت از منطق دامنه:** نه کپی سطح‌بصری رقیب. الهام از Linear/Stripe/Wise بگیر، ولی فرم از semantics مالی (نرخ/اسپرد/اعتماد) بیاید.

اگر نمی‌دانی خروجی‌ات بیلیون‌دلاری است یا نه، **مقایسه کن با landing صفحهٔ Wise یا Linear** — اگر یکی از آن‌ها این را منتشر نمی‌کرد، خروجی تو شکست است.

### 3.7 Directive: Comfortable Density — خروجی باید حس «زوم ۱۰۰٪» بدهد، نه ۱۲۵٪ (همیشه اجباری)
کاربر سایت را **از دور** و با **تنفس** می‌بیند. خروجی نباید حس کند که صفحه روی زوم ۱۲۵٪ (بزرگ، نزدیک، چسبیده) باز شده — باید حس «زوم ۱۰۰٪» (یکمی دورتر، کوچک‌تر، خوانا، با نمای کلی خوب) بدهد. رفرنس حرفه‌ای: **Supabase.com** (محتوای تنفس‌دار، سایز متن خوانا، ریتم عمودی راحت — نه بزرگ/چسبیده). هر سطح بصری باید موارد زیر را رد کند:

- **اندازه با فلوید تایپوگرافی (نه `zoom`):** حس «زوم ۱۰۰٪ / دورتر» را با `clamp()` روی توکن‌های `--fs-base` و `--ds-text-*` (و فاصله‌های `--ds-space-*`) بساز، **نه** با `zoom` روی `html`. `zoom` یک transform رستری است که متن/بوردر را تار می‌کند، fixed-elementها (هدر/مودال/فلوتینگ) را جابه‌جا می‌کند و با WCAG 1.4.4 تداخل دارد — طبق تحقیق ۲۰۲۶ هیچ‌کدام از سایت‌های حرفه‌ای (Supabase/Vercel/Stripe/Linear) از آن استفاده نمی‌کنند. متغیر `--page-zoom` اکنون `1` است و **غیرفعال**؛ دیگر به‌کار نرود و دوباره معرفی نشود. برای کوچک/بزرگ شدنِ کل صفحه از ریشهٔ فلوید (`--fs-base`) + عرض کانتینر معقول استفاده کن.
- **تنفس از لایهٔ بیرون، نه paddingِ چاق:** فاصلهٔ باز باید از ریتم بخش‌ها (فاصلهٔ عمودی `space-8`…`space-10` بین بخش‌ها) و `max-width` راحت بیاید — **نه** از inflate کردن padding درون کارت/دکمه. عناصر را compact نگه دار؛ حاشیه (breathing room) را در layout بساز، نه با پَدِ ضخیم که المان را بزرگ‌تر می‌کند.
- **فضای منفی ارزشمند است:** بین گروه‌ها فضای خالی بگذار؛ شلوغی/چسبندگی = شکست. هدف: کاربر «قشنگ کل صفحه را ببیند»، نه اینکه همه‌چیز بزرگ و در لبه‌ها چسبیده باشد.
- **max-width محتوای راحت:** ستون متن/فرم نباید تمام عرض را پر کند؛ با container مناسب اجازه بده حاشیه حفظ شود.
- این مورد بخشی از **Craft Bar (§3.6)** است: خروجی که بزرگ/نزدیک (حس ۱۲۵٪) است حتی با تکنیک‌های درست، **شکست** محسوب می‌شود.

### Workflow: Build a UI screen (repeatable)
0. **⛔ UIDQG Pre-scan (قبل از هر چیز — اجباری):** UQ1–UQ22 را سریع مرور کن. کدام سؤال‌ها برای این تسک ریسک دارند؟ پاسخ را در PRE-CODE GATE ردیف `🎨 UI Design Check` بنویس. این گام قبل از grep و قبل از کد است.
1. **Audit** existing components for the elements you need (grep `COMPONENTS.md` + repo).
2. **Map** elements → existing component → decision (reuse/extend/compose/create). Flag any new component/token/pattern. → **ردیف `🏗️ Component Map` در PRE-CODE GATE را پر کن.**
3. **Research** (internet-first rule) if the surface is non-trivial.
4. **Build** with tokens + canonical components; handle ALL states (loading / empty / error / disabled / success).
5. **Self-check** against `COMPONENTS.md` + `DESIGN.md` anti-patterns + Definition of Done. Run `npx tsc --noEmit` + `npm run lint`.
6. **Run UIDQG کامل (§UI Design Quality Gate)** — قبل از Show اجباری است. هر ❌ = همان لحظه fix کن.
7. **Show** the user; iterate on "fix" / "good".

---

## 🎨 UIDQG — UI Design Quality Gate (دروازهٔ بیست‌ودوسؤالهٔ طراحی — اجباری)

> **⛔ قانون VISIBLE OUTPUT:** این gate باید **قبل از هر Show/Done** به صورت visible در پیام نوشته شود. نوشتن «UIDQG را اجرا کردم» بدون خروجی = نقض مستقیم.
>
> **چه موقع اجرا می‌شود؟** هر تسک که UI/صفحه/کامپوننت بصری ایجاد یا ویرایش می‌کند — بدون استثنا.
>
> **فرمت پاسخ:** هر سؤال را با `✅ بله` / `❌ خیر` / `⚠️ جزئی` / `N/A` جواب بده + یک جمله توضیح. هر `❌` = همان لحظه fix کن.

```
🎨 UIDQG — UI DESIGN QUALITY GATE
════════════════════════════════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 بلاک A — هویت و استراتژی بصری (Vision)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[UQ1] آیا طراحی «بیلیون‌دلاری» است یا «معمولی/کسل‌کننده»؟
      → مقایسه کن با Wise/Linear/Stripe: اگر آن‌ها آن را منتشر نمی‌کردند = شکست.
      → «درست است ولی ordinary» = شکست.
      پاسخ: [ ]

[UQ2] آیا یک «لحظهٔ واو» (Signature Moment) وجود دارد؟
      → حداقل یک جزء به‌یادماندنی: ambient SVG stroke / System-breath / view-transition / stagger choreography.
      → هیچ‌چیز = شکست.
      پاسخ: [ ]

[UQ3] آیا هویت بصری از «منطق دامنه» (domain semantics) برمی‌خیزد؟
      → فرم از semantics مالی (نرخ/اعتماد/سرعت) می‌آید، نه کپی سطح‌بصری رقیب.
      → سایت مالی افغانستان/ایران باید ذاتاً خودش باشد، نه clone Stripe.
      پاسخ: [ ]

[UQ4] آیا با رفرنس‌های اینترنتی (2026) تحقیق شده؟
      → آیا حداقل یک UI reference معتبر (shadcn، Layered-UI، Supabase، Linear) مطالعه شده؟
      → تاریخ و منبع تحقیق باید visible باشد.
      پاسخ: [ ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ بلاک B — معماری و ساختار (Architecture)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[UQ5] آیا معماری درستی انتخاب شده؟
      → Server Component vs Client Component: آیا data-fetching روی server است؟
      → آیا Suspense / Streaming برای heavy sections بررسی شد؟
      → آیا layout/page structure با App Router best practice 2026 هماهنگ است؟
      پاسخ: [ ]

[UQ6] آیا می‌توان صفحه را جوری دیگر نوشت که کاربر راحت‌تر باشد؟
      → آیا task flow کاربر (user journey) بررسی شد؟ «کمترین click» برای هر عمل؟
      → آیا information architecture منطقی است (مهم‌ترین چیز اول، پنهان‌ترین آخر)?
      → آیا جایگزین بهتری (مثلاً inline edit به‌جای modal، یا split-view به‌جای tab) بررسی شد؟
      پاسخ: [ ]

[UQ7] آیا کارایی (Functionality) لازم دارد که پیاده نشده؟
      → تمام use-case های ممکن کاربر لیست شوند (CRUD + edge cases + error paths).
      → آیا هر حالتی که کاربر انتظار دارد handle شده؟ (loading / empty / error / success / disabled / partial)
      پاسخ: [ ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 بلاک C — پیچیدگی خوش و طراحی ممتاز (Craft)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[UQ8] آیا چیدمان و المان‌ها پیچیدهٔ خوش دارند (نه یکنواخت مثل سایت‌های معمولی)?
      → سلسله‌مراتب بصری واضح: بزرگ/کوچک/متن/عنوان/badge ترکیب شده‌اند.
      → گرید یا layout بدون تنوع = شکست.
      → حداقل ۲ سطح visual weight در هر section.
      پاسخ: [ ]

[UQ9] آیا عمق (Depth) وجود دارد؟
      → hairline border + elevation tiers (--ds-shadow-*) + لایه‌بندی.
      → صفحهٔ کاملاً تخت و بدون shadow/border hierarchy = شکست.
      پاسخ: [ ]

[UQ10] آیا کُرئوگرافی حرکت (Motion Choreography) دارد؟
       → spring micro-interactions + stagger (گام ۴۰ms) + enter/exit animation.
       → صفحهٔ کاملاً ایستا = شکست.
       → فقط opacity/transform/filter — نه width/height/top/left.
       پاسخ: [ ]

[UQ11] آیا میکرو‑اینترکشن‌ها پیاده شده‌اند؟
       → hover: translateY(-1px) + brighten border (بدون جهش رنگ).
       → press: spring tap (scale 0.97).
       → focus: visible focus ring (outline dashed یا glow hairline).
       → هیچ interactive element بدون feedback بصری نباشد.
       پاسخ: [ ]

[UQ12] آیا Restraint رعایت شده (بدون ۲۰۲۶‑slop)?
       → بدون: neon / loud color / heavy glow / excessive glass / ۳ کارت یکسان گرد / cubic-bezier-only مکانیکی.
       → هر المان دلیل وجودی دارد — decoration بی‌معنی حذف شده.
       پاسخ: [ ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 بلاک D — سیستم طراحی و توکن‌ها (Design System)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[UQ13] آیا رنگ‌های غالب سایت استفاده شده‌اند؟
       → فقط --ds-* (site) / --at-* (dashboard) / --nova-* (dashboard) توکن‌ها.
       → هیچ hex hardcode نشده.
       → رنگ accent، warning، danger، success از توکن می‌آیند نه از دل کد.
       پاسخ: [ ]

[UQ14] آیا از کامپوننت‌های موجود استفاده شده (نه duplicate)?
       → Component Decision Protocol: reuse → extend → compose → create.
       → COMPONENTS.md چک شد؟ هیچ Modal/Button/Card/Table/EmptyState جدید بی‌دلیل نساخته‌ام.
       → component map: `| element | existing impl | decision |` پر شده؟
       پاسخ: [ ]

[UQ15] آیا تایپوگرافی سلسله‌مراتب ادیتوریال دارد؟
       → مقیاس/وزن/leading مشخص — یک نقطهٔ کانونی (focal point) در هر section.
       → tabular-nums برای اعداد مالی.
       → هیچ دو heading هم‌سایز پشت هم نباشند.
       پاسخ: [ ]

[UQ16] آیا Comfortable Density رعایت شده (حس زوم ۱۰۰٪ — نه ۱۲۵٪)?
       → فضای منفی ارزشمند: از ریتم بخش‌ها (space-8…space-10) بین section‌ها.
       → عناصر compact، حاشیه در layout — نه padding چاق.
       → max-width راحت: محتوا تمام عرض را پر نمی‌کند.
       پاسخ: [ ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 بلاک E — وابستگی‌ها و یکپارچگی (Dependencies)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[UQ17] آیا Server Component / Server Action نوشته شده؟
       → data fetching روی server (نه client fetch/useEffect برای initial load).
       → Server Actions برای mutations.
       → هیچ secret در client bundle نیست.
       پاسخ: [ ]

[UQ18] آیا زیر‌کامپوننت‌ها (sub-components) آپدیت/بازطراحی شده‌اند؟
       → اگر parent redesign شد، تمام children که در صفحه نمایش داده می‌شوند بررسی شده‌اند.
       → اگر یک child هنوز طرح قدیمی دارد و visible است = شکست.
       → لیست children که بررسی شده‌اند باید visible باشد.
       پاسخ: [ ]

[UQ19] آیا صفحات/کامپوننت‌های مرتبط (related pages) آپدیت شده‌اند؟
       → navigation/sidebar/breadcrumb که به این صفحه لینک می‌دهند.
       → صفحات parent/child که data مشترک دارند.
       → هر جایی که این feature نمایش داده می‌شود (widget، dashboard tile، list view).
       پاسخ: [ ]

[UQ20] آیا وابستگی‌ها (dependencies) آپدیت شده‌اند؟
       → type/interface تغییر کرد → همه consumer‌ها grep شده‌اند.
       → action تغییر کرد → همه caller‌های client+server چک شده‌اند.
       → cache tag تغییر کرد → revalidation همه‌جا هماهنگ است.
       پاسخ: [ ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 بلاک F — ارزیابی نهایی (Final Verdict)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[UQ21] آیا ایرادهای طراحی که با این چک‌لیست نمی‌خوانند در این صفحه/صفحات مرتبط وجود دارد؟
       → مرور کامل صفحهٔ موجود (نه فقط بخش جدید) با همین سؤالات.
       → هر ایراد که الان fix نمی‌شود باید در post-task ثبت شود.
       → لیست ایرادها (اگر وجود دارد): [ ]
       پاسخ: [ ]

[UQ22] آیا این صفحه بازطراحی می‌خواهد یا باید از نو نوشته شود؟
       → اگر بیشتر از ۴۰٪ کد باید تغییر کند = از نو بنویس.
       → اگر طراحی موجود با §3.6/§3.7 تضاد اساسی دارد = بازطراحی اجباری.
       → اگر component structure غلط است (همه در یک فایل بزرگ) = refactor + redesign.
       → verdict: [reuse / redesign / rewrite] + دلیل.
       پاسخ: [ ]

════════════════════════════════════════════════════════════════════════════════
قانون: هر [UQ] که ❌ دارد → همان لحظه fix کن → از UQ1 دوباره شروع کن
فقط وقتی همه ✅ یا N/A (با دلیل) شدند → اعلام Show/Done مجاز است

⛔ VISIBLE OUTPUT REQUIRED: پاسخ هر UQ را در پیام بنویس
نوشتن «UIDQG انجام شد» بدون خروجی = نقض قانون VISIBLE RESULT
════════════════════════════════════════════════════════════════════════════════
```

**نحوهٔ گزارش UIDQG (فرمت اجباری):**
```
🎨 UIDQG Result:
[UQ1]  ✅ — Stripe-level depth + stagger animation
[UQ2]  ✅ — System-breath SVG در hero section
[UQ3]  ✅ — فرم از نرخ‌های مالی می‌آید
[UQ4]  ✅ — تاریخ 15/4/1404، رفرنس: Linear dashboard + shadcn DataTable
[UQ5]  ✅ — Server Component با Suspense، client فقط برای interactive parts
[UQ6]  ⚠️ — inline edit بهتر بود ولی scope بزرگ‌تر از تسک — ثبت در post-task
[UQ7]  ✅ — همه 6 state: loading/empty/error/success/disabled/partial
[UQ8]  ✅ — 3 سطح visual weight، grid 12col با span متغیر
[UQ9]  ✅ — elevation tiers از --ds-shadow-sm تا --ds-shadow-lg
[UQ10] ✅ — spring stagger 40ms، enter/exit با framer-motion
[UQ11] ✅ — hover/press/focus روی همه interactive elements
[UQ12] ✅ — بدون neon/glow — فقط hairline + elevation
[UQ13] ✅ — فقط --at-* و --ds-* tokens، بدون hex
[UQ14] ✅ — DataTable از primitives، Dialog از shadcn، EmptyState از موجود
[UQ15] ✅ — h1 32px/700، h2 18px/600، body 14px/400، tabular-nums روی اعداد
[UQ16] ✅ — space-8 بین sections، max-width 1200px، عناصر compact
[UQ17] ✅ — Server Component برای list، Server Actions برای mutations
[UQ18] ✅ — DetailDrawer + StatusBadge + CountBadge همه آپدیت شدند
[UQ19] ✅ — sidebar link موجود، widget tile آپدیت شد
[UQ20] ✅ — ServiceRequest type grep شد، 5 consumer چک شدند
[UQ21] ⚠️ — CommandBar هنوز skeleton قدیمی دارد — ثبت در post-task
[UQ22] ✅ — redesign (نه rewrite): ساختار کلی خوب، فقط visual layer آپدیت شد
```

### Definition of Done (before you say a task is complete)

> **⚡ این لیست با `§15DQG` هماهنگ است.** برای هر آیتم زیر، بُعد مرتبط از 15DQG در پرانتز ذکر شده. اگر 15DQG اجرا شده، این لیست به‌خودی‌خود پوشش داده می‌شود.

- [ ] **Craft Bar (§3.6) passed** (→ D13) — billion-dollar caliber: depth, motion, hierarchy, micro-interaction, restraint, wow. "Ordinary" = NOT done.
- [ ] **Comfortable Density (§3.7) passed** (→ D13) — 100% zoom feel (breathing room), NOT 125% cramped.
- [ ] Component reuse checked — no duplicate created (→ D8).
- [ ] Token usage: no hardcoded hex, no new px spacing, no `--color-*` (→ D5).
- [ ] All required states handled: loading / empty / error / disabled / success (→ D4, D13).
- [ ] Keyboard + visible focus + 44px touch targets (→ D11).
- [ ] RTL logical properties; no `left/right` (→ D5).
- [ ] Mobile (375) + desktop (1024/1440) verified (→ D12).
- [ ] No `any` / `@ts-ignore` / `console.log` / stub / TODO (→ D5, D6).
- [ ] `npx tsc --noEmit` passes; `npm run lint` passes (→ D5).
- [ ] Reference files (DESIGN.md / COMPONENTS.md) compared; deviations listed (→ D8).
- [ ] Temporary/duplicated styles removed (→ D6, D15).
- [ ] **19DQG fully run** — all 19 dimensions [D1–D19] checked or marked N/A with reason.

### 🔁 Task Completion Loop — ادامه تا تمام شدن (اجباری — learned 2026-07)

**قبل از هر اعلام «تمام»، این checklist را یک‌به‌یک اجرا کن و نتیجه را در پیام بنویس. اگر هر آیتم قرمز بود، همان لحظه fix کن و دوباره چک کن — متوقف نشو.**

> **⛔ قانون VISIBLE OUTPUT — learned 2026-07:** این چک‌لیست باید **در پیام پایانی** به کاربر نشان داده شود — نه «در ذهن اجرا شود». بدون visible checklist = تسک complete نیست. Agent نباید بنویسد «checklist را اجرا کردم» — باید بنویسد `[x] 1. تمام فایل‌ها نوشته شدند` به صورت visible.

```
TASK COMPLETION CHECKLIST (run before every "done" declaration — MUST be visible in message)
════════════════════════════════════════════════════════════════════════════════════════

─── ۱. کد واقعی و کامل ──────────────────────────────────────────────────────────────
[ ] 1.  تمام فایل‌های وعده‌داده‌شده نوشته شدند — هیچ‌کدام skip نشد
[ ] 2.  هر تغییری که در چت گفتم اما ننوشتم → الان بنویس
[ ] 3.  کد ناقص نیست: هیچ TODO / placeholder / console.log / stub / debugger وجود ندارد
[ ] 4.  هیچ تابع/API ساختگی (hallucinated) نوشته نشده — هر API ناآشنا در داک تأیید شد (anti-failure #17)
[ ] 5.  هر فایل تغییریافته قبل از ویرایش re-read شد — ویرایش روی نسخه stale نیست (anti-failure #2)
[ ] 6.  comment ها با کد واقعی مطابقت دارند — comment دروغ = بدترین bug (anti-failure #23)
[ ] 7.  فایل‌های بزرگ‌تر از ~400 خط split شدند — یک concern per file (Directive §2)

─── ۲. وابستگی‌ها و cascade ─────────────────────────────────────────────────────────
[ ] 8.  همه callers/importers فایل‌های تغییریافته grep شدند و هماهنگند (D2)
[ ] 9.  اگر type/interface تغییر کرد → همه consumer ها (UI+API+Action) آپدیت شدند
[ ] 10. Env var جدید → AGENTS.env.md + .env.example آپدیت شد
[ ] 11. Domain/image جدید → next.config.ts CSP + remotePatterns آپدیت شد
[ ] 12. Cron/job جدید → vercel.json + scheduler config آپدیت شد

─── ۳. امنیت ───────────────────────────────────────────────────────────────────────
[ ] 13. auth check (requireUser/requireRole) در هر Server Action/API route جدید (D3)
[ ] 14. هر input با Zod validate شده — هیچ raw req.body به DB نمی‌رسد
[ ] 15. هیچ secret/token در client bundle یا NEXT_PUBLIC_* نیست
[ ] 16. هیچ stack trace / raw DB error به کاربر برنمی‌گردد
[ ] 17. rate-limit برای هر endpoint mutating/auth بررسی شد
[ ] 18. عملیات مالی → idempotency-key + audit log ثبت شد (fintech requirement)

─── ۴. هماهنگی Front ↔ Back ────────────────────────────────────────────────────────
[ ] 19. فرانت از API shape { success, data } / { success:false, error:{code,message} } استفاده می‌کند
[ ] 20. Prisma schema تغییر کرد → همه query + handler + UI آپدیت شدند
[ ] 21. Cache tags بعد از هر write revalidate شدند (از @/lib/revalidate — نه next/cache مستقیم)
[ ] 22. همه UI states پیاده شده: loading / error / empty / success / disabled

─── ۵. قوانین پروژه ────────────────────────────────────────────────────────────────
[ ] 23. npx tsc --noEmit → سبز روی فایل‌های ما (D5)
[ ] 24. npm run lint (biome check --write) → سبز روی فایل‌های تغییریافته
[ ] 25. RTL: فقط logical props (ps-/pe-/ms-/me-) — هرگز left/right
[ ] 26. Tokens: فقط --ds-* و --at-* — هیچ #hex hardcode نشده
[ ] 27. CSS: هیچ قانون جدید به globals.css / dashboard.css اضافه نشده
[ ] 28. Prisma import فقط از @/lib/db — هرگز new PrismaClient()

─── ۶. کیفیت منطق (logic correctness) ─────────────────────────────────────────────
[ ] 29. هر محاسبه مالی یک مثال عددی در comment دارد (anti-failure #18 — silent logic error)
[ ] 30. هر regex روی حداقل ۳ نمونه واقعی از داده تست شده (anti-failure #22)
[ ] 31. هر ادعای فاکتوال درباره رفتار third-party با websearch/فایل واقعی تأیید شده (anti-failure #21)

─── ۷. راهکار بهتر / داک رسمی 2026 ───────────────────────────────────────────────
[ ] 32. داک‌های رسمی 2026 بررسی شد (Next.js/Prisma/MDN) — URL/منبع ذکر شد (D7/D18)
[ ] 33. هیچ deprecated API (unstable_ / getServerSideProps / pages/api) بدون جایگزین
[ ] 34. اگر راهکار بهتری وجود داشت → **قبل از کد** به کاربر گفته شد — نه بعد (anti-failure #31)
[ ] 35. اگر AGENTS.md نیاز به patch داشت → همین سشن نوشته شد

─── ۸. یکپارچگی و سلامت پروژه ──────────────────────────────────────────────────────
[ ] 36. هر خطای lint/tsc (حتی pre-existing) → همان لحظه fix شد یا گزارش شد (D16)
[ ] 37. هر خطای خارج‌از‌scope → صریح به کاربر اعلام شد + در post-task ثبت شد
[ ] 38. بخش‌های دیگر پروژه (nav/sidebar/sitemap/COMPONENTS.md) بررسی شدند (D19)
[ ] 39. git status: فقط فایل‌های مرتبط تغییر کرده — هرگز git add -A (D15)
[ ] 40. هیچ unused import / dead code / temp file باقی نمانده (D15)

─── ۹. گزارش نهایی ────────────────────────────────────────────────────────────────
[ ] 41. Post-task Report (§Post-task Report) نوشته شد
[ ] 42. Nineteen-Dimension Quality Gate (§19DQG) به صورت VISIBLE اجرا شد
[ ] 43. پاسخ ۸ سؤال کاربر (§قانون ۸ سؤال) در پیام نوشته شد

════════════════════════════════════════════════════════════════════════════════════════
اگر هر آیتم [ ] باقی ماند → کد را fix کن → checklist را دوباره اجرا کن
فقط وقتی همه [x] یا [N/A — دلیل] شدند → اعلام «تمام» مجاز است
```

**قانون توقف‌ناپذیری — learned 2026-07 (اجباری، بلا استثنا):**
هر خطایی که در هر فایل پروژه دیدی — چه مربوط به تغییرات باشد چه نباشد — **همان لحظه fix کن و ادامه بده.** هرگز «این خطا مربوط به ما نیست» یا «pre-existing است» را بهانه برای رد شدن قرار نده. تنها استثنا: اگر fix آن خطا از scope تسک کاملاً خارج و مستلزم یک PR مجزا است → صریح به کاربر اعلام کن **و** یک آیتم در گزارش post-task ثبت کن.

**قانون loop:** هر بار که یک fix جدید انجام دادی، checklist را از ابتدا re-run کن تا مطمئن شوی fix جدید چیزی نشکسته.

---

## 🛡️ Nineteen-Dimension Quality Gate (19DQG) — دروازهٔ نوزده‌بُعدی (اجباری — learned 2026-07)

> **قانون متوقف‌نشو:** هر بُعدی که [ ] باقی ماند = همان لحظه fix کن → از بُعد D1 دوباره شروع کن. «بعداً» یا «N/A بدون دلیل» وجود ندارد.
> اگر یک بُعد واقعاً خارج از scope تسک است → **صریح بنویس «N/A — [دلیل دقیق]»**.
>
> **⛔ قانون VISIBLE RESULT — learned 2026-07 (ریشه مشکل واقعی):**
> نوشتن `19DQG را اجرا کردم` در چت **ممنوع** است. باید نتیجهٔ هر بُعد را به صورت یک خط در پیام بنویسی:
> ```
> [D1] ✅ — کد نوشته شد (4 فایل)
> [D2] ✅ — callers grep شدند، سازگار است
> [D3] ✅ — auth + ownership check + rate-limit
> [D4] ✅ — front/back sync: include attachments در query
> [D5] ✅ — tsc+biome سبز، logical props، no hex
> [D6] ✅ — بدون console.log/TODO/stub
> [D7] ✅ — Prisma cascade + Next.js App Router best practice 2026
> [D8] ✅ — schema + actions + UI همگی آپدیت شدند
> [D9] ✅ — Server Actions، Prisma cascade، no implicit any
> [D10] ✅ — N+1 ندارد، explicit select، rate-limited
> [D11] ✅ — aria-label، focus-visible، touch target ≥44px
> [D12] ✅ — RTL logical props، tokens بدون hex
> [D13] N/A — تسک backend/data بود، UI صرفاً extend شد
> [D14] ✅ — migration با db push، cascade delete، onDelete تنظیم
> [D15] ✅ — بدون temp file، بدون unused import
> [D16] ✅ — خطاهای pre-existing گزارش داده شدند
> [D17] ✅ — upload infrastructure موجود reuse شد
> [D18] ✅ — تاریخ: 29/4/1404، Prisma cascade داک رسمی §Relations
> [D19] ✅ — page.tsx آپدیت شد، getMyServiceRequests آپدیت شد
> ```
> اگر این خروجی را ننوشتی، تسک را تمام نکرده‌ای — حتی اگر کد درست باشد.

```
🛡️ NINETEEN-DIMENSION QUALITY GATE — 19DQG
════════════════════════════════════════════════════════════════════════════

【D1】 کد واقعی نوشته شد؟ (نه فقط تحلیل — Anti-pattern §Analysis≠Done)
      [ ] کد واقعی نوشته یا ویرایش شد (نه فقط توضیح در چت)
      [ ] تمام فایل‌های وعده‌داده‌شده موجودند (نه partial/stub)
      [ ] هیچ بخشی در همین چت قول داده شد ولی skip شد
      ─────────────────────────────────────────
      ❌ اگر [ ] → همین لحظه بنویس — «بعداً» وجود ندارد

【D2】 وابستگی‌ها و cascade کامل شدند؟
      [ ] همه callers/importers فایل‌های تغییریافته grep و بررسی شدند
      [ ] Interface/type تغییر کرد → همه call sites سازگارند
      [ ] Symbol جدید → registry + seed + هر mapping موجود آپدیت شد
      [ ] Cron/job جدید → vercel.json / scheduler config آپدیت شد
      [ ] Env var جدید → AGENTS.env.md + .env.example آپدیت شد
      [ ] Domain/image جدید → next.config.ts CSP + remotePatterns آپدیت شد
      ─────────────────────────────────────────
      Ref: §Directive1"Dependency audit" + anti-failure #20, #26

【D3】 امنیت رعایت شده؟
      [ ] هیچ secret/token در client bundle یا NEXT_PUBLIC_* نیست
      [ ] هر API route جدید محافظت‌شده (requireUser/requireRole/requireAdmin)
      [ ] هر input کاربر با Zod validate شده (هرگز raw req.body به DB)
      [ ] Error shape استاندارد { success:false, error:{ code, message } }
      [ ] هیچ stack trace / raw DB error به کاربر نمی‌رسد
      [ ] Rate-limit برای mutating/auth endpoints بررسی شد
      [ ] عملیات مالی → idempotency-key + ledger-based (نه فقط DB write)
      [ ] داده حساس (شناسه ملی، کارت) → رمزنگاری at-rest (AES-256)
      ─────────────────────────────────────────
      Ref: pdk/security.md + pdk/constitution.md §C7 + anti-failure #9, #27

【D4】 هماهنگی بک‌اند ↔ فرانت‌اند برقرار است؟
      [ ] فرانت‌اند از API shape { success, data/error } استفاده می‌کند
      [ ] Prisma schema تغییر کرد → همه query + handler آپدیت شدند
      [ ] Cache tags بعد از هر write revalidate می‌شوند (از @/lib/revalidate)
      [ ] همه UI states پیاده شده: loading / error / empty / success / disabled
      [ ] هیچ hardcoded URL یا magic number بین front/back نیست
      [ ] Server Actions ← error handling با try/catch + شکل استاندارد
      ─────────────────────────────────────────
      Ref: §Critical conventions + anti-failure #8, #28

【D5】 قوانین پروژه رعایت شده؟
      [ ] RTL: فقط logical props (ps-/pe-/ms-/me-/inset-inline-)، هرگز left/right
      [ ] TypeScript strict: no any، no @ts-ignore، no TODO/FIXME/placeholder
      [ ] CSS: هیچ قانون جدید به globals.css / dashboard.css اضافه نشده
      [ ] Tokens: فقط --ds-* و --nova-*؛ هیچ hex hardcode نشده
      [ ] Prisma import فقط از @/lib/db؛ هرگز new PrismaClient()
      [ ] revalidateTag فقط از @/lib/revalidate؛ هرگز next/cache مستقیم
      [ ] npx tsc --noEmit → سبز
      [ ] npm run lint → سبز روی فایل‌های تغییریافته
      ─────────────────────────────────────────
      Ref: §Critical conventions + §Directives + anti-failure #29

【D6】 کد کامل است (نه stub/ناقص)?
      [ ] هیچ console.log / debugger / alert در کد نیست
      [ ] هیچ handler با return null یا throw new Error("TODO") نیست
      [ ] هیچ شاخهٔ نیمه‌کاره وجود ندارد
      [ ] Unused imports حذف شدند (grep برای import‌های بلا استفاده)
      [ ] Dead code / commented-out blocks حذف شدند
      [ ] temp/debug فایل‌ها حذف شدند
      ─────────────────────────────────────────
      Ref: anti-failure #25, #30 + §Directive2"No stubs" + pdk/coding-standards.md §5.6

【D7】 راهکار بهتری وجود داشت؟ (internet-first mandatory)
      [ ] 🔍 Research block قبل از کد در همین پیام نوشته شد
      [ ] داک رسمی 2026 بررسی شد (Next.js/Prisma/MDN/TypeScript)
      [ ] اگر راهکار بهتری هست → در همان پیام به کاربر گفته شد
      [ ] node_modules برای کتابخانهٔ موجود بررسی شد (قبل از نوشتن helper)
      [ ] اگر AGENTS.md با best practice 2026 تضاد داشت → به کاربر گفته + AGENTS patch شد
      ─────────────────────────────────────────
      Ref: §Pre-code Research Gate + §Internet-first + anti-failure #31, #34

【D8】 پروژه یکپارچه است و conflict ندارد؟
      [ ] تغییر جدید با بخش‌های دیگر پروژه conflict ایجاد نمی‌کند
      [ ] Data pipeline تغییر کرد → assembler.ts/registry.ts/seed هماهنگند
      [ ] Cron تغییر کرد → vercel.json + cron-auth.ts + comments هماهنگند
      [ ] منابع موازی داده بررسی شدند (refresh-market-rates vs sync-bazaar)
      [ ] Component جدید → COMPONENTS.md بررسی شد، تکراری نیست
      ─────────────────────────────────────────
      Ref: §Data Pipeline + anti-failure #4, #32

【D9】 Best practice 2026 رعایت شده؟
      [ ] Next.js 16+ patterns: use cache، Server Actions، App Router
      [ ] هیچ deprecated API (unstable_ prefix بررسی شد)
      [ ] TypeScript strict (no implicit any، no cast بی‌دلیل)
      [ ] React: hooks rules، no memory leaks، proper cleanup in useEffect
      [ ] Prisma: select fields explicit (no select *)، transaction برای multi-write
      [ ] API: idempotent، Retry-After در 429، HTTP status codes درست
      ─────────────────────────────────────────
      Ref: §Pre-code Research Gate + pdk/references.md + anti-failure #33

【D10】 Performance رعایت شده؟
      [ ] هیچ N+1 query (Prisma include/select هدفمند)
      [ ] داده‌های پرتکرار با unstable_cache + tag درست cache شده‌اند
      [ ] تصاویر با next/image (نه <img>)؛ فونت با next/font
      [ ] Component سنگین با dynamic import + ssr:false lazy-load شده
      [ ] هیچ unbounded DB read (pagination اضافه شد)
      [ ] هیچ blocking load در critical path (Suspense/streaming بررسی شد)
      ─────────────────────────────────────────
      Ref: anti-failure #7 + pdk/database.md §6.4

【D11】 Accessibility / a11y رعایت شده؟
      [ ] Semantic HTML + Radix primitives (نه div soup)
      [ ] هر interactive element label یا aria-label دارد
      [ ] Keyboard navigation کامل (Tab/Enter/Esc/Arrow)
      [ ] Focus ring دیدنی (outline نپوشانده)
      [ ] Touch target ≥ 44px × 44px
      [ ] کنتراست ≥ 4.5:1 برای متن؛ ≥ 7:1 برای اعداد مالی
      [ ] هیچ info صرفاً با رنگ منتقل نمی‌شود (+ آیکون یا متن)
      [ ] prefers-reduced-motion global clamp در tokens.css کافی است (per-component نساز)
      ─────────────────────────────────────────
      Ref: WCAG 2.2 AA + anti-failure #11 + pdk/anti-failure.md §a11y

【D12】 Responsive / Dark mode تست شده؟ (فقط تسک‌های UI)
      [ ] موبایل 375px: هیچ overflow، هیچ text کوچک‌تر از 12px
      [ ] دسکتاپ 1024px + 1440px: layout طبق طرح
      [ ] dark mode: همه رنگ‌ها از token (--ds-*) — هیچ hardcode که در dark شکسته
      [ ] RTL: هیچ المان جابه‌جا شده یا اشتباه flip نشده
      ─────────────────────────────────────────
      Ref: §Definition of Done + pdk/anti-failure.md §طراحی

【D13】 UI Design Quality Gate (فقط تسک‌های UI/بصری)
      ⚡ این بُعد با §UIDQG هماهنگ است — اجرای UIDQG این بُعد را کاملاً پوشش می‌دهد.
      [ ] UIDQG کامل اجرا شد (همه UQ1–UQ22 پاسخ گرفتند)
      [ ] Craft Bar §3.6 رد شد: عمق / motion / typography / micro-interaction / restraint / wow / detail
      [ ] Comfortable Density §3.7: حس زوم 100٪ (نه 125٪ چسبیده)
      [ ] AI-Slop Rubric (pdk/design-cycle.md §9.3): 0 مردود، ≤2 بازبینی
      [ ] Component reuse چک شد (Component Decision Protocol §Directive2)
      [ ] همه states پیاده شده: loading/empty/error/disabled/success
      [ ] رفرنس‌های اینترنتی 2026 بررسی شدند (UQ4)
      [ ] وابستگی‌های UI آپدیت شدند: sub-components + related pages (UQ18/UQ19/UQ20)
      [ ] صفحه verdict: reuse / redesign / rewrite (UQ22)
      ─────────────────────────────────────────
      Ref: §UIDQG (UQ1–UQ22) + §3.6 Craft Bar + §3.7 Density + pdk/design-cycle.md + anti-failure #35

【D14】 Database Safety (فقط تسک‌های DB/migration)
      [ ] Migration reversible است (rollback plan موجود)
      [ ] هرگز ستون populated را DROP نکن بدون backup
      [ ] Index روی FK + filtered columns اضافه شد
      [ ] Soft-delete (deletedAt) برای موجودیت‌های مالی
      [ ] پول با Decimal type (هرگز float)
      [ ] Timezone یکپارچه: UTC در DB، نمایش با timezone کاربر
      [ ] Migration اجرا شد و بدون خطا تمام شد
      ─────────────────────────────────────────
      Ref: pdk/database.md §6.5 + anti-failure #10

【D15】 Cleanup & Observability
      [ ] هیچ unused import / dead variable (biome بررسی کرد)
      [ ] هیچ temp file / debug artifact باقی نمانده
      [ ] git status: فقط فایل‌های مرتبط تغییر کرده (نه git add -A)
      [ ] عملیات حساس (login، transfer، admin action) در audit log ثبت می‌شود
      [ ] خطاهای server بدون ردپا نمانده (logger یا Sentry — نه فقط console.log)
      [ ] هیچ کد dead/commented-out بدون توضیح باقی نمانده
      ─────────────────────────────────────────
      Ref: anti-failure #13 + pdk/constitution.md §C10 + pdk/security.md §4.4

【D16】 هر خطا — چه مرتبط چه غیرمرتبط — fix شد؟
      [ ] هر خطای tsc/lint که دیده شد (حتی pre-existing) → همان لحظه fix شد
      [ ] اگر fix خارج از scope بود → صریح به کاربر گزارش داد + در post-task ثبت شد
      [ ] هیچ خطایی با «مربوط به ما نیست» رد نشد بدون گزارش
      [ ] بعد از هر fix جدید، checklist از D1 دوباره اجرا شد
      ─────────────────────────────────────────
      Ref: §قانون توقف‌ناپذیری (بالا) + anti-failure #42

【D17】 از کدهای موجود (Reuse-first) استفاده شد؟
      [ ] قبل از نوشتن هر component/util/hook، repo با grep بررسی شد
      [ ] Component Decision Protocol اجرا شد: reuse → extend → compose → create
      [ ] هیچ implementation موازی ساخته نشد (duplicate Modal/Button/EmptyState/...)
      [ ] اگر کد موجود reuse شد → در component map مستند شد
      [ ] lib/ و hooks/ برای helper جدید grep شدند (قبل از نوشتن)
      ─────────────────────────────────────────
      Ref: §Directive2 "Component Decision Protocol" + anti-failure #3 + pdk/constitution.md §C12

【D18】 از اینترنت با تاریخ امروز استفاده شد؟ + آیا AGENTS.md نیاز به آپدیت دارد؟
      [ ] websearch با تاریخ امروز (نه فقط «2026» کلی) انجام شد
            فرمت query: "[موضوع] site:nextjs.org OR site:prisma.io 2026" یا "[pattern] best practice July 2026"
      [ ] نتیجه تحقیق در 🔍 Research block با منبع + تاریخ ذکر شد
      [ ] اگر یک الگوی deprecated/بهتر پیدا شد → به کاربر گفته شد (نه ساکت ادامه)
      [ ] آیا AGENTS.md / AGENTS.anti-failure.md نیاز به آپدیت دارد؟
            - اگر اشتباه تکراری جدید رخ داد → Rule Failure Loop فعال + AGENTS patch شد
            - اگر best practice جدیدی کشف شد → §Pre-code Research Gate آپدیت شد
            - اگر راهکار بهتری برای قانون موجود وجود داشت → قانون مرتبط آپدیت شد
      [ ] AGENTS.md patch در همین سشن نوشته شد (نه «در آینده»)
      ─────────────────────────────────────────
      Ref: §Pre-code Research Gate + §Rule Failure Loop + anti-failure #43, #45

【D19】 آیا بخش‌های دیگر پروژه نیاز به آپدیت دارند؟
      [ ] همه فایل‌هایی که از فایل تغییریافته import می‌کنند grep شدند و بررسی شدند
      [ ] صفحات/کامپوننت‌هایی که به feature/data مرتبطند بررسی شدند
      [ ] اگر type یا interface تغییر کرد → همه consumer ها (UI + API + Server Action) آپدیت شدند
      [ ] اگر feature جدید است → navigation/sidebar/menu/sitemap آپدیت شد
      [ ] اگر env/config/vercel.json تغییر کرد → AGENTS.env.md + مستندات مرتبط آپدیت شد
      [ ] اگر داده یا رفتار public API تغییر کرد → همه caller های خارجی اطلاع یافتند
      [ ] هیچ بخشی از پروژه با تغییر جدید stale/ناهماهنگ نمانده
      ─────────────────────────────────────────
      Ref: anti-failure #4, #20, #46 + §Directive1"Dependency audit" + §Parallel data sources rule

════════════════════════════════════════════════════════════════════════════
قانون متوقف‌نشو: اگر هر [ ] باقی ماند → fix کن → از D1 دوباره شروع کن
فقط وقتی همه 19 بُعد [✓] یا [N/A — دلیل] شدند → اعلام «تمام» مجاز است

⛔ VISIBLE OUTPUT REQUIRED: نتیجه هر D را در پیام بنویس (فرمت نمونه بالا را ببین)
نوشتن «19DQG انجام شد» بدون خروجی = نقض قانون VISIBLE RESULT
════════════════════════════════════════════════════════════════════════════
```

### قانون «بهتر وجود داشت؟ → دستورالعمل آپدیت شو» — learned 2026-07
اگر در بُعد D7 یا D18 مشخص شد که راهکار بهتری وجود داشت **و** به کاربر گفته نشد، این شکست در دو سطح است:
1. **Immediate:** همان لحظه به کاربر اطلاع بده + راهکار بهتر پیشنهاد بده
2. **Systemic:** `§Pre-code Research Gate` را با مثال واقعی آن موضوع آپدیت کن — Rule Failure Loop را فعال کن

> «ساکت ادامه دادن» = نقض مستقیم Directive 0 (Internet-first) + Rule Failure Loop.

### قانون «هر خطا باید fix شود» — learned 2026-07
هیچ خطایی در پروژه «نادیده گرفتنی» نیست. تنها مقیاس تصمیم:
- **در scope:** fix کن همان لحظه
- **خارج از scope ولی کوچک:** fix کن همان لحظه (یک‌خطی نباید مانع شود)
- **خارج از scope و بزرگ:** صریح گزارش بده + در post-task «⚠️ ناقص» ثبت کن

قانون قدیمی «pre-existing errors → فقط گزارش» **لغو شده** — گزارش بدون fix = تکرار همان خطا در آینده.

## Data Pipeline conventions (market-rates specific — always-on)

این قوانین برای پایپ‌لاین `src/lib/market-rates/*` اجباری است:

- **Single source of truth:** `assembleMarketRates()` در `assembler.ts` تنها جایی است که نرخ محاسبه می‌شود. هیچ cron دیگری نباید مستقیم TGJU scrape کند و به DB بنویسد بدون عبور از assembler.
- **Priority chain (2026-07):** `manual` → `TGJU multi-page` → `sarafi.af (buy/sell AFN)` → `bonbast buy/sell (/json)` → `bonbast mid (derived)` → `USDT/Exir` → `FX API`. هر منبع جدید باید در این زنجیره با priority صریح جای بگیرد.
- **bonbast.com — روش جدید (2026-07):** داده‌ها از طریق `POST /json` با one-time param دریافت می‌شوند. روش قدیمی `POST /converter` (mid-rate) و `GET /` (HTML parse با buy2/sell2 class) دیگر کار نمی‌کند — جداول HTML خالی هستند و از Firebase Realtime پر می‌شوند. روش جدید: ۱) GET صفحه اصلی → extract param token از JS snippet، ۲) POST /json با param → JSON با کلیدهای `usd1`/`usd2` (sell/buy). `fetchBonbastBuySell()` این دو مرحله را انجام می‌دهد. `fetchBonbastRates()` از همان نتیجه mid-rate derive می‌کند (بدون fetch جداگانه). در assembler، فقط یک بار `fetchBonbastBuySell()` صدا زده می‌شود و `BonbastRates` از `fetchBonbastRatesFromBuySell()` ساخته می‌شود.
- **Symbol naming:** prefix صریح اجباری است — `IRAN_*`، `AFGHANI_*`، `SARA_*`، `BONBAST_*`، `HERAT_*`، `GLOBAL_*`. هر symbol جدید باید هم در `registry.ts` و هم در `seed-market-rates.ts` اضافه شود.
- **Snapshot JSON:** `public/data/market-rates.json` توسط cron `refresh-market-rates` هر ۶۰ ثانیه نوشته می‌شود. `sync-bazaar` deprecated است — در vercel.json فقط `refresh-market-rates` فعال باشد.
- **comments in cron files:** هرگذاری که auth mechanism در comment ذکر می‌شود (`x-cron-secret`، `?secret=`) باید با آنچه `cron-auth.ts` واقعاً می‌پذیرد (فقط `Authorization: Bearer`) مطابق باشد.

## Topic files — load ONLY when relevant

**Don't load all.** Read 1–2 at most, based on the task:

| Topic | File | Load when |
|-------|------|-----------|
| Repo layout | `AGENTS.repo.md` | First task in a new area |
| npm / dev commands | `AGENTS.commands.md` | Running scripts, db ops, builds |
| Env variables | `AGENTS.env.md` | Adding config, debugging env |
| Style & tooling | `AGENTS.style.md` | Writing any code (extended reference) |
| Gotchas | `AGENTS.gotchas.md` | Anything weird happening |
| MCPs (graphify + runtime) | `AGENTS.mcp.md` | Codebase navigation, runtime MCP usage (cu/matrix/playwright/trash) |
| Visual contract | `DESIGN.md` | Any UI/appearance task (load WITH `COMPONENTS.md`) |
| Component manifest | `COMPONENTS.md` | Choosing/creating any UI component |
| UI design direction | `AGENTS.ui-design.md` | Visual / UX intent & anti-patterns |
| Architecture rules | `AGENTS.architecture.md` | Multi-file changes, DB, auth |
| Anti-failure checklist | `AGENTS.anti-failure.md` | Before claiming a task done |

### Always-loaded (بلا استثنا)

- **PDK** (`PDK.md` + ماژول‌های `pdk/`): در *هر چت* و بدون استثنا خوانده می‌شود — مستقل از موضوع تسک. این ریپو از بلاگ مالی فارسی به **فین‌تک افغانستان** گسترش یافته و PDK نمایه واحد توسعه است. نقض قوانین PDK (مخصوصاً `pdk/constitution.md`) مجاز نیست. ماژول‌های تخصصی `pdk/` طبق نیاز تسک بار می‌شوند، اما خودِ `PDK.md` (entry point) همیشه. |

## 🔄 Rule Failure Loop — خودتصحیحی دستورالعمل (اجباری)

این مکانیزم ضمانت می‌کند که اشتباهات **تکرار نشوند** — نه فقط یک بار fix شوند.

### چه موقع فعال می‌شود؟
هر بار که یکی از این اتفاق‌ها بیفتد:
- یک قانون AGENTS.md در عمل کار نکرد (مثل «تمام گفتم ولی کد ننوشتم»)
- کاربر گفت «چرا این کار نکردی؟» یا «این اشتباه است»
- biome / tsc خطا داد که قابل پیش‌بینی بود
- یک الگوی تکراری اشتباه کشف شد (دومین بار همان نوع bug)

### پروتکل اجباری — ۳ مرحله:

**مرحله ۱ — Root Cause (علت ریشه‌ای):**
صادقانه بگو کدام قانون fail شد و چرا. نه عذرخواهی کلی — تشخیص دقیق:
> «قانون X در بخش Y از AGENTS.md داشتم، ولی در عمل Z اتفاق افتاد چون [علت دقیق].»

**مرحله ۲ — Immediate Fix (اصلاح همان لحظه):**
اگر تسک ناقص است، همان لحظه تمام کن. اگر bug در کد است، همان لحظه fix کن.
کاربر نباید در سشن بعدی دوباره همان مشکل را گزارش دهد.

**مرحله ۳ — AGENTS.md Patch (اصلاح دستورالعمل — اجباری):**
قانون fail‌شده را در AGENTS.md یا AGENTS.anti-failure.md اصلاح کن:
- اگر قانون **مبهم** بود → دقیق‌تر بنویس
- اگر قانون **وجود نداشت** → اضافه کن
- اگر قانون **وجود داشت ولی فراموش شد** → آن را به بخش بالاتر (SELF-ENFORCING LOOP) منتقل کن یا boldتر کن

فرمت ثبت در AGENTS.md (در انتهای بخش مرتبط، یا در anti-failure):
```
### [توضیح کوتاه] — learned [تاریخ]
[شرح اشتباه] + [قانون اصلاح‌شده]
```

### مثال واقعی از این سشن:
- **fail شد:** «تحلیل کردم و HTML artifact ساختم، ولی کد ننوشتم و تمام اعلام کردم»
- **علت:** قانون «Analysis ≠ Done» وجود نداشت
- **اصلاح:** قانون به AGENTS.md اضافه شد + شماره ۲۵ به anti-failure اضافه شد

### PRE-CODE GATE «راهکار بهتر» — Silent Skipping — learned 2026-07-29
- **fail شد:** هنگام ساختن `/api/exchange-quotes/active` از `safeCache` استفاده کردم بدون اینکه به کاربر بگویم جایگزین بهتر (Next.js 15+ `export const revalidate`) هم وجود دارد.
- **علت:** ردیف «💡 Better way?» در PRE-CODE GATE پر شد ولی چون انتخاب با consistency توجیه می‌شد، بدون explicit notification به کاربر ادامه دادم.
- **قانون اضافه‌شده:** وقتی ردیف «Better way?» پاسخ «بله — ولی consistency دارم» دارد، **باز هم باید به کاربر گفته شود** و explicit تأیید گرفته شود. «consistency» یک دلیل، نه یک مجوز سکوت است.

### ⚠️ تذکر مهم:
این loop **جایگزین عذرخواهی** است — نه مکمل آن. عذرخواهی بدون اصلاح دستورالعمل = همان اشتباه در سشن بعدی.

---

## Other rules

- `ARCHITECT_RULES.md` — Role + workflow + non-negotiable rules (lean core).
- `.claude/role/SKILL.md` — Role section mirror (no AGENTS.md duplicate).
- `.kimchi/AGENTS.md` — Trigger file: when user message starts with `قوانین` / `با قوانین` / `AGENTS` / `rules`, re-load rules first.