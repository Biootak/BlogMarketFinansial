/**
 * exchange-auth.ts — تست‌های امنیتی
 *
 * تمرکز روی:
 *   - IDOR: کاربر صرافی A نمی‌تواند به صرافی B دسترسی داشته باشد
 *   - Revoked staff: کارمند revoked-شده دسترسی ندارد
 *   - Write access: فقط OWNER/MANAGER می‌توانند write داشته باشند
 *   - Platform admin bypass: ADMIN/OWNER/SUPERADMIN همه صرافی‌ها
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock ─────────────────────────────────────────────────────────────────────

vi.mock('@/auth', () => ({ auth: vi.fn() }));

vi.mock('@/lib/db', () => ({
  default: {
    exchangeStaff: { findFirst: vi.fn() },
  },
}));

// ─── Import ───────────────────────────────────────────────────────────────────

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';

// ─── helpers ──────────────────────────────────────────────────────────────────

function session(role: string, id = 'user-x') {
  return { user: { id, role } };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('requireExchangeAccess — auth layer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('session null → error.code=UNAUTHENTICATED', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const r = await requireExchangeAccess('exch-1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('UNAUTHENTICATED');
  });

  it('session بدون id → error', async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);
    const r = await requireExchangeAccess('exch-1');
    expect(r.ok).toBe(false);
  });
});

describe('requireExchangeAccess — platform admin bypass', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ADMIN → دسترسی کامل بدون DB query', async () => {
    vi.mocked(auth).mockResolvedValue(session('ADMIN') as never);
    const r = await requireExchangeAccess('exch-1');
    expect(r.ok).toBe(true);
    expect(prisma.exchangeStaff.findFirst).not.toHaveBeenCalled();
  });

  it('OWNER → دسترسی کامل', async () => {
    vi.mocked(auth).mockResolvedValue(session('OWNER') as never);
    const r = await requireExchangeAccess('exch-1');
    expect(r.ok).toBe(true);
  });

  it('SUPERADMIN → دسترسی کامل', async () => {
    vi.mocked(auth).mockResolvedValue(session('SUPERADMIN') as never);
    const r = await requireExchangeAccess('exch-1');
    expect(r.ok).toBe(true);
  });

  it('ADMIN می‌تواند write=true هم داشته باشد', async () => {
    vi.mocked(auth).mockResolvedValue(session('ADMIN') as never);
    const r = await requireExchangeAccess('exch-1', true);
    expect(r.ok).toBe(true);
  });
});

describe('requireExchangeAccess — IDOR: staff دیگری', () => {
  beforeEach(() => vi.clearAllMocks());

  it('EXCHANGE بدون عضویت در این صرافی → FORBIDDEN', async () => {
    vi.mocked(auth).mockResolvedValue(session('EXCHANGE', 'user-attacker') as never);
    // هیچ ExchangeStaff پیدا نمی‌شود (staff دیگری است)
    vi.mocked(prisma.exchangeStaff.findFirst).mockResolvedValue(null);

    const r = await requireExchangeAccess('exch-victim');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('FORBIDDEN');
  });

  it('EXCHANGE عضو صرافی A نمی‌تواند صرافی B را ببیند', async () => {
    vi.mocked(auth).mockResolvedValue(session('EXCHANGE', 'user-a') as never);
    // کاربر staff صرافی A است ولی درخواست صرافی B می‌دهد
    vi.mocked(prisma.exchangeStaff.findFirst).mockImplementation((async ({
      where,
    }: { where?: { exchangeId?: string } }) => {
      // staff فقط در exch-A است
      if (where?.exchangeId === 'exch-B') return null;
      return { id: 'staff-1' };
    }) as never);

    const r = await requireExchangeAccess('exch-B');
    expect(r.ok).toBe(false);
  });

  it('CUSTOMER هرگز به صرافی دسترسی ندارد', async () => {
    vi.mocked(auth).mockResolvedValue(session('CUSTOMER') as never);
    vi.mocked(prisma.exchangeStaff.findFirst).mockResolvedValue(null);

    const r = await requireExchangeAccess('exch-1');
    expect(r.ok).toBe(false);
  });

  it('USER عادی هرگز به صرافی دسترسی ندارد', async () => {
    vi.mocked(auth).mockResolvedValue(session('USER') as never);
    vi.mocked(prisma.exchangeStaff.findFirst).mockResolvedValue(null);

    const r = await requireExchangeAccess('exch-1');
    expect(r.ok).toBe(false);
  });
});

describe('requireExchangeAccess — revoked staff', () => {
  beforeEach(() => vi.clearAllMocks());

  it('کارمند revoked → FORBIDDEN (revokedAt≠null در where حذف می‌شود)', async () => {
    vi.mocked(auth).mockResolvedValue(session('EXCHANGE', 'user-1') as never);
    // findFirst با where { revokedAt: null } — چون revoked است null برمی‌گرداند
    vi.mocked(prisma.exchangeStaff.findFirst).mockResolvedValue(null);

    const r = await requireExchangeAccess('exch-1');
    expect(r.ok).toBe(false);
  });

  it('کارمند فعال → موفق', async () => {
    vi.mocked(auth).mockResolvedValue(session('EXCHANGE', 'user-1') as never);
    vi.mocked(prisma.exchangeStaff.findFirst).mockResolvedValue({ id: 'staff-1' } as never);

    const r = await requireExchangeAccess('exch-1');
    expect(r.ok).toBe(true);
  });
});

describe('requireExchangeAccess — write access control', () => {
  beforeEach(() => vi.clearAllMocks());

  it('STAFF (نه OWNER/MANAGER) با writeAccess=true → FORBIDDEN', async () => {
    vi.mocked(auth).mockResolvedValue(session('EXCHANGE', 'user-staff') as never);
    // write=true → where شامل role: { in: [OWNER, MANAGER, STAFF] } می‌شود
    // (2026-08-01: STAFF هم transactions.write و customers.write دارد)
    // چون این کاربر عضو هیچ staff نیست → findFirst null برمی‌گرداند
    vi.mocked(prisma.exchangeStaff.findFirst).mockResolvedValue(null);

    const r = await requireExchangeAccess('exch-1', true);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('FORBIDDEN');
      // پیام عمومی است — نام نقش افشا نمی‌شود (prevent role enumeration)
      expect(r.error.message).toBe('شما دسترسی لازم برای انجام این عملیات را ندارید');
    }
  });

  it('VIEWER با writeAccess=true → FORBIDDEN', async () => {
    vi.mocked(auth).mockResolvedValue(session('EXCHANGE', 'user-viewer') as never);
    vi.mocked(prisma.exchangeStaff.findFirst).mockResolvedValue(null);

    const r = await requireExchangeAccess('exch-1', true);
    expect(r.ok).toBe(false);
  });

  it('MANAGER با writeAccess=true → موفق', async () => {
    vi.mocked(auth).mockResolvedValue(session('EXCHANGE', 'user-mgr') as never);
    vi.mocked(prisma.exchangeStaff.findFirst).mockResolvedValue({ id: 'staff-mgr' } as never);

    const r = await requireExchangeAccess('exch-1', true);
    expect(r.ok).toBe(true);
  });

  it('read بدون write → STAFF هم می‌تواند', async () => {
    vi.mocked(auth).mockResolvedValue(session('EXCHANGE', 'user-staff') as never);
    vi.mocked(prisma.exchangeStaff.findFirst).mockResolvedValue({ id: 'staff-1' } as never);

    const r = await requireExchangeAccess('exch-1', false);
    expect(r.ok).toBe(true);
  });
});
