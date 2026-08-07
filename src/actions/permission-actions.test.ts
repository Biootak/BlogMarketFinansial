/**
 * permission-actions — تست‌های unit
 *
 * تمام DB calls mock هستند.
 * تمرکز روی: auth guard، validation، batch logic.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock ─────────────────────────────────────────────────────────────────────

// tx mock با همه عملیات batch که production code استفاده می‌کند
const makeTx = (existingPerms: { id: string; permissionId: string; role: string }[] = []) => ({
  rolePermission: {
    findMany: vi.fn().mockResolvedValue(existingPerms),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  auditLog: { create: vi.fn() },
});

vi.mock('@/lib/db', () => ({
  default: {
    permission: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    rolePermission: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(makeTx())),
  },
}));

vi.mock('@/lib/require-auth', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/revalidate', () => ({
  revalidateTag: vi.fn(),
}));

// ─── Import ───────────────────────────────────────────────────────────────────

import {
  createPermission,
  deletePermission,
  getPermissions,
  saveRoleMatrix,
} from '@/actions/permission-actions';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';

// ─── helpers ──────────────────────────────────────────────────────────────────

const ADMIN = { success: true as const, user: { id: 'admin-1', role: 'ADMIN' as const } };
const UNAUTH = {
  success: false as const,
  status: 401 as const,
  code: 'UNAUTHENTICATED' as const,
  message: 'وارد شوید',
};

const MOCK_PERM = {
  id: 'perm-1',
  key: 'wallet:read',
  description: 'خواندن کیف پول',
  createdAt: new Date('2026-01-01'),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getPermissions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHENTICATED', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(UNAUTH);
    const result = await getPermissions();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('UNAUTHENTICATED');
  });

  it('با auth → permissions و matrix برمی‌گرداند', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.permission.findMany).mockResolvedValue([MOCK_PERM]);
    vi.mocked(prisma.rolePermission.findMany).mockResolvedValue([]);

    const result = await getPermissions();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.permissions).toHaveLength(1);
      expect(result.data.permissions[0]?.key).toBe('wallet:read');
      expect(result.data.matrix).toHaveLength(1);
    }
  });

  it('ماتریس برای هر permission همه نقش‌ها را دارد', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.permission.findMany).mockResolvedValue([MOCK_PERM]);
    vi.mocked(prisma.rolePermission.findMany).mockResolvedValue([]);

    const result = await getPermissions();
    if (result.success) {
      const entry = result.data.matrix[0];
      expect(entry).toBeDefined();
      expect(entry?.roles).toHaveProperty('CUSTOMER');
      expect(entry?.roles).toHaveProperty('ADMIN');
      expect(entry?.roles).toHaveProperty('EXCHANGE');
    }
  });
});

describe('createPermission', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHENTICATED', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(UNAUTH);
    const result = await createPermission({ key: 'wallet:write', description: 'نوشتن' });
    expect(result.success).toBe(false);
  });

  it('کلید نامعتبر (با فاصله) → INVALID_INPUT', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    const result = await createPermission({ key: 'invalid key', description: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_INPUT');
  });

  it('کلید خالی → INVALID_INPUT', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    const result = await createPermission({ key: '', description: '' });
    expect(result.success).toBe(false);
  });

  it('کلید تکراری → DUPLICATE_KEY', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.permission.findFirst).mockResolvedValue(MOCK_PERM);

    const result = await createPermission({ key: 'wallet:read', description: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('DUPLICATE_KEY');
  });

  it('کلید معتبر جدید → ساخته می‌شود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.permission.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.permission.create).mockResolvedValue(MOCK_PERM);

    const result = await createPermission({ key: 'transfer:create', description: 'ایجاد انتقال' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.key).toBe('wallet:read');
      expect(revalidateTag).toHaveBeenCalledWith('permissions');
    }
  });

  it('فرمت کلید: حروف کوچک + : الزامی', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    // کلید با حروف بزرگ
    const result = await createPermission({ key: 'WALLET:READ', description: '' });
    expect(result.success).toBe(false);
  });
});

describe('deletePermission', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHENTICATED', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(UNAUTH);
    const result = await deletePermission('perm-1');
    expect(result.success).toBe(false);
  });

  it('در حال استفاده → IN_USE خطا', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.rolePermission.count).mockResolvedValue(3);

    const result = await deletePermission('perm-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('IN_USE');
  });

  it('بلا‌استفاده → حذف می‌شود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    vi.mocked(prisma.rolePermission.count).mockResolvedValue(0);
    vi.mocked(prisma.permission.delete).mockResolvedValue(MOCK_PERM);

    const result = await deletePermission('perm-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('perm-1');
      expect(revalidateTag).toHaveBeenCalledWith('permissions');
    }
  });
});

describe('saveRoleMatrix', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHENTICATED', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(UNAUTH);
    const result = await saveRoleMatrix([]);
    expect(result.success).toBe(false);
  });

  it('ورودی نامعتبر (string) → INVALID_INPUT', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    const result = await saveRoleMatrix('invalid');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_INPUT');
  });

  it('آرایه خالی → موفق (هیچ تغییری)', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    const result = await saveRoleMatrix([]);
    expect(result.success).toBe(true);
  });

  it('آرایه با یک ردیف معتبر → transaction صدا می‌زند', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    const result = await saveRoleMatrix([
      {
        permissionId: 'perm-1',
        roles: { CUSTOMER: true, MERCHANT: false, EXCHANGE: true, SUPPORT: false, ADMIN: false },
      },
    ]);
    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(revalidateTag).toHaveBeenCalledWith('permissions');
  });

  it('roles[roleKey]=false با existing → delete branch اجرا می‌شود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN);
    // tx با یک رکورد موجود (CUSTOMER) → چون CUSTOMER=false است باید deleteMany صدا زده شود
    const txExisting = makeTx([{ id: 'rp-existing', permissionId: 'perm-1', role: 'CUSTOMER' }]);
    vi.mocked(prisma.$transaction).mockImplementationOnce((fn) => fn(txExisting as never));

    const result = await saveRoleMatrix([
      {
        permissionId: 'perm-1',
        roles: { CUSTOMER: false, MERCHANT: false, EXCHANGE: false, SUPPORT: false, ADMIN: false },
      },
    ]);
    expect(result.success).toBe(true);
    // deleteMany باید با id رکورد موجود صدا زده شده باشد
    expect(txExisting.rolePermission.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['rp-existing'] } },
    });
  });
});
