# AGENTS.md

> **این سایت مخصوص افغانستان است** — بازار صرافی‌های افغانستان، نرخ‌های تبدیل افغانی (AFN)، و کاربران افغان.
> Platform: Next.js 16 + Prisma + PostgreSQL + NextAuth v5.
> User-facing copy is Persian (Dari); code/commands/paths always in English.

---

## 🌐 Playwright MCP / مرورگر (همیشه فعال — قبل از هر کار مرورگر/Preview)

> باز کردن مرورگر واقعی **فقط** با `npm run browser:open` (بعد از `npm run dev`).
> ⛔ هرگز MCP پلی‌رایت را از صفر کانفیگ نکن — سند کامل: **`AGENTS.playwright.md`** (درایور + تله‌ها + بازسازی).

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

## 📖 Pre-Code Rule Reading (اجباری — قبل از هر کد، حتی یک خط)

> **یاد گرفته شد 2026-08-14 — گزارش کاربر:** قوانین در طراحی/کد اعمال نمی‌شد؛ «قبل از اینکه حتی یک خط کد بنویسی، قوانین باید حتماً خوانده شوند.»

| قانون | جزئیات |
|-------|--------|
| **خواندن قبل از اولین کد** | قبل از اولین خط کد هر تسک: AGENTS.md + PDK.md + `pdk/constitution.md` + topic files مرتبط با همان تسک خوانده شوند — نه فقط اول چت |
| **حتی Trivial/یک خط** | «یک خط» از قوانین مستثنا نیست — Decision Ladder (grep→reuse→extend→compose) + tokens فقط + RTL همیشه اجرا شود |
| **گیت شفاف در پیام** | هر تسک غیر-Trivial: جدول PRE-CODE GATE (و UI VISION GATE برای UI) با پاسخ واقعی داخل پاسخ بیاید — placeholder = تسک تمام‌شده نیست |
| **اینترنت-اول (همه چیز — حتی یک خط)** | قبل از هر کد — UI/UX، فرانت، بک‌اند، معماری، انتخاب ابزار/کتابخانه: حداقل یک `web_search` با تاریخ (سال جاری) + خواندن منبع رسمی (docs.nextjs / MDN / shadcn / npm)؛ اگر ابزار/کتابخانه انتخاب می‌شود → مقایسهٔ جایگزین‌های 2026 قبل از تصمیم، تا دوباره‌کاری نشود |
| **NO-REPEAT محدود** | NO-REPEAT فقط declaration را یک‌بار محدود می‌کند؛ خواندن فایل‌های قوانین قبل از هر تسک اجباری می‌ماند |
| **حق کاربر (trigger)** | کاربر می‌تواند وسط هر تسک بگوید «قوانین را بخوان» / «گیت‌ها را پر کن» → trigger جدید برای re-load rules؛ هرگز مسدود نمی‌شود |
| **گزارش پایانی** | انتهای هر تسک یک خط: «✅ قوانین: [گیت‌های اجراشده]» |
| **قبل از هر write/edit ابزاری** | در همان پیام، قبل از اولین write/edit/delete: `npm run rules:check` اجرا شود و نتیجه در پاسخ بیاید؛ اگر FAIL → اول بخوان + مهر، بعد ویرایش |

### 🛡️ مکانیک اجباری — Rules Read Gate (hook — نه فقط قانون)

> قانونِ نوشته‌شده کافی نیست (یاد گرفته شد 2026-08-14). این gate فایل‌محور است و روی همین
> working tree مشترک کار می‌کند — سشن یا اکانت عوض شود فرقی ندارد.

