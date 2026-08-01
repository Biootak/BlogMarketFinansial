/**
 * approvals.ts — Approval Workflows
 * ─────────────────────────────────────────────────────────────
 *  داده‌های واقعی از ApprovalRequest + ApprovalStep
 *  موارد استفاده: settlement, kyc, refund, withdrawal
 */

import 'server-only';

import { revalidateTag } from '@/lib/revalidate';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';

export type ApprovalType = 'settlement' | 'kyc' | 'refund' | 'withdrawal' | 'custom';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type StepStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

export interface ApprovalStepSummary {
  id: string;
  requestId: string;
  stepIndex: number;
  approverRole: string;
  approverId: string | null;
  status: StepStatus;
  comment: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface ApprovalSummary {
  id: string;
  type: ApprovalType;
  title: string;
  description: string | null;
  entityType: string;
  entityId: string;
  requesterId: string;
  requesterName: string | null;
  status: ApprovalStatus;
  currentStep: number;
  totalSteps: number;
  payload: unknown;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  steps: ApprovalStepSummary[];
  /** آیا مرحله فعلی به کاربر فعلی تعلق دارد (mine) */
  isMine: boolean;
  /** برچسب مرحله فعلی (نقش) */
  currentApproverRole: string | null;
}

export interface ApprovalSnapshot {
  generatedAt: string;
  requests: ApprovalSummary[];
  metrics: {
    pending: number;
    approved24h: number;
    rejected24h: number;
    myPending: number;
    avgDecisionMin: number;
  };
}

const VALID_TYPE: ApprovalType[] = ['settlement', 'kyc', 'refund', 'withdrawal', 'custom'];
const VALID_STATUS: ApprovalStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];

const requireStaff = async () => {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, reason: 'احراز هویت نشده‌اید' };
  const role = session.user.role ?? '';
  // SUPPORT-fix: SUPPORT می‌تواند تأییدیه‌ها را ببیند
  if (!['OWNER', 'SUPERADMIN', 'ADMIN', 'SUPPORT'].includes(role)) {
    return { ok: false as const, reason: 'دسترسی ندارید' };
  }
  return { ok: true as const, userId: session.user.id, role };
};

const toStep = (row: {
  id: string;
  requestId: string;
  stepIndex: number;
  approverRole: string;
  approverId: string | null;
  status: string;
  comment: string | null;
  decidedAt: Date | null;
  createdAt: Date;
}): ApprovalStepSummary => ({
  id: row.id,
  requestId: row.requestId,
  stepIndex: row.stepIndex,
  approverRole: row.approverRole,
  approverId: row.approverId,
  status: (['pending', 'approved', 'rejected', 'skipped'].includes(row.status)
    ? row.status
    : 'pending') as StepStatus,
  comment: row.comment,
  decidedAt: row.decidedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
});

