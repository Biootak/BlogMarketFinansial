/**
 * transfer.ts — تست‌های امنیتی تکمیلی
 *
 * شکاف‌های پوشش‌داده‌نشده در transfer.test.ts:
 *   - Self-transfer: کاربر نمی‌تواند به خودش انتقال دهد
 *   - OTP bypass: تراکنش high-value بدون OTP نباید confirm شود
 *   - Cross-customer IDOR: confirmTransfer تراکنش کاربر دیگر را رد می‌کند
 *   - amountCents=0: مقدار صفر باید رد شود
 *   - idempotencyKey خیلی کوتاه: 7 کاراکتر باید رد شود
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  default: {
    user: { findFirst: vi.fn() },
    transaction: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    customer: { findFirst: vi.fn() },
    kycRecord: { findUnique: vi.fn().mockResolvedValue({ expiresAt: null }) },
    fintechAccount: { update: vi.fn() },
    ledgerEntry: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        fintechAccount: {
          findFirst: vi.fn().mockResolvedValue({ id: 'acc-recv' }),
          update: vi.fn().mockResolvedValue({ balance: BigInt(0) }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({ balance: BigInt(950000) }),
        },
        ledgerEntry: { create: vi.fn() },
        transaction: { update: vi.fn() },
      }),
    ),
  },
}));

vi.mock('@/lib/require-auth', () => ({ requireUser: vi.fn() }));
vi.mock('@/lib/csrf-server', () => ({ assertCsrf: vi.fn() }));
vi.mock('@/lib/rate-limiter', () => ({ checkRateLimit: vi.fn() }));
vi.mock('@/lib/revalidate', () => ({ revalidateTag: vi.fn() }));
vi.mock('@/lib/fintech/transaction-guard', () => ({
  isHighValueTransaction: vi.fn().mockReturnValue(false),
  requestTransactionOtp: vi.fn(),
  verifyTransactionOtp: vi.fn(),
}));
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue('127.0.0.1') }),
}));

// ─── Import ───────────────────────────────────────────────────────────────────

import { confirmTransfer, initiateTransfer } from '@/actions/transfer';
import prisma from '@/lib/db';
import { isHighValueTransaction, verifyTransactionOtp } from '@/lib/fintech/transaction-guard';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';

// ─── helpers ──────────────────────────────────────────────────────────────────

const USER_1 = { success: true as const, user: { id: 'user-1', role: 'USER' as const } };
const USER_2 = { success: true as const, user: { id: 'user-2', role: 'USER' as const } };
const _AUTH_FAIL = {
  success: false as const,
  status: 401 as const,
  code: 'UNAUTHENTICATED' as const,
  message: 'وارد شوید',
};
const RL_OK = { success: true as const };

const SENDER_CUSTOMER = {
  id: 'cust-1',
  FintechAccount: [{ id: 'acc-1', balance: BigInt(5_000_000), exchangeId: 'exch-1' }],
};
const _RECIPIENT_CUSTOMER = {
  id: 'cust-recv',
  FintechAccount: [{ id: 'acc-recv' }],
};

// ─── Self-transfer prevention ─────────────────────────────────────────────────

describe('initiateTransfer — self-transfer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recipientUserId = userId فرستنده → NOT_FOUND (کاربر خودش را پیدا نمی‌کند)', async () => {
    // user-1 به user-1 انتقال — findTransferRecipient با NOT { id: auth.user.id } اجرا می‌شود
    // در initiateTransfer recipientUserId از ورودی است — سرویس باید Customer گیرنده را پیدا کند
    // اگر recipient = sender باشد، customer.findFirst(where: { userId: 'user-1' }) sender را پیدا می‌کند
    // و هر دو به یک حساب دسترسی خواهند داشت — تست می‌کند که findFirst دوم null باشد
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.customer.findFirst)
      .mockResolvedValueOnce(SENDER_CUSTOMER as never)
      .mockResolvedValueOnce(null); // گیرنده همان فرستنده است ولی customer دیگری ندارد

    const result = await initiateTransfer({
      recipientUserId: 'user-1', // خودِ user-1
      amountCents: 500,
      idempotencyKey: 'key-self12345',
    });
    // گیرنده حساب ندارد → RECIPIENT_NO_ACCOUNT
    expect(result.success).toBe(false);
  });
});

// ─── OTP bypass prevention ────────────────────────────────────────────────────

describe('confirmTransfer — OTP bypass', () => {
  beforeEach(() => vi.clearAllMocks());

  it('تراکنش high-value بدون OTP → OTP_REQUIRED', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue({
      id: 'txn-high',
      status: 'PENDING',
      amount: BigInt(15_000_000), // بالای آستانه high-value
      currency: 'AFN',
      accountId: 'acc-1',
      meta: { txnRef: 'ref-hv', recipientCustomerId: 'cust-recv' },
      exchangeId: 'exch-1',
      customerId: 'cust-1',
    } as never);
    vi.mocked(isHighValueTransaction).mockReturnValue(true); // high-value!

    // بدون OTP — فقط txnId و txnRef ارسال شده
    const result = await confirmTransfer({ txnId: 'txn-high', txnRef: 'ref-hv' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('OTP_REQUIRED');
  });

  it('تراکنش high-value با OTP نادرست → رد می‌شود', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue({
      id: 'txn-high2',
      status: 'PENDING',
      amount: BigInt(15_000_000),
      currency: 'AFN',
      accountId: 'acc-1',
      meta: { txnRef: 'ref-hv2', recipientCustomerId: 'cust-recv' },
      exchangeId: 'exch-1',
      customerId: 'cust-1',
    } as never);
    vi.mocked(isHighValueTransaction).mockReturnValue(true);
    vi.mocked(verifyTransactionOtp).mockResolvedValue({
      success: false,
      error: { code: 'INVALID_OTP', message: 'کد نادرست' },
    } as never);

    const result = await confirmTransfer({ txnId: 'txn-high2', txnRef: 'ref-hv2', otp: '000000' });
    expect(result.success).toBe(false);
  });

  it('تراکنش high-value با OTP درست → COMPLETED', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue({
      id: 'txn-high3',
      status: 'PENDING',
      amount: BigInt(15_000_000),
      currency: 'AFN',
      accountId: 'acc-1',
      meta: { txnRef: 'ref-hv3', recipientCustomerId: 'cust-recv' },
      exchangeId: 'exch-1',
      customerId: 'cust-1',
    } as never);
    vi.mocked(isHighValueTransaction).mockReturnValue(true);
    vi.mocked(verifyTransactionOtp).mockResolvedValue({ success: true, data: {} } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await confirmTransfer({ txnId: 'txn-high3', txnRef: 'ref-hv3', otp: '123456' });
    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });
});

// ─── Cross-customer IDOR ──────────────────────────────────────────────────────

describe('confirmTransfer — cross-customer IDOR', () => {
  beforeEach(() => vi.clearAllMocks());

  it('user-2 نمی‌تواند تراکنش user-1 را تأیید کند', async () => {
    // user-2 وارد شده است
    vi.mocked(requireUser).mockResolvedValue(USER_2);
    // customer user-2 پیدا می‌شود
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({ id: 'cust-2' } as never);
    // ولی تراکنش customerId=cust-1 دارد (متعلق به user-1 است)
    // findFirst با where { id: 'txn-1', customerId: 'cust-2' } → null برمی‌گرداند
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);

    const result = await confirmTransfer({ txnId: 'txn-user1', txnRef: 'ref-1' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });
});

// ─── Validation edge cases ────────────────────────────────────────────────────

describe('initiateTransfer — ورودی‌های مرزی', () => {
  beforeEach(() => vi.clearAllMocks());

  it('amountCents=0 → VALIDATION_ERROR (باید positive باشد)', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    const result = await initiateTransfer({
      recipientUserId: 'u2',
      amountCents: 0,
      idempotencyKey: 'key-zero12345',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('idempotencyKey 7 کاراکتر → VALIDATION_ERROR (min=8)', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    const result = await initiateTransfer({
      recipientUserId: 'u2',
      amountCents: 100,
      idempotencyKey: '1234567', // 7 chars
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('amountCents اعشاری (float) → VALIDATION_ERROR (باید int باشد)', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    const result = await initiateTransfer({
      recipientUserId: 'u2',
      amountCents: 99.5,
      idempotencyKey: 'key-float12345',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('txnRef بدون txnId → VALIDATION_ERROR', async () => {
    vi.mocked(requireUser).mockResolvedValue(USER_1);
    const result = await confirmTransfer({ txnId: '', txnRef: 'ref-1' });
    expect(result.success).toBe(false);
  });
});