| فرمان | نقش |
|-------|-----|
| `npm run rules:check` | **گام صفر هر تسک** — بدون مهر تازه FAIL می‌کند و لیست فایل‌های خواندنی را می‌دهد |
| `npm run rules:stamp -- --files "..."` | بعد از خواندن واقعی فایل‌ها — مهر با sha256 فایل‌ها ثبت می‌شود (فایل‌های اجباری: AGENTS.md، PDK.md، `pdk/constitution.md`) |
| `npm run verify` | اکنون شامل `rules:check` است → بدون مهر تازه تسک «تمام» نمی‌شود |
| pre-commit hook | `scripts/git-hooks/pre-commit` — بدون مهر تازه کامیت بلاک می‌شود |
| `npm run rules:log` | audit trail — قابل دیدن است چه کسی/کی چه فایل‌هایی را خوانده |
| `npm run rules:watch` | watcher زنده — در همان لحظهٔ اولین ویرایش فایل کد، اگر مهر کهنه باشد هشدار می‌دهد (داخل `npm run dev` خودکار فعال است؛ log: `.rules-violations.log`) |
| `npm run setup:hooks` | `git config core.hooksPath scripts/git-hooks` — برای clone های تازه |

- اگر AGENTS.md / PDK.md / `pdk/constitution.md` تغییر کنند (hash فرق کند) → مهر **خودکار باطل** می‌شود و خواندن دوباره اجباری است.
- عمر مهر: `RULES_GATE_TTL_MINUTES` (پیش‌فرض ۱۲۰ دقیقه).
- حد صادقانه: هیچ سیستمی «لحظهٔ نوشتن اولین خط» را رهگیری نمی‌کند؛ اما مسیر اتمام (verify) و کامیت (hook) بدون مهر تازه بسته است → کار بدون خواندن قوانین هرگز تمام/کامیت نمی‌شود.
- **محدودیت پلتفرم (صادقانه — یاد گرفته شد 2026-08-14):** هوکِ «قبل از ابزار ویرایش» (pre-tool hook) از سمت ریپو قابل نصب نیست — ابزارهای write/edit متعلق به runtime ایجنت‌اند (`.freebuff/settings.json` در دسترس نیست). نزدیک‌ترین اجرای مکانیکی: (۱) `rules:check` قبل از هر ویرایش در همان پیام، (۲) watcher در لحظهٔ اولین ویرایش فایل کد، (۳) verify + pre-commit به‌عنوان بلاک سخت.
- **پوشش IDE ها (همه):** همهٔ ابزارها (Trae، ZCode، Cursor، Codex، Gemini CLI، Copilot، Claude Code، **Bob Shell** و…) `AGENTS.md` ریشه را می‌خوانند → gate در همه اعمال می‌شود. اجرای مکانیکی در خود repo است → مستقل از IDE: `verify` + هر چهار hook ایجنت Bob (`scripts/git-hooks/` — pre-commit بلاک‌کننده، post-checkout/post-merge هشدار). برای ابزارهای قدیمی‌تر `CLAUDE.md` اشاره‌گر اضافه شد؛ `.kimchi/AGENTS.md` trigger را نگه می‌دارد؛ `.claude/role/SKILL.md` و `ARCHITECT_RULES.md` هم گام ۰ دارند.

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

### 0. Internet-first (همهٔ کد + انتخاب ابزار — اجباری، حتی برای یک خط)
> یاد گرفته شد 2026-08-14 (گزارش کاربر): «قبل از حتی یک خط کد، اینترنت و داک رسمی 2026 چک شود تا بهترین انتخاب شود و دوباره‌کاری نشود — برای طراحی ظاهری، فرانت، بک‌اند، همه چیز.»
1. قبل از هر کد (UI/UX، فرانت، بک‌اند، معماری، تصمیم DB/auth/security): `web_search` بزن (با **تاریخ امروز**) برای بهترین practice 2026 همان الگو.
2. منبع رسمی را بخوان و adapt کن: `docs.nextjs.org` / MDN / `shadcn-ui/ui` / `Layered-UI` / docs کتابخانهٔ انتخابی — نه صفحات مارکتینگ.
3. **انتخاب ابزار/کتابخانه:** قبل از افزودن هر dependency → گزینه‌های 2026 را مقایسه کن (نتیجه + منبع + تاریخ در پاسخ)؛ بهترینِ فعال و maintained را انتخاب کن.
4. الگو را با tokens/DS خودمان adapt کن — هرگز theme رقیب را کپی نکن.
5. بعد از استفاده، کپی `vendor/` یا `npm install` مرجع را نگه ندار.
6. **Mandate-challenge:** اگر AGENTS.md تکنیکی را اجباری کرده → با `web_search` چک کن هنوز best practice 2026 است. اگر تضاد دارد → **قبل از کد به کاربر بگو**.

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
> - **Custom controls:** `PersianDatePicker`, `PersianDateTimePicker`, `PersianDateRangePicker` *(range شمسی — canonical برای بازه تاریخ)*, `CurrencySelect`, `icon.tsx`, `typography.tsx`, `form-field.tsx` *(CustomSwitch حذف شد 2026-08-14 — از `ui/switch` استفاده کنید، ر.ک COMPONENTS.md)*
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

