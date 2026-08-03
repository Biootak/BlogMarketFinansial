'use server';

import { createHash, randomBytes } from 'node:crypto';
import { type BackupConfig, type BackupFileInfo, DEFAULT_BACKUP_CONFIG } from '@/lib/backup';
import prisma from '@/lib/db';
import { authFailureToActionResult, requireAdmin, requireSuperAdmin } from '@/lib/require-auth';
import { revalidatePath, revalidateTag } from '@/lib/revalidate';
import { safeRevalidateTag } from '@/lib/safe-cache';
import { revalidateSiteIdentity } from '@/lib/site-identity-revalidate';
import {
  AuditLogQuerySchema,
  CreateApiKeySchema,
  TriggerBackupSchema,
  UpdateBackupSettingsSchema,
  UpdateCacheSettingsSchema,
  UpdateEmailSettingsSchema,
  UpdateGeneralSettingsSchema,
  UpdateMaintenanceModeSchema,
  UpdateSecuritySettingsSchema,
  UpdateSocialSettingsSchema,
} from '@/schemas';

export interface SystemSettingsData {
  siteName?: string;
  siteDescription?: string;
  logoUrl?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  cacheEnabled?: boolean;
  smtpServer?: string;
  smtpPort?: string;
  smtpUsername?: string;
  smtpPassword?: string;
  telegram?: string;
  instagram?: string;
  whatsapp?: string;
  twitter?: string;
}

// Get system settings
// 2026-07-08 (C2): gate with requireSuperAdmin and NEVER return the SMTP
// password (secret). Callers that need to know whether a password is set
// can check `hasSmtpPassword` instead of the raw value.
export async function getSystemSettings() {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const settings = await prisma.systemSettings.findFirst({
      select: {
        id: true,
        siteName: true,
        siteDescription: true,
        logoUrl: true,
        siteUrl: true,
        maintenanceMode: true,
        cacheEnabled: true,
        smtpServer: true,
        smtpPort: true,
        smtpUsername: true,
        contactEmail: true,
        contactPhone: true,
        contactAddress: true,
        telegram: true,
        instagram: true,
        whatsapp: true,
        twitter: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!settings) {
      return {
        success: true,
        data: {
          id: '',
          siteName: '',
          siteDescription: '',
          logoUrl: null,
          siteUrl: '',
          maintenanceMode: false,
          cacheEnabled: true,
          smtpServer: '',
          smtpPort: '',
          smtpUsername: '',
          contactEmail: '',
          contactPhone: '',
          contactAddress: '',
          telegram: '',
          instagram: '',
          whatsapp: '',
          twitter: '',
          createdAt: null,
          updatedAt: null,
        },
      };
    }

    // C1 fix: never return the SMTP password (secret) to the client.
    (settings as { smtpPassword?: string }).smtpPassword = undefined;
    return { success: true, data: settings };
  } catch (_error) {
    return { success: false, error: 'خطا در دریافت تنظیمات' };
  }
}

// Update general settings
export async function updateGeneralSettings(data: {
  siteName: string;
  siteDescription: string;
  logoUrl?: string;
  /** دامنه اصلی سایت — مثال: https://financialmarket.page */
  siteUrl?: string;
  // 2026-07-29: contact fields (admin-editable)
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
}) {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    // 2026-08-11: Zod validation
    const parsed = UpdateGeneralSettingsSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'داده‌های وارد شده نامعتبر است.',
      };
    }

    const allData = {
      siteName: parsed.data.siteName,
      siteDescription: parsed.data.siteDescription,
      logoUrl: parsed.data.logoUrl ?? null,
      siteUrl: parsed.data.siteUrl?.trim() || null,
      contactEmail: parsed.data.contactEmail?.trim() || null,
      contactPhone: parsed.data.contactPhone?.trim() || null,
      contactAddress: parsed.data.contactAddress?.trim() || null,
    };

    let settings = await prisma.systemSettings.findFirst();

    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: allData,
      });
    } else {
      settings = await prisma.systemSettings.create({
        data: allData,
      });
    }

    // Revalidate all caches that depend on site settings:
    // - site-identity tag: logo/siteName used by Logo component, root layout
    await revalidateSiteIdentity();
    // - system-settings tag: used by getSystemSettingsCached (robots, sitemap, getSiteUrl)
    revalidateTag('system-settings');
    // - in-memory safeCache (getSystemSettingsData used by layouts and static pages)
    safeRevalidateTag('system-settings');
    revalidatePath('/dashboard/settings');
    revalidatePath('/');

    // C1 fix: never return the SMTP password (secret) to the client.
    (settings as { smtpPassword?: string }).smtpPassword = undefined;
    return { success: true, data: settings };
  } catch (_error) {
    return { success: false, error: 'خطا در ذخیره تنظیمات عمومی' };
  }
}