const toRequest = (
  row: {
    id: string;
    type: string;
    title: string;
    description: string | null;
    entityType: string;
    entityId: string;
    requesterId: string;
    status: string;
    currentStep: number;
    totalSteps: number;
    payload: unknown;
    decidedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  steps: ApprovalStepSummary[],
  requesterName: string | null = null,
  currentUserId?: string,
  currentRole?: string,
): ApprovalSummary => {
  const currentStepRow = steps[row.currentStep];
  const isMine =
    row.status === 'pending' &&
    !!currentUserId &&
    !!currentStepRow &&
    (currentStepRow.approverId === currentUserId ||
      currentStepRow.approverRole === currentRole);
  return {
    id: row.id,
    type: (VALID_TYPE as string[]).includes(row.type) ? (row.type as ApprovalType) : 'custom',
    title: row.title,
    description: row.description,
    entityType: row.entityType,
    entityId: row.entityId,
    requesterId: row.requesterId,
    requesterName,
    status: (VALID_STATUS as string[]).includes(row.status)
      ? (row.status as ApprovalStatus)
      : 'pending',
    currentStep: row.currentStep,
    totalSteps: row.totalSteps,
    payload: row.payload,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    steps,
    isMine,
    currentApproverRole: currentStepRow?.approverRole ?? null,
  };
};

const fetchSnapshotRaw = async (
  currentUserId: string,
  currentRole: string,
): Promise<ApprovalSnapshot> => {
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [requests, pending, approved24, rejected24, decided24] = await Promise.all([
    prisma.approvalRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { steps: { orderBy: { stepIndex: 'asc' } } },
    }),
    prisma.approvalRequest.count({ where: { status: 'pending' } }),
    prisma.approvalRequest.count({ where: { status: 'approved', decidedAt: { gte: since24 } } }),
    prisma.approvalRequest.count({ where: { status: 'rejected', decidedAt: { gte: since24 } } }),
    prisma.approvalRequest.findMany({
      where: { status: { in: ['approved', 'rejected'] }, decidedAt: { gte: since24 } },
      select: { createdAt: true, decidedAt: true },
    }),
  ]);

  // گرفتن نام درخواست‌کننده‌ها
  const requesterIds = Array.from(new Set(requests.map((r) => r.requesterId)));
  const users =
    requesterIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: requesterIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u.name ?? u.email]));

  const mapped = requests.map((r) =>
    toRequest(
      r,
      r.steps.map(toStep),
      userMap.get(r.requesterId) ?? null,
      currentUserId,
      currentRole,
    ),
  );

  // requests pending که مرحله فعلی متعلق به currentUser یا currentRole است
  const myPending = mapped.filter((r) => r.isMine).length;

  // میانگین زمان تصمیم‌گیری
  let totalMin = 0;
  let count = 0;
  for (const r of decided24) {
    if (r.decidedAt) {
      totalMin += (r.decidedAt.getTime() - r.createdAt.getTime()) / 60_000;
      count += 1;
    }
  }
  const avgDecisionMin = count > 0 ? Math.round((totalMin / count) * 10) / 10 : 0;

  return {
    generatedAt: new Date().toISOString(),
    requests: mapped,
    metrics: {
      pending,
      approved24h: approved24,
      rejected24h: rejected24,
      myPending,
      avgDecisionMin,
    },
  };
};

const empty: ApprovalSnapshot = {
  generatedAt: new Date().toISOString(),
  requests: [],
  metrics: { pending: 0, approved24h: 0, rejected24h: 0, myPending: 0, avgDecisionMin: 0 },
};

const getCachedSnapshot = safeCache(
  async () => {
    // فقط owner/superadmin می‌توانند snapshot عمومی ببینند
    const session = await auth();
    if (!session?.user?.id) return empty;
    const role = session.user.role ?? '';
    if (!['OWNER', 'SUPERADMIN', 'ADMIN', 'SUPPORT'].includes(role)) return empty;
    return fetchSnapshotRaw(session.user.id, role);
  },
  empty,
  {
    key: 'approvals-snapshot',
    ttl: 30,
    tags: ['approval-request', 'approval-step', 'approvals'],
  },
);

export async function getApprovalSnapshot(): Promise<{
  success: boolean;
  data?: ApprovalSnapshot;
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

export interface CreateApprovalInput {
  type: ApprovalType;
  title: string;
  description?: string;
  entityType: string;
  entityId: string;
  steps: Array<{ approverRole: string; approverId?: string | null }>;
  payload?: unknown;
}

export async function createApproval(
  input: CreateApprovalInput,
): Promise<{ success: boolean; id?: string; message?: string }> {
  const guard = await requireStaff();
  if (!guard.ok) return { success: false, message: guard.reason };
  if (!input.title.trim()) return { success: false, message: 'عنوان الزامی است' };
  if (input.steps.length === 0) {
    return { success: false, message: 'حداقل یک مرحله تأیید لازم است' };
  }
  try {
    const created = await prisma.approvalRequest.create({
      data: {
        type: input.type,
        title: input.title.trim(),
        description: input.description ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        requesterId: guard.userId,
        totalSteps: input.steps.length,
        payload: input.payload === undefined ? undefined : (input.payload as object),
        status: 'pending',
        currentStep: 0,
        steps: {
          create: input.steps.map((s, i) => ({
            stepIndex: i,
            approverRole: s.approverRole,
            approverId: s.approverId ?? null,
            status: 'pending',
          })),
        },
      },
      select: { id: true },
    });
    revalidateTag('approvals');
    revalidateTag('approval-request');
    revalidateTag('approval-step');
    return { success: true, id: created.id };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در ساخت',
    };
  }
}

