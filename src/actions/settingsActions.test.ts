/**
 * settingsActions — تست‌های unit تنظیمات سایت (تنظیمات سایت)
 *
 * تمام DB calls mock هستند. تمرکز روی:
 *   - گارد مجوزها (OWNER-only + settings:manage + ADMIN)
 *   - اعتبارسنجی Zod (safeParse vs parse)
 *   - عدم نشت smtpPassword (stripSecret)
 *   - امنیت API key (هش keyHash، هرگز key خام در audit)
 *   - منطق backup و storage
 *   - pagination/filter لاگ‌ها
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  default: {
    systemSettings: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    auditLog: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    backupConfig: { findUnique: vi.fn(), upsert: vi.fn() },
    backupRun: { findMany: vi.fn(), deleteMany: vi.fn() },
    user: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/require-auth', () => ({
  requireAdmin: vi.fn(),
  requireSuperAdmin: vi.fn(),
  requirePermission: vi.fn(),
  // pure — همان پیاده‌سازی واقعی
  authFailureToActionResult: (failure: { code: string; message: string }) => ({
    success: false,
    message: failure.message,
    error: failure.code,
  }),
}));

vi.mock('@/lib/revalidate', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/site-identity-revalidate', () => ({
  revalidateSiteIdentity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/edge-maintenance', () => ({
  setMaintenanceMode: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/backup', () => ({
  DEFAULT_BACKUP_CONFIG: {
    enabled: true,
    intervalHours: 24,
    retentionCount: 7,
    includeAuditLog: true,
    includeSocialLinks: true,
    includeSystemSettings: true,
    notifyOnSuccess: false,
    notifyOnFailure: true,
    notifyEmail: null,
  },
  runBackup: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  getStorageStatus: vi.fn(() => ({
    configured: false,
    provider: 'none',
    bucket: '',
    buckets: 0,
    poolBuckets: [],
    publicUrl: '',
    circuitBreakerActive: false,
  })),
}));

vi.mock('node:fs/promises', () => ({
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
}));

// ─── Imports (بعد از mock) ────────────────────────────────────────────────────

import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import {
  createApiKey,
  deleteBackup,
  generateApiKey,
  get2faStatus,
  getBackupStatus,
  getSecuritySettings,
  getSystemSettings,
  listApiKeys,
  queryAuditLogs,
  revokeApiKey,
  testDatabaseConnection,
  testSmtpConnection,
  triggerBackup,
  updateBackupSettings,
  updateCacheSettings,
  updateEmailSettings,
  updateGeneralSettings,
  updateMaintenanceMode,
  updateSecuritySettings,
  updateSocialSettings,
} from '@/actions/settingsActions';
import { runBackup } from '@/lib/backup';
import prisma from '@/lib/db';
import { setMaintenanceMode } from '@/lib/edge-maintenance';
import { requireAdmin, requirePermission, requireSuperAdmin } from '@/lib/require-auth';
import { revalidatePath, revalidateTag } from '@/lib/revalidate';
import { revalidateSiteIdentity } from '@/lib/site-identity-revalidate';
import { getStorageStatus } from '@/lib/storage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OWNER = { success: true as const, user: { id: 'owner-1', role: 'OWNER' as const } };
const ADMIN_USER = { success: true as const, user: { id: 'admin-1', role: 'ADMIN' as const } };
const UNAUTH = {
  success: false as const,
  status: 401 as const,
  code: 'UNAUTHENTICATED' as const,
  message: 'وارد شوید',
};
const FORBIDDEN = {
  success: false as const,
  status: 403 as const,
  code: 'FORBIDDEN' as const,
  message: 'شما دسترسی لازم برای انجام این عملیات را ندارید.',
};

const SETTINGS_ROW = {
  id: 's1',
  siteName: 'صرافی افغان',
  siteDescription: 'توضیح',
  logoUrl: '/logo.png',
  siteUrl: 'https://financialmarket.page',
  maintenanceMode: false,
  maintenanceMessage: null,
  cacheEnabled: true,
  smtpServer: 'smtp.example.com',
  smtpPort: '587',
  smtpUsername: 'noreply@example.com',
  smtpPassword: 'smtp-secret-123',
  contactEmail: 'info@example.com',
  contactPhone: '0700123456',
  contactAddress: 'کابل',
  telegram: '@afg',
  instagram: '',
  whatsapp: '',
  twitter: '',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getSystemSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون auth → UNAUTHENTICATED', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(UNAUTH);
    const r = await getSystemSettings();
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('UNAUTHENTICATED');
  });

  it('فقط OWNER — SUPERADMIN/ADMIN → FORBIDDEN', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(FORBIDDEN);
    const r = await getSystemSettings();
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('FORBIDDEN');
  });

  it('بدون ردیف settings → data=null', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(prisma.systemSettings.findFirst).mockResolvedValue(null);
    const r = await getSystemSettings();
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeNull();
  });

  it('smtpPassword هرگز در پاسخ برنمی‌گردد (stripSecret)', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(prisma.systemSettings.findFirst).mockResolvedValue(SETTINGS_ROW as never);
    const r = await getSystemSettings();
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toBeNull();
      expect(r.data).not.toHaveProperty('smtpPassword');
      expect(r.data).toHaveProperty('siteName', 'صرافی افغان');
      expect(r.data).toHaveProperty('smtpServer', 'smtp.example.com');
    }
  });
});

describe('updateGeneralSettings', () => {
  beforeEach(() => vi.clearAllMocks());
  const VALID = {
    siteName: 'صرافی افغان',
    siteDescription: 'توضیح',
    logoUrl: '/logo.png',
    siteUrl: 'https://financialmarket.page',
    contactEmail: 'info@example.com',
    contactPhone: '',
    contactAddress: '  کابل  ',
  };

  it('گارد دو لایه — OWNER لازم + مجوز settings:manage', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(FORBIDDEN);
    const r = await updateGeneralSettings(VALID);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('FORBIDDEN');
    expect(requirePermission).toHaveBeenCalledWith('settings:manage');
    expect(prisma.systemSettings.update).not.toHaveBeenCalled();
  });

  it('غیر OWNER → قبل از permission رد می‌شود', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(FORBIDDEN);
    const r = await updateGeneralSettings(VALID);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('FORBIDDEN');
    expect(requirePermission).not.toHaveBeenCalled();
  });

  it('داده نامعتبر (siteName خالی) → پیام Zod اختصاصی', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    const r = await updateGeneralSettings({ ...VALID, siteName: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('نام سایت الزامی است');
    expect(prisma.systemSettings.update).not.toHaveBeenCalled();
  });

  it('logoUrl نامعتبر → پیام Zod', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    const r = await updateGeneralSettings({ ...VALID, logoUrl: 'javascript:alert(1)' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('آدرس لوگو نامعتبر است');
  });

  it('ردیف موجود → update + revalidate + بدون smtpPassword', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    vi.mocked(prisma.systemSettings.findFirst).mockResolvedValue(SETTINGS_ROW as never);
    vi.mocked(prisma.systemSettings.update).mockResolvedValue({
      ...SETTINGS_ROW,
      smtpPassword: 'secret',
    } as never);

    const r = await updateGeneralSettings(VALID);
    expect(r.success).toBe(true);
    expect(prisma.systemSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({
          siteName: 'صرافی افغان',
          contactAddress: 'کابل', // trim شده
          contactPhone: null, // رشته خالی → null
          siteUrl: 'https://financialmarket.page',
        }),
      }),
    );
    expect(prisma.systemSettings.create).not.toHaveBeenCalled();
    expect(revalidateSiteIdentity).toHaveBeenCalled();
    expect(revalidateTag).toHaveBeenCalledWith('system-settings');
    expect(revalidatePath).toHaveBeenCalledWith('/');
    if (r.success) expect(r.data).not.toHaveProperty('smtpPassword');
  });

  it('بدون ردیف → create', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    vi.mocked(prisma.systemSettings.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.systemSettings.create).mockResolvedValue(SETTINGS_ROW as never);
    const r = await updateGeneralSettings(VALID);
    expect(r.success).toBe(true);
    expect(prisma.systemSettings.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ siteName: 'صرافی افغان' }),
    });
    expect(prisma.systemSettings.update).not.toHaveBeenCalled();
  });
});

describe('updateEmailSettings', () => {
  beforeEach(() => vi.clearAllMocks());
  const VALID = {
    smtpServer: 'smtp.example.com',
    smtpPort: '587',
    smtpUsername: 'noreply@example.com',
    smtpPassword: 'new-password',
  };

  it('گارد مجوز رد → هیچ نوشته‌ای در DB', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(FORBIDDEN);
    const r = await updateEmailSettings(VALID);
    expect(r.success).toBe(false);
    expect(prisma.systemSettings.update).not.toHaveBeenCalled();
  });

  it('پورت نامعتبر → پیام Zod', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    const r = await updateEmailSettings({ ...VALID, smtpPort: '0' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('پورت باید بین ۱ تا ۶۵۵۳۵ باشد');
  });

  it('پورت غیرعددی → پیام Zod', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    const r = await updateEmailSettings({ ...VALID, smtpPort: 'abc' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('پورت باید عدد باشد');
  });

  it('smtpPassword ذخیره می‌شود ولی در پاسخ برنمی‌گردد', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    vi.mocked(prisma.systemSettings.findFirst).mockResolvedValue(SETTINGS_ROW as never);
    vi.mocked(prisma.systemSettings.update).mockResolvedValue({
      ...SETTINGS_ROW,
      smtpPassword: 'new-password',
    } as never);
    const r = await updateEmailSettings(VALID);
    expect(r.success).toBe(true);
    expect(prisma.systemSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ smtpPassword: 'new-password' }),
      }),
    );
    if (r.success) expect(r.data).not.toHaveProperty('smtpPassword');
  });

  it('smtpPassword خالی → در data آپدیت نمی‌شود (محو نمی‌کند)', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    vi.mocked(prisma.systemSettings.findFirst).mockResolvedValue(SETTINGS_ROW as never);
    vi.mocked(prisma.systemSettings.update).mockResolvedValue(SETTINGS_ROW as never);
    await updateEmailSettings({ ...VALID, smtpPassword: '' });
    const call = vi.mocked(prisma.systemSettings.update).mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(call.data).not.toHaveProperty('smtpPassword');
  });
});

describe('updateSocialSettings / updateCacheSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('social: داده نامعتبر → خطای عمومی (parse بدون safeParse)', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    const r = await updateSocialSettings({ instagram: 'javascript:alert(1)' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('خطا در ذخیره تنظیمات شبکه‌های اجتماعی');
    expect(prisma.systemSettings.update).not.toHaveBeenCalled();
  });

  it('social: معتبر → update', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    vi.mocked(prisma.systemSettings.findFirst).mockResolvedValue(SETTINGS_ROW as never);
    vi.mocked(prisma.systemSettings.update).mockResolvedValue(SETTINGS_ROW as never);
    const r = await updateSocialSettings({
      telegram: '@afg',
      instagram: '',
      twitter: '',
      whatsapp: '+93700000000',
    });
    expect(r.success).toBe(true);
    expect(prisma.systemSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ telegram: '@afg', whatsapp: '+93700000000' }),
      }),
    );
  });

  it('cache: cacheEnabled غیر boolean → خطای عمومی', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    const r = await updateCacheSettings({ cacheEnabled: 'yes' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('خطا در ذخیره تنظیمات کش');
  });

  it('cache: معتبر → update', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    vi.mocked(prisma.systemSettings.findFirst).mockResolvedValue(SETTINGS_ROW as never);
    vi.mocked(prisma.systemSettings.update).mockResolvedValue(SETTINGS_ROW as never);
    const r = await updateCacheSettings({ cacheEnabled: false });
    expect(r.success).toBe(true);
    expect(prisma.systemSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cacheEnabled: false } }),
    );
  });
});

describe('updateMaintenanceMode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('داده نامعتبر → خطای عمومی + setMaintenanceMode صدا زده نمی‌شود', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    const r = await updateMaintenanceMode({ maintenanceMode: 'on' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('خطا در تغییر حالت تعمیرات');
    expect(setMaintenanceMode).not.toHaveBeenCalled();
    expect(prisma.systemSettings.update).not.toHaveBeenCalled();
  });

  it('فعال‌سازی → DB + Redis (setMaintenanceMode) + پیام trim', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    vi.mocked(prisma.systemSettings.findFirst).mockResolvedValue(SETTINGS_ROW as never);
    vi.mocked(prisma.systemSettings.update).mockResolvedValue(SETTINGS_ROW as never);
    const r = await updateMaintenanceMode({
      maintenanceMode: true,
      maintenanceMessage: '  به‌زودی  ',
    });
    expect(r.success).toBe(true);
    expect(prisma.systemSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { maintenanceMode: true, maintenanceMessage: 'به‌زودی' },
      }),
    );
    expect(setMaintenanceMode).toHaveBeenCalledWith(true);
  });

  it('پیام خالی → null در DB', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    vi.mocked(prisma.systemSettings.findFirst).mockResolvedValue(SETTINGS_ROW as never);
    vi.mocked(prisma.systemSettings.update).mockResolvedValue(SETTINGS_ROW as never);
    await updateMaintenanceMode({ maintenanceMode: false, maintenanceMessage: '' });
    expect(prisma.systemSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { maintenanceMode: false, maintenanceMessage: null } }),
    );
  });
});

describe('generateApiKey / testSmtpConnection / testDatabaseConnection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generateApiKey → stub قدیمی', async () => {
    const r = await generateApiKey();
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('createApiKey');
  });

  it('testSmtpConnection: بدون auth → UNAUTHENTICATED', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(UNAUTH);
    const r = await testSmtpConnection({});
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('UNAUTHENTICATED');
  });

  it('testSmtpConnection: با auth → پیام stub', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    const r = await testSmtpConnection({});
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('آزمون SMTP');
  });

  it('testDatabaseConnection: موفق → پیام اتصال', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);
    const r = await testDatabaseConnection();
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.message).toContain('برقرار');
  });

  it('testDatabaseConnection: خطای DB → fail', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('connection refused'));
    const r = await testDatabaseConnection();
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('خطا در اتصال به پایگاه داده');
  });
});

describe('getSecuritySettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('بدون audit قبلی → مقادیر پیش‌فرض', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue(null);
    const r = await getSecuritySettings();
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({
        sessionTimeoutMin: 60,
        ipAllowlist: '',
        force2faForAdmins: true,
        requireEmailForNewIp: true,
        maxConcurrentSessions: 5,
        auditRetentionDays: 180,
      });
    }
  });

  it('meta موجود → از meta می‌خواند و نوع اشتباه را پیش‌فرض می‌گیرد', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue({
      meta: {
        sessionTimeoutMin: 30,
        ipAllowlist: '1.2.3.4',
        force2faForAdmins: false,
        maxConcurrentSessions: 'x',
      },
    } as never);
    const r = await getSecuritySettings();
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sessionTimeoutMin).toBe(30);
      expect(r.data.ipAllowlist).toBe('1.2.3.4');
      expect(r.data.force2faForAdmins).toBe(false);
      // 'x' عدد نیست → پیش‌فرض
      expect(r.data.maxConcurrentSessions).toBe(5);
    }
  });
});

describe('updateSecuritySettings', () => {
  beforeEach(() => vi.clearAllMocks());
  const VALID = {
    sessionTimeoutMin: 30,
    ipAllowlist: '',
    force2faForAdmins: true,
    requireEmailForNewIp: true,
    maxConcurrentSessions: 5,
    auditRetentionDays: 90,
  };

  it('مقدار خارج از محدوده → خطای عمومی (parse)', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    const r = await updateSecuritySettings({ ...VALID, sessionTimeoutMin: 1 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('ذخیره تنظیمات امنیتی شکست خورد؛ سیاست اعمال نشده است');
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('معتبر → در auditLog با action و actor ثبت می‌شود', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
    vi.mocked(requirePermission).mockResolvedValue(OWNER);
    const r = await updateSecuritySettings(VALID);
    expect(r.success).toBe(true);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'owner-1',
        action: 'SECURITY_SETTINGS_UPDATED',
        meta: VALID,
      },
    });
    if (r.success) expect(r.data).toEqual(VALID);
  });
});

describe('API keys', () => {
  beforeEach(() => vi.clearAllMocks());

  const createdLog = (id: string, meta: Record<string, unknown>) => ({
    id: `log-${id}`,
    action: 'API_KEY_CREATED',
    actorId: 'owner-1',
    createdAt: new Date('2026-01-01'),
    meta,
  });
  const revokedLog = (logSeq: string, keyId: string) => ({
    id: `log-${logSeq}`,
    action: 'API_KEY_REVOKED',
    actorId: 'owner-1',
    createdAt: new Date('2026-01-02'),
    meta: { id: keyId },
  });

  describe('createApiKey', () => {
    it('scopes خالی → خطای عمومی', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(requirePermission).mockResolvedValue(OWNER);
      const r = await createApiKey({ name: 'کلید تست', scopes: [] });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe('ساخت کلید شکست خورد');
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('نام کوتاه → خطای عمومی', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(requirePermission).mockResolvedValue(OWNER);
      const r = await createApiKey({ name: 'a', scopes: ['read'] });
      expect(r.success).toBe(false);
    });

    it('کلید یک‌بار برمی‌گردد + فقط هش در audit', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(requirePermission).mockResolvedValue(OWNER);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
      const r = await createApiKey({
        name: 'کلید تست',
        scopes: ['read', 'write'],
        expiresInDays: 30,
      });
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.key).toMatch(/^bk_live_[a-f0-9]{64}$/);
      expect(r.data.id).toHaveLength(16);
      expect(r.data.record.name).toBe('کلید تست');
      expect(r.data.record.scopes).toEqual(['read', 'write']);
      expect(r.data.record.expiresAt).not.toBeNull();
      const auditMeta = vi.mocked(prisma.auditLog.create).mock.calls[0]?.[0] as {
        data: { meta: Record<string, unknown> };
      };
      expect(auditMeta.data.meta).not.toHaveProperty('key');
      expect(auditMeta.data.meta.keyHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('بدون expiresInDays → expiresAt=null', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(requirePermission).mockResolvedValue(OWNER);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
      const r = await createApiKey({ name: 'کلید تست', scopes: ['read'] });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.record.expiresAt).toBeNull();
    });
  });

  describe('revokeApiKey', () => {
    it('id نامعتبر → پیام واضح', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(requirePermission).mockResolvedValue(OWNER);
      const r1 = await revokeApiKey({});
      expect(r1.success).toBe(false);
      if (!r1.success) expect(r1.error).toBe('شناسه کلید نامعتبر است');
      const r2 = await revokeApiKey('k1');
      expect(r2.success).toBe(false);
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('معتبر → API_KEY_REVOKED ثبت می‌شود', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(requirePermission).mockResolvedValue(OWNER);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
      const r = await revokeApiKey({ id: 'k1' });
      expect(r.success).toBe(true);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: { actorId: 'owner-1', action: 'API_KEY_REVOKED', meta: { id: 'k1' } },
      });
      expect(revalidatePath).toHaveBeenCalled();
    });
  });

  describe('listApiKeys', () => {
    it('بدون لاگ → []', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      const r = await listApiKeys();
      expect(r.success).toBe(true);
      if (r.success) expect(r.data).toEqual([]);
    });

    it('ساخت + لغو → حذف می‌شود', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        createdLog('1', {
          id: 'k1',
          name: 'کلید',
          prefix: 'bk_live_ab',
          scopes: ['read'],
          expiresAt: null,
        }),
        revokedLog('2', 'k1'),
      ] as never);
      const r = await listApiKeys();
      expect(r.success).toBe(true);
      if (r.success) expect(r.data).toEqual([]);
    });

    it('دو کلید فعال → ۲ رکورد با فیلدهای پیش‌فرض', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        createdLog('1', {
          id: 'k1',
          name: 'کلید اول',
          prefix: 'bk_live_aa',
          scopes: ['read'],
          expiresAt: null,
        }),
        createdLog('2', { id: 'k2', scopes: ['read', 'admin', 42], expiresAt: null }),
      ] as never);
      const r = await listApiKeys();
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data).toHaveLength(2);
        const k2 = r.data.find((k) => k.id === 'k2');
        expect(k2).toBeDefined();
        expect(k2?.name).toBe('—'); // meta.name ندارد → پیش‌فرض
        expect(k2?.prefix).toBe('bk_'); // meta.prefix ندارد → پیش‌فرض
        expect(k2?.scopes).toEqual(['read', 'admin']); // 42 فیلتر شد
      }
    });

    it('create+revoke+create → فقط کلید زنده می‌ماند', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        createdLog('1', { id: 'k1', name: 'کلید', prefix: 'bk', scopes: [], expiresAt: null }),
        revokedLog('2', 'k1'),
        createdLog('3', { id: 'k1', name: 'کلید', prefix: 'bk', scopes: [], expiresAt: null }),
      ] as never);
      const r = await listApiKeys();
      expect(r.success).toBe(true);
      if (r.success) expect(r.data).toHaveLength(1);
    });
  });
});

describe('Backup', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getBackupStatus', () => {
    it('بدون config در DB → پیش‌فرض + storage', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(prisma.backupConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.backupRun.findMany).mockResolvedValue([]);
      const r = await getBackupStatus();
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.config.enabled).toBe(true);
        expect(r.data.config.intervalHours).toBe(24);
        expect(r.data.backups).toEqual([]);
        expect(r.data.lastBackupAt).toBeNull();
        expect(r.data.nextScheduledAt).toBeNull();
        expect(r.data.storage).toHaveProperty('configured');
        expect(getStorageStatus).toHaveBeenCalled();
      }
    });

    it('config فعال + آخرین run → nextScheduledAt = lastBackup + interval', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(prisma.backupConfig.findUnique).mockResolvedValue({
        id: 'singleton',
        enabled: true,
        intervalHours: 6,
        retentionCount: 10,
        includeAuditLog: true,
        includeSocialLinks: true,
        includeSystemSettings: true,
        notifyOnSuccess: false,
        notifyOnFailure: true,
        notifyEmail: null,
      } as never);
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      vi.mocked(prisma.backupRun.findMany).mockResolvedValue([
        {
          filename: 'backup-2026-01-01.json',
          sizeBytes: 100,
          createdAt,
          reason: 'manual',
          totalRows: 42,
          sections: ['users'],
          actor: 'owner-1',
          checksum: 'abc',
        },
      ] as never);
      const r = await getBackupStatus();
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.lastBackupAt).toBe(createdAt.toISOString());
        expect(r.data.nextScheduledAt).toBe(new Date('2026-01-01T06:00:00.000Z').toISOString());
        expect(r.data.backups[0]?.filename).toBe('backup-2026-01-01.json');
      }
    });

    it('config غیرفعال → nextScheduledAt=null حتی با run', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(prisma.backupConfig.findUnique).mockResolvedValue({
        id: 'singleton',
        enabled: false,
        intervalHours: 24,
        retentionCount: 7,
        includeAuditLog: true,
        includeSocialLinks: true,
        includeSystemSettings: true,
        notifyOnSuccess: false,
        notifyOnFailure: true,
        notifyEmail: null,
      } as never);
      vi.mocked(prisma.backupRun.findMany).mockResolvedValue([
        {
          filename: 'x.json',
          sizeBytes: 1,
          createdAt: new Date(),
          reason: 'manual',
          totalRows: 1,
          sections: [],
          actor: 'u',
          checksum: '',
        },
      ] as never);
      const r = await getBackupStatus();
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.nextScheduledAt).toBeNull();
    });
  });

  describe('updateBackupSettings', () => {
    const VALID = {
      enabled: true,
      intervalHours: 12,
      retentionCount: 14,
      includeAuditLog: true,
      includeSocialLinks: true,
      includeSystemSettings: true,
      notifyOnSuccess: true,
      notifyOnFailure: true,
      notifyEmail: 'backup@example.com',
    };

    it('interval نامعتبر → خطای عمومی + بدون upsert', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(requirePermission).mockResolvedValue(OWNER);
      const r = await updateBackupSettings({ ...VALID, intervalHours: 0 });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe('ذخیره تنظیمات backup شکست خورد');
      expect(prisma.backupConfig.upsert).not.toHaveBeenCalled();
    });

    it('معتبر → upsert singleton + audit', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(requirePermission).mockResolvedValue(OWNER);
      vi.mocked(prisma.backupConfig.upsert).mockResolvedValue({} as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
      const r = await updateBackupSettings(VALID);
      expect(r.success).toBe(true);
      expect(prisma.backupConfig.upsert).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        create: { id: 'singleton', ...VALID },
        update: VALID,
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'BACKUP_SETTINGS_UPDATED' }),
        }),
      );
    });
  });

  describe('triggerBackup', () => {
    it('معتبر → runBackup با دلیل + actor', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(requirePermission).mockResolvedValue(OWNER);
      vi.mocked(runBackup).mockResolvedValue({
        filename: 'backup.json',
        path: '',
        sizeBytes: 1,
        createdAt: new Date().toISOString(),
        reason: 'دلیل تست',
        totalRows: 1,
        sections: [],
        actor: 'owner-1',
        checksum: '',
      });
      const r = await triggerBackup({ reason: 'دلیل تست' });
      expect(r.success).toBe(true);
      expect(runBackup).toHaveBeenCalledWith('دلیل تست', 'owner-1');
    });

    it('بدون دلیل → manual', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(requirePermission).mockResolvedValue(OWNER);
      vi.mocked(runBackup).mockResolvedValue({
        filename: 'backup.json',
        path: '',
        sizeBytes: 1,
        createdAt: new Date().toISOString(),
        reason: 'manual',
        totalRows: 1,
        sections: [],
        actor: 'owner-1',
        checksum: '',
      });
      await triggerBackup();
      expect(runBackup).toHaveBeenCalledWith('manual', 'owner-1');
    });

    it('دلیل بیش از ۲۰۰ کاراکتر → خطای عمومی', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(requirePermission).mockResolvedValue(OWNER);
      const r = await triggerBackup({ reason: 'x'.repeat(201) });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe('خطا در اجرای backup');
      expect(runBackup).not.toHaveBeenCalled();
    });
  });

  describe('deleteBackup', () => {
    it('نام فایل مسیر خارجی (path traversal) → رد می‌شود', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(requirePermission).mockResolvedValue(OWNER);
      const r = await deleteBackup('../secret.json');
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe('نام فایل نامعتبر است');
      expect(unlink).not.toHaveBeenCalled();
      expect(prisma.backupRun.deleteMany).not.toHaveBeenCalled();
    });

    it('فایل موجود → حذف فایل + رکورد + audit', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(requirePermission).mockResolvedValue(OWNER);
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(prisma.backupRun.deleteMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
      const r = await deleteBackup('backup-2026.json');
      expect(r.success).toBe(true);
      expect(unlink).toHaveBeenCalledWith(expect.stringContaining('backup-2026.json'));
      expect(prisma.backupRun.deleteMany).toHaveBeenCalledWith({
        where: { filename: 'backup-2026.json' },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'BACKUP_DELETED' }) }),
      );
    });

    it('فایل موجود نیست → unlink صدا زده نمی‌شود ولی رکورد پاک می‌شود', async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(OWNER);
      vi.mocked(requirePermission).mockResolvedValue(OWNER);
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(prisma.backupRun.deleteMany).mockResolvedValue({ count: 0 } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
      const r = await deleteBackup('backup-2026.json');
      expect(r.success).toBe(true);
      expect(unlink).not.toHaveBeenCalled();
      expect(prisma.backupRun.deleteMany).toHaveBeenCalled();
    });
  });
});

describe('queryAuditLogs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('نیاز به ADMIN (نه فقط OWNER) — نقش ADMIN پاس می‌شود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN_USER);
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0);
    const r = await queryAuditLogs({});
    expect(r.success).toBe(true);
    expect(requireAdmin).toHaveBeenCalled();
  });

  it('بدون auth → UNAUTHENTICATED', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(UNAUTH);
    const r = await queryAuditLogs({});
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('UNAUTHENTICATED');
  });

  it('پیش‌فرض pagination → page=1, pageSize=50, skip=0', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN_USER);
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0);
    await queryAuditLogs({});
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50, orderBy: { createdAt: 'desc' } }),
    );
  });

  it('فیلترها + صفحه‌بندی سفارشی → where درست ساخته می‌شود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN_USER);
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0);
    await queryAuditLogs({
      page: 2,
      pageSize: 25,
      action: 'LOGIN',
      actorId: 'u1',
      fromDate: '2026-01-01',
      toDate: '2026-02-01',
    });
    const call = vi.mocked(prisma.auditLog.findMany).mock.calls[0]?.[0] as {
      where: { action?: unknown; actorId?: unknown; createdAt?: { gte?: Date; lte?: Date } };
      skip: number;
      take: number;
    };
    expect(call.where.action).toEqual({ contains: 'LOGIN' });
    expect(call.where.actorId).toBe('u1');
    expect(call.where.createdAt?.gte).toBeInstanceOf(Date);
    expect(call.where.createdAt?.lte).toBeInstanceOf(Date);
    expect(call.skip).toBe(25);
    expect(call.take).toBe(25);
  });

  it('مقدار دهی صفحه خارج از محدوده → خطای عمومی', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN_USER);
    const r = await queryAuditLogs({ page: 0 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('خطا در دریافت لاگ‌ها');
  });

  it('rows با severity=info و meta → JSON string می‌شود', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN_USER);
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: 'log1',
        actorId: 'u1',
        action: 'LOGIN',
        meta: { ip: '1.2.3.4' },
        createdAt: new Date('2026-01-01'),
      },
    ] as never);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(1);
    const r = await queryAuditLogs({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.rows[0]).toEqual({
        id: 'log1',
        userId: 'u1',
        action: 'LOGIN',
        details: JSON.stringify({ ip: '1.2.3.4' }),
        createdAt: new Date('2026-01-01').toISOString(),
        severity: 'info',
      });
      expect(r.data.total).toBe(1);
      expect(r.data.page).toBe(1);
    }
  });
});

describe('get2faStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('شمارش ادمین‌ها با/بدون 2FA', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(ADMIN_USER);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', name: 'الف', email: 'a@x.com', twoFactorEnabled: true },
      { id: 'u2', name: 'ب', email: 'b@x.com', twoFactorEnabled: true },
      { id: 'u3', name: null, email: 'c@x.com', twoFactorEnabled: false },
    ] as never);
    const r = await get2faStatus();
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.totalAdmins).toBe(3);
      expect(r.data.adminsWith2fa).toBe(2);
      expect(r.data.adminsWithout2fa).toEqual([{ id: 'u3', name: '', email: 'c@x.com' }]);
    }
  });

  it('بدون مجوز → UNAUTHENTICATED', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(UNAUTH);
    const r = await get2faStatus();
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('UNAUTHENTICATED');
  });
});
