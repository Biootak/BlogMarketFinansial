/**
 * role-actions — تست‌های unit مدیریت نقش‌ها
 *
 * تمرکز روی امنیت hierarchy:
 *   - فقط ADMIN/OWNER/SUPERADMIN
 *   - هیچ‌کس نمی‌تواند نقش خودش یا هم‌سطح/بالاتر را تغییر دهد
 *   - ADMIN نباید OWNER/SUPERADMIN را حتی ببیند
 *   - tokenVersion increment برای بی‌اثر شدن آنی session ها
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  default: {
    user: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock('@/lib/require-auth', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/revalidate', () => ({
  revalidatePath: vi.fn(),
}));

// ─── Imports (بعد از mock) ────────────────────────────────────────────────────

import { getRoleStats, getUsersByRole, updateUserRole } from '@/actions/role-actions';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { revalidatePath } from '@/lib/revalidate';
import { Role } from '@prisma/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const admin = (role: Role) => ({ success: true as const, user: { id: 'admin-1', role } });
const UNAUTH = {
  success: false as const,
  status: 401 as const,
  code: 'UNAUTHENTICATED' as const,
  message: 'وارد شوید',
};

const USER_ROW = {
  id: 'u1',
  name: 'کاربر',
  email: 'u@x.com',
  image: null,
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01'),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getRoleStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → خطای ورود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(UNAUTH);
    const r = await getRoleStats();
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHENTICATED');
    expect(prisma.user.groupBy).not.toHaveBeenCalled();
  });

  it('groupBy → آمار تجمیعی صحیح برای هر نقش', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.ADMIN));
    vi.mocked(prisma.user.groupBy).mockResolvedValue([
      { role: Role.ADMIN, status: 'ACTIVE', _count: { _all: 3 } },
      { role: Role.ADMIN, status: 'INACTIVE', _count: { _all: 1 } },
      { role: Role.USER, status: 'ACTIVE', _count: { _all: 7 } },
    ] as never);
    const r = await getRoleStats();
    expect(r.success).toBe(true);
    if (!r.success) return;
    const stats = r.data.stats;
    const adminStat = stats.find((s) => s.role === Role.ADMIN);
    const userStat = stats.find((s) => s.role === Role.USER);
    const ownerStat = stats.find((s) => s.role === Role.OWNER);
    expect(adminStat?.count).toBe(4);
    expect(adminStat?.activeCount).toBe(3);
    expect(userStat?.count).toBe(7);
    expect(userStat?.activeCount).toBe(7);
    // نقش بدون ردیف → صفر
    expect(ownerStat?.count).toBe(0);
    // hierarchy و assignable
    expect(ownerStat?.hierarchy).toBe(4);
    expect(adminStat?.hierarchy).toBe(3);
    expect(adminStat?.assignable).toBe(true);
    expect(ownerStat?.assignable).toBe(false); // OWNER قابل اعطا نیست
    expect(userStat?.assignable).toBe(true);
  });

  it('فقط نقش‌های پلتفرم (where role in) پرس‌وجو می‌شوند', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.ADMIN));
    vi.mocked(prisma.user.groupBy).mockResolvedValue([]);
    await getRoleStats();
    expect(prisma.user.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          role: {
            in: expect.arrayContaining([Role.USER, Role.ADMIN, Role.OWNER, Role.SUPERADMIN]),
          },
        },
      }),
    );
  });
});

describe('getUsersByRole', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → خطای ورود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(UNAUTH);
    const r = await getUsersByRole({ role: Role.USER });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHENTICATED');
  });

  it('نقش نامعتبر → INVALID_INPUT', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.ADMIN));
    const r = await getUsersByRole({ role: 'NOT_A_ROLE' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('INVALID_INPUT');
  });

  it('ADMIN نباید OWNER را ببیند → FORBIDDEN', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.ADMIN));
    const r = await getUsersByRole({ role: Role.OWNER });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('FORBIDDEN');
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('ADMIN نباید SUPERADMIN را ببیند → FORBIDDEN', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.SUPPORT));
    const r = await getUsersByRole({ role: Role.SUPERADMIN });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('FORBIDDEN');
  });

  it('OWNER می‌تواند OWNER/SUPERADMIN را ببیند', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.OWNER));
    vi.mocked(prisma.user.findMany).mockResolvedValue([USER_ROW] as never);
    vi.mocked(prisma.user.count).mockResolvedValue(1);
    const r = await getUsersByRole({ role: Role.OWNER });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.users).toHaveLength(1);
  });

  it('pagination: صفحه ۲ → skip=12, take=12', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.ADMIN));
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.count).mockResolvedValue(25);
    const r = await getUsersByRole({ role: Role.USER, page: 2 });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 12, take: 12, orderBy: { createdAt: 'desc' } }),
    );
    expect(r.data.page).toBe(2);
    expect(r.data.pages).toBe(3); // ceil(25/12)
    expect(r.data.total).toBe(25);
  });

  it('search → OR name/email با case-insensitive', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.ADMIN));
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    await getUsersByRole({ role: Role.AUTHOR, search: 'ali' });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          role: Role.AUTHOR,
          OR: [
            { name: { contains: 'ali', mode: 'insensitive' } },
            { email: { contains: 'ali', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });
});

describe('updateUserRole', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → خطای ورود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(UNAUTH);
    const r = await updateUserRole({ userId: 'u2', newRole: Role.USER });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('UNAUTHENTICATED');
  });

  it('داده نامعتبر → INVALID_INPUT', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.ADMIN));
    const r = await updateUserRole({ userId: '', newRole: 'BAD' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('INVALID_INPUT');
  });

  it('تغییر نقش خودش → FORBIDDEN', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.ADMIN));
    const r = await updateUserRole({ userId: 'admin-1', newRole: Role.USER });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('FORBIDDEN');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('کاربر هدف یافت نشد → NOT_FOUND', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.ADMIN));
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const r = await updateUserRole({ userId: 'u2', newRole: Role.USER });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('NOT_FOUND');
  });

  it('تغییر نقش کاربر هم‌سطح یا بالاتر → FORBIDDEN', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.ADMIN));
    // ADMIN (3) می‌خواهد نقش ADMIN دیگر (3) را تغییر دهد
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u2', role: Role.ADMIN } as never);
    const r = await updateUserRole({ userId: 'u2', newRole: Role.USER });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('FORBIDDEN');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('اعطای نقش بالاتر از خود → FORBIDDEN (escalation)', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.ADMIN));
    // ADMIN (3) می‌خواهد SUPPORT (2) را ADMIN (3) کند → سطح جدید = سطح خودش
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u2', role: Role.SUPPORT } as never);
    const r = await updateUserRole({ userId: 'u2', newRole: Role.ADMIN });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('FORBIDDEN');
    // ADMIN نمی‌تواند OWNER بسازد
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u2', role: Role.USER } as never);
    const r2 = await updateUserRole({ userId: 'u2', newRole: Role.OWNER });
    expect(r2.success).toBe(false);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('OWNER می‌تواند SUPERADMIN اعطا کند ولی نه OWNER', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.OWNER));
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u2', role: Role.ADMIN } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'u2', role: Role.SUPERADMIN } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
    const ok = await updateUserRole({ userId: 'u2', newRole: Role.SUPERADMIN });
    expect(ok.success).toBe(true);
    // اعطای OWNER → ممنوع حتی برای OWNER
    const forbidden = await updateUserRole({ userId: 'u2', newRole: Role.OWNER });
    expect(forbidden.success).toBe(false);
    if (!forbidden.success) expect(forbidden.error.code).toBe('FORBIDDEN');
  });

  it('موفق: ADMIN → USER با tokenVersion increment + audit + revalidate', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(admin(Role.ADMIN));
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u2', role: Role.USER } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'u2', role: Role.AUTHOR } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
    const r = await updateUserRole({ userId: 'u2', newRole: Role.AUTHOR });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data).toEqual({ id: 'u2', role: Role.AUTHOR });
    // session های فعال باید فوراً نقش جدید را بگیرند
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u2' },
        data: expect.objectContaining({ role: Role.AUTHOR, tokenVersion: { increment: 1 } }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'admin-1',
          actorRole: Role.ADMIN,
          action: 'USER_ROLE_CHANGED',
          entityId: 'u2',
          meta: { from: Role.USER, to: Role.AUTHOR },
        }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/roles');
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/users');
  });
});
