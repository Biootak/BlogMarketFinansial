# AGENTS.md

> Persian-first financial blog (`blogmarketfinansial.ir`) on Next.js 16 + Prisma + PostgreSQL + NextAuth v5.
> User-facing copy is Persian; user expects Persian in replies, English in code/commands/paths.

## Workflow — Build → Show → Improve

**phase.** Search fast (for Reuse) → Edit → User tests visually → Improve.

- Before code: only quick grep/find to avoid duplicates (Reuse → Refactor → Extend).
- After code: `npx tsc --noEmit` if new TypeScript written; skip for tiny CSS/UI tweaks.
- User tests visually and says "fix" or "good".

Only write a brief analysis (not a long plan) for: DB / migration / auth / security / caching / routing, or when user says "big" / "architecture changes".

## Mandatory declaration (start of every task)

> "AGENTS.md و PDK.md را خواندم — مستقیم می‌سازم (Build → Show → Improve)."

## SELF-ENFORCING LOOP (بلا استثنا — حتی وسط چت)

قوانین وسط کار فراموش می‌شوند. پس نه با حافظه، با **دروازهٔ مکانیکی** اعمالشان کن:

1. **قبل از هر ویرایش دوباره لنگر بینداز:** `DESIGN.md` + `COMPONENTS.md` + `AGENTS.ui-design.md` + بخش Directives را بخوان. بعد از تحلیل به حافظه اعتماد نکن.
2. **به انگلیسی فکر کن، از منابع خارجی تحقیق کن** (internet-first). فارسی فقط در متن کاربر‑محور.
3. **Build → `npm run verify` → Show.** تسک تا وقتی `npm run verify` سبز نشده «تمام» نیست (tsc + biome + اسکن آنتی‌پترن).
4. **اگر verify قرمز شد، تا سبز شدن درستش کن.** هرگز با چک قرمز «تمام» نگو.
5. **CRAFT GATE (اجباری — سقف، نه کف):** خروجی باید استاندارد «بیلیون‌دلاری» را در `DESIGN.md §Craft & Composition` + `AGENTS.ui-design.md` رد کند. این سایت محصول فین‌تک در کلاس Stripe/Wise/Linear/Vercel است — «درسته ولی معمولی/کسل‌کننده/بی‌هویت» یک **شکست** است، نه یک خروجیِ ایمن. عبور از دروازه فقط با tsc نیست؛ با سطح کرفت است. قبل از اعلام پایان، چک‌لیست کرفت (Directives §3.6) را یک‌به‌یک رد کن و در پیامت ثابت کن که عبور کرده‌ای.
6. **Definition of Done** (پایین) را یک‌به‌یک چک کن پیش از اعلام پایان.

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
1. **Audit** existing components for the elements you need (grep `COMPONENTS.md` + repo).
2. **Map** elements → existing component → decision (reuse/extend/compose/create). Flag any new component/token/pattern.
3. **Research** (internet-first rule) if the surface is non-trivial.
4. **Build** with tokens + canonical components; handle ALL states (loading / empty / error / disabled / success).
5. **Self-check** against `COMPONENTS.md` + `DESIGN.md` anti-patterns + Definition of Done. Run `npx tsc --noEmit` + `npm run lint`.
6. **Show** the user; iterate on "fix" / "good".

### Definition of Done (before you say a task is complete)
- [ ] **Craft Bar (§3.6) passed** — output is billion-dollar caliber (depth, motion, hierarchy, micro-interaction, restraint, a signature "wow", premium detail). "Ordinary but correct" = NOT done.
- [ ] **Comfortable Density (§3.7) passed** — feels like 100% zoom (breathing room, generous spacing), NOT 125% (cramped). "Technically right but tight" = NOT done.
- [ ] Component reuse checked (no duplicate component/system created).
- [ ] Token usage checked (no hardcoded hex, no new px spacing, no new `--color-*`).
- [ ] All required states handled (loading / empty / error / disabled / success).
- [ ] Keyboard + visible focus + 44px touch targets.
- [ ] RTL logical properties; no `left/right`.
- [ ] Mobile (375) + desktop (1024/1440) verified.
- [ ] No `any` / `@ts-ignore` / `console.log` / stub / TODO.
- [ ] `npx tsc --noEmit` passes; `npm run lint` passes.
- [ ] Reference files (DESIGN.md / COMPONENTS.md) compared; deviations listed.
- [ ] Temporary/duplicated styles removed.

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

## Other rules

- `ARCHITECT_RULES.md` — Role + workflow + non-negotiable rules (lean core).
- `.claude/role/SKILL.md` — Role section mirror (no AGENTS.md duplicate).
- `.kimchi/AGENTS.md` — Trigger file: when user message starts with `قوانین` / `با قوانین` / `AGENTS` / `rules`, re-load rules first.