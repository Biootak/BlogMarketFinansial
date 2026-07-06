# Editor1 Header Icons — Handoff

> هدف: حرفه‌ای‌سازی آیکون‌های هدر ادیتور + یکدست‌سازی Icon system.
> Build → Show → Improve. بعد از این، کاربر visual test می‌کنه و می‌گه fix/good.

## وضعیت (تا این لحظه)
- ✅ Icon registry ریفکتور شد — kebab-case canonical، canonical mapping
- ✅ کنترل‌های تولبار به `<Icon>` wrapper مهاجرت کردن (size=16, stroke=1.25)
- ✅ fixed-menu.tsx پاک‌سازی شد
- ✅ font-picker ها (font-family, font-size) مهاجرت شدن
- ✅ table-toolbar.tsx bubble menu جدول با `<Icon>`
- ✅ brand-mark در shell.scss با `Sparkles`
- ✅ save-status با `Loader` / `Save`
- ✅ status-bar پایین هم آیکون‌دار شد
- ⏳ `tsc --noEmit` باید پاس بشه — اگه نشد، تایپ‌های Icon رو چک کن
- ⏳ بیلد و visual test توسط کاربر

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
- [ ] `npx tsc --noEmit` پاس کنه
- [ ] `npm run build` پاس کنه (اگه build طول کشید و توکن داری، در آخر همین تسک اجرا کن)
- [ ] visual test: کاربر هدر/تولبار/بubble-menu رو تو browser نگاه کنه
- [ ] اگه کاربر گفت "fix" → برگرد به همین plan و ادامه بده
- [ ] اگه کاربر گفت "good" → status رو اینجا به "DONE" آپدیت کن + commit

## فعلاً چی در جریانه
- هیچ تسک دیگه‌ای شروع نشده. فقط visual feedback کاربر مونده.
- هیچ build دستی نزدم تو این دور — فقط ادیت‌ها. Build نهایی در پایان گرفته می‌شه.

## چطوری ادامه بدی وقتی fresh اومدی
۱. این فایل رو بخون.
۲. از کاربر بپرس: "الان وضعیت رو دیدی، می‌خوای visual test کنی و fix/good بگی، یا قبلش tsc/build بزنم؟"
۳. اگه fix: برگرد به نکات ظریف + Icon registry. اکثراً ایراد از یکی از اون‌هاست.
۴. اگه good: تموم.
