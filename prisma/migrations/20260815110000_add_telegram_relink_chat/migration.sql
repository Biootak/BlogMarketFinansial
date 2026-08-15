-- Migration: add_telegram_relink_chat
-- 2026-08-15: انتقال امن چت تلگرام بین دو حساب با شمارهٔ یکسان.
--
-- وقتی /start link_<token> روی چتی که قبلاً به حساب دیگری وصل است می‌آید،
-- توکن burn نمی‌شود؛ این فیلد chatId را نگه می‌دارد تا وقتی کاربر دکمهٔ
-- «ارسال شماره تماس» را زد، شمارهٔ تلگرام با شمارهٔ حساب مقصد تطبیق داده
-- شود و فقط در صورت یکی‌بودن، چت منتقل شود. اگر شماره یکی نبود، تلاش به‌عنوان
-- دزدی توکن رد و به ادمین گزارش می‌شود.

ALTER TABLE "TelegramLinkToken" ADD COLUMN "relinkChatId" TEXT;

CREATE INDEX "TelegramLinkToken_relinkChatId_idx" ON "TelegramLinkToken"("relinkChatId");