### 2.5 UI assets خارج از React (public/*.html و …) [یاد گرفته شد 2026-08-14]
> **خطای واقعی:** `public/offline.html` با استایل اختصاصی ساخته شد به‌جای زبان طراحی پروژه.
> فایل مستقل بودن ≠ حق طراحی دلخواه — هر UI باید از زبان StateHero/tokens پروژه پیروی کند.

- **فایل‌های HTML مستقل در `public/`** (مثل offline.html برای service worker) هم UI هستند:
  ۱. اول `StateHero` + `StateHero.module.css` + `tokens.css` را بخوان و زبان طراحی را استخراج کن
  ۲. همان ساختار را بازسازی کن (پس‌زمینه canvas + orb، eyebrow pill، title/lead، CTA، prefers-reduced-motion)
  ۳. مقادیر توکن‌ها (`--ds-*`) را inline کن — چون فایل مستقل است CSS باندل‌شده ندارد
  ۴. mark و کد وضعیت (مثل `OFF`) از همان SVG StateHero استفاده شود
  ۵. هرگز رنگ/فونت/چیدمان از سلیقه شخصی — همیشه از tokens پروژه
- **قانون:** قبل از هر UI (حتی یک فایل HTML در public/) → UI VISION GATE + خواندن StateHero/tokens.

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

## 🤖 Git Commit Gate (اجباری — انتهای هر تسک)

**هر تسک که به نتیجه رسید، همان‌جا کامیت کن — هرگز کار را بدون کامیت رها نکن.**

- **قبل از شروع هر تسک** (مخصوصاً در تسک‌های چند-پیامی): `git status` + `git log --oneline -5` بزن تا بدانی چه چیزی از قبل changed/staged است.
- **فقط فایل‌های خودت را stage کن** — هرگز `git add -A` / `git add .` نزن. فایل‌هایی که از قبل تغییر کرده‌اند (کار در جریان کاربر یا تسک‌های دیگر) را دست نزن.
- **کامیت‌ها را جدا و منطقی نگه دار**: هر تسک/هر موضوع → یک کامیت با پیام واضح. اگر در یک جلسه چند کار مجزا انجام شدی، فایل‌ها را بر اساس محتوا دسته‌بندی کن و جدا جدا کامیت بزن (نه یک کامیت بزرگِ «همه چیز»).
- **تغییرات کاربر را بدون اجازه کامیت نکن** — اگر فایل‌ها مختلط است (هم کار تو، هم کار کاربر)، با `git add -p` یا دسته‌بندی بر اساس محتوا جدا کن؛ اگر جداسازی ممکن نیست، قبل از کامیت بپرس.
- پیام کامیت: کوتاه، با فعل امری (`feat:` / `fix:` / `refactor:` / `style:`)، و توضیح «چرا» نه فقط «چه».
- **بعد از کامیت**: `git status` → باید تمیز باشد (به‌جز فایل‌های از‌پیش‌تغییر‌یافته که مال تو نیست).
- این قاعده برای هر تسک صدق می‌کند، حتی اگر کاربر صریحاً نخواسته باشد — کامیت پایان تسک از قاطی‌شدن کارها جلوگیری می‌کند.

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
| **Playwright MCP / browser** | **`AGENTS.playwright.md`** | **باز کردن مرورگر واقعی، هر کار مرورگر/Preview — قبل از هر کانفیگ** |
| Visual contract | `DESIGN.md` | Any UI task (load WITH `COMPONENTS.md`) |
| Component manifest | `COMPONENTS.md` | Choosing/creating any UI component |
| UI design direction | `AGENTS.ui-design.md` | Visual / UX intent |
| Architecture rules | `AGENTS.architecture.md` | Multi-file changes, DB, auth |
| Anti-failure | `AGENTS.anti-failure.md` | Before claiming a task done |
| **UI Design Quality Gate** | **`AGENTS.uidqg.md`** | **Any UI task** |
| **Quality Gates (19DQG)** | **`AGENTS.19dqg.md`** | **Before every "done"** |
| **Market-rates pipeline** | **`AGENTS.market-rates.md`** | **Working on market-rates or crons** |
| **🚀 Performance Status (SSOT)** | **`perf/STATUS.md`** | **هر کار سرعت/Lighthouse/bundle — قبل از شروع بخوان؛ آخر سشن آپدیت کن** |
| **🎨 UI/UX Pro Max Skill** | **`AGENTS.ui-ux-skill.md`** | **Any UI task — قبل از کد + قبل از Show** |

