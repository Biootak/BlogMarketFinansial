-- SECURITY-fix (2026-08-22): حذف صرافی نباید رکوردهای مالی فقط-الحاقی را
-- نابود کند. قبلاً هر ۵ جدول با Cascade به حذف Exchange وصل بودند — یک
-- deleteExchange اشتباه کل LedgerEntry/Transaction/CurrencyDeal/Settlement/
-- AuditLog صرافی را پاک می‌کرد. حالا ON DELETE RESTRICT: تا وقتی حتی یک
-- رکورد مالی وجود دارد، حذف صرافی در سطح DB بلاک می‌شود (P2003 در Prisma).
-- بستن یک صرافی باید از مسیر status=CLOSED انجام شود، نه hard-delete.
-- Rollback: بازگرداندن همین ۵ constraint به ON DELETE CASCADE.

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_exchangeId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_exchangeId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_exchangeId_fkey";

-- DropForeignKey
ALTER TABLE "CurrencyDeal" DROP CONSTRAINT "CurrencyDeal_exchangeId_fkey";

-- DropForeignKey
ALTER TABLE "Settlement" DROP CONSTRAINT "Settlement_exchangeId_fkey";

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrencyDeal" ADD CONSTRAINT "CurrencyDeal_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
