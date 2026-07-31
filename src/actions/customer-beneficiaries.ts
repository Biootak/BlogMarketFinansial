/**
 * customer-beneficiaries.ts
 *
 * مدیریت مخاطبان در سطح Customer Portal (نه User-level).
 * CustomerBeneficiary به customerId متصل است؛ tenant-isolated.
 *
 * تفاوت با beneficiaries.ts (site-level):
 *  - در اینجا owner یک Customer record است (نه User).
 *  - exchangeId از Customer record گرفته می‌شود.
 *  - actions متفاوت‌اند تا helper های مشترک ناخواسته share نشوند.
 *
 * 2026-07-28: Customer Portal به آن نیاز داشت (transfer wizard → save recipient).
 */

import { revalidateTag } from '@/lib/revalidate';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireCustomerAccess } from '@/lib/customer-auth';
import type { Prisma } from '@prisma/client';

export type CustomerBeneficiaryResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// ─── Schemas ──────────────────────────────────────────────────────────────────

const IdentifierSchema = z
  .string()
  .min(8, 'شناسه باید حداقل ۸ کاراکتر باشد')
  .max(64, 'شناسه نباید بیش از ۶۴ کاراکتر باشد')
  .regex(/^[A-Z0-9\-]+$/i, 'شناسه فقط می‌تواند شامل حروف، اعداد و خط تیره باشد');

const CreateSchema = z.object({
  name: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد').max(80, 'نام نباید بیش از ۸۰ کاراکتر باشد'),
  identifier: IdentifierSchema,
  note: z.string().max(200).optional().nullable(),
});

const UpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(80).optional(),
  note: z.string().max(200).optional().nullable(),
});

export type CustomerBeneficiary = {
  id: string;
  name: string;
  identifier: string;
  note: string | null;
  createdAt: Date;
};

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * لیست مخاطبان یک مشتری (customer-scoped).
 */
export async function listCustomerBeneficiaries(): Promise<CustomerBeneficiaryResult<CustomerBeneficiary[]>> {
  const auth = await requireCustomerAccess();
  if (!auth.ok) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: auth.error.message } };
  }

  const rows = await prisma.beneficiary.findMany({
    where: { customerId: auth.customerId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, name: true, identifier: true, note: true, createdAt: true },
  });

  return { success: true, data: rows };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createCustomerBeneficiary(
  raw: unknown,
): Promise<CustomerBeneficiaryResult<CustomerBeneficiary>> {
  const auth = await requireCustomerAccess();
  if (!auth.ok) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: auth.error.message } };
  }

  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'خطای اعتبارسنجی',
      },
    };
  }

  const { name, identifier, note } = parsed.data;

  // duplicate check
  const existing = await prisma.beneficiary.findUnique({
    where: { customerId_identifier: { customerId: auth.customerId, identifier } },
  });
  if (existing) {
    return {
      success: false,
      error: { code: 'DUPLICATE', message: 'این شناسه قبلاً اضافه شده است' },
    };
  }

  const row = await prisma.beneficiary.create({
    data: {
      id: crypto.randomUUID(),
      customerId: auth.customerId,
      name,
      identifier,
      note: note ?? null,
    },
    select: { id: true, name: true, identifier: true, note: true, createdAt: true },
  });

  // audit
  try {
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        exchangeId: auth.exchangeId,
        actorId: auth.userId,
        actorRole: 'CUSTOMER',
        action: 'CUSTOMER_BENEFICIARY_CREATED',
        entityType: 'Beneficiary',
        entityId: row.id,
        meta: { name, identifier, customerId: auth.customerId } as Prisma.InputJsonValue,
      },
    });
  } catch {
    // best-effort
  }

  revalidateTag('customer-beneficiaries');
  return { success: true, data: row };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateCustomerBeneficiary(
  raw: unknown,
): Promise<CustomerBeneficiaryResult<void>> {
  const auth = await requireCustomerAccess();
  if (!auth.ok) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: auth.error.message } };
  }

  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'خطا',
      },
    };
  }
  const { id, name, note } = parsed.data;

  const row = await prisma.beneficiary.findFirst({
    where: { id, customerId: auth.customerId },
  });
  if (!row) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'مخاطب یافت نشد' } };
  }

  await prisma.beneficiary.update({
    where: { id },
    data: { ...(name ? { name } : {}), note: note ?? null },
  });

  revalidateTag('customer-beneficiaries');
  return { success: true, data: undefined };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteCustomerBeneficiary(
  id: string,
): Promise<CustomerBeneficiaryResult<void>> {
  const auth = await requireCustomerAccess();
  if (!auth.ok) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: auth.error.message } };
  }

  const row = await prisma.beneficiary.findFirst({
    where: { id, customerId: auth.customerId },
  });
  if (!row) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'مخاطب یافت نشد' } };
  }

  await prisma.beneficiary.delete({ where: { id } });

  // audit
  try {
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        exchangeId: auth.exchangeId,
        actorId: auth.userId,
        actorRole: 'CUSTOMER',
        action: 'CUSTOMER_BENEFICIARY_DELETED',
        entityType: 'Beneficiary',
        entityId: id,
        meta: { name: row.name } as Prisma.InputJsonValue,
      },
    });
  } catch {
    // best-effort
  }

  revalidateTag('customer-beneficiaries');
  return { success: true, data: undefined };
}