### Always-loaded
- **PDK** (`PDK.md`): در هر چت. نمایه واحد توسعه فین‌تک. نقض `pdk/constitution.md` مجاز نیست.

---

## 🎬 Motion Blueprint (always-on — بدون dependency جدید)

> **یاد گرفته شد 2026-08-16 (بررسی زنده MCP از Revolut + Wise + Linear)**
> تمام animation بزرگ‌ها با CSS + حداقل JS — هیچ Framer، GSAP، Lottie نیست.

### یافته‌های دقیق از کد واقعی (نه تئوری)

| سایت | تکنیک اصلی | ابزار |
|------|------------|-------|
| **Revolut** | CSS tokens برای timing: `--rui-duration-xs:100ms` تا `--rui-duration-xl:900ms`؛ easing default: `cubic-bezier(0.15,0.5,0.5,1)`؛ bounce: `cubic-bezier(0.175,0.885,0.21,1.65)` | فقط CSS — بدون lib |
| **Linear** | ۲۵ SVG circle، هر کدام یک `@keyframes` مستقل با `animation-delay` متفاوت → موج نور | فقط CSS keyframes |
| **Wise** | IntersectionObserver + class toggle برای scroll-reveal؛ `cubic-bezier(0.8,0.05,0.2,0.95)` برای nav | CSS + 10 خط JS |

### Tokens موجود در پروژه (استفاده کنید — نه hardcode)

```css
/* Duration */
--ds-duration-fast: 180ms;    /* hover، focus */
--ds-duration-base: 280ms;    /* component enter/exit */
--ds-duration-slow: 420ms;    /* modal، slide */
--ds-duration-page: 600ms;    /* page transition */

/* Easing */
--ds-ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1);      /* default همه چیز */
--ds-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);       /* bounce/overshoot */
--ds-ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);         /* hero animations */
--ds-ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);    /* accordion/panel */
```

### Keyframes و utilities موجود در globals.css (استفاده — هرگز تکرار نکنید)

```
.anim-fade-in-up    → motion-fade-in-up 320ms ease-out-quart
.anim-fade-in       → motion-fade-in 240ms
.anim-fade-in-right → motion-fade-in-right 280ms
.stagger-children   → هر فرزند با nth-child delay متفاوت
.anim-aurora-a/b    → blob های ambient (32-36s slow)
.anim-ping-soft     → pulse dot
```

### قوانین Motion (اجباری — همه UI)

