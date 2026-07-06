# Editor1 Header Icons — Handoff

> هدف: حرفه‌ای‌سازی آیکون‌های هدر ادیتور + یکدست‌سازی Icon system.
> Build → Show → Improve. بعد از این، کاربر visual test می‌کنه و می‌گه fix/good.

> ## 🟢 BUILD STATE (برای resume — اگه fresh اومدی اول اینو ببین)
>
> | چیز | وضعیت |
> |------|--------|
> | `.next/` | ✅ **FRESH** — اخیر: `npm run build`، Compiled successfully in 34.9s، exit 0 |
> | `tsc --noEmit` | ✅ exit 0 |
> | Last build log | `.harness/.last-build.log` (Tee شده موقع build) |
> | Journal | آخرین entry: `EDIT .harness/CONVENTIONS.md` (callout برای fresh sessions) |
> | CONVENTIONS | `.harness/CONVENTIONS.md` بالاش callout داره: **hook ها offline ان** — manual journal کن |
>
> **اگه token تموم شد و session مرد:** `.next/` همین الان valid و dev server فوری بالا میاد. rebuild لازم نیست.

## وضعیت (تا این لحظه)
- ✅ Icon registry ریفکتور شد — kebab-case canonical، canonical mapping
- ✅ کنترل‌های تولبار به `<Icon>` wrapper مهاجرت کردن (size=16, stroke=1.25)
- ✅ fixed-menu.tsx پاک‌سازی شد
- ✅ font-picker ها (font-family, font-size) مهاجرت شدن
- ✅ table-toolbar.tsx bubble menu جدول با `<Icon>`
- ✅ brand-mark در shell.scss با `Sparkles`
- ✅ save-status با `Loader` / `Save`
- ✅ status-bar پایین هم آیکون‌دار شد
- ✅ **v2 mapping changes اعمال شد** — همه‌ی ۷ تغییر prototype:
  - حذف `buildInlineMarkIcon` inline function (bold/italic/underline)
  - `font-size → Type`, `font-family → CaseSensitive`
  - `arrow-up/down/left/right → ChevronUp/Down/Left/Right`
  - `indent → CornerDownRight`, `outdent → CornerDownLeft`
  - `merge → Combine`
  - `palette → Pipette`
  - `loader-2 → LoaderCircle`
  - ۹ lucide import جدید (Bold, Italic, Type, CaseSensitive, ChevronUp/Left/Right, CornerDownLeft/Right, Combine, Pipette, LoaderCircle)
  - ۹ lucide import حذف (ArrowUp/Down/Left/Right, IndentIncrease/Decrease, Loader2, Merge, Palette)
- ✅ `npx tsc --noEmit` — exit 0 (هیچ خطای تایپ)
- ✅ `npm run build` — Compiled successfully in 34.9s, exit 0
- ⏳ **visual test توسط کاربر** (آخرین مرحله)

**Status: `IN_PROGRESS — AWAITING VISUAL CONFIRM`** — همه‌ی mapping v2 اعمال شد. سایز فقط 16 (size variants نیازی نبود). منتظر تأیید visual تو روی dev server.

## فایل‌های لمس‌شده (۱۳ عدد)
```
src/components/Editor1/components/fixed-menu.tsx              +12 -4
src/components/Editor1/components/table-toolbar.tsx            +356 -345
src/components/Editor1/controls/menu-button-indent.tsx         +8 -12
src/components/Editor1/controls/menu-button-outdent.tsx        +8 -10
src/components/Editor1/controls/menu-button-subscript.tsx      +28 -24
src/components/Editor1/controls/menu-button-superscript.tsx    +28 -24
src/components/Editor1/controls/menu-button-table.tsx          +198 -196
src/components/Editor1/controls/menu-button-task-list.tsx      +33 -24
src/components/Editor1/controls/menu-select-font-family.tsx    +418 -213
src/components/Editor1/controls/menu-select-font-size.tsx      +133 -104
src/components/Editor1/editor.tsx                              +71 -10
src/components/Editor1/styles/shell.scss                       +76 -47
src/components/ui/icon.tsx                                     (مپ canonical، kebab-case)
```

## تصمیمات کلیدی که باید رعایت شود
1. **از همه‌جا به `<Icon>` import کن.** هیچ‌وقت مستقیم از `lucide-react` تو کامپوننت‌ها import نکن. فقط خود `icon.tsx` مجازه.
2. **Icon sizes:** toolbar پیش‌فرض `16px`. اگه منوی بزرگ یا خیلی کوچک خواستی، توکن بساز نه inline.
3. **stroke=1.25** ثابت (در Icon wrapper پریمیوم). از prop قابل override ولی معمولاً نکن.
4. **Indentation** در lucide-react v0.469: `IndentIncrease` و `IndentDecrease` — هرگز `Indent`/`Outdent` (deprecated).
5. **kebab-case** برای کلید Icon. `more-horizontal` نه `MoreHorizontal`. (case در resolve canonical مپ می‌شه ولی convention رو نگه‌دار.)
6. **RTL هیچ‌وقت hardcode نشه** — همه‌چیز با logical property.

## نکات ظریف
- اگه آیکونی در registry نبود، اول اضافه‌ش کن بعد مصرف کن — نه import مستقیم.
- task-list icon = `ListTodo`.
- table = `Table`، merge = `TableCellsMerge`، split = `TableCellsSplit` (merge/split رو خودم اضافه کردم).
- brand-mark در دک = `Sparkles`.
- save-status = `Loader` موقع save، `Save` موقع idle.

## چک‌لیست بعد از تحویل (وقتی ادامه می‌دی)
- [x] `npx tsc --noEmit` پاس کنه — exit 0
- [x] `npm run build` پاس کنه — Compiled successfully
- [ ] visual test: کاربر `npm run dev` بزنه و هدر/تولبار/بubble-menu رو تو browser نگاه کنه
- [ ] اگه کاربر گفت "fix" → برگرد به نکات ظریف + Icon registry، fix کن، دوباره tsc/build/test
- [ ] اگه کاربر گفت "good" → status رو اینجا به `DONE` ببر + commit

## فعلاً چی در جریانه
- tsc + build سبز. کاربر visual test می‌کنه (هدر/تولبار/بubble-menu در dev server).
- هیچ تسک دیگه‌ای شروع نشده.
- Build log در `.harness/.last-build.log` ذخیره شد برای reference.

## چطوری ادامه بدی وقتی fresh اومدی
۱. این فایل رو بخون.
۲. از کاربر بپرس: "الان وضعیت رو دیدی، می‌خوای visual test کنی و fix/good بگی، یا قبلش tsc/build بزنم؟"
۳. اگه fix: برگرد به نکات ظریف + Icon registry. اکثراً ایراد از یکی از اون‌هاست.
۴. اگه good: تموم.
