# AGENTS.md

> **این سایت مخصوص افغانستان است** — بازار صرافی‌های افغانستان، نرخ‌های تبدیل افغانی (AFN)، و کاربران افغان.
> Platform: Next.js 16 + Prisma + PostgreSQL + NextAuth v5.
> User-facing copy is Persian (Dari); code/commands/paths always in English.

---

## 🇦🇫 Domain Priority — Afghanistan-first (always-on)

> **قانون P0:** این سایت **مخصوص افغانستان** است. هر تصمیم UX/UI/copy باید این اولویت را رعایت کند.

| قانون | جزئیات |
|-------|---------|
| **AFN اول** | در هر calculator، dropdown، یا لیست ارزی — AFN (افغانی) باید **اول** نمایش داده شود |
| **ترتیب اولویت ارزها** | `AFN → USD → EUR → AED → ...` — هرگز USD یا EUR را پیش‌فرض نگذار |
| **واحد پیش‌فرض** | `defaultCode = 'AFN'` در همه کامپوننت‌های calculator |
| **copy فارسی** | زبان دری (فارسی افغانستان) — نه اصطلاحات ایرانی مثل «تومان» به‌عنوان واحد اصلی |
| **unit در DB** | واحد `afn` = افغانی؛ `toman` = تومان (ایران) — این دو را قاطی نکن |
| **cross-rate** | نرخ AFN از pivot USD محاسبه می‌شود: `1 AFN = USD.buy / AFN.rate` |
| **rawUnit vs unit** | `rawUnit` = کلید خام DB (`'afn'`, `'toman'`, ...) برای منطق محاسبه؛ `unit` = label فارسی برای نمایش |

> ⛔ هرگز ایران را به‌عنوان بازار اصلی فرض نکن. «تومان» ثانویه است؛ «افغانی» اصلی است.

---


## تعریف سطح تسک (اجباری — قبل از هر gate)

| سطح | معیار |
|-----|-------|
| **Trivial** | ≤1 file + no type/interface change + no DB + no auth logic |
| **Standard** | ≤3 files or type/interface change |
| **Full** | >3 files or DB migration or auth or UI redesign |

---

## Mandatory declaration

> "AGENTS.md و PDK.md را خواندم — مستقیم می‌سازم (Build → Show → Improve)."

⛔ **قانون NO-REPEAT:** این declaration فقط یک بار در اولین پیام هر چت نوشته می‌شود.
- اگر **todo list فعال** دارم → declaration را skip کن؛ مستقیم ادامه بده.
- اگر context reset جزئی رخ داد → وضعیت را از `update_todo_list` + git status بازسازی کن؛ هرگز از صفر شروع نکن.

---

## Workflow — Build → Show → Improve

**phase:** Search fast (for Reuse) → Edit → User tests visually → Improve.
- Before code: quick grep to avoid duplicates.
- After code: `npx tsc --noEmit` if TypeScript written; skip for tiny CSS tweaks.
- Brief analysis only for: DB / migration / auth / security / caching / routing.

### ⛔ Analysis ≠ Done
تحلیل بدون پیاده‌سازی = شکست. اگر «کارهایی که باید انجام شود» لیست کردی، همان لحظه بنویس.

### 📍 Mid-task state (تسک‌های چند-پیامی)
در شروع هر پیام میانی یک خط وضعیت بنویس:
`📍 وضعیت: [فایل X تمام | فایل Y در حال نوشتن | فایل Z باقی‌مانده]`

---

## 🎨 UI VISION GATE (فقط UI — قبل از PRE-CODE GATE)

> ⛔ برای تسک‌های backend/DB → یک خط: `UI VISION GATE: N/A — backend only`
> این جدول باید **قبل از هر grep و قبل از جدول PRE-CODE GATE** پر شود.
> اگر هر سؤال پاسخ ندارد → کد ممنوع. §Craft Bar در `AGENTS.uidqg.md` را همین لحظه بخوان.

```
| چک                    | سؤال                                                                          | پاسخ (یک جمله — نه placeholder) |
|-----------------------|-------------------------------------------------------------------------------|----------------------------------|
| 👁️ UQ1 — Vision      | این صفحه چه احساسی باید بدهد؟ مقایسه با کدام product بیلیون‌دلاری؟           | «حس [X] — شبیه [Product] در لحظه [Y]» |
| ✨ UQ2 — Signature    | signature moment این صفحه چیست؟                                               | «[ambient SVG / stagger / view-transition / ...]» |
| 🏦 UQ3 — Domain       | هویت بصری از کجای منطق مالی دامنه می‌آید؟ (نه کپی رقیب)                      | «هویت از [X] می‌آید، نه کپی [Y]» |
| ⚠️ UQ Risk           | UQ4–UQ22 مرور شد — کدام ریسک‌دارند؟                                          | [شماره UQ ها + دلیل کوتاه] |
| 🏗️ Comp Map          | المان‌های UI → کامپوننت موجود → decision                                      | \| element \| impl \| decision \| |
```

