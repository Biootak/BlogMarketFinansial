# Editor1 — Status Snapshot

Backup از `.harness/HANDOFF.md`. اگه اکانت/Agent عوض شد، اول `HANDOFF.md` رو بخون، این فایل هم یه خلاصه‌ی سریع‌تره.

## یه جمله‌ای
آیکون‌های هدر Editor1 حرفه‌ای شدن — Icon registry ریفکتور، کنترل‌ها به `<Icon>` مهاجرت، brand/save-status آیکون گرفتن. منتظر visual test کاربر.

## فایل‌های کلیدی
- Registry: `src/components/ui/icon.tsx` (kebab-case canonical)
- Shell (brand-mark + save-ico + status-bar): `src/components/Editor1/styles/shell.scss`
- Editor host: `src/components/Editor1/editor.tsx`

## قوانین سفت
- از `<Icon>` استفاده کن، نه lucide-react مستقیم.
- stroke=1.25، size=16 (مگه override لازم باشه).
- IndentIncrease / IndentDecrease (نه Indent / Outdent).
- RTL با logical property.

## بعد از fresh login
بگو: «`HANDOFF.md` رو بخون و از ادامه‌ش شروع کن.» من ادامه می‌دم.
