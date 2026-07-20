'use server';

/**
 * exchange-customers — Server Actions برای مدیریت مشتریان هر صراف.
 *
 * Tenant isolation: هر action نیازمند exchangeId است و دسترسی چک می‌شود.
 */

import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function requireExchangeAccess(exchangeId: string) {
  const auth = await requireUser();
  if (!auth.success) return { ok: false as const, error: auth };

  const { user } = auth;
  // OWNER/ADMIN پلتفرم همه چیز را می‌بینند
  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    return { ok: true as const, userId: user.id };
  }

  // بقیه باید staff همین صرافی باشند
  const staff = await prisma.exchangeStaff.findFirst({
    where: { exchangeId, userId: user.id, revokedAt: null },
  });
  if (!staff) {
    return {
      ok: false as const,
      error: {
        success: false as const,
        status: 403 as const,
        code: 'FORBIDDEN' as const,
        message: 'دسترسی به این صرافی ندارید',
      },
    };
  }

  return { ok: true as const, userId: user.id };
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const CustomerSchema = z.object({
  fullName: z.string().min(2, 'نام حداقل ۲ کاراکتر').max(120),
  fatherName: z.string().max(80).nullable().optional(),
  nationalId: z.string().max(20).nullable().optional(),
  passportNo: z.string().max(30).nullable().optional(),
  phone: z.string().min(7, 'شماره تلفن نامعتبر').max(25),
  email: z.string().email('ایمیل نامعتبر').nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  personalLimitAf: z.number().int().min(0).nullable().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CustomerRow = {
  id: string;
  exchangeId: string;
  fullName: string;
  fatherName: string | null;
  nationalId: string | null;
  passportNo: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  status: string;
  kycLevel: string;
  kycStatus: string;
  personalLimitAf: bigint | null;
  riskScore: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// ─── READ ─────────────────────────────────────────────────────────────────────

export async function getCustomers(
  exchangeId: string,
  opts?: { query?: string; status?: string; limit?: number; offset?: number },
): Promise<{ rows: CustomerRow[]; total: number }> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return { rows: [], total: 0 };

  const statusValue = opts?.status && opts.status !== 'all' ? opts.status : undefined;
  const where = {
    exchangeId,
    ...(statusValue ? { status: statusValue as 'PROSPECT' | 'ACTIVE' | 'FROZEN' | 'CLOSED' } : {}),
    ...(opts?.query
      ? {
          OR: [
            { fullName: { contains: opts.query, mode: 'insensitive' as const } },
            { phone: { contains: opts.query } },
            { nationalId: { contains: opts.query } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 50,
      skip: opts?.offset ?? 0,
    }),
    prisma.customer.count({ where }),
  ]);

  return { rows: rows as unknown as CustomerRow[], total };
}

export async function getCustomerById(
  exchangeId: string,
  customerId: string,
): Promise<CustomerRow | null> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return null;

  return prisma.customer.findFirst({
    where: { id: customerId, exchangeId },
  }) as Promise<CustomerRow | null>;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createCustomer(
  exchangeId: string,
  raw: unknown,
): Promise<ActionResult<CustomerRow>> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok)
    return { success: false, error: { code: access.error.code, message: access.error.message } };

  const parsed = CustomerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'داده نامعتبر' },
    };
  }

  const row = await prisma.customer.create({
    data: {
      id: createId(),
      exchangeId,
      ...parsed.data,
      personalLimitAf: parsed.data.personalLimitAf ? BigInt(parsed.data.personalLimitAf) : null,
      updatedAt: new Date(),
      createdById: access.userId,
    },
  });

  revalidateTag(`exchange-customers-${exchangeId}`);
  return { success: true, data: row as unknown as CustomerRow };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateCustomer(
  exchangeId: string,
  customerId: string,
  raw: unknown,
): Promise<ActionResult<CustomerRow>> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok)
    return { success: false, error: { code: access.error.code, message: access.error.message } };

  const parsed = CustomerSchema.partial().safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'داده نامعتبر' },
    };
  }

  const row = await prisma.customer.update({
    where: { id: customerId, exchangeId },
    data: {
      ...parsed.data,
      ...(parsed.data.personalLimitAf !== undefined
        ? {
            personalLimitAf: parsed.data.personalLimitAf
              ? BigInt(parsed.data.personalLimitAf)
              : null,
          }
        : {}),
      updatedAt: new Date(),
    },
  });

  revalidateTag(`exchange-customers-${exchangeId}`);
  return { success: true, data: row as unknown as CustomerRow };
}

// ─── STATUS ───────────────────────────────────────────────────────────────────

export async function setCustomerStatus(
  exchangeId: string,
  customerId: string,
  status: 'PROSPECT' | 'ACTIVE' | 'FROZEN' | 'CLOSED',
): Promise<ActionResult<{ id: string; status: string }>> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok)
    return { success: false, error: { code: access.error.code, message: access.error.message } };

  const row = await prisma.customer.update({
    where: { id: customerId, exchangeId },
    data: { status, updatedAt: new Date() },
    select: { id: true, status: true },
  });

  revalidateTag(`exchange-customers-${exchangeId}`);
  return { success: true, data: row };
}