| قانون | جزئیات |
|-------|---------|
| **فقط opacity + transform** | هرگز width/height/top/left/margin/padding animate نکنید — layout thrash |
| **بدون dependency** | Framer، GSAP، Lottie، AOS ممنوع — CSS + IntersectionObserver کافی است |
| **Scroll-reveal** | IntersectionObserver + class toggle (`reveal` → `reveal visible`) — نه AOS |
| **Stagger** | `stagger-children` utility موجود — یا CSS `nth-child` با `animation-delay` |
| **Ambient SVG** | نه blur blob؛ نه gradient noise — فقط SVG circles/paths با opacity keyframe |
| **Spring tap** | `.spring-press:active { transform: scale(0.96); transition: 100ms spring }` |
| **prefers-reduced-motion** | global در `tokens.css:221` — هرگز per-component block اضافه نکنید |
| **will-change** | فقط روی المان‌هایی که واقعاً GPU layer نیاز دارند — aurora blobs فقط |

### تکنیک Linear Grid (Signature Moment)

```css
/* ۲۵ نقطه SVG در hero — هر کدام keyframe مستقل */
@keyframes ds-dot-pulse-N {
  0%, 100% { opacity: 0.15; }
  50%       { opacity: 0.9; }
}
/* N را از 0 تا 24 بگذارید، با animation-delay: calc(N * 112ms) */
/* duration: 2800ms linear infinite — موج نور بدون JS */
```

### 🏦 Design Language — بررسی زنده MCP (Stripe × Wise — 2026-08-16)

> **یاد گرفته شد 2026-08-16 — بررسی زنده با Playwright MCP (نه اسکرین‌شات):**
> با `node scripts/pw-eval.mjs scripts/probes/live-design-probe.js` روی خودِ
> stripe.com و wise.com مقدارهای real گرفته شد (getComputedStyle + getAnimations).
> ابزار زنده همیشه قبل از تصمیم طراحی سایت/کامپوننت استفاده شود — اسکرین‌شات
> تعامل و انیمیشن را نشان نمی‌دهد.

| چک | Stripe (real) | Wise (real) | قانون ما |
|-----|---------------|-------------|----------|
| **فونت بدنه** | sohne-var، 16px، w400 | Inter، **18px**، w400 | بدنه ما: `--fs-base` 16px — اختیار 18px برای landing |
| **H1** | **40px، w300 (لایت!)**، `letter-spacing: -0.02em`، line-height 1.15 | **Wise Sans 90px، w900**، line-height 0.85 | Hero تایپوگرافی bold — برای «ظرافت» از tracking منفی + وزن کمی سبک‌تر استفاده کن، نه از فونت سبک فارسی |
| **Accent** | بنفش `#533afd` (hover `#665efd`) — یک رنگ واحد | لیمویی `#9fe870` — یک رنگ واحد | **یک accent در هر صفحه** (قانون §3.7) — از `--ds-accent-emerald` ما |
| **دکمه** | radius **4px**، transition `0.24s cubic-bezier(0.45,0.05,0.55,0.95)` | **pill 9999px**، padding 19px 24px، `0.15s ease-in-out` | دکمه‌های ما: pill موجود؛ transition همه `--ds-duration-fast` + `--ds-ease-out-quart` |
| **انیمیشن در حال اجرا** | فقط nav detect-scroll — **هیچ loop در hero** | ۱ انیمیشن coin 3000ms | «quiet luxury»: در حالت سکون تقریباً هیچ انیمیشن لوپ‌شونده — پولیش در **transition ها** است نه loop ها |
| **Spacing** | توکن کامل `--hds-space-core-*` (24px/152px/160px) | `clamp()` fluid + ریتم ثابت marginBlock ~57px | ریتم بخش‌ها با `--ds-space-8/10`؛ فضای باز در layout |
| **بنتو** | `modular-solutions-bento-card` — Payments/Billing/Issuing | — | برای marketplace: گرید کارت با accent per-card مجاز (یک accent غالب) |
| **تغییر عدد در calculator** | — | CSS counter + fade (بدون JS animation) | عدد نتیجه با fade opacity 280ms — نه slide |

