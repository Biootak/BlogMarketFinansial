/**
 * concurrency.test.ts — تست‌های race-condition برای جابجایی پول
 *
 * هدف: اثبات اینکه دو درخواست هم‌زمان روی یک تراکنش/تسویه نمی‌توانند
 * دوبار برداشت/پرداخت/ایجاد کنند. مکانیزم اصلاحی (atomic claim با
 * updateMany شرطی + unique constraint) با شبیه‌سازی count=0 در mock
 * تست می‌شود.
 *
 * نکته: در mock، `$transaction` فوری اجرا می‌شود. برای شبیه‌سازی
 * هم‌زمانی، چند فراخوانی هم‌زمان صدا می‌زنیم و مطمئن می‌شویم منطق
 * claim (updateMany با شرط status) دقیقاً یک‌بار موفق می‌شود و بقیه
 * idempotent برمی‌گردند.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock: confirmTransfer / confirmWithdraw ──────────────────────────────────

vi.mock('@/lib/db', () => ({
  default: {
    customer: { findFirst: vi.fn() },
    transaction: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: 'txn-1', status: 'FAILED' }),
    },
    transactionStatusLog: { create: vi.fn().mockResolvedValue({}) },
    fintechAccount: { findFirst: vi.fn() },
    ledgerEntry: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    // برای markSettlementPaid / computePeriodSettlement
    settlement: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    currencyDeal: { findMany: vi.fn() },
    exchange: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/require-auth', () => ({
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  requirePermission: vi.fn(),
}));
vi.mock('@/lib/csrf-server', () => ({ assertCsrf: vi.fn() }));
vi.mock('@/lib/rate-limiter', () => ({ checkRateLimit: vi.fn() }));
vi.mock('@/lib/revalidate', () => ({ revalidateTag: vi.fn() }));
vi.mock('@/lib/fintech/transaction-guard', () => ({
  isHighValueTransaction: vi.fn().mockReturnValue(false),
  requestTransactionOtp: vi.fn(),
  verifyTransactionOtp: vi.fn(),
}));
vi.mock('@/lib/fraud/screener', () => ({
  screenTransaction: vi
    .fn()
    .mockResolvedValue({ score: 0, reasons: [], shouldBlock: false, shouldHold: false }),
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

import { confirmWithdraw } from '@/actions/fintech-account';
import { markSettlementPaid } from '@/actions/settlement';
import { confirmTransfer } from '@/actions/transfer';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requirePermission, requireUser } from '@/lib/require-auth';

const USER = { success: true as const, user: { id: 'user-1', role: 'USER' as const } };
const RL_OK = { success: true as const };

const TXN = {
  id: 'txn-1',
  status: 'PENDING',
  amount: BigInt(100_000),
  currency: 'AFN',
  accountId: 'acc-1',
  customerId: 'cust-1',
  exchangeId: 'exch-1',
  meta: { txnRef: 'ref-1', recipientCustomerId: 'cust-2' },
};

function txClient(claimCount: number) {
  return {
    transaction: { updateMany: vi.fn().mockResolvedValue({ count: claimCount }) },
    fintechAccount: {
      findFirst: vi.fn().mockResolvedValue({ id: 'acc-recv' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ balance: BigInt(400_000) }),
      update: vi.fn().mockResolvedValue({ balance: BigInt(500_000) }),
    },
    ledgerEntry: {
      create: vi.fn(),
      findFirst: vi.fn().mockResolvedValue({ runningBalance: BigInt(0) }),
    },
    transactionStatusLog: { create: vi.fn() },
  };
}

// mockImplementation برای $transaction با تایپ واقعی Prisma ناسازگار است؛
// cast به never تا تایپ mock (که شبیه‌سازی tx است) آزاد بماند.
// بدنه تراکنش (fn) را با آبجکت tx شبیه‌سازی‌شده صدا می‌زند و نتیجه را
// در Promise می‌پیچد تا با امضای $transaction سازگار باشد.
function mockTxn(getTx: () => unknown) {
  vi.mocked(prisma.$transaction).mockImplementation(((fn: (tx: unknown) => Promise<unknown>) =>
    Promise.resolve(fn(getTx()))) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue(USER);
  vi.mocked(requirePermission).mockResolvedValue({
    success: true as const,
    user: { id: 'admin-1', role: 'ADMIN' as const },
  });
  vi.mocked(checkRateLimit).mockResolvedValue(RL_OK as never);
  vi.mocked(prisma.customer.findFirst).mockResolvedValue({ id: 'cust-1' } as never);
  vi.mocked(prisma.transaction.findFirst).mockResolvedValue(TXN as never);
  vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
});

// ─── confirmTransfer: double-debit race ──────────────────────────────────────

describe('confirmTransfer — race double-debit', () => {
  it('claim موفق می‌شود (count=1) → تراکنش اجرا و COMPLETED می‌شود', async () => {
    mockTxn(() => txClient(1));

    const result = await confirmTransfer({ txnId: 'txn-1', txnRef: 'ref-1' });
    expect(result.success).toBe(true);
  });

  it('دو confirm هم‌زمان → اولی برنده، دومی claim=0 → idempotent success (بدون دوبار برداشت)', async () => {
    // دو فراخوانی هم‌زمان: اولی count=1 (برنده)، دومی count=0 (بازنده)
    const callOne = txClient(1);
    const callTwo = txClient(0);
    let idx = 0;
    mockTxn(() => (idx++ === 0 ? callOne : callTwo));

    const [r1, r2] = await Promise.all([
      confirmTransfer({ txnId: 'txn-1', txnRef: 'ref-1' }),
      confirmTransfer({ txnId: 'txn-1', txnRef: 'ref-1' }),
    ]);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true); // idempotent — خطا نیست
    // فقط یک ledgerEntry DEBIT برای فرستنده باید ثبت شده باشد
    const ledgerDebits = [
      ...(callOne.ledgerEntry.create.mock.calls ?? []),
      ...(callTwo.ledgerEntry.create.mock.calls ?? []),
    ].filter((call) => (call[0] as { data?: { direction?: string } }).data?.direction === 'DEBIT');
    expect(ledgerDebits).toHaveLength(1);
  });

  it('موجودی ناکافی → INSUFFICIENT_BALANCE (بدون برداشت)', async () => {
    const tx = txClient(1);
    tx.fintechAccount.updateMany = vi.fn().mockResolvedValue({ count: 0 }); // debit شکست
    mockTxn(() => tx);

    const result = await confirmTransfer({ txnId: 'txn-1', txnRef: 'ref-1' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(tx.ledgerEntry.create).not.toHaveBeenCalled();
  });
});

// ─── confirmWithdraw: double-debit race ──────────────────────────────────────

describe('confirmWithdraw — race double-debit', () => {
  it('دو confirm هم‌زمان → فقط یک برداشت (ledger DEBIT یک‌بار)', async () => {
    const callOne = txClient(1);
    const callTwo = txClient(0);
    let idx = 0;
    mockTxn(() => (idx++ === 0 ? callOne : callTwo));

    const [r1, r2] = await Promise.all([
      confirmWithdraw({ txnId: 'txn-1', txnRef: 'ref-1' }),
      confirmWithdraw({ txnId: 'txn-1', txnRef: 'ref-1' }),
    ]);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true); // idempotent
    const debits = [
      ...(callOne.ledgerEntry.create.mock.calls ?? []),
      ...(callTwo.ledgerEntry.create.mock.calls ?? []),
    ].filter((call) => (call[0] as { data?: { direction?: string } }).data?.direction === 'DEBIT');
    expect(debits).toHaveLength(1);
  });
});

// ─── markSettlementPaid: double-pay race ─────────────────────────────────────

describe('markSettlementPaid — race double-pay', () => {
  const ADMIN = { success: true as const, user: { id: 'admin-1', role: 'ADMIN' as const } };

  it('دو پرداخت هم‌زمان → فقط یک ledger (DEBIT+CREDIT) ثبت می‌شود', async () => {
    // markSettlementPaid از requireAdmin استفاده می‌کند نه requireUser
    const auth = await import('@/lib/require-auth');
    vi.mocked(auth.requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue({ status: 'APPROVED' } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const paidPayload = {
      exchangeId: 'exch-1',
      platformFee: BigInt(5000),
      exchangeNet: BigInt(45000),
      currency: 'AFN',
      totalVolume: BigInt(500000),
      dealCount: 10,
    };
    // اولی claim=1 برنده، دومی claim=0 بازنده
    const winTx = {
      settlement: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(paidPayload),
      },
      ledgerEntry: {
        create: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({ runningBalance: BigInt(0) }),
      },
    };
    const loseTx = {
      settlement: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: vi.fn(),
      },
      ledgerEntry: {
        create: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({ runningBalance: BigInt(0) }),
      },
    };
    let idx = 0;
    mockTxn(() => (idx++ === 0 ? winTx : loseTx));

    const [r1, r2] = await Promise.all([
      markSettlementPaid('settle-1'),
      markSettlementPaid('settle-1'),
    ]);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true); // idempotent
    // برنده باید دقیقاً ۲ ledger بسازد (DEBIT+CREDIT)؛ بازنده صفر → بدون double-pay
    expect(winTx.ledgerEntry.create.mock.calls.length).toBe(2);
    expect(loseTx.ledgerEntry.create.mock.calls.length).toBe(0);
  });
});
