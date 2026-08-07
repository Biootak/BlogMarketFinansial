/**
 * tickets.ts — مرکز داده‌های Helpdesk / Tickets
 * ─────────────────────────────────────────────────────────────
 *  داده‌های واقعی از SupportTicket + TicketMessage
 *  چند نقش می‌توانند تیکت بسازند: USER, CUSTOMER, EXCHANGE_STAFF
 *  ADMIN/OWNER/SUPERADMIN تیکت را بررسی و پاسخ می‌دهند.
 */

import 'server-only';

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { revalidateTag } from '@/lib/revalidate';
import { safeCache } from '@/lib/safe-cache';

export type TicketStatus = 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory =
  | 'general'
  | 'billing'
  | 'technical'
  | 'kyc'
  | 'account'
  | 'transfer'
  | 'rate'
  | 'other';

export interface TicketSummary {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  requesterId: string;
  requesterRole: string | null;
  assignedToId: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  messageCount: number;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessageSummary {
  id: string;
  ticketId: string;
  authorId: string;
  authorRole: string | null;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface TicketSnapshot {
  generatedAt: string;
  tickets: TicketSummary[];
  metrics: {
    open: number;
    pending: number;
    inProgress: number;
    resolved: number;
    closed: number;
    urgent: number;
    unassigned: number;
    avgFirstResponseMin: number;
  };
}

const requireStaff = async () => {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, reason: 'احراز هویت نشده‌اید' };
  const role = session.user.role ?? '';
  // SUPPORT-fix: SUPPORT هم در پشتیبانی تیکت نقش دارد
  if (!['OWNER', 'SUPERADMIN', 'ADMIN', 'AUTHOR', 'SUPPORT'].includes(role)) {
    return { ok: false as const, reason: 'دسترسی ندارید' };
  }
  return { ok: true as const, userId: session.user.id, role };
};

const VALID_STATUS: TicketStatus[] = ['open', 'pending', 'in_progress', 'resolved', 'closed'];
const VALID_PRIORITY: TicketPriority[] = ['low', 'normal', 'high', 'urgent'];
const VALID_CATEGORY: TicketCategory[] = [
  'general',
  'billing',
  'technical',
  'kyc',
  'account',
  'transfer',
  'rate',
  'other',
];

const toTicket = (row: {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  requesterId: string;
  requesterRole: string | null;
  assignedToId: string | null;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  messageCount: number;
  tags: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TicketSummary => ({
  id: row.id,
  subject: row.subject,
  description: row.description,
  status: (VALID_STATUS as string[]).includes(row.status) ? (row.status as TicketStatus) : 'open',
  priority: (VALID_PRIORITY as string[]).includes(row.priority)
    ? (row.priority as TicketPriority)
    : 'normal',
  category: (VALID_CATEGORY as string[]).includes(row.category)
    ? (row.category as TicketCategory)
    : 'general',
  requesterId: row.requesterId,
  requesterRole: row.requesterRole,
  assignedToId: row.assignedToId,
  firstResponseAt: row.firstResponseAt?.toISOString() ?? null,
  resolvedAt: row.resolvedAt?.toISOString() ?? null,
  closedAt: row.closedAt?.toISOString() ?? null,
  messageCount: row.messageCount,
  tags: row.tags,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const fetchSnapshotRaw = async (): Promise<TicketSnapshot> => {
  const [tickets, byStatus, urgentCount, unassignedCount, withFirstResponse] = await Promise.all([
    prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.supportTicket.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.supportTicket.count({ where: { priority: 'urgent', status: { not: 'closed' } } }),
    prisma.supportTicket.count({ where: { assignedToId: null, status: { not: 'closed' } } }),
    prisma.supportTicket.findMany({
      where: { firstResponseAt: { not: null } },
      select: { createdAt: true, firstResponseAt: true },
      take: 100, // Reduce from 200 to 100 for faster stats calculation
    }),
  ]);

  const byStatusMap = new Map(byStatus.map((r) => [r.status, r._count._all]));

  let totalMin = 0;
  let responseCount = 0;
  for (const t of withFirstResponse) {
    if (t.firstResponseAt) {
      totalMin += (t.firstResponseAt.getTime() - t.createdAt.getTime()) / 60_000;
      responseCount += 1;
    }
  }
  const avgFirstResponseMin =
    responseCount > 0 ? Math.round((totalMin / responseCount) * 10) / 10 : 0;

  return {
    generatedAt: new Date().toISOString(),
    tickets: tickets.map(toTicket),
    metrics: {
      open: byStatusMap.get('open') ?? 0,
      pending: byStatusMap.get('pending') ?? 0,
      inProgress: byStatusMap.get('in_progress') ?? 0,
      resolved: byStatusMap.get('resolved') ?? 0,
      closed: byStatusMap.get('closed') ?? 0,
      urgent: urgentCount,
      unassigned: unassignedCount,
      avgFirstResponseMin,
    },
  };
};

const empty: TicketSnapshot = {
  generatedAt: new Date().toISOString(),
  tickets: [],
  metrics: {
    open: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    urgent: 0,
    unassigned: 0,
    avgFirstResponseMin: 0,
  },
};

const getCachedSnapshot = safeCache(fetchSnapshotRaw, empty, {
  key: 'tickets-snapshot',
  ttl: 30,
  tags: ['support-ticket', 'tickets'],
});

export async function getTicketSnapshot(): Promise<{
  success: boolean;
  data?: TicketSnapshot;
  message?: string;
}> {
  const guard = await requireStaff();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    const data = await getCachedSnapshot();
    return { success: true, data };
  } catch (err) {
    return {
      success: true,
      data: empty,
      message: err instanceof Error ? err.message : 'خطای ناشناخته',
    };
  }
}

export async function getTicketMessages(ticketId: string): Promise<{
  success: boolean;
  data?: TicketMessageSummary[];
  message?: string;
}> {
  const guard = await requireStaff();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
    return {
      success: true,
      data: messages.map((m) => ({
        id: m.id,
        ticketId: m.ticketId,
        authorId: m.authorId,
        authorRole: m.authorRole,
        body: m.body,
        isInternal: m.isInternal,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا',
    };
  }
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  priority?: TicketPriority;
  category?: TicketCategory;
  tags?: string;
}

export async function createTicket(
  input: CreateTicketInput,
): Promise<{ success: boolean; id?: string; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'احراز هویت نشده‌اید' };
  if (!input.subject.trim() || !input.description.trim()) {
    return { success: false, message: 'موضوع و شرح الزامی است' };
  }
  if (input.subject.length > 200) {
    return { success: false, message: 'موضوع نباید بیش از ۲۰۰ کاراکتر باشد' };
  }
  if (input.description.length > 10_000) {
    return { success: false, message: 'شرح نباید بیش از ۱۰۰۰۰ کاراکتر باشد' };
  }
  try {
    const created = await prisma.supportTicket.create({
      data: {
        subject: input.subject.trim(),
        description: input.description.trim(),
        priority: input.priority ?? 'normal',
        category: input.category ?? 'general',
        tags: input.tags ?? null,
        requesterId: session.user.id,
        requesterRole: session.user.role ?? null,
        messageCount: 0,
        status: 'open',
      },
      select: { id: true },
    });
    revalidateTag('tickets');
    revalidateTag('support-ticket');
    return { success: true, id: created.id };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در ساخت تیکت',
    };
  }
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
): Promise<{ success: boolean; message?: string }> {
  const guard = await requireStaff();
  if (!guard.ok) return { success: false, message: guard.reason };
  if (!VALID_STATUS.includes(status)) return { success: false, message: 'وضعیت نامعتبر' };
  try {
    const now = new Date();
    const data: {
      status: TicketStatus;
      firstResponseAt?: Date;
      resolvedAt?: Date;
      closedAt?: Date;
    } = {
      status,
    };
    if (status === 'in_progress' || status === 'pending') {
      // فقط اولین بار firstResponseAt را ست می‌کنیم
    }
    if (status === 'resolved') data.resolvedAt = now;
    if (status === 'closed') data.closedAt = now;
    await prisma.supportTicket.update({ where: { id }, data });
    revalidateTag('tickets');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در به‌روزرسانی',
    };
  }
}

export async function assignTicket(
  id: string,
  assigneeId: string | null,
): Promise<{ success: boolean; message?: string }> {
  const guard = await requireStaff();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    await prisma.supportTicket.update({
      where: { id },
      data: { assignedToId: assigneeId },
    });
    revalidateTag('tickets');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در ارجاع',
    };
  }
}

export async function replyToTicket(
  ticketId: string,
  body: string,
  isInternal = false,
): Promise<{ success: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'احراز هویت نشده‌اید' };
  if (!body.trim()) return { success: false, message: 'پیام خالی است' };
  if (body.length > 5000) return { success: false, message: 'پیام نباید بیش از ۵۰۰۰ کاراکتر باشد' };
  if (isInternal) {
    // فقط staff می‌توانند یادداشت داخلی بگذارند
    const role = session.user.role ?? '';
    if (!['OWNER', 'SUPERADMIN', 'ADMIN', 'AUTHOR', 'SUPPORT'].includes(role)) {
      return { success: false, message: 'دسترسی ندارید' };
    }
  }
  try {
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        authorId: session.user.id,
        authorRole: session.user.role ?? null,
        body: body.trim(),
        isInternal,
      },
    });
    // به‌روزرسانی messageCount و firstResponseAt (اگر اولین پاسخ است)
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { firstResponseAt: true, messageCount: true },
    });
    if (ticket) {
      const updateData: { messageCount: { increment: number }; firstResponseAt?: Date } = {
        messageCount: { increment: 1 },
      };
      if (!ticket.firstResponseAt && !isInternal) {
        updateData.firstResponseAt = new Date();
      }
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: updateData,
      });
    }
    revalidateTag('tickets');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در ارسال پاسخ',
    };
  }
}
