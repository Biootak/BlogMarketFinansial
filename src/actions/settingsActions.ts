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

const ok = <T>(data?: T) => ({ success: true as const, ...(data === undefined ? {} : { data }) });
const fail = (error: string) => ({ success: false as const, error });
const stripSecret = <T extends Record<string, unknown>>(value: T): Omit<T, 'smtpPassword'> => {
  const { smtpPassword: _removed, ...rest } = value;
  return rest as Omit<T, 'smtpPassword'>;
};

export async function getSystemSettings() {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const settings = await prisma.systemSettings.findFirst({
      select: {
        id: true,
        siteName: true,
        siteDescription: true,
        logoUrl: true,
        siteUrl: true,
        maintenanceMode: true,
        maintenanceMessage: true,
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
    return ok(settings ? stripSecret(settings as unknown as Record<string, unknown>) : null);
  } catch {
    return fail('خطا در دریافت تنظیمات');
  }
}

export async function updateGeneralSettings(data: unknown) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const parsed = UpdateGeneralSettingsSchema.safeParse(data);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'داده‌های نامعتبر');
    const p = parsed.data;
    const current = await prisma.systemSettings.findFirst();
    const saved = current
      ? await prisma.systemSettings.update({
          where: { id: current.id },
          data: {
            siteName: p.siteName,
            siteDescription: p.siteDescription,
            logoUrl: p.logoUrl ?? null,
            siteUrl: p.siteUrl?.trim() || null,
            contactEmail: p.contactEmail?.trim() || null,
            contactPhone: p.contactPhone?.trim() || null,
            contactAddress: p.contactAddress?.trim() || null,
          },
        })
      : await prisma.systemSettings.create({
          data: {
            siteName: p.siteName,
            siteDescription: p.siteDescription,
            logoUrl: p.logoUrl ?? null,
            siteUrl: p.siteUrl?.trim() || null,
            contactEmail: p.contactEmail?.trim() || null,
            contactPhone: p.contactPhone?.trim() || null,
            contactAddress: p.contactAddress?.trim() || null,
          },
        });
    await revalidateSiteIdentity();
    revalidateTag('system-settings');
    safeRevalidateTag('system-settings');
    revalidatePath('/');
    return ok(stripSecret(saved as unknown as Record<string, unknown>));
  } catch {
    return fail('خطا در ذخیره تنظیمات عمومی');
  }
}

export async function updateEmailSettings(data: unknown) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const parsed = UpdateEmailSettingsSchema.safeParse(data);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'داده‌های نامعتبر');
    const p = parsed.data;
    const current = await prisma.systemSettings.findFirst();
    const fields = {
      smtpServer: p.smtpServer,
      smtpPort: p.smtpPort,
      smtpUsername: p.smtpUsername,
      ...(p.smtpPassword ? { smtpPassword: p.smtpPassword } : {}),
    };
    const saved = current
      ? await prisma.systemSettings.update({ where: { id: current.id }, data: fields })
      : await prisma.systemSettings.create({ data: fields });
    revalidatePath('/dashboard/settings');
    return ok(stripSecret(saved as unknown as Record<string, unknown>));
  } catch {
    return fail('خطا در ذخیره تنظیمات ایمیل');
  }
}
export async function updateSocialSettings(data: unknown) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const p = UpdateSocialSettingsSchema.parse(data);
    const current = await prisma.systemSettings.findFirst();
    const saved = current
      ? await prisma.systemSettings.update({ where: { id: current.id }, data: p })
      : await prisma.systemSettings.create({ data: p });
    revalidatePath('/');
    return ok(stripSecret(saved as unknown as Record<string, unknown>));
  } catch {
    return fail('خطا در ذخیره تنظیمات شبکه‌های اجتماعی');
  }
}
export async function updateCacheSettings(data: unknown) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const p = UpdateCacheSettingsSchema.parse(data);
    const current = await prisma.systemSettings.findFirst();
    const saved = current
      ? await prisma.systemSettings.update({ where: { id: current.id }, data: p })
      : await prisma.systemSettings.create({ data: p });
    revalidatePath('/dashboard/settings');
    return ok(stripSecret(saved as unknown as Record<string, unknown>));
  } catch {
    return fail('خطا در ذخیره تنظیمات کش');
  }
}
export async function updateMaintenanceMode(data: unknown) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const p = UpdateMaintenanceModeSchema.parse(data);
    const current = await prisma.systemSettings.findFirst();
    const saved = current
      ? await prisma.systemSettings.update({
          where: { id: current.id },
          data: {
            maintenanceMode: p.maintenanceMode,
            maintenanceMessage: p.maintenanceMessage?.trim() || null,
          },
        })
      : await prisma.systemSettings.create({
          data: {
            maintenanceMode: p.maintenanceMode,
            maintenanceMessage: p.maintenanceMessage?.trim() || null,
          },
        });
    revalidatePath('/maintenance');
    return ok(stripSecret(saved as unknown as Record<string, unknown>));
  } catch {
    return fail('خطا در تغییر حالت تعمیرات');
  }
}

