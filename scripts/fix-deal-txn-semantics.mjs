// scripts/fix-deal-txn-semantics.mjs
// ----------------------------------------------------------------------------
// هدف: اصلاح ردیف‌های Transaction با قرارداد معکوسِ قدیمیِ completeDeal
//
// تا 2026-08-22، completeDeal ردیف EXCHANGE را «مقصد-اول» می‌نوشت:
//   amount = toAmount (ارز مقصد) ، destAmount = fromAmount (ارز مبدا)
// در حالی که fx-trade و exchange-transactions و کدِ جدیدِ completeDeal همه
// «مبدا-اول» هستند: amount = پرداخت مشتری. جمع AML روزانه (kyc-limits) روی
// amount+currency می‌چرخد؛ ردیف‌های معکوس سقف روزانه را تا ~۹۰× اشتباه
// حساب می‌کردند (مثال: deal 100USD→7M AFN به‌جای ~7,500 معادل AFN ثبت می‌شد).
//
// شناسایی ایمن (بدون اتکا به تاریخ):
//   1. Transaction.kind='EXCHANGE' و note حاوی «معامله ارزی — کد: {suffix}»
//   2. suffix = ۸ کاراکتر آخر CurrencyDeal.id → join با endsWith
//   3. فقط وقتی txn.currency == deal.toCurrency یعنی معکوس است → swap
//      (ردیف‌های جدیدِ درست currency==fromCurrency دارند و skip می‌شوند)
//   4. تطبیق مقداری: Decimal(amount)==deal.toAmount و destAmount==fromAmount
//
// مصرف:
//   node scripts/fix-deal-txn-semantics.mjs --dry-run   # پیش‌فرض — فقط گزارش
//   node scripts/fix-deal-txn-semantics.mjs --apply     # اعمال + بکاپ JSON
//
// اسکریپت idempotent است: ردیف‌های اصلاح‌شده دیگر شرط معکوس را ندارند.
// ----------------------------------------------------------------------------

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

function decimalEquals(a, b) {
  // "100" == "100.00" → true (مقایسه عددی، مستقل از scale)
  return Number(a.toString()) === Number(b.toString());
}

async function main() {
  const candidates = await prisma.transaction.findMany({
    where: {
      kind: 'EXCHANGE',
      destCurrency: { not: null },
      note: { contains: 'معامله ارزی' },
    },
    select: {
      id: true,
      exchangeId: true,
      amount: true,
      currency: true,
      destAmount: true,
      destCurrency: true,
      rate: true,
      fee: true,
      createdAt: true,
      note: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`candidate EXCHANGE rows with deal-note: ${candidates.length}`);

  const fixes = [];
  const skipped = [];

  for (const txn of candidates) {
    const match = /کد:\s*([A-Za-z0-9_-]+)\s*$/.exec(txn.note ?? '');
    if (!match) {
      skipped.push({ id: txn.id, reason: 'NO_DEAL_SUFFIX_IN_NOTE' });
      continue;
    }
    const suffix = match[1];
    const deals = await prisma.currencyDeal.findMany({
      where: { id: { endsWith: suffix } },
      select: {
        id: true,
        trackingCode: true,
        fromCurrency: true,
        toCurrency: true,
        fromAmount: true,
        toAmount: true,
      },
    });
    if (deals.length === 0) {
      skipped.push({ id: txn.id, reason: 'DEAL_NOT_FOUND', suffix });
      continue;
    }
    // چند deal با suffix مشترک تقریباً محال است (uuid v4)؛ با تطبیق مقداری فیلتر می‌کنیم
    const deal =
      deals.find(
        (d) =>
          d.toCurrency === txn.currency &&
          d.fromCurrency === txn.destCurrency &&
          decimalEquals(d.toAmount, txn.amount) &&
          decimalEquals(d.fromAmount, txn.destAmount ?? 0),
      ) ?? null;
    if (!deal) {
      skipped.push({ id: txn.id, reason: 'AMOUNT_MISMATCH_OR_ALREADY_FIXED', suffix });
      continue;
    }
    fixes.push({
      transactionId: txn.id,
      exchangeId: txn.exchangeId,
      dealId: deal.id,
      dealTrackingCode: deal.trackingCode,
      createdAt: txn.createdAt.toISOString(),
      before: {
        amount: txn.amount.toString(),
        currency: txn.currency,
        destAmount: txn.destAmount?.toString() ?? null,
        destCurrency: txn.destCurrency,
      },
      after: {
        amount: txn.destAmount?.toString() ?? '0',
        currency: txn.destCurrency,
        destAmount: txn.amount.toString(),
        destCurrency: txn.currency,
      },
    });
  }

  console.log(`inverted rows to fix : ${fixes.length}`);
  console.log(`skipped              : ${skipped.length}`);
  for (const f of fixes) {
    console.log(
      `  - ${f.transactionId} deal=${f.dealTrackingCode}: ${f.before.amount} ${f.before.currency} ⇄ ${f.before.destAmount} ${f.before.destCurrency}`,
    );
  }

  if (!APPLY) {
    console.log('\nDRY-RUN — هیچ تغییری اعمال نشد. برای اعمال: --apply');
    return;
  }

  if (fixes.length === 0) {
    console.log('چیزی برای اعمال نیست.');
    return;
  }

  const backupDir = join(dirname(fileURLToPath(import.meta.url)), 'backups');
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(backupDir, `fix-deal-txn-semantics-${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify({ fixes, skipped }, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
  console.log(`backup written: ${backupPath}`);

  let applied = 0;
  for (const f of fixes) {
    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: f.transactionId },
        data: {
          amount: BigInt(f.after.amount),
          currency: f.after.currency,
          destAmount: BigInt(f.after.destAmount),
          destCurrency: f.after.destCurrency,
        },
      });
    });
    applied += 1;
  }
  console.log(`applied: ${applied}/${fixes.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