**قوانین عملی (اجباری):**
1. **Hero تایپوگرافی:** tracking منفی (`-0.02em` تا `-0.04em`) روی عنوان‌های بزرگ؛ وزن 300–400 برای فارسی فقط در سایزهای ≥ 34px؛ bold برای عنوان‌های کوچک‌تر.
   > **به‌روزرسانی 2026-08-16 (بازخورد کاربر «دقیقاً مثل Stripe»):** hero لایت-ادیتوریال مجاز و ترجیح کاربر است — H1 ≥34px با `font-weight: 400` (Vazirmatn حداقل 400 است) + tracking منفی + leading 1.2؛ accent روی یک کلمه (مثل `titleAccent`). عناوین کوچک‌تر bold می‌مانند.
2. **Restraint در انیمیشن:** حداکثر ۱ انیمیشن لوپ ambient در هر صفحه (dot-pulse یا coin) — بقیه حرکت‌ها transition-on-interaction.
3. **Transition یکسان:** همه دکمه/کارت/اینپوت: `transition: … var(--ds-duration-fast) var(--ds-ease-out-quart)` — هرگز `0.2s ease` پراکنده.
4. **لایو پروب قبل از طراحی:** برای الهام از رقیب → `node scripts/pw-cmd.mjs browser_navigate '{"url":"..."}'` بعد `node scripts/pw-eval.mjs scripts/probes/live-design-probe.js` — مقادیر real را بگیر، حدس نزن.
5. **Bento یکپارچه:** گرید کارت‌های سرویس با accent per-card (`--service-accent`) — حداکثر ۳ tone، بقیه از همان خانواده.

### 🛒 Marketplace / سوپر-اپ — بررسی زنده MCP (Revolut × Careem — 2026-08-16)

> **یاد گرفته شد 2026-08-16 — همان روز بررسی زنده روی revolut.com و careem.com**
> برای صفحات «بازارچه خدمات» — الگوی سوپر-اپ از کد واقعی (نه اسکرین‌شات):

| چک | Revolut (real) | Careem (real) | قانون ما |
|-----|----------------|---------------|----------|
| **H1** | Aeonik Pro **54px w500**، tracking **-1.2px**، leading 1.0 | CareemSans 700 | بازارچه: `clamp(1.9rem→2.9rem)` w800 tracking -0.03em — bold فارسی |
| **ریتم بخش‌ها** | marginBlock **80px** بین sections | category grid بلافاصله زیر hero (32px) | زون‌ها با `--ds-space-10` + hairline جداکننده؛ هر زون هدر مختصر |
| **دکمه** | pill radius 50px، transition `0.3s cubic-bezier(0.15, 0.5, 0.5, 1)` | radius 8px، `transform 0.3s ease-in-out` | transition یکسان: `--ds-duration-fast` + `--ds-ease-out-quart` |
| **شروع سریع** | — | **category tiles** زیر hero — گرید آیکون‌های بزرگ با لینک مستقیم | **هر صفحه بازارچه: strip «شروع سریع»** — ۶ tile پرکاربرد → deep-link |
| **Accent** | آبی `#376CD5` | سبز روشن `#00EB79` — **یک accent** | یک accent غالب در صفحه — emerald ما |
| **انیمیشن سکون** | هیچ loop | هیچ loop | در سکون فقط ۱ ambient (dot-pulse) — بقیه transition-on-interaction |

**قوانین عملی بازارچه (اجباری):**
1. **۴ زون سقف** (قانون §3.7): hero signature → شروع سریع → کاتالوگ → utility. هر زون هدر خودش را دارد — تکراری ممنوع.
2. **کارت پرچمدار:** اولین کارت گرید ۲ ستونه (`grid-column: span 2`) با گرادیان hairline لبه — بقیه استاندارد.
3. **هر کارت CTA ثبت سفارش دارد** — سرویس‌های بدون صرافی همکار «ارائه مستقیم» هستند (توسط خود ما)، نه «به‌زودی»؛ همکارها additive هستند.
4. **شروع سریع = deep-link مستقیم** به `?service=X` — مسیر یک کلیک، نه scroll.
5. **فیلتر:** segmented tabs برای گروه + چیپ اسکرول‌شونده برای سرویس — URL-sync (`?group=`/`?service=`) حفظ.

