'use server';

/**
 * exchange-customers — Server Actions برای مدیریت مشتریان هر صراف.
 *
 * Tenant isolation: هر action نیازمند exchangeId است و دسترسی چک می‌شود.
 *
 * P0-5: nationalId قبل از ذخیره با SHA-256 هش می‌شود (حفظ حریم خصوصی)
 * P3-1: mapCustomer() type-safe به جای as unknown as CustomerRow
 * P3-2: personalLimitAf در CustomerRow از bigint به string تبدیل شد (JSON-safe)
 */

import { createHash } from 'node:crypto';
import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── Helper: هش کردن شناسه ملی (P0-5) ────────────────────────────────────────
// SHA-256 یک‌طرفه — نه قابل بازیابی نه قابل مقایسه متنی.
// مثال: "1234567890" → "a665a45920422f9d417e4867efdc4fb8a0..."
// برای search: ورودی کاربر را هش کن و با هش ذخیره‌شده مقایسه کن.
function hashNationalId(id: string): string {
  return createHash('sha256').update(id.trim()).digest('hex');
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
  /** هش SHA-256 کد ملی — برای نمایش در UI باید null یا '[محافظت‌شده]' نشان داده شود */
  nationalId: string | null;
  passportNo: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  status: string;
  kycLevel: string;
  kycStatus: string;
  /** P3-2: string به جای bigint — JSON-serializable و قابل پاس به client components */
  personalLimitAf: string | null;
  riskScore: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ─── mapCustomer: type-safe mapper (P3-1) ─────────────────────────────────────
type PrismaCustomer = {
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

function mapCustomer(row: PrismaCustomer): CustomerRow {
  return {
    id: row.id,
    exchangeId: row.exchangeId,
    fullName: row.fullName,
    fatherName: row.fatherName,
    nationalId: row.nationalId, // هش ذخیره‌شده — نه plain text
    passportNo: row.passportNo,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    status: row.status,
    kycLevel: row.kycLevel,
    kycStatus: row.kycStatus,
    personalLimitAf: row.personalLimitAf != null ? row.personalLimitAf.toString() : null,
    riskScore: row.riskScore,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

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
            // P0-5: search روی هش — ورودی کاربر را قبل از مقایسه هش کن
            { nationalId: { equals: hashNationalId(opts.query) } },
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

  return { rows: rows.map(mapCustomer), total };
}

export async function getCustomerById(
  exchangeId: string,
  customerId: string,
): Promise<CustomerRow | null> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return null;

  const row = await prisma.customer.findFirst({
    where: { id: customerId, exchangeId },
  });
  return row ? mapCustomer(row) : null;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createCustomer(
  exchangeId: string,
  raw: unknown,
): Promise<FintechActionResult<CustomerRow>> {
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

  const { nationalId, ...restData } = parsed.data;
  const row = await prisma.customer.create({
    data: {
      id: createId(),
      exchangeId,
      ...restData,
      // P0-5: هش کردن nationalId — plain text هرگز به DB نمی‌رسد
      nationalId: nationalId ? hashNationalId(nationalId) : null,
      personalLimitAf: parsed.data.personalLimitAf ? BigInt(parsed.data.personalLimitAf) : null,
      updatedAt: new Date(),
      createdById: access.userId,
    },
  });

  revalidateTag(`exchange-customers-${exchangeId}`);
  return { success: true, data: mapCustomer(row) };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateCustomer(
  exchangeId: string,
  customerId: string,
  raw: unknown,
): Promise<FintechActionResult<CustomerRow>> {
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

  const { nationalId: newNationalId, ...restUpdate } = parsed.data;
  const row = await prisma.customer.update({
    where: { id: customerId, exchangeId },
    data: {
      ...restUpdate,
      // P0-5: اگر nationalId جدید داده شده، هش کن
      ...(newNationalId !== undefined
        ? { nationalId: newNationalId ? hashNationalId(newNationalId) : null }
        : {}),
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
  return { success: true, data: mapCustomer(row) };
}

// ─── STATUS ───────────────────────────────────────────────────────────────────

export async function setCustomerStatus(
  exchangeId: string,
  customerId: string,
  status: 'PROSPECT' | 'ACTIVE' | 'FROZEN' | 'CLOSED',
): Promise<FintechActionResult<{ id: string; status: string }>> {
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