---

## 🚦 PRE-CODE GATE (قبل از اولین کد هر تسک جدید — نه هر پیام)

> ⛔ جدول باید **بعد از تحقیق واقعی** پر شود — هیچ placeholder مجاز نیست.
> اگر تسک Trivial است → `PRE-CODE GATE: N/A — [دلیل]`

```
| چک              | سؤال                                                              | پاسخ |
|-----------------|-------------------------------------------------------------------|------|
| 🔍 Research     | best practice 2026 بررسی شد؟ منبع + تاریخ امروز؟                 | [نتیجه واقعی + URL + تاریخ — نه "بله"] |
| 🔁 Reuse        | کامپوننت/util مشابه در repo وجود دارد؟                            | [نتیجه grep واقعی] |
| 📐 Scope        | چه فایل‌هایی تغییر می‌کنند؟                                       | [لیست دقیق] |
| 🔗 Dependencies | callers/importers این فایل‌ها چیستند؟                             | [نتیجه grep] |
| 🔒 Security     | auth/validation/rate-limit لازم است؟                              | [پاسخ کامل] |
| 🔄 Sync         | فرانت و بک‌اند هماهنگند?                                          | [API shape، cache tags، UI states] |
| 📏 Rules        | RTL/TSstrict/no-hex/Prisma-singleton رعایت می‌شود?                | [بله/خیر + جزئیات] |
| 🗄️ DB          | schema/migration لازم است؟                                        | [با rollback plan] |
| 🧩 Integration  | با بخش‌های دیگر پروژه هماهنگ است؟                                 | [grep callers، sidebar، nav، sitemap] |
| ✅ Complete     | کد کامل خواهد بود؟                                                | [نه stub/TODO/console.log] |
| 💡 Better way?  | راهکار بهتری وجود داشت؟                                           | [اگر بله → همین لحظه به کاربر بگو + تأیید بگیر] |
```

**ترتیب اجباری:** ۱. [UI] **UI VISION GATE** → ۲. grep/read_file → ۳. داک رسمی/اینترنت (تاریخ اجباری) → ۴. PRE-CODE GATE → ۵. اگر «بهتر وجود دارد» → به کاربر بگو + تأیید بگیر → ۶. کد بنویس.

---

## SELF-ENFORCING LOOP (بلا استثنا)

1. **[فقط UI] قبل از هر ویرایش بصری re-anchor:** `DESIGN.md` + `COMPONENTS.md` + `AGENTS.ui-design.md` را بخوان. برای backend/DB: فقط §Critical conventions کافی است.
2. **Build → `npm run verify` → Show.** تسک تا `npm run verify` سبز نشده «تمام» نیست.
3. اگر verify قرمز شد → تا سبز شدن درستش کن.
4. **[فقط UI] CRAFT GATE (دو نقطه — قبل از کد + قبل از Show):** خروجی UI باید §Craft Bar را رد کند. **قبل از کد** یک بار بخوان؛ **قبل از Show** دوباره چک کن. «کار می‌کند ولی معمولی» = شکست مستقل از اینکه بقیه UQ سبز باشند.
5. **[فقط UI] UIDQG دو مرحله‌ای:** مرحله ۱ در PRE-CODE GATE (قبل از کد)، مرحله ۲ قبل از Show. → ر.ک `AGENTS.uidqg.md §Workflow`.
6. قبل از «تمام» → gate متناسب با سطح تسک از `AGENTS.19dqg.md` را اجرا کن.

---

## Critical conventions (always-on)

- **RTL:** `html dir="rtl" lang="fa-IR"`. Logical properties only — never `left/right`. `useDirection('rtl')` in every Editor1 shell/portal.
- **TypeScript strict:** no `any`, `ts-ignore`, TODO, placeholder.
- **API shape:** `{ success: true, data }` or `{ success: false, error: { code, message } }`.
- **Cache tags:** `posts`, `archive`, `featured-posts`, `latest-posts`, `popular-posts`, `post-{id}`, `post-slug`, `post-by-slug`, `comments`, `categories`, `tags`, `sidebar-data`, `dashboard-stats`, `ticker`, `exchange-rates`, `header-ad`, `advertisements`, `rate-lists`, `dashboard-{section}`.
- **`revalidateTag`** → always from `@/lib/revalidate`, never `next/cache`.
- **Prisma** singleton → import from `@/lib/db`. Never `new PrismaClient()`.
- **English** in code/commands/paths. **Persian** in user-facing copy only.
- **Error boundaries** → همیشه از `RouteError` (ر.ک §Error Handling).