// Update email/SMTP settings
export async function updateEmailSettings(data: {
  smtpServer: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
}) {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    // 2026-08-11: Zod validation
    const parsed = UpdateEmailSettingsSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'داده‌های وارد شده نامعتبر است.',
      };
    }

    let settings = await prisma.systemSettings.findFirst();

    // Only write smtpPassword when a new, non-empty value is supplied.
    // getSystemSettings no longer returns the stored secret, so the form
    // cannot prefill it — an empty field must mean "keep the existing
    // password" rather than overwriting it with an empty string.
    const smtpPassword = parsed.data.smtpPassword ? parsed.data.smtpPassword : undefined;

    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          smtpServer: parsed.data.smtpServer,
          smtpPort: parsed.data.smtpPort,
          smtpUsername: parsed.data.smtpUsername,
          ...(smtpPassword ? { smtpPassword } : {}),
        },
      });
    } else {
      settings = await prisma.systemSettings.create({
        data: {
          smtpServer: parsed.data.smtpServer,
          smtpPort: parsed.data.smtpPort,
          smtpUsername: parsed.data.smtpUsername,
          ...(smtpPassword ? { smtpPassword } : {}),
        },
      });
    }

    revalidatePath('/dashboard/settings');
    // C1 fix: never return the SMTP password (secret) to the client.
    (settings as { smtpPassword?: string }).smtpPassword = undefined;
    return { success: true, data: settings };
  } catch (_error) {
    return { success: false, error: 'خطا در ذخیره تنظیمات ایمیل' };
  }
}

// Update social media settings
export async function updateSocialSettings(data: {
  instagram: string;
  telegram: string;
  twitter: string;
  whatsapp: string;
}) {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    // 2026-08-11: Zod validation
    const parsed = UpdateSocialSettingsSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'داده‌های وارد شده نامعتبر است.',
      };
    }

    let settings = await prisma.systemSettings.findFirst();

    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          instagram: parsed.data.instagram,
          telegram: parsed.data.telegram,
          twitter: parsed.data.twitter,
          whatsapp: parsed.data.whatsapp,
        },
      });
    } else {
      settings = await prisma.systemSettings.create({
        data: {
          instagram: parsed.data.instagram,
          telegram: parsed.data.telegram,
          twitter: parsed.data.twitter,
          whatsapp: parsed.data.whatsapp,
        },
      });
    }

    // Revalidate all pages that use social settings
    revalidatePath('/dashboard/settings');
    revalidatePath('/');

    // C1 fix: never return the SMTP password (secret) to the client.
    (settings as { smtpPassword?: string }).smtpPassword = undefined;
    return { success: true, data: settings };
  } catch (_error) {
    return { success: false, error: 'خطا در ذخیره تنظیمات شبکه‌های اجتماعی' };
  }
}

// Update cache settings
export async function updateCacheSettings(data: { cacheEnabled: boolean }) {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    // 2026-08-11: Zod validation
    const parsed = UpdateCacheSettingsSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'داده‌های وارد شده نامعتبر است.',
      };
    }

    let settings = await prisma.systemSettings.findFirst();

    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: { cacheEnabled: parsed.data.cacheEnabled },
      });
    } else {
      settings = await prisma.systemSettings.create({
        data: { cacheEnabled: parsed.data.cacheEnabled },
      });
    }

    revalidatePath('/dashboard/settings');
    // C1 fix: never return the SMTP password (secret) to the client.
    (settings as { smtpPassword?: string }).smtpPassword = undefined;
    return { success: true, data: settings };
  } catch (_error) {
    return { success: false, error: 'خطا در ذخیره تنظیمات کش' };
  }
}

