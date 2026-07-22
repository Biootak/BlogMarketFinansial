'use server';

import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';
import { revalidatePath } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import { z } from 'zod';

const BillingAddressSchema = z.object({
  country: z.string().min(2).max(10).default('af'),
  province: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(300).optional(),
  postalCode: z.string().max(20).optional(),
  recipientName: z.string().max(100).optional(),
  phoneNumber: z.string().max(30).optional(),
});

export type BillingAddressData = z.infer<typeof BillingAddressSchema>;

export async function getBillingAddress(): Promise<FintechActionResult<BillingAddressData | null>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }
  const record = await prisma.billingAddress.findUnique({
    where: { userId: auth.user.id },
    select: { country: true, province: true, city: true, address: true, postalCode: true, recipientName: true, phoneNumber: true },
  });
  if (!record) return { success: true, data: null };
  // null → undefined برای سازگاری با Zod schema (optional fields)
  return {
    success: true,
    data: {
      country: record.country,
      province: record.province ?? undefined,
      city: record.city ?? undefined,
      address: record.address ?? undefined,
      postalCode: record.postalCode ?? undefined,
      recipientName: record.recipientName ?? undefined,
      phoneNumber: record.phoneNumber ?? undefined,
    },
  };
}

export async function saveBillingAddress(raw: unknown): Promise<FintechActionResult<void>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const parsed = BillingAddressSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'ورودی نامعتبر' },
    };
  }

  const { country, province, city, address, postalCode, recipientName, phoneNumber } = parsed.data;

  const existing = await prisma.billingAddress.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });

  if (existing) {
    await prisma.billingAddress.update({
      where: { userId: auth.user.id },
      data: { country, province, city, address, postalCode, recipientName, phoneNumber, updatedAt: new Date() },
    });
  } else {
    await prisma.billingAddress.create({
      data: {
        id: auth.user.id + '_ba',
        userId: auth.user.id,
        country,
        province,
        city,
        address,
        postalCode,
        recipientName,
        phoneNumber,
        updatedAt: new Date(),
      },
    });
  }

  revalidatePath('/dashboard/billing-address');
  return { success: true, data: undefined };
}