---

## Directives — Editing / Creating / UI appearance

### 0. Internet-first (non-trivial UI/UX — اجباری)
1. `websearch` the current (2026) best practice for the pattern.
2. Fetch 1–2 references from: `shadcn-ui/ui`, `Layered-UI/Layered-UI`, or similar. Read source, not marketing pages.
3. Extract the pattern → adapt to OUR tokens/DS. Never copy their theme.
4. Delete after use — never leave a `vendor/` copy or `npm install` the reference.
5. **Mandate-challenge:** اگر AGENTS.md یک تکنیک را اجباری کرده، پیش از پیاده‌سازی با `websearch` چک کن که هنوز best practice است. اگر تضاد دارد → **قبل از کد به کاربر بگو**.

### 1. Editing existing code
- Audit before change: grep for existing component/util; reuse before modifying.
- Scope discipline: change only what the task requires. Note broader inconsistencies; propose a separate task.
- Never expand global CSS: no new rules in `globals.css`, `dashboard.css`, `setup.css`, `auth.css`, `atelier-archive.css`, `money-transfer/styles.css`.
- Keep modular: فایل‌های human-written را با rule زیر ارزیابی کن (نه صرفاً با شمارش خط). فایل‌های data-heavy (config، schema، locale، migration، generated code) از این قانون مستثنا هستند.
- No stubs / no regressions: no `console.log`, no `any`, no half-built branches.
- **Dependency audit:** هر بار که `lib/` تغییر می‌کند → همه importers را grep کن و سازگاری را بررسی کن.
- **Parallel data sources:** اگر دو منبع یک هدف مشترک دارند، تناقض را به کاربر بگو. → ر.ک `AGENTS.market-rates.md`.

### 2. Creating code