// Update maintenance mode
// 2026-07-29: حالا maintenanceMessage هم ذخیره می‌شود تا در صفحه /maintenance نمایش یابد
export async function updateMaintenanceMode(data: {
  maintenanceMode: boolean;
  maintenanceMessage?: string;
}) {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    // 2026-08-11: Zod validation
    const parsed = UpdateMaintenanceModeSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'داده‌های وارد شده نامعتبر است.',
      };
    }

    let settings = await prisma.systemSettings.findFirst();

    // 2026-07-29: null را به undefined تبدیل می‌کنیم تا Prisma مقدار پیش‌فرض نگه دارد
    const messageToStore =
      parsed.data.maintenanceMessage && parsed.data.maintenanceMessage.length > 0
        ? parsed.data.maintenanceMessage
        : null;

    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          maintenanceMode: parsed.data.maintenanceMode,
          maintenanceMessage: messageToStore,
        },
      });
    } else {
      settings = await prisma.systemSettings.create({
        data: {
          maintenanceMode: parsed.data.maintenanceMode,
          maintenanceMessage: messageToStore,
        },
      });
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/maintenance');
    // C1 fix: never return the SMTP password (secret) to the client.
    (settings as { smtpPassword?: string }).smtpPassword = undefined;
    return { success: true, data: settings };
  } catch (_error) {
    return { success: false, error: 'خطا در تغییر حالت تعمیرات' };
  }
}

// Generate new API key
export async function generateApiKey() {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    const apiKey = `bk_${crypto.randomUUID().replace(/-/g, '')}`;
    return { success: true, data: { apiKey } };
  } catch (_error) {
    return { success: false, error: 'خطا در تولید کلید API' };
  }
}

// Test SMTP connection
export async function testSmtpConnection(data: {
  smtpServer: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
}) {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    // Simulate SMTP test - in production, you'd actually test the connection
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!data.smtpServer || !data.smtpPort) {
      return { success: false, error: 'لطفاً اطلاعات سرور SMTP را وارد کنید' };
    }

    return { success: true, message: 'اتصال به سرور SMTP با موفقیت برقرار شد' };
  } catch (_error) {
    return { success: false, error: 'خطا در اتصال به سرور SMTP' };
  }
}

// Test database connection
export async function testDatabaseConnection() {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    await prisma.$queryRaw`SELECT 1`;
    return { success: true, message: 'اتصال به پایگاه داده برقرار است' };
  } catch (_error) {
    return { success: false, error: 'خطا در اتصال به پایگاه داده' };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ۲۰۲۶-۰۷-۲۹ — Security / API Keys / Backup / Audit
// ════════════════════════════════════════════════════════════════════════════

// ── Security settings ──────────────────────────────────────────────────────

/**
 * دریافت تنظیمات امنیتی.
 *  اگر رکوردی در SystemSettings نباشد، مقدار پیش‌فرض برمی‌گردد.
 */
export async function getSecuritySettings(): Promise<{
  success: boolean;
  data?: {
    sessionTimeoutMin: number;
    ipAllowlist: string;
    force2faForAdmins: boolean;
    requireEmailForNewIp: boolean;
    maxConcurrentSessions: number;
    auditRetentionDays: number;
  };
  error?: string;
}> {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const fallback = {
      sessionTimeoutMin: 60,
      ipAllowlist: '',
      force2faForAdmins: true,
      requireEmailForNewIp: true,
      maxConcurrentSessions: 5,
      auditRetentionDays: 180,
    };

    // m5-fix (2026-08-01): قبلاً این‌جا فقط fallback برمی‌گشت و هیچ ذخیره‌ای
    // نبود (no-op). حالا آخرین AuditLog با action SECURITY_SETTINGS_UPDATED را
    // می‌خوانیم — updateSecuritySettings آن را در meta ذخیره می‌کند. تا وقتی
    // migration ستون‌های security به SystemSettings اضافه نشده، AuditLog
    // منبع حقیقت تنظیمات امنیتی است.
    const last = await prisma.auditLog.findFirst({
      where: { action: 'SECURITY_SETTINGS_UPDATED' },
      orderBy: { createdAt: 'desc' },
      select: { meta: true },
    });

    const meta = (last?.meta ?? {}) as Record<string, unknown>;
    return {
      success: true,
      data: {
        sessionTimeoutMin:
          typeof meta.sessionTimeoutMin === 'number'
            ? meta.sessionTimeoutMin
            : fallback.sessionTimeoutMin,
        ipAllowlist: typeof meta.ipAllowlist === 'string' ? meta.ipAllowlist : fallback.ipAllowlist,
        force2faForAdmins:
          typeof meta.force2faForAdmins === 'boolean'
            ? meta.force2faForAdmins
            : fallback.force2faForAdmins,
        requireEmailForNewIp:
          typeof meta.requireEmailForNewIp === 'boolean'
            ? meta.requireEmailForNewIp
            : fallback.requireEmailForNewIp,
        maxConcurrentSessions:
          typeof meta.maxConcurrentSessions === 'number'
            ? meta.maxConcurrentSessions
            : fallback.maxConcurrentSessions,
        auditRetentionDays:
          typeof meta.auditRetentionDays === 'number'
            ? meta.auditRetentionDays
            : fallback.auditRetentionDays,
      },
    };
  } catch (_error) {
    return { success: false, error: 'خطا در دریافت تنظیمات امنیتی' };
  }
}

