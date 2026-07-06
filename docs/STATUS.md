# Editor1 — Status Snapshot

Backup از `.harness/HANDOFF.md`. اگه اکانت/Agent عوض شد، اول `HANDOFF.md` رو بخون، این فایل هم یه خلاصه‌ی سریع‌تره.

## یه جمله‌ای
آیکون‌های هدر Editor1 v2 شدن — Icon registry ریفکتور، همه‌ی ۷ mapping prototype اعمال شد (Type/CaseSensitive برای font-picker، Chevron برای toolbar، CornerDown برای indent، Combine برای merge، Pipette برای palette، LoaderCircle برای save، Lucide رسمی برای bold/italic/underline). tsc + build سبز؛ منتظر visual test کاربر.

## فایل‌های کلیدی
- Registry: `src/components/ui/icon.tsx` (kebab-case canonical، v2 mappings)
- Shell (brand-mark + save-ico + status-bar): `src/components/Editor1/styles/shell.scss`
- Editor host: `src/components/Editor1/editor.tsx`

## قوانین سفت
- از `<Icon>` استفاده کن، نه lucide-react مستقیم.
- stroke=1.25، size=16 (مگه override لازم باشه).
- **v2 mappings (icon.tsx):**
  - font-size=`Type`، font-family=`CaseSensitive`
  - arrow-{up,down,left,right}=`Chevron{Up,Down,Left,Right}`
  - indent=`CornerDownRight`، outdent=`CornerDownLeft`
  - merge=`Combine`، palette=`Pipette`
  - loader-2=`LoaderCircle`
  - bold/italic/underline = Lucide رسمی (نه inline SVG)
- RTL با logical property.

## Build state (همین لحظه)
- `npx tsc --noEmit` — exit 0
- `npm run build` — Compiled successfully in 34.9s, exit 0
- `.next/` — fresh، dev server فوری بالا میاد
- Build log → `.harness/.last-build.log`

## بعد از fresh login
بگو: «`HANDOFF.md` رو بخون و از ادامه‌ش شروع کن.» من ادامه می‌دم.