export async function generateApiKey() {
  return fail('این مسیر قدیمی است؛ از createApiKey استفاده کنید');
}
export async function testSmtpConnection(_data: unknown) {
  const gate = await requireSuperAdmin();
  if (!gate.success) return authFailureToActionResult(gate);
  return fail('آزمون SMTP واقعی هنوز پیکربندی نشده است؛ اتصال جعلی گزارش نمی‌شود');
}
export async function testDatabaseConnection() {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    await prisma.$queryRaw`SELECT 1`;
    return ok({ message: 'اتصال به پایگاه داده برقرار است' });
  } catch {
    return fail('خطا در اتصال به پایگاه داده');
  }
}

export async function getSecuritySettings() {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const last = await prisma.auditLog.findFirst({
      where: { action: 'SECURITY_SETTINGS_UPDATED' },
      orderBy: { createdAt: 'desc' },
      select: { meta: true },
    });
    const m = (last?.meta ?? {}) as Record<string, unknown>;
    return ok({
      sessionTimeoutMin: typeof m.sessionTimeoutMin === 'number' ? m.sessionTimeoutMin : 60,
      ipAllowlist: typeof m.ipAllowlist === 'string' ? m.ipAllowlist : '',
      force2faForAdmins: typeof m.force2faForAdmins === 'boolean' ? m.force2faForAdmins : true,
      requireEmailForNewIp:
        typeof m.requireEmailForNewIp === 'boolean' ? m.requireEmailForNewIp : true,
      maxConcurrentSessions:
        typeof m.maxConcurrentSessions === 'number' ? m.maxConcurrentSessions : 5,
      auditRetentionDays: typeof m.auditRetentionDays === 'number' ? m.auditRetentionDays : 180,
    });
  } catch {
    return fail('خطا در دریافت تنظیمات امنیتی');
  }
}
export async function updateSecuritySettings(data: unknown) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const p = UpdateSecuritySettingsSchema.parse(data);
    await prisma.auditLog.create({
      data: { actorId: gate.user.id, action: 'SECURITY_SETTINGS_UPDATED', meta: p },
    });
    revalidatePath('/dashboard/settings');
    safeRevalidateTag('settings-security');
    return ok(p);
  } catch {
    return fail('ذخیره تنظیمات امنیتی شکست خورد؛ سیاست اعمال نشده است');
  }
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdBy: string;
}
export async function listApiKeys() {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const logs = await prisma.auditLog.findMany({
      where: { action: { in: ['API_KEY_CREATED', 'API_KEY_REVOKED'] } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const map = new Map<string, ApiKeyRecord>();
    for (const log of logs) {
      const m = (log.meta ?? {}) as Record<string, unknown>;
      const id = typeof m.id === 'string' ? m.id : log.id;
      if (log.action === 'API_KEY_REVOKED') map.delete(id);
      else if (!map.has(id))
        map.set(id, {
          id,
          name: typeof m.name === 'string' ? m.name : '—',
          prefix: typeof m.prefix === 'string' ? m.prefix : 'bk_',
          scopes: Array.isArray(m.scopes)
            ? m.scopes.filter((x): x is string => typeof x === 'string')
            : [],
          createdAt: log.createdAt.toISOString(),
          lastUsedAt: null,
          expiresAt: typeof m.expiresAt === 'string' ? m.expiresAt : null,
          createdBy: log.actorId ?? '',
        });
    }
    return ok(Array.from(map.values()));
  } catch {
    return fail('خطا در دریافت کلیدها');
  }
}
export async function createApiKey(data: unknown) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const p = CreateApiKeySchema.parse(data);
    const key = `bk_live_${randomBytes(32).toString('hex')}`;
    const id = createHash('sha256').update(key).digest('hex').slice(0, 16);
    const expiresAt = p.expiresInDays
      ? new Date(Date.now() + p.expiresInDays * 86400000).toISOString()
      : null;
    const record: ApiKeyRecord = {
      id,
      name: p.name,
      prefix: key.slice(0, 12),
      scopes: p.scopes,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt,
      createdBy: gate.user.id,
    };
    await prisma.auditLog.create({
      data: {
        actorId: gate.user.id,
        action: 'API_KEY_CREATED',
        meta: { ...record, keyHash: createHash('sha256').update(key).digest('hex') },
      },
    });
    return ok({ id, key, prefix: record.prefix, record });
  } catch {
    return fail('ساخت کلید شکست خورد');
  }
}
export async function revokeApiKey(data: unknown) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    if (
      typeof data !== 'object' ||
      data === null ||
      typeof (data as { id?: unknown }).id !== 'string'
    )
      return fail('شناسه کلید نامعتبر است');
    const id = (data as { id: string }).id;
    await prisma.auditLog.create({
      data: { actorId: gate.user.id, action: 'API_KEY_REVOKED', meta: { id } },
    });
    revalidatePath('/dashboard/settings');
    return ok({ id });
  } catch {
    return fail('لغو کلید شکست خورد');
  }
}