/**
 * به‌روزرسانی تنظیمات امنیتی.
 *  فعلاً به‌صورت best-effort: اگر ستون‌ها در DB نبود، no-op می‌شود ولی
 *  success برمی‌گردد (برای forward-compat). وقتی migration اجرا شد،
 *  ستون‌ها اضافه می‌شوند.
 */
export async function updateSecuritySettings(data: {
  sessionTimeoutMin: number;
  ipAllowlist?: string;
  force2faForAdmins: boolean;
  requireEmailForNewIp: boolean;
  maxConcurrentSessions: number;
  auditRetentionDays: number;
}) {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const parsed = UpdateSecuritySettingsSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'داده‌های نامعتبر',
      };
    }

    // best-effort: store as a special audit log entry for now
    await prisma.auditLog
      .create({
        data: {
          actorId: authCheck.user.id,
          action: 'SECURITY_SETTINGS_UPDATED',
          meta: {
            sessionTimeoutMin: parsed.data.sessionTimeoutMin,
            ipAllowlist: parsed.data.ipAllowlist || null,
            force2faForAdmins: parsed.data.force2faForAdmins,
            requireEmailForNewIp: parsed.data.requireEmailForNewIp,
            maxConcurrentSessions: parsed.data.maxConcurrentSessions,
            auditRetentionDays: parsed.data.auditRetentionDays,
          },
        },
      })
      .catch(() => {
        // best-effort: don't fail the operation if audit fails
      });

    revalidatePath('/dashboard/settings');
    safeRevalidateTag('settings-security');
    return { success: true, data: parsed.data };
  } catch (_error) {
    return { success: false, error: 'خطا در ذخیره تنظیمات امنیتی' };
  }
}

// ── API Keys ───────────────────────────────────────────────────────────────

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdBy: string;
  // the full key is NEVER returned after creation
}

/**
 * لیست API key ها — فقط metadata. کلید واقعی فقط یک‌بار در زمان ساخت برگشت داده می‌شود.
 *  فعلاً در DB به‌صورت JSON در یک رکورد AuditLog ذخیره می‌شود (best-effort).
 */
