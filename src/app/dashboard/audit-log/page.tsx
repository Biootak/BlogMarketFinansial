import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { AuditLogClient } from './_components/AuditLogClient';

export const metadata: Metadata = {
  title: 'گزارش ممیزی | داشبورد',
};

async function getRecentAuditLogs() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
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
  });
  return logs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    meta: l.meta as Record<string, unknown> | null,
  }));
}

export default async function AuditLogPage() {
  const session = await auth();
  if (
    !session?.user ||
    !['ADMIN', 'OWNER', 'SUPERADMIN'].includes(session.user.role ?? '')
  ) {
    redirect('/dashboard');
  }

  const logs = await getRecentAuditLogs();

  return (
    <div className="at-page" dir="rtl">
      <AuditLogClient logs={logs} />
    </div>
  );
}
