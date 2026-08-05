/**
 * transfer.ts — تست‌های unit
 *
 * تمرکز: auth guard، validation schema، idempotency، state transitions.
 * DB مک شده — منطق business logic کامل تست می‌شود.
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

import { confirmTransfer, findTransferRecipient, initiateTransfer } from '@/actions/transfer';
import prisma from '@/lib/db';
import { isHighValueTransaction } from '@/lib/fintech/transaction-guard';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';

// ─── helpers ──────────────────────────────────────────────────────────────────

const AUTH_OK = { success: true as const, user: { id: 'user-1', role: 'USER' as const } };
const AUTH_FAIL = {
  success: false as const,
  status: 401 as const,
  code: 'UNAUTHENTICATED' as const,
  message: 'وارد شوید',
};
const RL_OK = { success: true as const };
const RL_FAIL = { success: false as const };

const MOCK_RECIPIENT_USER = {
  id: 'user-recv',
  name: 'گیرنده',
  KycRecord: { reviewedAt: new Date(), rejectedReason: null },
};

const MOCK_SENDER_CUSTOMER = {
  id: 'cust-1',
  FintechAccount: [{ id: 'acc-1', balance: BigInt(1_000_000), exchangeId: 'exch-1' }],
};

const MOCK_RECIPIENT_CUSTOMER = {
  id: 'cust-recv',
  kycStatus: 'APPROVED',
  kycLevel: 'VERIFIED',
  FintechAccount: [{ id: 'acc-recv' }],
};

// ─── findTransferRecipient ────────────────────────────────────────────────────

describe('findTransferRecipient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // T1-P1: findTransferRecipient حالا rate-limit می‌شود؛ پیش‌فرض OK
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
  });

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_FAIL);
    const result = await findTransferRecipient({ identifier: '07012345678' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('UNAUTHORIZED');
  });

  it('identifier کوتاه → VALIDATION_ERROR', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    const result = await findTransferRecipient({ identifier: '123' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('کاربر یافت نشد → NOT_FOUND', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    const result = await findTransferRecipient({ identifier: '07012345678' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('کاربر با KYC تأیید‌شده → APPROVED', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(MOCK_RECIPIENT_USER as never);
    const result = await findTransferRecipient({ identifier: '07012345678' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kycStatus).toBe('APPROVED');
      expect(result.data.id).toBe('user-recv');
    }
  });

  it('کاربر بدون KYC → PENDING', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      ...MOCK_RECIPIENT_USER,
      KycRecord: null,
    } as never);
    const result = await findTransferRecipient({ identifier: '07012345678' });
    if (result.success) expect(result.data.kycStatus).toBe('PENDING');
  });
});

// ─── initiateTransfer ─────────────────────────────────────────────────────────

describe('initiateTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // پاک‌سازی mockOnceهای مصرف‌نشده (مثلاً وقتی balance check زودتر return می‌کند)
    vi.mocked(prisma.customer.findFirst).mockReset();
  });

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_FAIL);
    const result = await initiateTransfer({});
    expect(result.success).toBe(false);
  });

  it('rate limit → RATE_LIMITED', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValue(RL_FAIL as never);
    const result = await initiateTransfer({
      recipientUserId: 'u2',
      amountCents: 100,
      idempotencyKey: 'key-123456789',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RATE_LIMITED');
  });

  it('ورودی نامعتبر (amountCents منفی) → VALIDATION_ERROR', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    const result = await initiateTransfer({
      recipientUserId: 'u2',
      amountCents: -100,
      idempotencyKey: 'key-123456789',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('idempotency hit → همان txnId برمی‌گرداند', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValue(MOCK_SENDER_CUSTOMER as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue({
      id: 'txn-existing',
      customerId: 'cust-1',
      meta: { txnRef: 'ref-xyz' },
    } as never);

    const result = await initiateTransfer({
      recipientUserId: 'u2',
      amountCents: 500,
      idempotencyKey: 'key-duplicate',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.txnId).toBe('txn-existing');
    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: { idempotencyKey: 'key-duplicate' },
      select: { id: true, customerId: true, meta: true },
    });
  });

  it('idempotency key کاربر دیگر → نباید transaction او را replay کند', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.customer.findFirst).mockResolvedValue(MOCK_SENDER_CUSTOMER as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue({
      id: 'txn-other',
      customerId: 'cust-other',
      meta: { txnRef: 'ref-other' },
    } as never);

    const result = await initiateTransfer({
      recipientUserId: 'u2',
      amountCents: 500,
      idempotencyKey: 'key-owned-by-other-user',
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('حساب فرستنده یافت نشد → NO_ACCOUNT', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.customer.findFirst).mockResolvedValue(null);

    const result = await initiateTransfer({
      recipientUserId: 'u2',
      amountCents: 500,
      idempotencyKey: 'key-noaccnt1',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NO_ACCOUNT');
  });

  it('موجودی ناکافی → INSUFFICIENT_BALANCE', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.customer.findFirst)
      .mockResolvedValueOnce({
        id: 'cust-1',
        FintechAccount: [{ id: 'acc-1', balance: BigInt(100), exchangeId: 'exch-1' }],
      } as never)
      .mockResolvedValueOnce(MOCK_RECIPIENT_CUSTOMER as never);

    const result = await initiateTransfer({
      recipientUserId: 'u2',
      amountCents: 99999999,
      idempotencyKey: 'key-insuff11',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('انتقال معتبر → txnId برمی‌گرداند و needsOtp=false', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.customer.findFirst)
      .mockResolvedValueOnce(MOCK_SENDER_CUSTOMER as never)
      .mockResolvedValueOnce(MOCK_RECIPIENT_CUSTOMER as never);
    vi.mocked(prisma.transaction.create).mockResolvedValue({ id: 'txn-new' } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
    vi.mocked(isHighValueTransaction).mockReturnValue(false);

    const result = await initiateTransfer({
      recipientUserId: 'u2',
      amountCents: 50000,
      idempotencyKey: 'key-valid1234',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.txnId).toBe('txn-new');
      expect(result.data.needsOtp).toBe(false);
    }
  });

  it('مبلغ بالا → needsOtp=true و OTP درخواست می‌شود', async () => {
    const { requestTransactionOtp } = await import('@/lib/fintech/transaction-guard');
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.customer.findFirst)
      .mockResolvedValueOnce({
        ...MOCK_SENDER_CUSTOMER,
        FintechAccount: [{ id: 'acc-1', balance: BigInt(20_000_000), exchangeId: 'exch-1' }],
      } as never)
      .mockResolvedValueOnce(MOCK_RECIPIENT_CUSTOMER as never);
    vi.mocked(prisma.transaction.create).mockResolvedValue({ id: 'txn-hv' } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
    vi.mocked(isHighValueTransaction).mockReturnValue(true); // high-value!
    vi.mocked(requestTransactionOtp).mockResolvedValue({
      success: true,
      data: { expiresInSeconds: 120, devCode: '123456' },
    } as never);

    const result = await initiateTransfer({
      recipientUserId: 'u2',
      amountCents: 15_000_000,
      idempotencyKey: 'key-highvalue12',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.needsOtp).toBe(true);
      expect(result.data.expiresInSeconds).toBe(120);
    }
    expect(requestTransactionOtp).toHaveBeenCalledOnce();
  });
});

// ─── confirmTransfer ──────────────────────────────────────────────────────────

describe('confirmTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.customer.findFirst).mockReset();
  });

  it('بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_FAIL);
    const result = await confirmTransfer({ txnId: 't1', txnRef: 'r1' });
    expect(result.success).toBe(false);
  });

  it('ورودی نامعتبر → VALIDATION_ERROR', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    const result = await confirmTransfer({ txnId: '' });
    expect(result.success).toBe(false);
  });

  it('تراکنش یافت نشد → NOT_FOUND', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);

    const result = await confirmTransfer({ txnId: 'txn-missing', txnRef: 'ref-1' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('تراکنش COMPLETED → idempotent موفق', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue({
      id: 'txn-1',
      status: 'COMPLETED',
    } as never);

    const result = await confirmTransfer({ txnId: 'txn-1', txnRef: 'ref-1' });
    expect(result.success).toBe(true);
  });

  it('تراکنش CANCELLED → INVALID_STATE', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue({
      id: 'txn-1',
      status: 'CANCELLED',
    } as never);

    const result = await confirmTransfer({ txnId: 'txn-1', txnRef: 'ref-1' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_STATE');
  });

  it('تراکنش PENDING بدون OTP → COMPLETED', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue({
      id: 'txn-1',
      status: 'PENDING',
      amount: BigInt(50000),
      currency: 'AFN',
      accountId: 'acc-1',
      meta: { recipientCustomerId: 'cust-recv' },
      exchangeId: 'exch-1',
      customerId: 'cust-1',
    } as never);
    vi.mocked(isHighValueTransaction).mockReturnValue(false);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await confirmTransfer({ txnId: 'txn-1', txnRef: 'ref-1' });
    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('meta بدون recipientCustomerId → MISSING_RECIPIENT', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue({
      id: 'txn-1',
      status: 'PENDING',
      amount: BigInt(50000),
      currency: 'AFN',
      accountId: 'acc-1',
      meta: {},
      exchangeId: 'exch-1',
      customerId: 'cust-1',
    } as never);
    vi.mocked(isHighValueTransaction).mockReturnValue(false);

    const result = await confirmTransfer({ txnId: 'txn-1', txnRef: 'ref-1' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('MISSING_RECIPIENT');
  });

  it('accountId null → INVALID_STATE', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({ id: 'cust-1' } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue({
      id: 'txn-1',
      status: 'PENDING',
      amount: BigInt(50000),
      currency: 'AFN',
      accountId: null,
      meta: { recipientCustomerId: 'cust-recv' },
      exchangeId: 'exch-1',
      customerId: null,
    } as never);
    vi.mocked(isHighValueTransaction).mockReturnValue(false);

    const result = await confirmTransfer({ txnId: 'txn-1', txnRef: 'ref-1' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_STATE');
  });

  it('گیرنده NO_ACCOUNT → حساب گیرنده را پیدا نمی‌کند (branch)', async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTH_OK);
    vi.mocked(prisma.customer.findFirst)
      .mockResolvedValueOnce(MOCK_SENDER_CUSTOMER as never)
      .mockResolvedValueOnce(null); // گیرنده حساب ندارد
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);
    vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
    vi.mocked(prisma.transaction.create).mockResolvedValue({ id: 'txn-x' } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const result = await initiateTransfer({
      recipientUserId: 'u-noaccnt',
      amountCents: 500,
      idempotencyKey: 'key-norecv123',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RECIPIENT_NO_ACCOUNT');
  });
});