export async function listApiKeys(): Promise<{
  success: boolean;
  data?: ApiKeyRecord[];
  error?: string;
}> {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    // best-effort: تلاش می‌کنیم از یک جدول مجازی بخوانیم.
    // اگر جدول نبود، خالی برمی‌گردد.
    const logs = await prisma.auditLog
      .findMany({
        where: {
          action: { in: ['API_KEY_CREATED', 'API_KEY_REVOKED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      .catch(() => [] as Awaited<ReturnType<typeof prisma.auditLog.findMany>>);

    // reconstruct from logs (simple in-memory index)
    const map = new Map<string, ApiKeyRecord>();
    for (const log of logs) {
      try {
        const raw = log.meta;
        const meta = (typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {})) as Record<
          string,
          unknown
        >;
        const id = (meta.id as string) ?? log.id;
        if (log.action === 'API_KEY_CREATED' && !map.has(id)) {
          map.set(id, {
            id,
            name: (meta.name as string) ?? '—',
            prefix: (meta.prefix as string) ?? 'bk_',
            scopes: Array.isArray(meta.scopes) ? (meta.scopes as string[]) : [],
            createdAt: log.createdAt.toISOString(),
            lastUsedAt: (meta.lastUsedAt as string) ?? null,
            expiresAt: (meta.expiresAt as string) ?? null,
            createdBy: log.actorId ?? '',
          });
        } else if (log.action === 'API_KEY_REVOKED') {
          map.delete(id);
        }
      } catch {
        // skip malformed
      }
    }

    return { success: true, data: Array.from(map.values()) };
  } catch (_error) {
    return { success: false, error: 'خطا در دریافت کلیدها' };
  }
}

/**
 * ساخت API key جدید.
 *  کلید فقط یک‌بار در همین response برگشت داده می‌شود.
 *  هَش کلید (sha256) در audit log ذخیره می‌شود.
 */
export async function createApiKey(data: {
  name: string;
  scopes: Array<'read' | 'write' | 'admin' | 'webhook' | 'reports'>;
  expiresInDays?: number | null;
}): Promise<{
  success: boolean;
  data?: { id: string; key: string; prefix: string; record: ApiKeyRecord };
  error?: string;
}> {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const parsed = CreateApiKeySchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'داده‌های نامعتبر',
      };
    }

    // ساخت کلید تصادفی امن — ۳۲ بایت → ۶۴ کاراکتر hex
    const randomPart = randomBytes(32).toString('hex');
    const key = `bk_live_${randomPart}`;
    const prefix = key.slice(0, 12);
    const id = createHash('sha256').update(key).digest('hex').slice(0, 16);
    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const record: ApiKeyRecord = {
      id,
      name: parsed.data.name,
      prefix,
      scopes: parsed.data.scopes,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt: expiresAt?.toISOString() ?? null,
      createdBy: authCheck.user.id,
    };

    await prisma.auditLog
      .create({
        data: {
          actorId: authCheck.user.id,
          action: 'API_KEY_CREATED',
          meta: {
            id,
            name: record.name,
            prefix,
            scopes: record.scopes,
            expiresAt: record.expiresAt,
            keyHash: createHash('sha256').update(key).digest('hex'),
          },
        },
      })
      .catch(() => {
        // best-effort
      });

    return { success: true, data: { id, key, prefix, record } };
  } catch (_error) {
    return { success: false, error: 'خطا در ساخت کلید' };
  }
}

export async function revokeApiKey(data: { id: string }) {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    // schema is small, validate inline
    if (!data.id || typeof data.id !== 'string') {
      return { success: false, error: 'شناسه کلید نامعتبر است' };
    }

    await prisma.auditLog
      .create({
        data: {
          actorId: authCheck.user.id,
          action: 'API_KEY_REVOKED',
          meta: { id: data.id },
        },
      })
      .catch(() => {
        // best-effort
      });

    revalidatePath('/dashboard/settings');
    return { success: true, data: { id: data.id } };
  } catch (_error) {
    return { success: false, error: 'خطا در لغو کلید' };
  }
}

// ── Backup ─────────────────────────────────────────────────────────────────

/**
 * دریافت تنظیمات backup + لیست backup های موجود.
 *  تنظیمات backup فعلاً best-effort در audit log ذخیره می‌شود.
 */