> 🔴 **CUSTOM-FIRST, NATIVE-NEVER (P0 rule — اجباری برای همه المان‌ها — site و dashboard)**
>
> **هر المان UI** — چه form control باشد، چه display، چه layout، چه card، چه section — قبل از ساختن باید این سلسله مراتب را طی کند. این قانون هم برای **داشبورد** و هم برای **سایت** (صفحات عادی کاربر) اجباری است.
>
> **مرحله ۱ — Repo Scan (اجباری، قبل از هر کد):**
>
> **برای داشبورد:**
> 1. grep `src/components/Dashboard/primitives/` — canonical dashboard primitives
> 2. grep `src/components/ui/` — shadcn/Radix shared components
> 3. grep `src/components/Dashboard/` — dashboard domain components
>
> **برای سایت (صفحات کاربر):**
> 1. grep `src/components/` برای site-level custom components (Card*, Section*, Widget*, Nc*, ...)
> 2. grep `src/components/ui/` — shadcn/Radix shared base
> 3. grep `src/components/fintech/`, `src/components/Exchange/`, `src/components/MarketRates/` — domain components
>
> **مرحله ۲ — Decision Ladder:**
> | یافته | اقدام |
> |-------|-------|
> | موجود با همان purpose | **reuse** — بدون تغییر |
> | موجود با structure مشابه | **extend** (variant prop) — نه fork |
> | چند primitive مرتبط | **compose** — نه از صفر |
> | هیچ‌کدام وجود ندارد — داشبورد | **→ ساخت shared** در `src/components/Dashboard/primitives/` + export به `index.ts` |
> | هیچ‌کدام وجود ندارد — سایت | **→ ساخت shared** در `src/components/[نام-منطقی]/` یا `src/components/ui/` + **نه inline** |
>
> **قانون طلایی:** اگر یک component در بیش از یک page یا feature استفاده می‌شود (یا احتمالش هست) → **باید shared باشد**.
>
> ⚠️ **استثنای Premium Moment:** برای «لحظات قهرمان» صفحات premium (hero، brand mark، گرافیک امضا)، page-specific creative freedom مجاز است — حتی اگر شامل container، header، یا variant رنگی اختصاصی باشد. این استثنا فقط برای **یکی-دو element در هر page** (نه همه). co-located `*.module.css` اجباری؛ export به primitives ممنوع.
>
> **موجودی canonical داشبورد:**
> - **Primitives:** `PageHeader`, `StatCard`, `StatGrid`, `DataTable`, `EmptyState`, `DashboardEmpty`, `Section`, `StatusBadge`, `TableToolbar`, `SearchInput` *(فیلد جستجوی controlled، RTL-safe — برای همه toolbar/filterbar)*, `FormField`, `PanelDrawer`, `ConfirmDialog`, `CountUp`, `Skeleton`, `AmbientBackground`, `GeometricAccent`, `NoiseTexture`, `Spotlight`, `MagneticButton`, `Breadcrumb`
> - **UI (shadcn):** `Button`, `Input`, `Dialog`, `Card`, `Skeleton`, `Badge`, `Tabs`, `Select`, `DropdownMenu`, `Popover`, `Sheet`, `Tooltip`, `Switch`, `Toggle`, `Toolbar`, `Table`, `Progress`, `ScrollArea`, `Separator`, `Avatar`, `Alert`, `Textarea`, `Checkbox`
> - **Custom controls:** `PersianDatePicker`, `PersianDateTimePicker`, `PersianDateRangePicker` *(range شمسی — canonical برای بازه تاریخ)*, `CurrencySelect`, `CustomSwitch`, `icon.tsx`, `typography.tsx`, `form-field.tsx`
> - **⚠️ Deprecated:** `DatePickerWithRange` (`date-range-picker.tsx`) — از `PersianDateRangePicker` استفاده کنید
>
> **موجودی canonical سایت (site-level):**
> - **Cards:** `Card3Small`, `Card6`, `Card9`, `Card10`, `Card11`, `CardAuthor`, `CardAuthor2`, `CardAuthorBox`, `CardAuthorBox2`, `CardCategory1`, `CardCategory2`, `CryptoTickerCard`
> - **Sections/Layout:** `SectionHeader`, `SectionHero`, `BackgroundSection`, `BgGlassmorphism`, `SectionSubscribe2`, `SectionGridCategoryBox`, `SectionSliderNewCategories`, `SectionSliderNewAthors`
> - **Widgets:** `WidgetPosts`, `WidgetAuthors`, `WidgetCategories`, `WidgetTags`, `WidgetAds`, `WidgetHeading1`
> - **Media/Image:** `NcImage`, `PostFeaturedMedia`, `SafeImage`, `NcBookmark`, `PostTypeFeaturedIcon`
> - **Navigation/Meta:** `PostCardMeta`, `PostMeta2`, `PostCardLikeAndComment`, `CategoryBadgeList`, `Tag`, `Pagination`, `Nav`, `Navigation`, `MenuBar`, `NavItem`
> - **Auth/User:** `Avatar`, `VerifyIcon`, `FollowButton`, `SocialsList`, `AccountActionDropdown`
> - **Exchange/Fintech:** `CurrencyIcon`, `GenericCryptoIcon`, `CryptoTickerSlider`, `MarketRates/*`, `Exchange/*`, `fintech/*`, `money-transfer/*`, `online-payment/*`
> - **Feedback/State:** `Empty`, `ErrorComponent`, `ErrorState/*`, `SkeletonLoader`, `Skeletons/*`, `LoadingMore`, `ZodErrors`
> - **Utils/Misc:** `NcModal`, `NcDropDown`, `ShareDropdown`, `SideDropdown`, `Motion`, `MySlider`, `FormattedDate`, `SubmitButton`, `SearchBar`, `Ticker`, `TickerShell`

> 🚨 **NO NATIVE FORM CONTROLS (P0 rule — learned 2026-07-28)**
> قبل از هر `<input type="date|time|datetime-local">`, `<select>`, `<input type="checkbox|radio">`, `<input type="range">`:
> 1. grep `src/components/ui/` برای shared alternative
> 2. در دسترس: `DatePickerWithRange`, `PersianDatePicker`, `PersianDateTimePicker`, `CurrencySelect`, `select.tsx`, `dropdown-menu.tsx`, `checkbox.tsx`, `CustomSwitch`, `toggle.tsx`, `tabs.tsx`
> 3. هر native control بدون grep ممنوع — حتی برای تسک‌های Trivial
> 4. اگر shared component وجود ندارد → **ساخت shared در `src/components/ui/`، نه inline**
>
> این قانون به این دلیل P0 است: native dropdown/datepicker همیشه با design system (tokens, fonts, RTL, motion) ناسازگار می‌شود و design drift ایجاد می‌کند.

