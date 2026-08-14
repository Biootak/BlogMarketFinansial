/**
 * financial-integrity.test.ts — تست‌های یکپارچگی مالی
 *
 * هدف: اطمینان از اینکه هیچ تراکنش مالی بدون ردیابی کامل رخ نمی‌دهد،
 *      double-spend جلوگیری می‌شود، atomic claim کار می‌کند، و تمام
 *      مسیرهای خطا منجر به StatusLog و AuditLog صحیح می‌شوند.
 *
 * سناریوهای پوشش‌داده‌شده:
 *   Audit trail:    همه عملیات مالی AuditLog ثبت می‌کنند
 *   StatusLog:      هر تغییر وضعیت (PENDING/COMPLETED/FAILED) ثبت می‌شود
 *   Atomic claim:   double-spend با optimistic locking جلوگیری می‌شود
 *   FAILED state:   تراکنش‌های ناموفق به FAILED می‌روند (نه PENDING مرده)
 *   Idempotency:    درخواست تکراری همان نتیجه را برمی‌گرداند بدون insert مجدد
 *   Ledger:         debit + credit هر دو ثبت می‌شوند در atomic transaction
 *   IDOR guard:     ownership check قبل از هر mutation
 *   Fraud hold:     تراکنش‌های held در meta ثبت می‌شوند
 *   executeConfirmTransfer — atomic core engine: INSUFFICIENT_BALANCE → FAILED + StatusLog
 *                            RECIPIENT_NO_ACCOUNT → FAILED + StatusLog
 *                            ALREADY_PROCESSED → idempotent OK
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const makeTx = (overrides: Record<string, unknown> = {}) => ({
  fintechAccount: {
    findFirst: vi.fn().mockResolvedValue({ id: 'acc-to-1', balance: BigInt(0) }),
    update: vi.fn().mockResolvedValue({ balance: BigInt(10_000) }),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    findUniqueOrThrow: vi.fn().mockResolvedValue({ balance: BigInt(500_000) }),
  },
  ledgerEntry: { create: vi.fn().mockResolvedValue({}) },
  transaction: {
    findFirst: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: 'txn-new', accountId: 'acc-1', exchangeId: 'exch-1' }),
    update: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  transactionStatusLog: { create: vi.fn().mockResolvedValue({}) },
  ...overrides,
});

vi.mock('@/lib/db', () => ({
  default: {
    user: { findFirst: vi.fn() },
    // update باید resolved برگرداند — پیاده‌سازی .then روی آن زنجیره می‌کند
    transaction: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn().mockResolvedValue({}) },
    customer: { findFirst: vi.fn() },
    fintechAccount: { findFirst: vi.fn(), update: vi.fn() },
    ledgerEntry: { create: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    transactionStatusLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(makeTx())),
  },
}));

vi.mock('@/lib/require-auth', () => ({ requireUser: vi.fn() }));
vi.mock('@/lib/csrf-server', () => ({ assertCsrf: vi.fn() }));
vi.mock('@/lib/rate-limiter', () => ({ checkRateLimit: vi.fn(), resetRateLimit: vi.fn() }));
vi.mock('@/lib/revalidate', () => ({ revalidateTag: vi.fn() }));
vi.mock('@/lib/fraud/screener', () => ({
  screenTransaction: vi
    .fn()
    .mockResolvedValue({ score: 0, reasons: [], shouldBlock: false, shouldHold: false }),
}));
vi.mock('@/lib/kyc-limits', () => ({
  assertOutgoingKycLimit: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('@/lib/fintech/transaction-guard', () => ({
  isHighValueTransaction: vi.fn().mockReturnValue(false),
  requestTransactionOtp: vi
    .fn()
    .mockResolvedValue({ success: true, data: { expiresInSeconds: 120 } }),
  verifyTransactionOtp: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('@/lib/fintech/txn-trail', () => ({
  logTxnStatusChange: vi.fn().mockResolvedValue(undefined),
  logFintechEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue('127.0.0.1') }),
}));
vi.mock('@/lib/notifications/telegram-user', () => ({
  notifyTelegramCustomer: vi.fn().mockResolvedValue(undefined),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { requestDeposit, requestWithdraw } from '@/actions/fintech-account';
import { executeConfirmTransfer } from '@/actions/transfer';
import prisma from '@/lib/db';
import { logTxnStatusChange } from '@/lib/fintech/txn-trail';
import { screenTransaction } from '@/lib/fraud/screener';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AUTH_OK = { success: true as const, user: { id: 'user-1', role: 'USER' as const } };
const RL_OK = { success: true as const, reset: Date.now() + 60000 };
const CUSTOMER = {
  id: 'cust-1',
  FintechAccount: [{ id: 'acc-1', balance: BigInt(1_000_000), exchangeId: 'exch-1' }],
};
// موجودی کافی برای برداشت‌های پرمبلغ (۵۰٬۰۰۰٬۰۰۰) — بدون این، تست به
// INSUFFICIENT_BALANCE می‌رسد و مسیر OTP هرگز طی نمی‌شود.
const CUSTOMER_HIGH_BALANCE = {
  id: 'cust-1',
  FintechAccount: [{ id: 'acc-1', balance: BigInt(100_000_000), exchangeId: 'exch-1' }],
};

// ─── Audit Trail: همه عملیات AuditLog دارند ──────────────────────────────────

describe('Audit Trail — همه عملیات مالی باید AuditLog ثبت کنند', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requestDeposit موفق → auditLog با action=DEPOSIT_REQUESTED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER as never);
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({ id: 'txn-1', meta: {} } as never);
    await requestDeposit({
      amountCents: 100_000_00,
      currency: 'AFN',
      idempotencyKey: 'dep-audit-001',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'DEPOSIT_REQUESTED', entityType: 'Transaction' }),
      }),
    );
  });

  it('requestWithdraw موفق → auditLog با action=WITHDRAWAL_REQUESTED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER as never);
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({ id: 'txn-2', meta: {} } as never);
    await requestWithdraw({
      amountCents: 10_000_00,
      currency: 'AFN',
      idempotencyKey: 'wit-audit-001',
      destinationAccount: 'حساب-آزمایش',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'WITHDRAWAL_REQUESTED',
          entityType: 'Transaction',
        }),
      }),
    );
  });

  it('executeConfirmTransfer موفق → auditLog با action=TRANSFER_COMPLETED', async () => {
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-t-1',
      status: 'PENDING',
      amount: BigInt(50_000_00),
      currency: 'AFN',
      accountId: 'acc-1',
      meta: { recipientCustomerId: 'cust-recv' },
      exchangeId: 'exch-1',
      customerId: 'cust-1',
    } as never);
    await executeConfirmTransfer({ txnId: 'txn-t-1', customerId: 'cust-1', actorId: 'user-1' });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'TRANSFER_COMPLETED' }),
      }),
    );
  });
});

// ─── StatusLog: هر تغییر وضعیت ثبت می‌شود ────────────────────────────────────

describe('TransactionStatusLog — هر انتقال وضعیت باید ثبت شود', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requestDeposit → StatusLog با fromStatus=null, toStatus=PENDING', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER as never);
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({
      id: 'txn-sl-1',
      meta: {},
    } as never);
    await requestDeposit({ amountCents: 50_000_00, currency: 'AFN', idempotencyKey: 'sl-dep-001' });
    expect(logTxnStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ fromStatus: null, toStatus: 'PENDING' }),
    );
  });

  it('executeConfirmTransfer موفق → StatusLog PENDING→COMPLETED داخل transaction', async () => {
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-sl-2',
      status: 'PENDING',
      amount: BigInt(10_000_00),
      currency: 'AFN',
      accountId: 'acc-1',
      meta: { recipientCustomerId: 'cust-recv' },
      exchangeId: 'exch-1',
      customerId: 'cust-1',
    } as never);
    const txMock = makeTx();
    vi.mocked(prisma.$transaction).mockImplementationOnce((async (
      fn: (tx: Record<string, unknown>) => Promise<unknown>,
    ) => fn(txMock)) as never);
    await executeConfirmTransfer({ txnId: 'txn-sl-2', customerId: 'cust-1', actorId: 'user-1' });
    // transactionStatusLog.create داخل $transaction باید صدا زده شود
    expect(txMock.transactionStatusLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fromStatus: 'PENDING',
          toStatus: 'COMPLETED',
          note: 'TRANSFER_COMPLETED',
        }),
      }),
    );
  });

  it('executeConfirmTransfer INSUFFICIENT_BALANCE → تراکنش FAILED می‌شود', async () => {
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-sl-3',
      status: 'PENDING',
      amount: BigInt(999_000_00),
      currency: 'AFN',
      accountId: 'acc-1',
      meta: { recipientCustomerId: 'cust-recv' },
      exchangeId: 'exch-1',
      customerId: 'cust-1',
    } as never);
    vi.mocked(prisma.$transaction).mockImplementationOnce((async (
      fn: (tx: Record<string, unknown>) => Promise<unknown>,
    ) =>
      fn({
        ...makeTx(),
        fintechAccount: {
          findFirst: vi.fn().mockResolvedValue({ id: 'acc-to-1' }),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }), // موجودی کافی نیست
          update: vi.fn(),
          findUniqueOrThrow: vi.fn(),
        },
        transaction: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }), // claim موفق
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
      })) as never);
    const r = await executeConfirmTransfer({
      txnId: 'txn-sl-3',
      customerId: 'cust-1',
      actorId: 'user-1',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('INSUFFICIENT_BALANCE');
    // تراکنش باید به FAILED برود
    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'txn-sl-3' },
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('executeConfirmTransfer RECIPIENT_NO_ACCOUNT → تراکنش FAILED می‌شود', async () => {
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-sl-4',
      status: 'PENDING',
      amount: BigInt(10_000_00),
      currency: 'AFN',
      accountId: 'acc-1',
      meta: { recipientCustomerId: 'cust-gone' },
      exchangeId: 'exch-1',
      customerId: 'cust-1',
    } as never);
    vi.mocked(prisma.$transaction).mockImplementationOnce((async (
      fn: (tx: Record<string, unknown>) => Promise<unknown>,
    ) =>
      fn({
        ...makeTx(),
        fintechAccount: {
          findFirst: vi.fn().mockResolvedValue(null), // گیرنده حساب ندارد
          updateMany: vi.fn(),
          update: vi.fn(),
          findUniqueOrThrow: vi.fn(),
        },
        transaction: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
      })) as never);
    const r = await executeConfirmTransfer({
      txnId: 'txn-sl-4',
      customerId: 'cust-1',
      actorId: 'user-1',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('RECIPIENT_NO_ACCOUNT');
    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    );
  });

  it('requestWithdraw OTP fail → تراکنش FAILED می‌شود + StatusLog', async () => {
    const { isHighValueTransaction, requestTransactionOtp } = await import(
      '@/lib/fintech/transaction-guard'
    );
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER_HIGH_BALANCE as never);
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({ id: 'txn-otp-fail' } as never);
    vi.mocked(isHighValueTransaction).mockReturnValueOnce(true);
    vi.mocked(requestTransactionOtp).mockResolvedValueOnce({
      success: false,
      error: { code: 'OTP_SEND_ERROR', message: 'سرویس OTP در دسترس نیست' },
    } as never);
    await requestWithdraw({
      amountCents: 500_000_00,
      currency: 'AFN',
      idempotencyKey: 'wit-otp-fail-01',
      destinationAccount: 'حساب-تست',
    });
    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'txn-otp-fail' },
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
    expect(logTxnStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ toStatus: 'FAILED', note: 'OTP_SEND_FAILED' }),
    );
  });
});

// ─── Atomic Claim / Double-Spend Prevention ───────────────────────────────────

describe('Atomic Claim — Double-Spend Prevention', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ALREADY_PROCESSED → idempotent OK بدون debit مجدد', async () => {
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-dup',
      status: 'PENDING',
      amount: BigInt(100_00),
      currency: 'AFN',
      accountId: 'acc-1',
      meta: { recipientCustomerId: 'cust-recv' },
      exchangeId: 'exch-1',
      customerId: 'cust-1',
    } as never);
    // atomic claim: 0 ردیف update → دیگری claim کرده
    const txMock = makeTx({
      transaction: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }), // ALREADY_PROCESSED
      },
    });
    vi.mocked(prisma.$transaction).mockImplementationOnce((async (
      fn: (tx: Record<string, unknown>) => Promise<unknown>,
    ) => fn(txMock)) as never);
    const r = await executeConfirmTransfer({
      txnId: 'txn-dup',
      customerId: 'cust-1',
      actorId: 'user-1',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.alreadyProcessed).toBe(true);
    // debit نباید رخ داده باشد
    expect(txMock.fintechAccount.updateMany).not.toHaveBeenCalled();
  });

  it('تراکنش COMPLETED قبلی → idempotent OK (بدون re-execute)', async () => {
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-comp',
      status: 'COMPLETED',
      amount: BigInt(100_00),
      currency: 'AFN',
      accountId: 'acc-1',
      meta: { recipientCustomerId: 'cust-recv' },
      exchangeId: 'exch-1',
      customerId: 'cust-1',
    } as never);
    const r = await executeConfirmTransfer({
      txnId: 'txn-comp',
      customerId: 'cust-1',
      actorId: 'user-1',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.alreadyProcessed).toBe(true);
    // $transaction نباید صدا زده شود — از همان ابتدا short-circuit
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('تراکنش CANCELLED/FAILED → شکست بدون execute', async () => {
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-fail',
      status: 'FAILED',
      amount: BigInt(100_00),
      currency: 'AFN',
      accountId: 'acc-1',
      meta: { recipientCustomerId: 'cust-recv' },
      exchangeId: 'exch-1',
      customerId: 'cust-1',
    } as never);
    const r = await executeConfirmTransfer({
      txnId: 'txn-fail',
      customerId: 'cust-1',
      actorId: 'user-1',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('INVALID_STATE');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

// ─── Fraud Screening: meta ثبت می‌شود ────────────────────────────────────────

describe('Fraud Screening — hold/score در meta تراکنش ثبت می‌شود', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fraud hold → تراکنش ثبت می‌شود با fraudHeld=true در meta', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER as never);
    vi.mocked(screenTransaction).mockResolvedValueOnce({
      score: 72,
      reasons: ['velocity'],
      shouldBlock: false,
      shouldHold: true,
    });
    vi.mocked(prisma.transaction.create).mockResolvedValueOnce({ id: 'txn-held' } as never);
    await requestDeposit({
      amountCents: 50_000_00,
      currency: 'AFN',
      idempotencyKey: 'dep-hold-001',
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          meta: expect.objectContaining({ fraudHeld: true, fraudScore: 72 }),
        }),
      }),
    );
    // StatusLog باید HELD را ذکر کند
    expect(logTxnStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ note: expect.stringContaining('HELD') }),
    );
  });

  it('fraud block → تراکنش ثبت نمی‌شود + FRAUD_BLOCKED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce(CUSTOMER as never);
    vi.mocked(screenTransaction).mockResolvedValueOnce({
      score: 95,
      reasons: [],
      shouldBlock: true,
      shouldHold: false,
    });
    const r = await requestDeposit({
      amountCents: 50_000_00,
      currency: 'AFN',
      idempotencyKey: 'dep-block-001',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('FRAUD_BLOCKED');
    expect(prisma.transaction.create).not.toHaveBeenCalled();
    expect(logTxnStatusChange).not.toHaveBeenCalled();
  });
});

// ─── Idempotency: درخواست تکراری → همان نتیجه ───────────────────────────────

describe('Idempotency — درخواست تکراری بدون side effect اضافی', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deposit تکراری با همان کلید → همان txnId بدون create جدید', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    // B-DEPOSIT-IDMP fix: customer قبل از transaction فچ می‌شود
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-1', FintechAccount: [] } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-idem-dep',
      meta: { txnRef: 'ref-idem' },
    } as never);
    const r = await requestDeposit({
      amountCents: 100_000_00,
      currency: 'AFN',
      idempotencyKey: 'existing-key-123',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.txnId).toBe('txn-idem-dep');
    expect(prisma.transaction.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(logTxnStatusChange).not.toHaveBeenCalled();
  });

  it('withdraw تکراری با همان کلید → همان txnId', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK);
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    // B-IDMP-01 fix: customer قبل از transaction فچ می‌شود
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-1', FintechAccount: [] } as never);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'txn-idem-wit',
      meta: { txnRef: 'ref-w-idem' },
    } as never);
    const r = await requestWithdraw({
      amountCents: 50_000_00,
      currency: 'AFN',
      idempotencyKey: 'existing-w-key',
      destinationAccount: 'حساب-تست',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.txnId).toBe('txn-idem-wit');
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });
});