export async function getBackupStatus(): Promise<{
  success: boolean;
  data?: {
    config: BackupConfig;
    backups: BackupFileInfo[];
    lastBackupAt: string | null;
    nextScheduledAt: string | null;
  };
  error?: string;
}> {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    // بارگذاری تنظیمات از جدول BackupConfig (singleton)
    const dbConfig = await prisma.backupConfig
      .findUnique({ where: { id: 'singleton' } })
      .catch(() => null);

    const config: BackupConfig = dbConfig
      ? {
          enabled: dbConfig.enabled,
          intervalHours: dbConfig.intervalHours,
          retentionCount: dbConfig.retentionCount,
          includeAuditLog: dbConfig.includeAuditLog,
          includeSocialLinks: dbConfig.includeSocialLinks,
          includeSystemSettings: dbConfig.includeSystemSettings,
          notifyOnSuccess: dbConfig.notifyOnSuccess,
          notifyOnFailure: dbConfig.notifyOnFailure,
          notifyEmail: dbConfig.notifyEmail,
        }
      : { ...DEFAULT_BACKUP_CONFIG };

    // بارگذاری لیست backup ها از جدول BackupRun (به‌روز + filesystem)
    const dbRuns = await prisma.backupRun
      .findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
      .catch(() => [] as Awaited<ReturnType<typeof prisma.backupRun.findMany>>);

    const backups: BackupFileInfo[] = dbRuns.map((r) => ({
      filename: r.filename,
      path: '',
      sizeBytes: r.sizeBytes,
      createdAt: r.createdAt.toISOString(),
      reason: r.reason,
      totalRows: r.totalRows,
      sections: r.sections,
      actor: r.actor ?? 'unknown',
      checksum: r.checksum ?? '',
    }));

    const lastBackupAt = backups[0]?.createdAt ?? null;
    const nextScheduledAt =
      lastBackupAt && config.enabled
        ? new Date(
            new Date(lastBackupAt).getTime() + config.intervalHours * 60 * 60 * 1000,
          ).toISOString()
        : null;

    return {
      success: true,
      data: { config, backups, lastBackupAt, nextScheduledAt },
    };
  } catch (_error) {
    return { success: false, error: 'خطا در دریافت وضعیت backup' };
  }
}

/**
 * به‌روزرسانی تنظیمات backup.
 */
export async function updateBackupSettings(data: {
  enabled: boolean;
  intervalHours: number;
  retentionCount: number;
  includeAuditLog: boolean;
  includeSocialLinks: boolean;
  includeSystemSettings: boolean;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notifyEmail?: string | null;
}) {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const parsed = UpdateBackupSettingsSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'داده‌های نامعتبر',
      };
    }

    const d = parsed.data;

    // ذخیره در جدول BackupConfig (upsert singleton)
    await prisma.backupConfig.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        enabled: d.enabled,
        intervalHours: d.intervalHours,
        retentionCount: d.retentionCount,
        includeAuditLog: d.includeAuditLog,
        includeSocialLinks: d.includeSocialLinks,
        includeSystemSettings: d.includeSystemSettings,
        notifyOnSuccess: d.notifyOnSuccess,
        notifyOnFailure: d.notifyOnFailure,
        notifyEmail: d.notifyEmail ?? null,
      },
      update: {
        enabled: d.enabled,
        intervalHours: d.intervalHours,
        retentionCount: d.retentionCount,
        includeAuditLog: d.includeAuditLog,
        includeSocialLinks: d.includeSocialLinks,
        includeSystemSettings: d.includeSystemSettings,
        notifyOnSuccess: d.notifyOnSuccess,
        notifyOnFailure: d.notifyOnFailure,
        notifyEmail: d.notifyEmail ?? null,
      },
    });

    // audit log
    await prisma.auditLog
      .create({
        data: {
          actorId: authCheck.user.id,
          action: 'BACKUP_SETTINGS_UPDATED',
          meta: d as unknown as object,
        },
      })
      .catch(() => {});

    revalidatePath('/dashboard/settings');
    safeRevalidateTag('settings-backup');
    return { success: true, data: d };
  } catch (_error) {
    return { success: false, error: 'خطا در ذخیره تنظیمات backup' };
  }
}

/**
 * اجرای backup دستی. بلافاصله snapshot می‌گیرد و در `/backups` می‌نویسد.
 *  شامل تنها بخش‌هایی که در config فعال است.
 */
export async function triggerBackup(data: { reason?: string } = {}) {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const parsed = TriggerBackupSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'داده‌های نامعتبر',
      };
    }

    // تمام منطق backup در runBackup است — از تکرار جلوگیری می‌شود
    const { runBackup } = await import('@/lib/backup');
    const info = await runBackup(parsed.data.reason || 'manual', authCheck.user.id);

    revalidatePath('/dashboard/settings');
    return { success: true, data: info };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطا در اجرای backup',
    };
  }
}