Component Decision Protocol — همیشه به ترتیب:
1. Search repo for existing component (site-level AND dashboard) with the same purpose.
2. Search for similar structure/behavior — اگر اسم فرق دارد اهمیتی ندارد؛ purpose مهم است.
3. Prefer: **reuse** → **extend** → **compose** → new **shared** → page-**specific** (فقط اگر واقعاً page-specific باشد).
4. Do NOT create new just because an existing one has different name.
5. **Page-specific `_components/` مجاز است برای:** (الف) orchestration/layout این page، (ب) **creative containers/headers برای premium moments** (یکی-دو مورد). هر primitive/display/control قابل‌اشتراک (در بیش از یک page) باید به `shared/` یا `primitives/` منتقل شود.
6. **محل ساخت shared component جدید:** داشبورد → `primitives/` + `index.ts`؛ سایت → `src/components/[نام-منطقی]/index.tsx` یا `src/components/ui/`.

Rules for new code:
- **اندازه فایل (انعطاف‌پذیر، بر اساس industry consensus 2026 — Clean Code + Biome + Aikido + Xomware):**

  | بازه | وضعیت | اقدام |
  |------|--------|-------|
  | ≤ 500 خط | Comfortable | هدف پیش‌فرض — بدون سؤال |
  | 500–700 خط | Acceptable | OK اگر **یک concern** است؛ در PR توضیح کوتاه بده |
  | 700–800 خط | Warning | split پیشنهاد می‌شود مگر دلیل محکم (الگوریتم پیچیده، generated-style) |
  | > 800 خط | Hard cap | **باید split شود** — فقط data-heavy مستثنا |

  معیار اصلی single-responsibility است، نه شمارش خط. فایل‌های config/schema/locale/migration/generated از هر دو محدودیت مستثنا هستند. business logic → `lib/` or hook، never inline.
- No `any`, `@ts-ignore`, TODO/placeholder/FIXME. Type everything.
- No stubs: every action must do something real.
- Co-located `*.module.css`.
- **هر component جدید shared (داشبورد)** → باید در `primitives/index.ts` export شود.
- **هر component جدید shared (سایت)** → باید یک `index.tsx` با named export داشته باشد، داخل `src/components/[نام]/`.
- هرگز component سایت را در `Dashboard/primitives/` نگذار و بالعکس — دو namespace جداگانه‌اند.

### 3. UI appearance (load `DESIGN.md` + `COMPONENTS.md` first) [فقط UI]
- **Canonical:** `src/components/ui/*` (shadcn) + `src/components/Dashboard/primitives/*`.
- `src/components/ds/*` is experimental — do NOT route new code to it except where already adopted.
- **Forbidden duplicates:** never create another `Modal`/`EmptyState`/`Skeleton`/`Button`/`Card`/`Input`/`Table` **به‌عنوان shared component جدید**. ⚠️ استثنا: page-specific visual container برای premium moments (حداکثر ۱-۲ در هر page) — co-located `*.module.css`، export به `ui/` یا `primitives/` ممنوع.
- **Tokens only:** `--ds-*` (site) / `--nova-*` (dashboard). Never hex/rgb; never px-fixed spacing where `--ds-space-*` exists.
- **Motion:** opacity/transform only; no per-component reduced-motion (global clamp in `tokens.css:221`).

### 3.5 Redesign mode [فقط بازطراحی صریح]
1. Recompose structure (new hierarchy, layout, order). Stripping a violation ≠ redesign.
2. New styles → co-located `*.module.css` (tokens only, logical props). Still forbidden to touch global CSS.
3. Keep data/logic intact — reuse existing `lib/` helpers.
4. After build: run `npm run verify` then SHOW the visual diff.

### 3.6 Comfortable Density [فقط UI]
خروجی باید حس «زوم ۱۰۰٪» بدهد، نه ۱۲۵٪. ساخت این حس:
- با `clamp()` روی توکن‌های `--fs-base` و `--ds-space-*` — **نه** با `zoom` روی `html`.
- فضای باز از ریتم بخش‌ها (space-8…space-10 بین section‌ها) و `max-width` راحت.
- عناصر compact نگه دار؛ حاشیه را در layout بساز، نه با padding چاق.
- `--page-zoom` غیرفعال است و دیگر به‌کار نرود.

### 3.7 Flexibility & Restraint [فقط UI — learned 2026-07-30]

> **این بخش برای جلوگیری از تکرار اشتباه قبلی است:** یک page که ۶ zone با ۴ tone رنگ و چندین overlay تزئینی داشت. انعطاف بیشتر، بدون restraint = آشوب.

