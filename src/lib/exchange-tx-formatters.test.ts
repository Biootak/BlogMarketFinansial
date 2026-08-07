/**
 * exchange-tx-formatters.ts — تست‌های واحد
 *
 * ماژول فقط formatter/derive دارد (بدون DB و side-effect)، پس همه تست‌ها
 * pure هستند. مبالغ در DB به‌صورت BigInt×۱۰۰ ذخیره می‌شوند؛ تمرکز تست روی
 * درستی این تبدیل و aggregate کردن ردیف‌ها است.
 */

import type { TransactionRow } from '@/actions/exchange-transactions';
import {
  aggregateRows,
  amountFromBigInt,
  enrichRow,
  enrichRows,
  faNum,
  formatAmount,
  formatAmountShort,
  getTxStatusKey,
  getTxTone,
} from '@/lib/exchange-tx-formatters';
import { afterEach, describe, expect, it, vi } from 'vitest';

function makeRow(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: 'tx_1',
    exchangeId: 'ex_1',
    customerId: 'cus_1',
    accountId: 'acc_1',
    kind: 'DEPOSIT',
    status: 'COMPLETED',
    amount: '150000',
    currency: 'AFN',
    rate: null,
    fee: '2500',
    destAmount: null,
    destCurrency: null,
    note: null,
    counterparty: null,
    idempotencyKey: null,
    createdAt: '2026-06-15T09:00:00.000Z',
    updatedAt: '2026-06-15T09:00:00.000Z',
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

// ─── getTxTone ────────────────────────────────────────────────────────────────

describe('getTxTone', () => {
  it.each([
    ['DEPOSIT', 'credit'],
    ['WITHDRAWAL', 'debit'],
    ['FEE', 'debit'],
    ['EXCHANGE', 'neutral'],
    ['TRANSFER', 'neutral'],
    ['UNKNOWN_KIND', 'neutral'],
  ])('kind %s → tone %s', (kind, tone) => {
    expect(getTxTone(kind)).toBe(tone);
  });
});

// ─── getTxStatusKey ───────────────────────────────────────────────────────────

describe('getTxStatusKey', () => {
  it.each([
    ['PENDING', 'pending'],
    ['PROCESSING', 'progress'],
    ['COMPLETED', 'success'],
    ['FAILED', 'danger'],
    ['REVERSED', 'danger'],
    ['CANCELLED', 'cancelled'],
  ])('status %s → key %s', (status, key) => {
    expect(getTxStatusKey(status)).toBe(key);
  });

  it('status ناشناخته → pending (fallback ایمن)', () => {
    expect(getTxStatusKey('SOMETHING_ELSE')).toBe('pending');
  });
});

// ─── amountFromBigInt ─────────────────────────────────────────────────────────

describe('amountFromBigInt', () => {
  it('رشته BigInt → مبلغ انسانی (تقسیم بر ۱۰۰)', () => {
    expect(amountFromBigInt('150000')).toBe(1500);
  });

  it('null/undefined/رشته خالی → صفر', () => {
    expect(amountFromBigInt(null)).toBe(0);
    expect(amountFromBigInt(undefined)).toBe(0);
    expect(amountFromBigInt('')).toBe(0);
  });

  it('رشته‌های «null»/«undefined» سریال‌شده → صفر', () => {
    expect(amountFromBigInt('null')).toBe(0);
    expect(amountFromBigInt('undefined')).toBe(0);
  });

  it('number هم پذیرفته می‌شود', () => {
    expect(amountFromBigInt(150000)).toBe(1500);
  });

  it('مقدار اعشاری (غیر BigInt) با fallback عددی محاسبه می‌شود', () => {
    expect(amountFromBigInt('150000.5')).toBeCloseTo(1500.005, 6);
  });

  it('مقدار غیرعددی → NaN (fallback عددی)', () => {
    expect(amountFromBigInt('abc')).toBeNaN();
  });

  it('مبلغ منفی حفظ می‌شود', () => {
    expect(amountFromBigInt('-2500')).toBe(-25);
  });

  it('مبالغ فراتر از Number.MAX_SAFE_INTEGER هم parse می‌شوند', () => {
    expect(amountFromBigInt('123456789012345678900')).toBeGreaterThan(1e18);
  });
});

// ─── faNum / formatAmount ─────────────────────────────────────────────────────

describe('faNum', () => {
  it('عدد را با ارقام فارسی برمی‌گرداند', () => {
    expect(faNum(1500)).toMatch(/^[۰-۹٬]+$/);
  });

  it('نتیجه cache شده با فراخوانی مجدد یکسان است', () => {
    expect(faNum(98765)).toBe(faNum(98765));
  });

  it('cache بیش از ۵۰۰ کلید پاک می‌شود ولی خروجی درست می‌ماند', () => {
    const before = faNum(42);
    for (let i = 0; i < 600; i += 1) faNum(i + 1_000_000);
    expect(faNum(42)).toBe(before);
  });
});

describe('formatAmount / formatAmountShort', () => {
  it('واحد ارز بعد از عدد می‌آید', () => {
    expect(formatAmount('150000', 'AFN').endsWith(' AFN')).toBe(true);
  });

  it('formatAmount مقدار اعشاری را نگه می‌دارد', () => {
    expect(formatAmount('150050', 'AFN')).toBe(`${faNum(1500.5)} AFN`);
  });

  it('formatAmountShort مقدار را گرد می‌کند', () => {
    expect(formatAmountShort('150050', 'AFN')).toBe(`${faNum(1501)} AFN`);
  });

  it('مقدار null → صفر با ارز', () => {
    expect(formatAmount(null, 'USD')).toBe(`${faNum(0)} USD`);
  });
});

// ─── enrichRow ────────────────────────────────────────────────────────────────

describe('enrichRow', () => {
  it('برچسب فارسی kind/status و کلیدهای بصری را اضافه می‌کند', () => {
    const enriched = enrichRow(makeRow());
    expect(enriched).toMatchObject({
      kindLabel: 'واریز',
      statusLabel: 'تکمیل',
      statusKey: 'success',
      tone: 'credit',
      amount: 1500,
      feeAmount: 25,
    });
  });

  it('kind/status ناشناخته → همان مقدار خام به‌عنوان برچسب', () => {
    const enriched = enrichRow(makeRow({ kind: 'MYSTERY', status: 'WEIRD' }));
    expect(enriched.kindLabel).toBe('MYSTERY');
    expect(enriched.statusLabel).toBe('WEIRD');
    expect(enriched.statusKey).toBe('pending');
    expect(enriched.tone).toBe('neutral');
  });

  it('بدون destAmount مقادیر مقصد null می‌مانند', () => {
    const enriched = enrichRow(makeRow());
    expect(enriched.destAmount).toBeNull();
    expect(enriched.destAmountStr).toBeNull();
  });

  it('تراکنش تبدیل → مبلغ مقصد با ارز مقصد قالب می‌گیرد', () => {
    const enriched = enrichRow(
      makeRow({ kind: 'EXCHANGE', destAmount: '5000', destCurrency: 'USD', rate: 70.5 }),
    );
    expect(enriched.destAmount).toBe(50);
    expect(enriched.destAmountStr?.endsWith(' USD')).toBe(true);
    expect(enriched.rate).toBe(70.5);
  });

  it('اگر ارز مقصد null باشد از ارز مبدأ استفاده می‌شود', () => {
    const enriched = enrichRow(makeRow({ destAmount: '5000', destCurrency: null }));
    expect(enriched.destAmountStr?.endsWith(' AFN')).toBe(true);
  });

  it('نام و تلفن مشتری استخراج می‌شود و initial از حرف اول نام می‌آید', () => {
    const enriched = enrichRow(
      makeRow({ customer: { fullName: '  احمد ولی ', phone: '0701234567' } }),
    );
    expect(enriched.customerName).toBe('  احمد ولی ');
    expect(enriched.customerPhone).toBe('0701234567');
    expect(enriched.customerInitial).toBe('ا');
  });

  it('بدون مشتری → initial خط تیره', () => {
    const enriched = enrichRow(makeRow());
    expect(enriched.customerName).toBeNull();
    expect(enriched.customerInitial).toBe('—');
  });

  it('تاریخ در دو قالب compact و کامل تولید می‌شود', () => {
    const enriched = enrichRow(makeRow());
    expect(enriched.createdAtCompact.length).toBeGreaterThan(0);
    expect(enriched.createdAtFull.length).toBeGreaterThan(enriched.createdAtCompact.length);
  });
});

describe('enrichRows', () => {
  it('ترتیب ردیف‌ها حفظ می‌شود', () => {
    const rows = enrichRows([makeRow({ id: 'a' }), makeRow({ id: 'b' })]);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('لیست خالی → آرایه خالی', () => {
    expect(enrichRows([])).toEqual([]);
  });
});

// ─── aggregateRows ────────────────────────────────────────────────────────────

describe('aggregateRows', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  function aggregateAt(rows: TransactionRow[], currency = 'AFN') {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    return aggregateRows(enrichRows(rows), currency);
  }

  it('لیست خالی → همه شمارنده‌ها صفر', () => {
    const agg = aggregateAt([]);
    expect(agg).toMatchObject({
      total: 0,
      totalAmount: 0,
      totalFee: 0,
      completedCount: 0,
      pendingCount: 0,
      failedCount: 0,
      exchangeCount: 0,
      primaryCurrency: 'AFN',
    });
  });

  it('فقط ارز اصلی در مجموع مبالغ حساب می‌شود', () => {
    const agg = aggregateAt([
      makeRow({ amount: '150000', fee: '2500' }),
      makeRow({ id: 'tx_2', amount: '100000', fee: '1000', currency: 'USD' }),
    ]);
    expect(agg.total).toBe(2);
    expect(agg.totalAmount).toBe(1500);
    expect(agg.totalFee).toBe(25);
  });

  it('واریز و برداشت جدا تفکیک می‌شوند', () => {
    const agg = aggregateAt([
      makeRow({ kind: 'DEPOSIT', amount: '150000' }),
      makeRow({ id: 'tx_2', kind: 'WITHDRAWAL', amount: '50000' }),
      makeRow({ id: 'tx_3', kind: 'EXCHANGE', amount: '10000' }),
    ]);
    expect(agg.depositAmount).toBe(1500);
    expect(agg.withdrawalAmount).toBe(500);
    expect(agg.exchangeCount).toBe(1);
  });

  it('وضعیت‌ها در سه سبد completed/pending/failed جمع می‌شوند', () => {
    const agg = aggregateAt([
      makeRow({ id: '1', status: 'COMPLETED' }),
      makeRow({ id: '2', status: 'PENDING' }),
      makeRow({ id: '3', status: 'PROCESSING' }),
      makeRow({ id: '4', status: 'FAILED' }),
      makeRow({ id: '5', status: 'REVERSED' }),
      makeRow({ id: '6', status: 'CANCELLED' }),
    ]);
    expect(agg.completedCount).toBe(1);
    expect(agg.pendingCount).toBe(2);
    expect(agg.failedCount).toBe(3);
  });

  it('شمارش امروز و دیروز بر اساس نیمه‌شب محلی است', () => {
    const agg = aggregateAt([
      makeRow({ id: 'today', createdAt: now.toISOString() }),
      makeRow({ id: 'yesterday', createdAt: '2026-06-14T13:00:00.000Z' }),
      makeRow({ id: 'old', createdAt: '2026-05-01T09:00:00.000Z' }),
    ]);
    expect(agg.todayCount).toBe(1);
    expect(agg.yesterdayCount).toBe(1);
    expect(agg.total).toBe(3);
  });

  it('primaryCurrency در خروجی بازتاب داده می‌شود', () => {
    expect(aggregateAt([], 'USD').primaryCurrency).toBe('USD');
  });
});