### 🎨 ریستریت رنگ — تکفام Stripe (یاد گرفته شد 2026-08-16 — بازخورد کاربر «انقدر رنگ»)

> **یاد گرفته شد 2026-08-16 — بازخورد مستقیم کاربر روی بازارچه:** accent per-card (۸ رنگ) = شلوغی.
> پروب زنده stripe.com همین را تأیید کرد: کل صفحه `section--white`، آیکون‌ها مونوکروم، یک accent واحد `#533afd` فقط برای تعاملات.

| قانون | جزئیات |
|-------|---------|
| **بدون accent per-card** | آیکون‌های کارت/tile: `--ds-surface-recessed` + `--ds-text-primary` — مونوکروم. رنگ فقط برای تعامل و status.
| **یک accent در هر صفحه** | `--ds-brand-*` فقط روی: CTA اصلی (solid)، تب/چیپ فعال، هاور لینک‌ها، hairline کارت پرچمدار، تایپوگرافی hero.
| **بج‌ها خنثی** | persona/coverage/self بج‌ها: `--ds-surface-recessed` + border hairline + `--ds-text-muted` — شخصیت از متن می‌آید نه رنگ.
| **کارت‌ها سفید روی سفید** | hairline border + elevation — هیچ tint رنگی داخل کارت (مثل stripe `modular-solutions-bento-card`).
| **CTA کارت = outline** | border hairline + متن؛ هاور → برند. فقط یک CTA **solid** در کل صفحه (hero).
| **امضای حرکت** | گرادیان hairline لبه کارت پرچمدار + ورود stagger — رنگ در حرکت است، نه در سکون.

**H1 صفحه‌های محتوا:** وزن 300–400 فقط در سایزهای ≥34px و با tracking منفی؛ وگرنه w800 (فارسی).

**دو تکنیک امضای Stripe (برای همه بازارچه‌ها/گرید کارت + کارت فرم checkout):**
1. **گرادیان hairline لبه روی هاور:** `::after` با `padding: 1.5px` + `mask-composite: exclude` + `opacity 0→0.65` روی `:hover` — امضای `modular-solutions-bento-card__border-color-gradient` (opacity-only، بدون layout thrash).
2. **نوار تیره انتهایی (drama flip):** آخرین زون utility با `--ds-color-canvas-dark` + متن `--ds-brand-on` + دکمه CTA سفید — یک نقطه تاریک در صفحه سفید (مثل `rgb(13,23,56)` استرایپ).

### 🧵 Stripe Fiber — سیستم طراحی استخراج‌شده (live MCP + جستجوی وب 2026-08-16)

| فیبر | مقدار | کاربرد ما |
|------|--------|-----------|
| **جوهر (ink)** | مشکی متن + نیلی `#0A2540`؛ نوار تیره `rgb(13,23,56)` | نوار تیره = `--ds-color-canvas-dark` |
| **Accent** | بنفش `#533AFD` (live) / `#635BFF` (کلاسیک) — فقط تعاملات | `--ds-brand-*` فقط CTA/تب فعال/هاور |
| **تینت سطح** | `rgb(229,237,245)` — تنها رنگ ثانویه کل صفحه | `--ds-surface-recessed` برای آیکون‌ها/بج‌ها |
| **تایپوگرافی** | sohne-var؛ H1 48px w300 `-0.96px`؛ h2/h3 w300؛ heading محصول 18px w500 | فارسی: H1 w400 ≥34px، عناوین کوچک w700-800 |
| **ریتم** | پایه 4px؛ فاصله سکشن 152–160px | زون‌ها `--ds-space-10` + hairline جداکننده |
| **Radius** | 4px (تیز) | رامپ خودمان 8–24px (تطبیق فرهنگی) |
| **CTA** | یک solid + یک ghost در هر سکشن | یک solid در هر صفحه (hero/band)، بقیه outline |
| **حرکت** | 0.24s تعامل، sweep گرادیان 1000ms، ورود 800ms، سکون ≈ بدون loop | `--ds-duration-fast/base` + گرادیان hairline |