#### ✅ Flexibility (مجاز است)

| آیتم | جزئیات |
|---|---|
| **Premium container اختصاصی** | hero page می‌تواند container اختصاصی (بدون border یا bg) داشته باشد، فقط co-located CSS، فقط page-specific |
| **Header متنوع در هر zone** | zone های مختلف page حق دارند title/description متفاوت داشته باشند (h1 inline، چسبیده به لبه، overlay، بدون عنوان). یکنواختی = ضد الگو |
| **Color discipline شکستن** | یک page می‌تواند ۲-۳ tone داشته باشد (نه ۱، نه ۴+). یک dominant + حداکثر یک accent |
| **Custom header treatment** | اگر `Section` هدر خسته‌کننده دارد، مجاز به استفاده نکردن از آن. ولی اگر استفاده می‌کنی، هدر **باید** متفاوت از zone های دیگر باشد |
| **Container density متفاوت** | hero می‌تواند spacious باشد (space-10)، utility zone می‌تواند compact باشد (space-3) — تنوع intentional |
| **Custom typography scale** | یک page می‌تواند از `--fs-display-*` یا scale clamp اختصاصی استفاده کند برای hero moments |

#### ❌ Restraint (ممنوع است)

| آیتم | جزئیات |
|---|---|
| **بیش از ۴ zone بصری اصلی** | اصل پارتو. اگر ۵+ zone دارید، تجدیدنظر کنید. ۱ hero + ۲ supporting + ۱ utility = حداکثر |
| **بیش از ۳ tone رنگ در یک page** | ۱ dominant + ۱ accent + ۱ utility (status). بیشتر = شلوغی |
| **Decorative overlay های چندگانه** | `GeometricField + Spotlight + NoiseTexture + GeometricAccent` همزمان در یک page = آشوب. **حداکثر ۱ overlay در هر page**، فقط اگر purposeful باشد |
| **SVG signature بیش از ۱** | یک page حداکثر یک «graphic signature» (hero mark). بقیه نمودارها functional هستند، نه signature |
| **Animation بیش از ۲** | opacity/transform فقط؛ حداکثر ۲ animation مستقل در یک page |
| **همه zone با یک container style** | اگر همه چیز `Card` است یا همه چیز flat است، تنوع نیست. عمدا متنوع باشید |
| **Header تکراری در همه zone ها** | اگر ۵ zone دارید و همه `<h3> + icon + actions` دارند، redesign لازم است |

#### 🎯 Hierarchy rule (اجباری)

هر page باید **یک قهرمان** داشته باشد:
- **Hero** (۶۰-۷۰٪ عرض یا ۱ ردیف کامل) — متمایز از بقیه، spacious، signature
- **Supporting** (هر کدام ≤ ۳۰٪ عرض) — اطلاعات مکمل، متراکم‌تر
- **Utility** (strip پایین یا sidebar) — ابزار/فیلتر/پیمایش

اگر دو zone با هم رقابت می‌کنند، یکی را حذف کن یا hierarchical subordinate کن (سایز، رنگ، density، یا opacity کمتر).

---

## 🚨 Error Handling (always-on)

> **قانون:** هر `error.tsx` جدید باید از `RouteError` استفاده کند — هرگز inline component نسازید.

### معماری Error Boundary (Next.js App Router 2026)

```
global-error.tsx          ← crash کامل root layout (inline style اجباری — بدون providers)
  └── app/error.tsx       ← root catch-all → RouteError
        ├── (auth)/error.tsx         ← استثنا: از auth CSS classes استفاده می‌کند (حفظ شود)
        ├── dashboard/error.tsx      → RouteError
        ├── (exchange)/error.tsx     → RouteError
        │     └── exchange/**/error.tsx → RouteError
        └── (site)/**/error.tsx     → RouteError
```

### الگوی استاندارد برای هر `error.tsx` جدید

```tsx
'use client';

import { RouteError } from '@/components/Dashboard/primitives';

export default function RouteErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      section="نام بخش فارسی"
      backHref="/مسیر-مناسب"
      backLabel="متن دکمه بازگشت"
    />
  );
}
```

### قوانین