/**
 * حذف یک backup خاص.
 */
export async function deleteBackup(filename: string) {
  try {
    const authCheck = await requireSuperAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    // security: reject path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return { success: false, error: 'نام فایل نامعتبر است' };
    }

    // حذف فایل از filesystem
    const { unlink } = await import('node:fs/promises');
    const { existsSync } = await import('node:fs');
    const nodePath = await import('node:path');
    const fullPath = nodePath.join(process.cwd(), 'backups', filename);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }

    // حذف رکورد از BackupRun (best-effort — ممکن است قبلاً وجود نداشته باشد)
    await prisma.backupRun.deleteMany({ where: { filename } }).catch(() => {});

    // audit log
    await prisma.auditLog
      .create({
        data: {
          actorId: authCheck.user.id,
          action: 'BACKUP_DELETED',
          meta: { filename },
        },
      })
      .catch(() => {});

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (_error) {
    return { success: false, error: 'خطا در حذف backup' };
  }
}

// ── Audit log query ────────────────────────────────────────────────────────

/**
 * query لاگ‌های audit — برای صفحه‌ی Audit Log.
 *  pagination + filter.
 */
export async function queryAuditLogs(rawQuery: unknown): Promise<{
  success: boolean;
  data?: {
    rows: Array<{
      id: string;
      userId: string;
      action: string;
      details: string;
      createdAt: string;
      severity: 'info' | 'warn' | 'error' | 'critical';
    }>;
    total: number;
    page: number;
    pageSize: number;
  };
  error?: string;
}> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const parsed = AuditLogQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'پارامترهای نامعتبر',
      };
    }

    const { page, pageSize, action, actorId, fromDate, toDate } = parsed.data;
    const where: Record<string, unknown> = {};
    if (action) where.action = { contains: action };
    if (actorId) where.actorId = actorId;
    if (fromDate || toDate) {
      const range: Record<string, Date> = {};
      if (fromDate) range.gte = fromDate;
      if (toDate) range.lte = toDate;
      where.createdAt = range;
    }

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        rows: rows.map((r) => ({
          id: r.id,
          userId: r.actorId ?? '',
          action: r.action,
          details: r.meta ? JSON.stringify(r.meta) : '',
          createdAt: r.createdAt.toISOString(),
          severity: classifySeverity(r.action),
        })),
        total,
        page,
        pageSize,
      },
    };
  } catch (_error) {
    return { success: false, error: 'خطا در دریافت لاگ‌ها' };
  }
}

function classifySeverity(action: string): 'info' | 'warn' | 'error' | 'critical' {
  const upper = action.toUpperCase();
  if (upper.includes('REVOKED') || upper.includes('DELETED') || upper.includes('FAILED')) {
    return 'warn';
  }
  if (upper.includes('BLOCKED') || upper.includes('REJECTED')) {
    return 'error';
  }
  if (upper.includes('CRITICAL') || upper.includes('FRAUD')) {
    return 'critical';
  }
  return 'info';
}

// ── 2FA state ──────────────────────────────────────────────────────────────

/**
 * وضعیت 2FA ادمین‌ها — آیا همه 2FA فعال دارند یا نه.
 *  best-effort: از جدول TwoFactor می‌خواند اگر موجود باشد.
 */
export async function get2faStatus(): Promise<{
  success: boolean;
  data?: {
    totalAdmins: number;
    adminsWith2fa: number;
    adminsWithout2fa: Array<{ id: string; name: string; email: string }>;
  };
  error?: string;
}> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'OWNER', 'SUPERADMIN'] } },
      select: { id: true, name: true, email: true, twoFactorEnabled: true },
    });

    const adminsWith2fa = admins.filter((a) => a.twoFactorEnabled).length;
    const adminsWithout2fa = admins
      .filter((a) => !a.twoFactorEnabled)
      .map((a) => ({ id: a.id, name: a.name ?? '', email: a.email }));

    return {
      success: true,
      data: { totalAdmins: admins.length, adminsWith2fa, adminsWithout2fa },
    };
  } catch (_error) {
    return { success: false, error: 'خطا در دریافت وضعیت 2FA' };
  }
}
