-- R1-fix: unique constraint برای جلوگیری از double-settlement race
-- دو cron هم‌زمان برای همان دوره (exchange + period + currency) فقط یکی می‌تواند
-- رکورد بسازد؛ دومی P2002 می‌گیرد و باید settlement موجود را برگرداند.

-- پاکسازی احتمالی داده‌های تکراری (اگر از قبل double-settlement ساخته شده باشد):
-- نگه‌داشتن کمترین id برای هر گروه و حذف بقیه
DELETE FROM "Settlement" a USING "Settlement" b
WHERE a.id > b.id
  AND a."exchangeId" = b."exchangeId"
  AND a."periodStart" = b."periodStart"
  AND a."periodEnd" = b."periodEnd"
  AND a.currency = b.currency;

CREATE UNIQUE INDEX "Settlement_exchangeId_periodStart_periodEnd_currency_key"
  ON "Settlement" ("exchangeId", "periodStart", "periodEnd", "currency");
