'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';

type ExportOpts = {
  search?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
};

const CATEGORY_PREFIXES: Record<string, string[]> = {
  kyc: ['KYC'],
  deal: ['DEAL', 'CURRENCY_DEAL'],
  exchange: ['EXCHANGE', 'SETTLEMENT'],
  security: ['FRAUD', 'SECURITY'],
  transfer: ['TRANSFER', 'PAYMENT'],
};

function buildCategoryFilter(category: string) {
  const prefixes = CATEGORY_PREFIXES[category];
  if (!prefixes) return undefined;
  return {
    OR: prefixes.map((p) => ({
      action: { startsWith: p, mode: 'insensitive' as const },
    })),
  };
}

/**
 * Server Action — exports ALL matching audit logs (no pagination).
 * Returns rows as CSV string for client-side download.
 * Auth: ADMIN / OWNER / SUPERADMIN only.
 */
export async function exportAuditLogs(
  opts: ExportOpts,
): Promise<
  { success: true; csv: string } | { success: false; error: { code: string; message: string } }
> {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER', 'SUPERADMIN'].includes(session.user.role ?? '')) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیر مجاز' } };
  }

  const { search, entityType, dateFrom, dateTo, category } = opts;

  const categoryFilter = category ? buildCategoryFilter(category) : undefined;

  const where = {
    ...(search ? { action: { contains: search, mode: 'insensitive' as const } } : {}),
    ...(entityType ? { entityType } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59Z`) } : {}),
          },
        }
      : {}),
    ...(categoryFilter ?? {}),
  };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      actorId: true,
      actorRole: true,
      action: true,
      entityType: true,
      entityId: true,
      ip: true,
      createdAt: true,
      exchangeId: true,
    },
  });

  const formatDate = (d: Date) =>
    d.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const header = 'شناسه,زمان,کنشگر,نقش,اقدام,نوع موجودیت,شناسه موجودیت,IP,صرافی';
  const rows = logs.map((l) =>
    [
      l.id,
      formatDate(l.createdAt),
      l.actorId ?? '',
      l.actorRole ?? '',
      l.action,
      l.entityType ?? '',
      l.entityId ?? '',
      l.ip ?? '',
      l.exchangeId ?? '',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );

  const csv = [header, ...rows].join('\n');

  return { success: true, csv };
}
