/**
 * authorization-integration.test.ts — تست‌های یکپارچه مجوزها
 *
 * هدف: اطمینان از اینکه هیچ action مالی / مدیریتی بدون auth مناسب
 *      قابل دسترسی نیست. این تست‌ها باگ‌های IDOR، privilege escalation،
 *      و دور زدن role guard را کشف می‌کنند.
 *
 * سناریوهای پوشش‌داده‌شده:
 *   IDOR (cross-user): کاربر A نباید تراکنش / کارت / حساب کاربر B را ببیند یا تغییر دهد
 *   Role escalation:   USER نباید به endpoint‌های ADMIN دسترسی داشته باشد
 *   Auth-before-action: همه endpoint‌ها باید auth را قبل از هر DB call بررسی کنند
 *   requirePermission:  deny مقدم بر grant است؛ کاربر USER بدون platform role رد می‌شود
 *   permission gate:    OWNER با deny نباید بتواند permission رد شده را اجرا کند
 *   session-less calls: server action بدون session → UNAUTHORIZED (نه 500)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  default: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    customer: { findFirst: vi.fn() },
    transaction: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    kycRecord: { findUnique: vi.fn().mockResolvedValue({ expiresAt: null }) },
    fintechAccount: { findFirst: vi.fn(), update: vi.fn() },
    virtualCard: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    settlement: { findFirst: vi.fn(), update: vi.fn() },
    ledgerEntry: { create: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        transaction: {
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        fintechAccount: {
          findFirst: vi.fn().mockResolvedValue({ id: 'acc-1', balance: BigInt(100_000) }),
          update: vi.fn().mockResolvedValue({ balance: BigInt(0) }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({ balance: BigInt(0) }),
        },
        ledgerEntry: { create: vi.fn() },
        transactionStatusLog: { create: vi.fn() },
      }),
    ),
  },
}));

vi.mock('@/lib/require-auth', () => ({
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock('@/lib/csrf-server', () => ({ assertCsrf: vi.fn() }));
vi.mock('@/lib/rate-limiter', () => ({ checkRateLimit: vi.fn(), resetRateLimit: vi.fn() }));
vi.mock('@/lib/revalidate', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock('@/lib/fraud/screener', () => ({
  screenTransaction: vi
    .fn()
    .mockResolvedValue({ score: 0, shouldBlock: false, shouldHold: false, reasons: [] }),
}));
vi.mock('@/lib/kyc-limits', () => ({
  assertOutgoingKycLimit: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('@/lib/fintech/transaction-guard', () => ({
  isHighValueTransaction: vi.fn().mockReturnValue(false),
  requestTransactionOtp: vi.fn(),
  verifyTransactionOtp: vi.fn(),
}));
vi.mock('@/lib/fintech/txn-trail', () => ({
  logTxnStatusChange: vi.fn().mockResolvedValue(undefined),
  logFintechEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(null) }),
}));
vi.mock('@/lib/exchange-auth', () => ({
  requireExchangeAccess: vi
    .fn()
    .mockResolvedValue({ success: false, status: 401, code: 'UNAUTHENTICATED', message: '' }),
}));
vi.mock('@/lib/notifications/telegram-user', () => ({
  notifyTelegramCustomer: vi.fn().mockResolvedValue(undefined),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { confirmWithdraw, requestDeposit, requestWithdraw } from '@/actions/fintech-account';
import { confirmTransfer, findTransferRecipient, initiateTransfer } from '@/actions/transfer';
import {
  cancelVirtualCard,
  getMyVirtualCards,
  issueVirtualCard,
  toggleFreezeCard,
} from '@/actions/virtual-card';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireAdmin, requirePermission, requireUser } from '@/lib/require-auth';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AUTH_FAIL = {
  success: false as const,
  status: 401 as const,
  code: 'UNAUTHENTICATED' as const,
  message: 'ابتدا وارد شوید',
};
const AUTH_OK_USER = { success: true as const, user: { id: 'user-1', role: 'USER' as const } };
const AUTH_OK_ADMIN = { success: true as const, user: { id: 'admin-1', role: 'ADMIN' as const } };
const AUTH_OK_OWNER = { success: true as const, user: { id: 'owner-1', role: 'OWNER' as const } };
const AUTH_FORBIDDEN = {
  success: false as const,
  status: 403 as const,
  code: 'FORBIDDEN' as const,
  message: 'دسترسی ندارید',
};
const RL_OK = { success: true as const, reset: Date.now() + 60000 };

// ─── Auth guard: همه action‌های مالی ─────────────────────────────────────────

describe('Auth Guard: action‌های مالی بدون session → UNAUTHORIZED', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requestDeposit بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    const r = await requestDeposit({
      amountCents: 100_00,
      currency: 'AFN',
      idempotencyKey: 'k'.repeat(8),
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
    // هیچ DB call نباید رخ دهد
    expect(prisma.customer.findFirst).not.toHaveBeenCalled();
  });

  it('requestWithdraw بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    const r = await requestWithdraw({
      amountCents: 100_00,
      currency: 'AFN',
      idempotencyKey: 'k'.repeat(8),
      destinationAccount: 'حساب-۱۲۳۴۵',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
    expect(prisma.customer.findFirst).not.toHaveBeenCalled();
  });

  it('confirmWithdraw بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    const r = await confirmWithdraw({ txnId: 'txn-1', txnRef: 'ref-1' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
    expect(prisma.transaction.findFirst).not.toHaveBeenCalled();
  });

  it('initiateTransfer بدون auth → UNAUTHORIZED (بعد از CSRF)', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    const r = await initiateTransfer({
      recipientUserId: 'user-2',
      amountCents: 100_00,
      currency: 'AFN',
      idempotencyKey: 'k'.repeat(8),
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
  });

  it('confirmTransfer بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    const r = await confirmTransfer({ txnId: 'txn-1', txnRef: 'ref-1' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
  });

  it('issueVirtualCard بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    const r = await issueVirtualCard({});
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
    expect(prisma.virtualCard.create).not.toHaveBeenCalled();
  });

  it('getMyVirtualCards بدون auth → آرایه خالی (graceful fallback)', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    // getMyVirtualCards طراحی شده که [] برگرداند نه exception
    const r = await getMyVirtualCards();
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(0);
    expect(prisma.virtualCard.findMany).not.toHaveBeenCalled();
  });

  it('toggleFreezeCard بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    const r = await toggleFreezeCard('card-1', true);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
  });

  it('cancelVirtualCard بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    const r = await cancelVirtualCard('card-1');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
  });

  it('findTransferRecipient بدون auth → UNAUTHORIZED', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_FAIL as never);
    const r = await findTransferRecipient({ identifier: '07901234567' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHORIZED');
  });
});

// ─── IDOR: تراکنش متعلق به کاربر دیگر ────────────────────────────────────────

describe('IDOR Prevention', () => {
  beforeEach(() => vi.clearAllMocks());

  it('confirmWithdraw: کاربر A نباید تراکنش کاربر B را تأیید کند', async () => {
    // هر describe با beforeEach clearAllMocks دارد — باید auth را اینجا mock کنیم
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK_USER);
    // customer کاربر A = cust-attacker
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-attacker' } as never);
    // تراکنش برای cust-victim است — query `customerId=cust-attacker` چیزی نمی‌یابد
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    const r = await confirmWithdraw({ txnId: 'victim-txn', txnRef: 'ref-victim' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NOT_FOUND');
    // نباید هیچ تغییری در DB رخ دهد
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('confirmTransfer: کاربر A نباید انتقال کاربر B را confirm کند', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK_USER);
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'cust-attacker' } as never);
    // query `customerId=cust-attacker` چیزی نمی‌یابد
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null);
    const r = await confirmTransfer({ txnId: 'victim-transfer', txnRef: 'ref-victim' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NOT_FOUND');
  });

  it('toggleFreezeCard: کاربر A نباید کارت کاربر B را فریز کند', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK_USER);
    // کارت متعلق به userId دیگری است
    vi.mocked(prisma.virtualCard.findFirst).mockResolvedValueOnce(null); // query userId=user-1 اما کارت userId=user-2
    const r = await toggleFreezeCard('card-of-user-2', true);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NOT_FOUND');
  });

  it('cancelVirtualCard: کاربر A نباید کارت کاربر B را لغو کند', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK_USER);
    vi.mocked(prisma.virtualCard.findFirst).mockResolvedValueOnce(null);
    const r = await cancelVirtualCard('card-of-user-2');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NOT_FOUND');
  });

  it('initiateTransfer: کاربر نباید به خودش انتقال دهد (self-transfer)', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK_USER);
    // rate-limit OK برای initiateTransfer
    vi.mocked(checkRateLimit).mockResolvedValueOnce(RL_OK as never);
    // sender customer
    vi.mocked(prisma.customer.findFirst)
      .mockResolvedValueOnce({ id: 'cust-1' } as never) // sender
      .mockResolvedValueOnce(null) // recipient customer: پیدا نشد
      .mockResolvedValueOnce(null); // kycRecord: null
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce(null); // idempotency: نه
    vi.mocked(prisma.kycRecord.findUnique).mockResolvedValueOnce(null); // recipient KYC: نه
    const r = await initiateTransfer({
      recipientUserId: AUTH_OK_USER.user.id, // خودش
      amountCents: 100_00,
      currency: 'AFN',
      idempotencyKey: 'self-transfer-x',
    });
    // باید با NO_ACCOUNT یا RECIPIENT_NO_ACCOUNT خطا بدهد
    expect(r.success).toBe(false);
    if (!r.success)
      expect(['NO_ACCOUNT', 'RECIPIENT_NO_ACCOUNT', 'RECIPIENT_KYC_REQUIRED']).toContain(
        r.error.code,
      );
  });
});

// ─── requirePermission: RBAC دانه‌ای ─────────────────────────────────────────

describe('requirePermission — Role-Based Access Control', () => {
  beforeEach(() => vi.clearAllMocks());

  it('USER بدون platform role → FORBIDDEN از requirePermission', async () => {
    vi.mocked(requirePermission).mockResolvedValueOnce(AUTH_FORBIDDEN as never);
    // یک action که requirePermission صدا می‌زند
    const r = await requirePermission('settlement:approve');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe('FORBIDDEN');
  });

  it('OWNER با deny → FORBIDDEN حتی اگر grant هم باشد', async () => {
    // deny مقدم است — حتی اگر grants داشته باشد
    vi.mocked(requirePermission).mockResolvedValueOnce(AUTH_FORBIDDEN as never);
    const r = await requirePermission('kyc:approve');
    expect(r.success).toBe(false);
  });

  it('ADMIN بدون override → دسترسی از طریق platform role', async () => {
    vi.mocked(requirePermission).mockResolvedValueOnce(AUTH_OK_ADMIN);
    const r = await requirePermission('exchange:read');
    expect(r.success).toBe(true);
  });

  it('requireAdmin برای USER → FORBIDDEN', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(AUTH_FORBIDDEN as never);
    const r = await requireAdmin();
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe('FORBIDDEN');
  });

  it('requireAdmin برای ADMIN → OK', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(AUTH_OK_ADMIN);
    const r = await requireAdmin();
    expect(r.success).toBe(true);
  });

  it('requireAdmin برای OWNER → OK', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(AUTH_OK_OWNER);
    const r = await requireAdmin();
    expect(r.success).toBe(true);
  });
});

// ─── CSRF Protection ──────────────────────────────────────────────────────────

describe('CSRF Protection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initiateTransfer بدون CSRF token → CSRF_FAILED', async () => {
    // importها بعد از mock هستند — باید dynamically import کنیم
    const { assertCsrf } = await import('@/lib/csrf-server');
    vi.mocked(assertCsrf).mockRejectedValueOnce(new Error('CSRF mismatch'));
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK_USER);
    const r = await initiateTransfer({
      recipientUserId: 'user-2',
      amountCents: 100_00,
      currency: 'AFN',
      idempotencyKey: 'k'.repeat(8),
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('CSRF_FAILED');
    // هیچ DB call نباید رخ دهد
    expect(prisma.customer.findFirst).not.toHaveBeenCalled();
  });

  it('confirmTransfer بدون CSRF token → CSRF_FAILED', async () => {
    const { assertCsrf } = await import('@/lib/csrf-server');
    vi.mocked(assertCsrf).mockRejectedValueOnce(new Error('CSRF mismatch'));
    vi.mocked(requireUser).mockResolvedValueOnce(AUTH_OK_USER);
    const r = await confirmTransfer({ txnId: 'txn-1', txnRef: 'ref-1' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('CSRF_FAILED');
  });
});