| قانون | توضیح |
|-------|-------|
| **یک component واحد** | فقط `RouteError` — نه `SiteRouteError`، نه `ExchangeRouteError`، نه inline |
| **⚠️ Deprecated** | `SiteRouteError` و `ExchangeRouteError` — در کد جدید استفاده نشوند |
| **error type detection** | خودکار داخل `RouteError` (network/auth/notfound/server/unknown) |
| **Sentry** | داخل `RouteError` — نیازی به `Sentry.captureException` در error.tsx نیست |
| **variant** | `page` (پیش‌فرض، center-screen) یا `inline` (داخل section) |
| **auth استثنا** | `(auth)/error.tsx` از auth CSS classes استفاده می‌کند — دست نزنید |
| **global-error.tsx** | نمی‌تواند از `RouteError` استفاده کند (providers موجود نیستند) — inline style اجباری |
| **not-found ≠ error** | `not-found.tsx` جداگانه است — با `error.tsx` قاطی نکنید |

### interface کامل RouteError

```tsx
interface RouteErrorProps {
  error: Error & { digest?: string };  // اجباری
  reset: () => void;                   // اجباری
  section?: string;                    // نام بخش — مثلاً «گزارش‌ها»
  backHref?: string;                   // پیش‌فرض: "/"
  backLabel?: string;                  // پیش‌فرض: "صفحه اصلی"
  variant?: 'page' | 'inline';         // پیش‌فرض: "page"
}
```

---

## Post-task Report (بعد از هر تسک چند-فایلی)

```
## گزارش تسک

### ✅ انجام شد
- [فایل]: [چه تغییری — یک خط]

### ⚠️ ناقص / بعداً
- [مورد]: [دلیل]

### 💡 پیشنهادات (فقط موارد واقعی)
- [پیشنهاد]: [چرا مفید است]

### 🐛 خطرات احتمالی
- [خطر]: [پیشگیری]
```

همه چیز کامل است؟ همان را صریح بگو. گزارش را inflate نکن.

---

## تضاد scope vs. fix — قانون صریح

| نوع خطا | اقدام |
|---------|-------|
| در فایل‌های تغییریافته | fix همان لحظه |
| خارج scope ولی کوچک (<10 دقیقه) | fix + در post-task note |
| خارج scope و بزرگ | به کاربر بگو + در post-task ثبت کن |

**قانون:** «گزارش بدون fix» = تضمین تکرار در تسک بعدی. «scope discipline» مانع fix موارد کوچک نمی‌شود.

---

## Topic files — load ONLY when relevant

| Topic | File | Load when |
|-------|------|-----------|
| Repo layout | `AGENTS.repo.md` | First task in a new area |
| npm / dev commands | `AGENTS.commands.md` | Running scripts, db ops, builds |
| Env variables | `AGENTS.env.md` | Adding config, debugging env |
| Style & tooling | `AGENTS.style.md` | Writing any code |
| Gotchas | `AGENTS.gotchas.md` | Anything weird happening |
| MCPs | `AGENTS.mcp.md` | Runtime MCP usage |
| Visual contract | `DESIGN.md` | Any UI task (load WITH `COMPONENTS.md`) |
| Component manifest | `COMPONENTS.md` | Choosing/creating any UI component |
| UI design direction | `AGENTS.ui-design.md` | Visual / UX intent |
| Architecture rules | `AGENTS.architecture.md` | Multi-file changes, DB, auth |
| Anti-failure | `AGENTS.anti-failure.md` | Before claiming a task done |
| **UI Design Quality Gate** | **`AGENTS.uidqg.md`** | **Any UI task** |
| **Quality Gates (19DQG)** | **`AGENTS.19dqg.md`** | **Before every "done"** |
| **Market-rates pipeline** | **`AGENTS.market-rates.md`** | **Working on market-rates or crons** |
| **🎨 UI/UX Pro Max Skill** | **`AGENTS.ui-ux-skill.md`** | **Any UI task — قبل از کد + قبل از Show** |

### Always-loaded
- **PDK** (`PDK.md`): در هر چت. نمایه واحد توسعه فین‌تک. نقض `pdk/constitution.md` مجاز نیست.

---

## 🔄 Rule Failure Loop (خودتصحیحی — اجباری)

### چه موقع فعال می‌شود؟
- یک قانون AGENTS.md در عمل کار نکرد
- کاربر گفت «چرا این کار نکردی؟»
- biome / tsc خطای قابل‌پیش‌بینی داد
- یک الگوی تکراری اشتباه کشف شد

### پروتکل — ۳ مرحله:

**۱. Root Cause:** علت دقیق را بگو (نه عذرخواهی کلی):
`«قانون X در بخش Y داشتم، ولی Z اتفاق افتاد چون [علت دقیق].»`

**۲. Immediate Fix:** همان لحظه کد را تمام کن.