export async function decideStep(
  requestId: string,
  decision: 'approved' | 'rejected',
  comment?: string,
): Promise<{ success: boolean; message?: string }> {
  const guard = await requireStaff();
  if (!guard.ok) return { success: false, message: guard.reason };
  if (decision !== 'approved' && decision !== 'rejected') {
    return { success: false, message: 'تصمیم نامعتبر' };
  }
  try {
    const request = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: { steps: { orderBy: { stepIndex: 'asc' } } },
    });
    if (!request) return { success: false, message: 'درخواست یافت نشد' };
    if (request.status !== 'pending') {
      return { success: false, message: 'درخواست دیگر در حال بررسی نیست' };
    }
    const currentStep = request.steps[request.currentStep];
    if (!currentStep) return { success: false, message: 'مرحله فعلی نامعتبر است' };

    // چک کاربر: یا owner دارد یا نقش
    const canDecide =
      (currentStep.approverId && currentStep.approverId === guard.userId) ||
      currentStep.approverRole === guard.role;
    if (!canDecide) return { success: false, message: 'شما مجاز به تصمیم نیستید' };

    const now = new Date();
    if (decision === 'rejected') {
      // همه را rejected می‌کنیم (skip بقیه) و request نهایی می‌شود
      await prisma.$transaction([
        prisma.approvalStep.update({
          where: { id: currentStep.id },
          data: { status: 'rejected', decidedAt: now, comment: comment ?? null },
        }),
        // skip بقیه مراحل
        ...request.steps.slice(request.currentStep + 1).map((s) =>
          prisma.approvalStep.update({
            where: { id: s.id },
            data: { status: 'skipped' },
          }),
        ),
        prisma.approvalRequest.update({
          where: { id: requestId },
          data: { status: 'rejected', decidedAt: now },
        }),
      ]);
    } else {
      // approved
      const isLast = request.currentStep === request.totalSteps - 1;
      await prisma.$transaction([
        prisma.approvalStep.update({
          where: { id: currentStep.id },
          data: { status: 'approved', decidedAt: now, comment: comment ?? null },
        }),
        prisma.approvalRequest.update({
          where: { id: requestId },
          data: isLast
            ? { status: 'approved', decidedAt: now }
            : { currentStep: request.currentStep + 1 },
        }),
      ]);
    }
    revalidateTag('approvals');
    revalidateTag('approval-request');
    revalidateTag('approval-step');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در ثبت تصمیم',
    };
  }
}

export async function getApprovalById(
  id: string,
): Promise<{ success: boolean; data?: ApprovalSummary; message?: string }> {
  const guard = await requireStaff();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    const r = await prisma.approvalRequest.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepIndex: 'asc' } } },
    });
    if (!r) return { success: false, message: 'یافت نشد' };
    const requester = await prisma.user.findUnique({
      where: { id: r.requesterId },
      select: { name: true, email: true },
    });
    return {
      success: true,
      data: toRequest(
        r,
        r.steps.map(toStep),
        requester?.name ?? requester?.email ?? null,
        guard.userId,
        guard.role,
      ),
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطای ناشناخته',
    };
  }
}

export async function cancelApproval(
  requestId: string,
): Promise<{ success: boolean; message?: string }> {
  const guard = await requireStaff();
  if (!guard.ok) return { success: false, message: guard.reason };
  try {
    const request = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
      select: { requesterId: true, status: true },
    });
    if (!request) return { success: false, message: 'یافت نشد' };
    if (request.status !== 'pending') {
      return { success: false, message: 'فقط درخواست‌های در حال بررسی قابل لغو هستند' };
    }
    if (request.requesterId !== guard.userId && !['OWNER', 'SUPERADMIN'].includes(guard.role)) {
      return { success: false, message: 'فقط سازنده یا مالک می‌تواند لغو کند' };
    }
    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: 'cancelled', decidedAt: new Date() },
    });
    revalidateTag('approvals');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'خطا در لغو',
    };
  }
}