---

## 🔄 Rule Failure Loop (خودتصحیحی — اجباری)

### گرادیان‌های نامرئی — `to inline-end` نامعتبر است (learned 2026-08-16)
> **یاد گرفته شد 2026-08-16 — پروب زنده:** `getComputedStyle(::after).backgroundImage` روی ۸ فایل `none` برگشت چون `linear-gradient(to inline-end, …)` کلیدواژه منطقی است که در گرادیان‌ها وجود ندارد — کل declaration حذف می‌شود.
> **قانون:** در `linear-gradient()`/`conic-gradient()` فقط جهت‌های فیزیکی (`to right`/`to left`/`90deg`) مجاز است؛ logical properties فقط برای `inset-*`/`margin-*`/`padding-*` هستند. هر گرادیان جدید با پروب `getComputedStyle().backgroundImage` تأیید شود.

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
| 2026-08-13 | **Playwright MCP دائمی شد:** `scripts/playwright-open.mjs` (خودترمیم، SDK را خودش نصب می‌کند) + `npm run browser:open` + `AGENTS.playwright.md`. باز کردن مرورگر واقعی دیگر فقط یک فرمان است — هر AI باید این سند را بخواند و از صفر کانفیگ نکند. |
| 2026-08 | **UI/UX Pro Max Skill تنظیم شد:** Skill local در `.claude/skills/ui-ux-pro-max/` نصب شده؛ Design System با `--variance 6 --density 8` برای fintech/RTL/dark در `design-system/afghanistan-exchange-market/MASTER.md` persist شد؛ `AGENTS.ui-ux-skill.md` با قوانین P1–P10 از SKILL.md و وضعیت انطباق پروژه ایجاد شد؛ `AUDIT.md` با gap report نوشته شد. در هر سشن UI باید `AGENTS.ui-ux-skill.md` خوانده شود. |
| 2026-08-14 | **📖 Pre-Code Rule Reading اضافه شد:** خواندن قوانین قبل از هر کد (حتی یک خط) اجباری؛ گیت شفاف در پیام؛ اینترنت-اول برای هر تغییر UI؛ حق کاربر برای trigger «قوانین را بخوان». یاد گرفته شد از گزارش مستقیم کاربر. |
| 2026-08-14 | **اینترنت-اول به همهٔ کد گسترش یافت:** قبل از هر کد (حتی یک خط) — UI/UX، فرانت، بک‌اند، معماری، انتخاب ابزار/کتابخانه — حداقل یک `web_search` با تاریخ (سال جاری) + منبع رسمی؛ مقایسهٔ جایگزین‌های 2026 قبل از انتخاب ابزار. یاد گرفته شد از گزارش کاربر. |
| 2026-08-16 | **Motion Blueprint (بررسی زنده MCP از Revolut+Wise+Linear):** تکنیک‌های animation بزرگ‌ها دقیقاً مستند شد و قانون «بدون dependency جدید» تأیید شد. ر.ک §Motion Blueprint. |
| 2026-08-16 | **Deploy استاندارد — push→GitHub→Azure:** روش دیپلوی سایت تعیین و مستند شد: آپدیت فقط با `git push origin main`؛ روی Azure VM cron-poll هر دقیقه pull+build می‌کند. مرجع واحد: `deploy/AZURE.md` §دیپلوی روزمره + اسکریپت‌های `deploy/azure-update.sh` / `azure-auto-deploy.sh` / `install-auto-deploy.sh`. `AGENTS.commands.md` به‌روز شد؛ Heroku/`deploy-heroku.yml` منسوخ. |

---

## Other rules

- `ARCHITECT_RULES.md` — Role + workflow + non-negotiable rules.
- `.claude/role/SKILL.md` — Role section mirror.
- Trigger: هر پیامی که با `قوانین` / `AGENTS` / `rules` شروع شود → re-load rules first: `npm run rules:check` (گام صفر مکانیکی — AGENTS.md §Pre-Code Rule Reading).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