export async function getBackupStatus() {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const dbConfig = await prisma.backupConfig.findUnique({ where: { id: 'singleton' } });
    const config: BackupConfig = dbConfig ? { ...dbConfig } : { ...DEFAULT_BACKUP_CONFIG };
    const runs = await prisma.backupRun.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    const backups: BackupFileInfo[] = runs.map((r) => ({
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
    return ok({
      config,
      backups,
      lastBackupAt,
      nextScheduledAt:
        lastBackupAt && config.enabled
          ? new Date(
              new Date(lastBackupAt).getTime() + config.intervalHours * 3600000,
            ).toISOString()
          : null,
    });
  } catch {
    return fail('خطا در دریافت وضعیت backup');
  }
}
export async function updateBackupSettings(data: unknown) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const p = UpdateBackupSettingsSchema.parse(data);
    await prisma.backupConfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...p },
      update: p,
    });
    await prisma.auditLog.create({
      data: { actorId: gate.user.id, action: 'BACKUP_SETTINGS_UPDATED', meta: p },
    });
    revalidatePath('/dashboard/settings');
    safeRevalidateTag('settings-backup');
    return ok(p);
  } catch {
    return fail('ذخیره تنظیمات backup شکست خورد');
  }
}
export async function triggerBackup(data: unknown = {}) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const p = TriggerBackupSchema.parse(data);
    const { runBackup } = await import('@/lib/backup');
    return ok(await runBackup(p.reason || 'manual', gate.user.id));
  } catch {
    return fail('خطا در اجرای backup');
  }
}
export async function deleteBackup(filename: string) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    if (!/^[A-Za-z0-9_-]+\.json$/.test(filename)) return fail('نام فایل نامعتبر است');
    const { unlink } = await import('node:fs/promises');
    const { existsSync } = await import('node:fs');
    const path = (await import('node:path')).join(process.cwd(), 'backups', filename);
    if (existsSync(path)) await unlink(path);
    await prisma.backupRun.deleteMany({ where: { filename } });
    await prisma.auditLog.create({
      data: { actorId: gate.user.id, action: 'BACKUP_DELETED', meta: { filename } },
    });
    revalidatePath('/dashboard/settings');
    return ok({ filename });
  } catch {
    return fail('خطا در حذف backup');
  }
}
export async function queryAuditLogs(rawQuery: unknown) {
  try {
    const gate = await requireAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const p = AuditLogQuerySchema.parse(rawQuery);
    const where: Record<string, unknown> = {};
    if (p.action) where.action = { contains: p.action };
    if (p.actorId) where.actorId = p.actorId;
    if (p.fromDate || p.toDate)
      where.createdAt = {
        ...(p.fromDate ? { gte: p.fromDate } : {}),
        ...(p.toDate ? { lte: p.toDate } : {}),
      };
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p.page - 1) * p.pageSize,
        take: p.pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return ok({
      rows: rows.map((r) => ({
        id: r.id,
        userId: r.actorId ?? '',
        action: r.action,
        details: r.meta ? JSON.stringify(r.meta) : '',
        createdAt: r.createdAt.toISOString(),
        severity: 'info' as const,
      })),
      total,
      page: p.page,
      pageSize: p.pageSize,
    });
  } catch {
    return fail('خطا در دریافت لاگ‌ها');
  }
}
export async function get2faStatus() {
  try {
    const gate = await requireAdmin();
    if (!gate.success) return authFailureToActionResult(gate);
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'OWNER', 'SUPERADMIN'] } },
      select: { id: true, name: true, email: true, twoFactorEnabled: true },
    });
    return ok({
      totalAdmins: admins.length,
      adminsWith2fa: admins.filter((a) => a.twoFactorEnabled).length,
      adminsWithout2fa: admins
        .filter((a) => !a.twoFactorEnabled)
        .map((a) => ({ id: a.id, name: a.name ?? '', email: a.email })),
    });
  } catch {
    return fail('خطا در دریافت وضعیت 2FA');
  }
}
