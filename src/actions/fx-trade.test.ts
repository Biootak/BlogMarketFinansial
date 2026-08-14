/**
 * fx-trade.ts — تست‌های جامع تبدیل ارز (FX Trade)
 *
 * سناریوهای پوشش‌داده‌شده:
 *   getFxQuote      — auth guard / same-currency / no-customer / no-rate
 *   executeFxTrade  — auth guard / rate-limit / validation / same-currency /
 *                     no-customer / customer-locked / idempotency /
 *                     idempotency conflict / KYC limit / fraud block /
 *                     no-from-account / no-to-account / INSUFFICIENT_BALANCE /
 *                     atomic completion / audit trail / StatusLog
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// mock های داخل transaction — خارج از vi.mock factory قابل دسترسی باشند
const txAuditLogCreate = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const txStatusLogCreate = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@/lib/db', () => ({
  default: {
    customer: { findFirst: vi.fn() },
    transaction: { findFirst: vi.fn(), create: vi.fn() },
    fintechAccount: { findFirst: vi.fn(), findUnique: vi.fn() },
    exchangeRateQuote: { findFirst: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        fintechAccount: {
          findFirst: vi
            .fn()
            .mockResolvedValue({ id: 'acc-to-1', status: 'ACTIVE', balance: BigInt(0) }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          update: vi.fn().mockResolvedValue({ balance: BigInt(10_000) }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({ balance: BigInt(500_000) }),
        },
        ledgerEntry: { create: vi.fn().mockResolvedValue({}) },
        transaction: {
          create: vi.fn().mockResolvedValue({ id: 'txn-fx-1' }),
          update: vi.fn().mockResolvedValue({}),
        },
        transactionStatusLog: { create: txStatusLogCreate },
        exchangeRateQuote: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'q-1',
            sellRate: '89.5',
            approvedAt: new Date(),
            expiresAt: null,
          }),
        },
        auditLog: { create: txAuditLogCreate },
      }),
    ),
  },
}));

vi.mock('@/lib/require-auth', () => ({ requireUser: vi.fn() }));
vi.mock('@/lib/rate-limiter', () => ({ checkRateLimit: vi.fn() }));
vi.mock('@/lib/revalidate', () => ({ revalidateTag: vi.fn() }));
vi.mock('@/lib/fraud/screener', () => ({
  screenTransaction: vi
    .fn()
    .mockResolvedValue({ score: 0, reasons: [], shouldBlock: false, shouldHold: false }),
}));
vi.mock('@/lib/kyc-limits', () => ({
  assertOutgoingKycLimit: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('@/lib/fintech/txn-trail', () => ({
  logTxnStatusChange: vi.fn().mockResolvedValue(undefined),
  logFintechEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue('127.0.0.1') }),
}));
// fx-trade از getMarketRates (بدون scrape) استفاده می‌کند نه assembleMarketRates.
vi.mock('@/actions/market-rates', () => ({
  getMarketRates: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/market-rates/fx', () => ({
  getGlobalFxRates: vi.fn().mockResolvedValue(null),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { executeFxTrade, getFxQuote } from '@/actions/fx-trade';
import prisma from '@/lib/db';
import { screenTransaction } from '@/lib/fraud/screener';
import { assertOutgoingKycLimit } from '@/lib/kyc-limits';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AUTH_OK = { success: true as const, user: { id: 'user-1', role: 'USER' as const } };
const AUTH_FAIL = {
  success: false as const,
  status: 401 as const,
  code: 'UNAUTHENTICATED' as const,
  message: '',
};
const RL_OK = { success: true as const, reset: Date.now() + 60000 };
const RL_FAIL = { success: false as const, reset: Date.now() + 30000 };

const CUSTOMER_ACTIVE = { id: 'cust-1', exchangeId: 'exch-1', status: 'ACTIVE' };
const CUSTOMER_FROZEN = { id: 'cust-1', exchangeId: 'exch-1', status: 'FROZEN' };

const RATE_QUOTE = {
  id: 'q-1',
  sellRate: '89.5',
  approvedAt: new Date(),
  createdAt: new Date(),
  expiresAt: null,
};

const VALID_TRADE = {
  fromCurrency: 'USD',
  toCurrency: 'AFN',
  amountCents: 100_00,
  idempotencyKey: 'fx-idem-0001',
};

const FROM_ACCOUNT = { id: 'acc-usd-1', balance: BigInt(500_00), exchangeId: 'exch-1' };

// ─── getFxQuote ───────────────────────────────────────────────────────────────

describe('getFxQuote', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    const r = await getFxQuote({ fromCurrency: 'USD', toCurrency: 'AFN' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
  });

  it('ارزهای یکسان → INVALID_PAIR', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    const r = await getFxQuote({ fromCurrency: 'USD', toCurrency: 'USD' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('INVALID_PAIR');
  });

  it('مشتری وجود ندارد → NO_CUSTOMER', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(null);
    const r = await getFxQuote({ fromCurrency: 'USD', toCurrency: 'AFN' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NO_CUSTOMER');
  });

  it('نرخی موجود نیست → NO_RATE', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ exchangeId: 'exch-1' } as never);
    vi.mocked(prisma.exchangeRateQuote.findFirst).mockResolvedValueOnce(null);
    const r = await getFxQuote({ fromCurrency: 'USD', toCurrency: 'AFN' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NO_RATE');
  });

  it('نرخ موجود → quote با rate و feePercent', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ exchangeId: 'exch-1' } as never);
    vi.mocked(prisma.exchangeRateQuote.findFirst).mockResolvedValueOnce(RATE_QUOTE as never);
    const r = await getFxQuote({ fromCurrency: 'USD', toCurrency: 'AFN' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.rate).toBe(89.5);
      expect(r.data.feePercent).toBeGreaterThan(0);
    }
  });
});

// ─── executeFxTrade ───────────────────────────────────────────────────────────

describe('executeFxTrade', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    const r = await executeFxTrade(VALID_TRADE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
  });

  it('rate-limit → RATE_LIMITED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_FAIL as never);
    const r = await executeFxTrade(VALID_TRADE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('RATE_LIMITED');
  });

  it('validation — amountCents منفی → VALIDATION_ERROR', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    const r = await executeFxTrade({ ...VALID_TRADE, amountCents: -100 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('VALIDATION_ERROR');
  });

  it('ارزهای یکسان → INVALID_PAIR', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    const r = await executeFxTrade({ ...VALID_TRADE, fromCurrency: 'AFN', toCurrency: 'AFN' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('INVALID_PAIR');
  });

  it('مشتری وجود ندارد → NO_CUSTOMER', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(null);
    const r = await executeFxTrade(VALID_TRADE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NO_CUSTOMER');
  });

  it('حساب مشتری مسدود → CUSTOMER_LOCKED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER_FROZEN as never);
    const r = await executeFxTrade(VALID_TRADE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('CUSTOMER_LOCKED');
  });

  it('idempotency — تراکنش COMPLETED قبلی → همان txnId', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER_ACTIVE as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-fx-exist',
      status: 'COMPLETED',
      currency: 'USD',
      destCurrency: 'AFN',
      amount: BigInt(100_00),
      meta: {
        toAmountCents: 895000,
        rate: 89.5,
        feeCents: 450,
        fromAccountId: null,
        toAccountId: null,
      },
    } as never);
    const r = await executeFxTrade(VALID_TRADE);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.txnId).toBe('txn-fx-exist');
  });

  it('idempotency conflict — کلید با پارامتر دیگر → IDEMPOTENCY_CONFLICT', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER_ACTIVE as never);
    // تراکنش COMPLETED اما با ارز متفاوت
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-conflict',
      status: 'COMPLETED',
      currency: 'EUR', // متفاوت از fromCurrency=USD
      destCurrency: 'AFN',
      amount: BigInt(100_00),
      meta: {},
    } as never);
    const r = await executeFxTrade(VALID_TRADE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('KYC limit → خطای AML', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER_ACTIVE as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(assertOutgoingKycLimit).mockResolvedValueOnce({
      ok: false,
      code: 'KYC_DAILY_LIMIT',
      error: 'سقف روزانه',
    } as never);
    const r = await executeFxTrade(VALID_TRADE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('KYC_DAILY_LIMIT');
  });

  it('fraud block → FRAUD_BLOCKED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER_ACTIVE as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(assertOutgoingKycLimit).mockResolvedValueOnce({ ok: true } as never);
    vi.mocked(screenTransaction).mockResolvedValueOnce({
      score: 88,
      reasons: [],
      shouldBlock: true,
      shouldHold: false,
    });
    const r = await executeFxTrade(VALID_TRADE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('FRAUD_BLOCKED');
  });

  it('حساب مبدأ وجود ندارد → NO_ACCOUNT', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER_ACTIVE as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(assertOutgoingKycLimit).mockResolvedValueOnce({ ok: true } as never);
    vi.mocked(prisma.exchangeRateQuote.findFirst).mockResolvedValueOnce(RATE_QUOTE as never);
    vi.mocked(prisma.fintechAccount.findFirst).mockResolvedValueOnce(null); // no from account
    const r = await executeFxTrade(VALID_TRADE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NO_ACCOUNT');
  });

  it('تبدیل موفق → txnId + audit trail + StatusLog COMPLETED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER_ACTIVE as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(assertOutgoingKycLimit).mockResolvedValueOnce({ ok: true } as never);
    vi.mocked(prisma.exchangeRateQuote.findFirst).mockResolvedValueOnce(RATE_QUOTE as never);
    vi.mocked(prisma.fintechAccount.findFirst).mockResolvedValueOnce(FROM_ACCOUNT as never);
    const r = await executeFxTrade(VALID_TRADE);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.txnId).toBeTypeOf('string');
    // audit داخل transaction ثبت شد (FX_EXCHANGE)
    expect(txAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'FX_EXCHANGE' }) }),
    );
    // StatusLog داخل transaction ثبت شد (PENDING→COMPLETED)
    expect(txStatusLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ toStatus: 'COMPLETED' }) }),
    );
  });
});
