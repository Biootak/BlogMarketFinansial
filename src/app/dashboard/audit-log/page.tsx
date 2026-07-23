import { auth } from '@/auth';
import prisma from '@/lib/db';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AuditLogClient } from './_components/AuditLogClient';

export const metadata: Metadata = {
  title: 'گزارش ممیزی | داشبورد',
  description: 'تاریخچه تمام اقدامات حساس سیستم',
};

const PAGE_SIZE = 25;

const CATEGORY_PREFIXES: Record<string, string[]> = {
  kyc:      ['KYC'],
  deal:     ['DEAL', 'CURRENCY_DEAL'],
  exchange: ['EXCHANGE', 'SETTLEMENT'],
  security: ['FRAUD', 'SECURITY'],
  transfer: ['TRANSFER', 'PAYMENT'],
};

async function getAuditLogs(opts: {
  page: number;
  search?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
}) {
  const { page, search, entityType, dateFrom, dateTo, category } = opts;
  const skip = (page - 1) * PAGE_SIZE;

  const categoryFilter =
    category && CATEGORY_PREFIXES[category]
      ? {
          OR: CATEGORY_PREFIXES[category].map((p) => ({
            action: { startsWith: p, mode: 'insensitive' as const },
          })),
        }
      : {};

  const where = {
    ...(search
      ? {
          action: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
      : {}),
    ...(entityType ? { entityType } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59Z`) } : {}),
          },
        }
      : {}),
    ...categoryFilter,
  };

  const [logs, total, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        actorId: true,
        actorRole: true,
        action: true,
        entityType: true,
        entityId: true,
        ip: true,
        createdAt: true,
        meta: true,
        exchangeId: true,
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      distinct: ['entityType'],
      select: { entityType: true },
      where: { entityType: { not: null } },
    }),
  ]);

  return {
    logs: logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      meta: l.meta as Record<string, unknown> | null,
    })),
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    entityTypes: entityTypes.map((e) => e.entityType).filter(Boolean) as string[],
  };
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER', 'SUPERADMIN'].includes(session.user.role ?? '')) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1'));
  const search = params.search ?? '';
  const entityType = params.entityType ?? '';
  const dateFrom = params.dateFrom ?? '';
  const dateTo = params.dateTo ?? '';
  const category = params.category ?? '';

  const { logs, total, totalPages, entityTypes } = await getAuditLogs({
    page,
    search: search || undefined,
    entityType: entityType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    category: category || undefined,
  });

  return (
    <div className="at-page" dir="rtl">
      <Suspense
        fallback={
          <div style={{ padding: '2rem', color: 'var(--ds-text-muted)' }}>در حال بارگذاری...</div>
        }
      >
        <AuditLogClient
          logs={logs}
          total={total}
          totalPages={totalPages}
          currentPage={page}
          entityTypes={entityTypes}
          currentSearch={search}
          currentEntityType={entityType}
          currentDateFrom={dateFrom}
          currentDateTo={dateTo}
          currentCategory={category}
        />
      </Suspense>
    </div>
  );
}
