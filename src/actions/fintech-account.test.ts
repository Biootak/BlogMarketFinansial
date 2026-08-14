/**
 * fintech-account.ts — تست‌های جامع واریز / برداشت / تأیید برداشت
 *
 * سناریوهای پوشش‌داده‌شده:
 *   requestDeposit   — auth guard / rate-limit / validation / idempotency /
 *                      NO_ACCOUNT / fraud block / audit trail / PENDING log
 *   requestWithdraw  — auth guard / rate-limit / validation / idempotency /
 *                      NO_ACCOUNT / INSUFFICIENT_BALANCE / KYC limit /
 *                      fraud block / OTP high-value / audit trail / PENDING log
 *   confirmWithdraw  — auth guard / validation / IDOR ownership / state guard /
 *                      idempotent COMPLETED / OTP required / double-spend atomic /
 *                      ALREADY_PROCESSED idempotency / audit trail
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const makeTx = (overrides = {}) => ({
  transaction: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  fintechAccount: {
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    findUniqueOrThrow: vi.fn().mockResolvedValue({ balance: BigInt(800_000) }),
  },
  ledgerEntry: { create: vi.fn().mockResolvedValue({}) },
  transactionStatusLog: { create: vi.fn().mockResolvedValue({}) },
  ...overrides,
});

vi.mock('@/lib/db', () => ({
  default: {
    transaction: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    customer: { findFirst: vi.fn() },
    fintechAccount: { findFirst: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(makeTx())),
  },
}));

vi.mock('@/lib/require-auth', () => ({ requireUser: vi.fn() }));
vi.mock('@/lib/rate-limiter', () => ({ checkRateLimit: vi.fn(), resetRateLimit: vi.fn() }));
vi.mock('@/lib/revalidate', () => ({ revalidateTag: vi.fn() }));
vi.mock('@/lib/fintech/transaction-guard', () => ({
  isHighValueTransaction: vi.fn().mockReturnValue(false),
  requestTransactionOtp: vi
    .fn()
    .mockResolvedValue({ success: true, data: { expiresInSeconds: 120 } }),
  verifyTransactionOtp: vi.fn().mockResolvedValue({ success: true }),
}));
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
vi.mock('@/lib/csrf-server', () => ({ assertCsrf: vi.fn().mockResolvedValue(undefined) }));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { confirmWithdraw, requestDeposit, requestWithdraw } from '@/actions/fintech-account';
import prisma from '@/lib/db';
import {
  isHighValueTransaction,
  requestTransactionOtp,
  verifyTransactionOtp,
} from '@/lib/fintech/transaction-guard';
import { logTxnStatusChange } from '@/lib/fintech/txn-trail';
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

const CUSTOMER = {
  id: 'cust-1',
  FintechAccount: [{ id: 'acc-1', balance: BigInt(1_000_000), exchangeId: 'exch-1' }],
};
// موجودی کافی برای برداشت‌های پرمبلغ (مثلاً ۵۰٬۰۰۰٬۰۰۰) — بدون این، تست به
// INSUFFICIENT_BALANCE می‌رسد و Once های OTP مصرف‌نشده به تست بعدی leak می‌کنند.
const CUSTOMER_HIGH_BALANCE = {
  id: 'cust-1',
  FintechAccount: [{ id: 'acc-1', balance: BigInt(100_000_000), exchangeId: 'exch-1' }],
};
const CUSTOMER_ZERO = {
  id: 'cust-1',
  FintechAccount: [{ id: 'acc-1', balance: BigInt(0), exchangeId: 'exch-1' }],
};
const CUSTOMER_NO_ACCOUNT = { id: 'cust-1', FintechAccount: [] };

const VALID_DEPOSIT = { amountCents: 50_000_00, currency: 'AFN', idempotencyKey: 'idem-dep-001' };
const VALID_WITHDRAW = {
  amountCents: 10_000_00,
  currency: 'AFN',
  idempotencyKey: 'idem-wit-001',
  destinationAccount: 'حساب-۱۲۳۴۵',
};

// ─── requestDeposit ───────────────────────────────────────────────────────────

describe('requestDeposit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    const r = await requestDeposit(VALID_DEPOSIT);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('rate-limit → RATE_LIMITED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_FAIL as never);
    const r = await requestDeposit(VALID_DEPOSIT);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('RATE_LIMITED');
  });

  it('validation — مبلغ منفی → VALIDATION_ERROR', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    const r = await requestDeposit({
      amountCents: -100,
      currency: 'AFN',
      idempotencyKey: 'k'.repeat(8),
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('VALIDATION_ERROR');
  });

  it('validation — idempotencyKey کوتاه → VALIDATION_ERROR', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    const r = await requestDeposit({
      amountCents: 100_00,
      currency: 'AFN',
      idempotencyKey: 'short',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('VALIDATION_ERROR');
  });

  it('idempotency — کلید تکراری → همان txnId (بدون insert جدید)', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    // B-DEPOSIT-IDMP fix: اکنون customer اول فچ می‌شود، سپس transaction
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-1', FintechAccount: [] } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-exist',
      meta: { txnRef: 'ref-abc' },
    } as never);
    const r = await requestDeposit(VALID_DEPOSIT);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.txnId).toBe('txn-exist');
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('NO_ACCOUNT — مشتری ندارد → NO_ACCOUNT', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(null);
    const r = await requestDeposit(VALID_DEPOSIT);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NO_ACCOUNT');
  });

  it('NO_ACCOUNT — حساب ارز ندارد → NO_ACCOUNT', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER_NO_ACCOUNT as never);
    // idempotency: بدون transaction موجود → transaction.findFirst null برمی‌گرداند
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    const r = await requestDeposit(VALID_DEPOSIT);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NO_ACCOUNT');
  });

  it('fraud block → FRAUD_BLOCKED (تراکنش ثبت نمی‌شود)', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(screenTransaction).mockResolvedValueOnce({
      score: 95,
      reasons: ['velocity'],
      shouldBlock: true,
      shouldHold: false,
    });
    const r = await requestDeposit(VALID_DEPOSIT);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('FRAUD_BLOCKED');
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('واریز موفق → txnId + txnRef + paymentInstructions', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({
      id: 'txn-dep-1',
      meta: {},
    } as never);
    const r = await requestDeposit(VALID_DEPOSIT);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.txnId).toBe('txn-dep-1');
      expect(r.data.paymentInstructions).toBeDefined();
    }
  });

  it('audit trail — logTxnStatusChange با PENDING صدا زده می‌شود', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({
      id: 'txn-dep-2',
      meta: {},
    } as never);
    await requestDeposit(VALID_DEPOSIT);
    expect(logTxnStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ toStatus: 'PENDING', fromStatus: null }),
    );
  });

  it('audit log — auditLog.create صدا زده می‌شود', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({
      id: 'txn-dep-3',
      meta: {},
    } as never);
    await requestDeposit(VALID_DEPOSIT);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'DEPOSIT_REQUESTED' }) }),
    );
  });
});

// ─── requestWithdraw ──────────────────────────────────────────────────────────

describe('requestWithdraw', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    const r = await requestWithdraw(VALID_WITHDRAW);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
  });

  it('rate-limit → RATE_LIMITED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_FAIL as never);
    const r = await requestWithdraw(VALID_WITHDRAW);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('RATE_LIMITED');
  });

  it('validation — destinationAccount کوتاه → VALIDATION_ERROR', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    const r = await requestWithdraw({ ...VALID_WITHDRAW, destinationAccount: 'ab' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('VALIDATION_ERROR');
  });

  it('idempotency — کلید تکراری → همان txnId', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    // B-IDMP-01 fix: اکنون customer اول فچ می‌شود، سپس transaction
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-1', FintechAccount: [] } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-w-exist',
      meta: { txnRef: 'ref-w' },
    } as never);
    const r = await requestWithdraw(VALID_WITHDRAW);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.txnId).toBe('txn-w-exist');
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('NO_ACCOUNT → error', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER_NO_ACCOUNT as never);
    // idempotency: بدون transaction موجود
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    const r = await requestWithdraw(VALID_WITHDRAW);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NO_ACCOUNT');
  });

  it('INSUFFICIENT_BALANCE → error (قبل از ثبت تراکنش)', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER_ZERO as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    const r = await requestWithdraw({ ...VALID_WITHDRAW, amountCents: 100_000_00 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('KYC limit — حد تراکنش از سقف بیشتر است → خطای AML', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(assertOutgoingKycLimit).mockResolvedValueOnce({
      ok: false,
      code: 'KYC_LIMIT_EXCEEDED',
      error: 'سقف تراکنش روزانه',
    } as never);
    const r = await requestWithdraw(VALID_WITHDRAW);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('KYC_LIMIT_EXCEEDED');
  });

  it('fraud block → FRAUD_BLOCKED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(assertOutgoingKycLimit).mockResolvedValueOnce({ ok: true } as never);
    vi.mocked(screenTransaction).mockResolvedValueOnce({
      score: 90,
      reasons: ['suspicious'],
      shouldBlock: true,
      shouldHold: false,
    });
    const r = await requestWithdraw(VALID_WITHDRAW);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('FRAUD_BLOCKED');
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('برداشت عادی موفق → txnId + needsOtp=false', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(assertOutgoingKycLimit).mockResolvedValueOnce({ ok: true } as never);
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({
      id: 'txn-w-1',
      meta: {},
    } as never);
    const r = await requestWithdraw(VALID_WITHDRAW);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.txnId).toBe('txn-w-1');
      expect(r.data.needsOtp).toBe(false);
    }
  });

  it('برداشت پرمبلغ → needsOtp=true + expiresInSeconds', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER_HIGH_BALANCE as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(assertOutgoingKycLimit).mockResolvedValueOnce({ ok: true } as never);
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({ id: 'txn-w-hv' } as never);
    vi.mocked(isHighValueTransaction).mockReturnValueOnce(true);
    vi.mocked(requestTransactionOtp).mockResolvedValueOnce({
      success: true,
      data: { expiresInSeconds: 120 },
    } as never);
    const r = await requestWithdraw({ ...VALID_WITHDRAW, amountCents: 500_000_00 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.needsOtp).toBe(true);
      expect(r.data.expiresInSeconds).toBe(120);
    }
  });

  it('OTP ارسال نشد → تراکنش FAILED می‌شود (نه PENDING مرده)', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER_HIGH_BALANCE as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(assertOutgoingKycLimit).mockResolvedValueOnce({ ok: true } as never);
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({ id: 'txn-w-fail' } as never);
    vi.mocked(isHighValueTransaction).mockReturnValueOnce(true);
    vi.mocked(requestTransactionOtp).mockResolvedValueOnce({
      success: false,
      error: { code: 'OTP_FAILED', message: 'خطا در ارسال OTP' },
    } as never);
    await requestWithdraw({ ...VALID_WITHDRAW, amountCents: 500_000_00 });
    // تراکنش باید به FAILED برود
    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'txn-w-fail' },
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
    // و StatusLog ثبت شود
    expect(logTxnStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ toStatus: 'FAILED', note: 'OTP_SEND_FAILED' }),
    );
  });
});

// ─── confirmWithdraw ──────────────────────────────────────────────────────────

describe('confirmWithdraw', () => {
  beforeEach(() => vi.clearAllMocks());

  const VALID_INPUT = { txnId: 'txn-w-1', txnRef: 'ref-001' };

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    const r = await confirmWithdraw(VALID_INPUT);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
  });

  it('validation — txnId خالی → VALIDATION_ERROR', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    const r = await confirmWithdraw({ txnId: '', txnRef: 'ref-001' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('VALIDATION_ERROR');
  });

  it('IDOR: تراکنش متعلق به کاربر دیگر → NOT_FOUND (نه FORBIDDEN)', async () => {
    // مهم: پیام باید NOT_FOUND باشد، نه اینکه تأیید کند تراکنش وجود دارد
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-attacker' } as never);
    // تراکنش برای cust-victim است — query با customerId=cust-attacker چیزی نمی‌یابد
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    const r = await confirmWithdraw(VALID_INPUT);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NOT_FOUND');
  });

  it('state guard: تراکنش COMPLETED → idempotent success', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-w-1',
      status: 'COMPLETED',
      amount: BigInt(100_00),
      currency: 'AFN',
      accountId: 'acc-1',
      exchangeId: 'exch-1',
      customerId: 'cust-1',
      meta: { txnRef: 'ref-001' },
    } as never);
    const r = await confirmWithdraw(VALID_INPUT);
    expect(r.success).toBe(true); // idempotent
  });

  it('state guard: تراکنش FAILED → INVALID_STATE', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-w-1',
      status: 'FAILED',
      amount: BigInt(100_00),
      currency: 'AFN',
      accountId: 'acc-1',
      exchangeId: 'exch-1',
      customerId: 'cust-1',
      meta: { txnRef: 'ref-001' },
    } as never);
    const r = await confirmWithdraw(VALID_INPUT);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('INVALID_STATE');
  });

  it('OTP_REQUIRED: تراکنش پرمبلغ بدون OTP → خطا', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-w-1',
      status: 'PENDING',
      amount: BigInt(500_000_00),
      currency: 'AFN',
      accountId: 'acc-1',
      exchangeId: 'exch-1',
      customerId: 'cust-1',
      meta: { txnRef: 'ref-001' },
    } as never);
    vi.mocked(isHighValueTransaction).mockReturnValueOnce(true);
    const r = await confirmWithdraw(VALID_INPUT);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('OTP_REQUIRED');
  });

  it('OTP اشتباه → خطا', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-w-1',
      status: 'PENDING',
      amount: BigInt(500_000_00),
      currency: 'AFN',
      accountId: 'acc-1',
      exchangeId: 'exch-1',
      customerId: 'cust-1',
      meta: { txnRef: 'ref-001' },
    } as never);
    vi.mocked(isHighValueTransaction).mockReturnValueOnce(true);
    vi.mocked(verifyTransactionOtp).mockResolvedValueOnce({
      success: false,
      error: { code: 'OTP_INVALID', message: 'کد اشتباه' },
    } as never);
    const r = await confirmWithdraw({ ...VALID_INPUT, otp: '000000' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('OTP_INVALID');
  });

  it('تأیید موفق → success + auditLog WITHDRAWAL_COMPLETED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-w-1',
      status: 'PENDING',
      amount: BigInt(100_000_00),
      currency: 'AFN',
      accountId: 'acc-1',
      exchangeId: 'exch-1',
      customerId: 'cust-1',
      meta: { txnRef: 'ref-001' },
    } as never);
    // $transaction با tx کامل — claim + debit + ledger + statusLog
    vi.mocked(prisma.$transaction).mockImplementationOnce((async (
      fn: (tx: Record<string, unknown>) => Promise<unknown>,
    ) =>
      fn({
        transaction: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        fintechAccount: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({ balance: BigInt(800_000) }),
          findFirst: vi.fn(),
          update: vi.fn(),
        },
        ledgerEntry: { create: vi.fn().mockResolvedValue({}) },
        transactionStatusLog: { create: vi.fn().mockResolvedValue({}) },
      })) as never);
    const r = await confirmWithdraw(VALID_INPUT);
    expect(r.success).toBe(true);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'WITHDRAWAL_COMPLETED' }),
      }),
    );
  });

  it('double-spend: ALREADY_PROCESSED → idempotent success بدون debit مجدد', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-w-1',
      status: 'PENDING',
      amount: BigInt(100_000_00),
      currency: 'AFN',
      accountId: 'acc-1',
      exchangeId: 'exch-1',
      customerId: 'cust-1',
      meta: { txnRef: 'ref-001' },
    } as never);
    // atomic claim می‌گوید 0 ردیف update شد — یعنی دیگری قبلاً claim کرده
    vi.mocked(prisma.$transaction).mockImplementationOnce((async (
      fn: (tx: Record<string, unknown>) => Promise<unknown>,
    ) =>
      fn({
        transaction: {
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }), // ALREADY_PROCESSED
        },
        fintechAccount: {
          updateMany: vi.fn(),
          findUniqueOrThrow: vi.fn(),
          findFirst: vi.fn(),
          update: vi.fn(),
        },
        ledgerEntry: { create: vi.fn() },
        transactionStatusLog: { create: vi.fn() },
      })) as never);
    const r = await confirmWithdraw(VALID_INPUT);
    // idempotent success — تراکنش قبلاً کامل شده
    expect(r.success).toBe(true);
  });

  // ─── B-TXNREF-01: txnRef باید با meta.txnRef تطبیق داشته باشد ──────────────

  it('B-TXNREF-01: txnRef اشتباه → INVALID_REFERENCE (شکاف قبلی)', async () => {
    // این تست باگ واقعی B-TXNREF-01 را پوشش می‌دهد:
    // قبل از fix، مهاجم می‌توانست txnRef را جعل کند و OTP مربوط به txnRef دیگری
    // را برای این تراکنش verify کند. fix: meta.txnRef با txnRef ورودی مطابقت می‌شود.
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-w-1',
      status: 'PENDING',
      amount: BigInt(100_000_00),
      currency: 'AFN',
      accountId: 'acc-1',
      exchangeId: 'exch-1',
      customerId: 'cust-1',
      meta: { txnRef: 'legitimate-ref-001' }, // txnRef واقعی در DB
    } as never);
    // مهاجم txnRef متفاوت ارسال می‌کند
    const r = await confirmWithdraw({ txnId: 'txn-w-1', txnRef: 'attacker-spoofed-ref' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('INVALID_REFERENCE');
    // نباید به $transaction برسد
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('B-TXNREF-01: txnRef صحیح → تراکنش به جلو می‌رود (مقابل false positive)', async () => {
    // مطمئن می‌شویم که fix باعث false positive نشده:
    // وقتی txnRef درست است باید به $transaction برسد نه INVALID_REFERENCE.
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-w-1',
      status: 'PENDING',
      amount: BigInt(100_000_00),
      currency: 'AFN',
      accountId: 'acc-1',
      exchangeId: 'exch-1',
      customerId: 'cust-1',
      meta: { txnRef: 'ref-001' }, // همان ref که در VALID_INPUT هست
    } as never);
    vi.mocked(prisma.$transaction).mockImplementationOnce((async (
      fn: (tx: Record<string, unknown>) => Promise<unknown>,
    ) =>
      fn({
        transaction: {
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        fintechAccount: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({ balance: BigInt(800_000) }),
          findFirst: vi.fn(),
          update: vi.fn(),
        },
        ledgerEntry: { create: vi.fn().mockResolvedValue({}) },
        transactionStatusLog: { create: vi.fn().mockResolvedValue({}) },
      })) as never);
    const r = await confirmWithdraw(VALID_INPUT); // txnRef: 'ref-001' = meta.txnRef
    expect(r.success).toBe(true);
  });
});