**۳. AGENTS patch (اجباری — همین سشن):**
- قانون مبهم بود → دقیق‌تر بنویس
- وجود نداشت → اضافه کن
- وجود داشت ولی فراموش شد → به بخش بالاتر منتقل کن یا bold‌تر کن
- **Periodic cleanup:** اگر patch جدید با قانون موجود overlap دارد → قانون قدیمی را ادغام یا حذف کن. هرگز روی قوانین قدیمی stack نکن.

فرمت ثبت:
```
### [توضیح] — learned [تاریخ]
[شرح] + [قانون اصلاح‌شده]
```

> تذکر: عذرخواهی بدون patch = همان اشتباه در سشن بعدی.

---

## Changelog

| تاریخ | تغییر |
|-------|-------|
| 2026-07 | Analysis≠Done، 19DQG، UIDQG، PRE-CODE GATE اضافه شدند |
| 2026-07-09 | COMPLETE ANSWERS gate، قانون ۸ سؤال کاربر |
| 2026-07-28 | UI-DESIGN GATE دو مرحله‌ای |
| 2026-07-29 | PRE-CODE GATE silent-skipping rule |
| 2026-07-29 | قانون اندازه فایل انعطاف‌پذیر شد: target ~500 / soft 700 / hard 800 (طبق industry consensus — Clean Code + Biome + Aikido + Xomware)؛ معیار single-responsibility جایگزین شمارش خط شد. |
| 2026-07 | NO-REPEAT declaration rule (تکرار وسط تسک ممنوع) |
| 2026-07 | AGENTS.md refactored: UIDQG→AGENTS.uidqg.md، 19DQG→AGENTS.19dqg.md، market-rates→AGENTS.market-rates.md |
| 2026-07 | تعریف صریح Trivial/Standard/Full؛ رفع تضاد scope/fix؛ periodic cleanup rule؛ mid-task state tracking |
| 2026-07 | **Vision-First gate:** UQ1+UQ2+UQ3 پیش از grep اجباری شدند؛ §Craft Bar دو نقطه (قبل از کد + قبل از Show)؛ بلاک A در UIDQG مارک ⚡ شد |
| 2026-07 | **UI VISION GATE جداگانه:** جدول مستقل UI VISION GATE قبل از PRE-CODE GATE اضافه شد؛ ردیف‌های UI Check و Comp Map از PRE-CODE GATE حذف و به جدول جدید منتقل شدند |
| 2026-07 | **CUSTOM-FIRST, NATIVE-NEVER (P0):** سلسله مراتب Repo Scan + Decision Ladder برای هر المان؛ موجودی کامل primitives/ui/custom + site-level ثبت شد؛ قانون جدا برای داشبورد vs سایت؛ export اجباری؛ namespace جداگانه site/dashboard |
| 2026-07 | **Error Handling یکپارچه:** `RouteError` canonical ساخته شد؛ همه error.tsx ها migrate شدند؛ `SiteRouteError`/`ExchangeRouteError` deprecated؛ §Error Handling section اضافه شد؛ `SettingsSubNavItem.icon` → `iconName: string` برای Server→Client safety |
| 2026-07-30 | **§3.7 Flexibility & Restraint اضافه شد:** page-specific premium containers، header متنوع در هر zone، color discipline (۲-۳ tone) — همزمان با anti-overdesign: حداکثر ۴ zone، حداکثر ۳ tone، حداکثر ۱ overlay تزئینی، حداکثر ۲ animation، حداکثر ۱ SVG signature در page. یاد گرفته شد از: ۶-zone redesign که همه zoneها با هم رقابت می‌کردند. |
| 2026-08 | **UI/UX Pro Max Skill تنظیم شد:** Skill local در `.claude/skills/ui-ux-pro-max/` نصب شده؛ Design System با `--variance 6 --density 8` برای fintech/RTL/dark در `design-system/afghanistan-exchange-market/MASTER.md` persist شد؛ `AGENTS.ui-ux-skill.md` با قوانین P1–P10 از SKILL.md و وضعیت انطباق پروژه ایجاد شد؛ `AUDIT.md` با gap report نوشته شد. در هر سشن UI باید `AGENTS.ui-ux-skill.md` خوانده شود. |

---

## Other rules

- `ARCHITECT_RULES.md` — Role + workflow + non-negotiable rules.
- `.claude/role/SKILL.md` — Role section mirror.
- `.kimchi/AGENTS.md` — Trigger: when message starts with `قوانین` / `AGENTS` / `rules`, re-load rules first.
