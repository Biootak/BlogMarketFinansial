import type { Prisma } from '@prisma/client';
import { v4 as createId } from 'uuid';

/**
 * revenue.ts — ثبت درآمد کارمزد پلتفرم در دفتر دوطرفه
 *
 * الگوی صنعت (Modern Treasury «Accounting for Developers»، 2025؛ sdk.finance،
 * 2026-07؛ youngju.dev banking-ledger، 2026-06): کارمزدِ نگه‌داشته‌شده توسط
 * پلتفرم باید به‌عنوان CREDIT روی «حساب درآمد پلتفرم» در همان تراکنشِ مالی
 * book شود — وگرنه درآمد نامرئی/غیرقابل حسابرسی است و جمع دوطرفه نمی‌بندد.
 *
 * طراحی در این ریپو: FintechAccount.customerId غیر-nullable است و ساختن مدل
 * جدید RevenueAccount تغییر ساختاری می‌خواهد؛ بنابراین حساب درآمد «مجازی»
 * است: LedgerEntry با accountId=null و customerId=null — دقیقاً همان قرارداد
 * موجود LedgerEntry های settlement (کامنت schema: «nullable برای LedgerEntry
 * های settlement که مختص حساب مشتری نیستند»).
 *
 * شناساگر پایدار برای گزارش/جمع درآمد:
 *   exchangeId + accountId IS NULL + description startsWith FEE_REVENUE_PREFIX
 * runningBalance = ماندهٔ تجمعی جریان درآمد (exchange, currency) پس از این
 * ردیف — هم‌قرارداد با سایر LedgerEntry ها.
 */

export const FEE_REVENUE_PREFIX = 'FEE_REVENUE';

type Tx = Prisma.TransactionClient;

async function revenueRunningBalance(
  tx: Tx,
  exchangeId: string,
  currency: string,
): Promise<bigint> {
  // جریان درآمد CREDIT (ثبت کارمزد) و DEBIT (برگشت) دارد؛ aggregate جهت را
  // نمی‌داند پس خالص = تفاضل دو جمع. (amount در schema همیشه غیرمنفی است.)
  const credits = await tx.ledgerEntry.aggregate({
    where: {
      exchangeId,
      currency,
      accountId: null,
      customerId: null,
      direction: 'CREDIT',
      description: { startsWith: FEE_REVENUE_PREFIX },
    },
    _sum: { amount: true },
  });
  const debits = await tx.ledgerEntry.aggregate({
    where: {
      exchangeId,
      currency,
      accountId: null,
      customerId: null,
      direction: 'DEBIT',
      description: { startsWith: FEE_REVENUE_PREFIX },
    },
    _sum: { amount: true },
  });
  return (credits._sum.amount ?? BigInt(0)) - (debits._sum.amount ?? BigInt(0));
}

/**
 * ثبت کارمزد پلتفرم به‌عنوان درآمد — داخل همان $transaction معامله صدا زده
 * شود تا اتمی بماند.
 */
export async function bookFeeRevenue(
  tx: Tx,
  params: {
    exchangeId: string;
    txnId: string;
    amount: bigint;
    currency: string;
    actorId?: string | null;
    detail?: string;
  },
): Promise<void> {
  const { exchangeId, txnId, amount, currency, actorId, detail } = params;
  if (amount <= BigInt(0)) return; // بدون کارمزد — ردیف درآمد بی‌معناست

  const previousBalance = await revenueRunningBalance(tx, exchangeId, currency);
  const runningBalance = previousBalance + amount;
  await tx.ledgerEntry.create({
    data: {
      id: createId(),
      exchangeId,
      accountId: null,
      customerId: null,
      txnId,
      direction: 'CREDIT',
      amount,
      currency,
      runningBalance,
      description: `${FEE_REVENUE_PREFIX} — کارمزد پلتفرم${detail ? ` (${detail})` : ''}`,
      createdById: actorId ?? null,
    },
  });
}

/**
 * برگشت درآمد کارمزد (فقط وقتی کسب‌وکار بخواهد کارمزد بازگردد). عرف صرافی‌ها
 * حفظ کارمزد در انصراف/استرداد است — این helper برای مسیرهای آینده که
 * سیاستشان بازگشت کامل است نگه داشته می‌شود.
 */
export async function reverseFeeRevenue(
  tx: Tx,
  params: {
    exchangeId: string;
    txnId: string;
    amount: bigint;
    currency: string;
    actorId?: string | null;
    detail?: string;
  },
): Promise<void> {
  const { exchangeId, txnId, amount, currency, actorId, detail } = params;
  if (amount <= BigInt(0)) return;

  const previousBalance = await revenueRunningBalance(tx, exchangeId, currency);
  const runningBalance = previousBalance - amount;
  await tx.ledgerEntry.create({
    data: {
      id: createId(),
      exchangeId,
      accountId: null,
      customerId: null,
      txnId,
      direction: 'DEBIT',
      amount,
      currency,
      runningBalance,
      description: `${FEE_REVENUE_PREFIX} — برگشت کارمزد پلتفرم${detail ? ` (${detail})` : ''}`,
      createdById: actorId ?? null,
    },
  });
}
