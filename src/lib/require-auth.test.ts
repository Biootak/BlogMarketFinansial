/**
 * require-auth.ts — تست‌های امنیتی
 *
 * تمرکز روی:
 *   - requireUser: کاربر احراز هویت نشده
 *   - requireRole: نقش‌های مجاز vs غیرمجاز
 *   - requireAdmin: نقش‌های ADMIN / OWNER / SUPERADMIN
 *   - requireSuperAdmin: فقط OWNER / SUPERADMIN
 *   - requireAuthor: نقش‌های AUTHOR / ADMIN / OWNER
 *   - requirePermission: granular RBAC از جدول Permission
 *   - authFailureToActionResult: تبدیل AuthFailure به ActionResult shape
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock: next-auth ──────────────────────────────────────────────────────────

vi.mock('@/auth', () => ({ auth: vi.fn() }));

// ─── Mock: prisma ─────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  default: {
    permission: { findFirst: vi.fn() },
    rolePermission: { findFirst: vi.fn() },
  },
}));

// ─── Import ───────────────────────────────────────────────────────────────────

import { auth } from '@/auth';
import prisma from '@/lib/db';
import {
  authFailureToActionResult,
  requireAdmin,
  requireAuthor,
  requirePermission,
  requireRole,
  requireSuperAdmin,
  requireUser,
} from '@/lib/require-auth';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeSession(role: string) {
  return { user: { id: 'user-1', role, name: 'تست', email: 'test@test.com' } };
}

// ─── requireUser ─────────────────────────────────────────────────────────────

describe('requireUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('session null → UNAUTHENTICATED', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const r = await requireUser();
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe('UNAUTHENTICATED');
      expect(r.status).toBe(401);
    }
  });

  it('session بدون id → UNAUTHENTICATED', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { name: 'تست' } } as never);
    const r = await requireUser();
    expect(r.success).toBe(false);
  });

  it('session معتبر → success=true و user.id', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('USER') as never);
    const r = await requireUser();
    expect(r.success).toBe(true);
    if (r.success) expect(r.user.id).toBe('user-1');
  });
});

// ─── requireRole ─────────────────────────────────────────────────────────────

describe('requireRole', () => {
  beforeEach(() => vi.clearAllMocks());

  it('نقش در لیست مجاز → موفق', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('ADMIN') as never);
    const r = await requireRole(['ADMIN', 'OWNER']);
    expect(r.success).toBe(true);
  });

  it('نقش خارج از لیست → FORBIDDEN', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('USER') as never);
    const r = await requireRole(['ADMIN', 'OWNER']);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.code).toBe('FORBIDDEN');
      expect(r.status).toBe(403);
    }
  });

  it('CUSTOMER نمی‌تواند نقش ADMIN بگیرد', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('CUSTOMER') as never);
    const r = await requireRole(['ADMIN']);
    expect(r.success).toBe(false);
  });

  it('EXCHANGE نمی‌تواند نقش ADMIN بگیرد', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('EXCHANGE') as never);
    const r = await requireRole(['ADMIN', 'OWNER', 'SUPERADMIN']);
    expect(r.success).toBe(false);
  });

  it('session null → UNAUTHENTICATED (نه FORBIDDEN)', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const r = await requireRole(['ADMIN']);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe('UNAUTHENTICATED');
  });
});

// ─── requireAdmin ─────────────────────────────────────────────────────────────

describe('requireAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ADMIN → موفق', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('ADMIN') as never);
    expect((await requireAdmin()).success).toBe(true);
  });

  it('OWNER → موفق', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('OWNER') as never);
    expect((await requireAdmin()).success).toBe(true);
  });

  it('SUPERADMIN → موفق (SUPERADMIN = OWNER access)', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('SUPERADMIN') as never);
    expect((await requireAdmin()).success).toBe(true);
  });

  it('USER → FORBIDDEN', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('USER') as never);
    expect((await requireAdmin()).success).toBe(false);
  });

  it('CUSTOMER → FORBIDDEN', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('CUSTOMER') as never);
    expect((await requireAdmin()).success).toBe(false);
  });

  it('EXCHANGE → FORBIDDEN', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('EXCHANGE') as never);
    expect((await requireAdmin()).success).toBe(false);
  });

  it('SUPPORT → FORBIDDEN', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('SUPPORT') as never);
    expect((await requireAdmin()).success).toBe(false);
  });

  it('AUTHOR → FORBIDDEN (AUTHOR فقط بلاگ)', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('AUTHOR') as never);
    expect((await requireAdmin()).success).toBe(false);
  });
});

// ─── requireSuperAdmin ───────────────────────────────────────────────────────

describe('requireSuperAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('OWNER → موفق', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('OWNER') as never);
    expect((await requireSuperAdmin()).success).toBe(true);
  });

  it('SUPERADMIN → موفق', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('SUPERADMIN') as never);
    expect((await requireSuperAdmin()).success).toBe(true);
  });

  it('ADMIN (غیر-owner) → FORBIDDEN', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('ADMIN') as never);
    expect((await requireSuperAdmin()).success).toBe(false);
  });
});

// ─── requireAuthor ───────────────────────────────────────────────────────────

describe('requireAuthor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('AUTHOR → موفق', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('AUTHOR') as never);
    expect((await requireAuthor()).success).toBe(true);
  });

  it('ADMIN → موفق', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('ADMIN') as never);
    expect((await requireAuthor()).success).toBe(true);
  });

  it('USER → FORBIDDEN (نویسنده نیست)', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('USER') as never);
    expect((await requireAuthor()).success).toBe(false);
  });

  it('CUSTOMER → FORBIDDEN', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('CUSTOMER') as never);
    expect((await requireAuthor()).success).toBe(false);
  });
});

// ─── requirePermission ───────────────────────────────────────────────────────

describe('requirePermission', () => {
  beforeEach(() => vi.clearAllMocks());

  it('session null → UNAUTHENTICATED', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const r = await requirePermission('wallet:read');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe('UNAUTHENTICATED');
  });

  it('permission کلید ناموجود → FORBIDDEN', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('USER') as never);
    vi.mocked(prisma.permission.findFirst).mockResolvedValue(null);
    const r = await requirePermission('wallet:nope');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe('FORBIDDEN');
  });

  it('نقش بدون این permission → FORBIDDEN', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('CUSTOMER') as never);
    vi.mocked(prisma.permission.findFirst).mockResolvedValue({ id: 'perm-1' } as never);
    vi.mocked(prisma.rolePermission.findFirst).mockResolvedValue(null);
    const r = await requirePermission('kyc:approve');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe('FORBIDDEN');
  });

  it('نقش با permission موجود → موفق', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('ADMIN') as never);
    vi.mocked(prisma.permission.findFirst).mockResolvedValue({ id: 'perm-1' } as never);
    vi.mocked(prisma.rolePermission.findFirst).mockResolvedValue({ id: 'rp-1' } as never);
    const r = await requirePermission('permissions:manage');
    expect(r.success).toBe(true);
  });

  it('CUSTOMER نمی‌تواند permissions:manage داشته باشد (scope escalation)', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession('CUSTOMER') as never);
    vi.mocked(prisma.permission.findFirst).mockResolvedValue({ id: 'perm-1' } as never);
    vi.mocked(prisma.rolePermission.findFirst).mockResolvedValue(null);
    const r = await requirePermission('permissions:manage');
    expect(r.success).toBe(false);
  });
});

// ─── authFailureToActionResult ────────────────────────────────────────────────

describe('authFailureToActionResult', () => {
  it('UNAUTHENTICATED → success=false و error=UNAUTHENTICATED', () => {
    const r = authFailureToActionResult({
      success: false,
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'وارد شوید',
    });
    expect(r.success).toBe(false);
    expect(r.error).toBe('UNAUTHENTICATED');
    expect(r.message).toBe('وارد شوید');
  });

  it('FORBIDDEN → success=false و error=FORBIDDEN', () => {
    const r = authFailureToActionResult({
      success: false,
      status: 403,
      code: 'FORBIDDEN',
      message: 'دسترسی ندارید',
    });
    expect(r.success).toBe(false);
    expect(r.error).toBe('FORBIDDEN');
    expect(r.message).toBe('دسترسی ندارید');
  });

  it('message در خروجی حفظ می‌شود', () => {
    const r = authFailureToActionResult({
      success: false,
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'پیام سفارشی',
    });
    expect(r.message).toBe('پیام سفارشی');
  });
});
