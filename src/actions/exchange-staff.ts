'use server';

/**
 * exchange-staff — Server Actions برای مدیریت کارکنان صرافی
 *
 * OWNER/ADMIN پلتفرم: همه کارکنان همه صراف‌ها را می‌بینند.
 * ExchangeStaff با نقش OWNER/MANAGER: کارکنان صرافی خودشان.
 */

import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import type { ExchangeStaffRole } from '@prisma/client';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const StaffInviteSchema = z.object({
  exchangeId: z.string().min(1, 'صرافی الزامی است'),
  userId: z.string().min(1, 'کاربر الزامی است'),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF', 'VIEWER']),
  title: z.string().max(120).nullable().optional(),
  permissions: z.array(z.string()).default([]),
});

const StaffUpdateSchema = z.object({
  role: z.enum(['OWNER', 'MANAGER', 'STAFF', 'VIEWER']).optional(),
  title: z.string().max(120).nullable().optional(),
  permissions: z.array(z.string()).optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type StaffRow = {
  id: string;
  exchangeId: string;
  exchangeName: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  role: ExchangeStaffRole;
  title: string | null;
  permissions: string[];
  invitedBy: string | null;
  joinedAt: Date;
  revokedAt: Date | null;
};

function mapStaff(raw: {
  id: string;
  exchangeId: string;
  userId: string;
  role: ExchangeStaffRole;
  title: string | null;
  permissions: string[];
  invitedBy: string | null;
  joinedAt: Date;
  revokedAt: Date | null;
  Exchange: { name: string };
  User: { name: string | null; email: string | null; image: string | null };
}): StaffRow {
  return {
    id: raw.id,
    exchangeId: raw.exchangeId,
    exchangeName: raw.Exchange.name,
    userId: raw.userId,
    userName: raw.User.name,
    userEmail: raw.User.email,
    userImage: raw.User.image,
    role: raw.role,
    title: raw.title,
    permissions: raw.permissions,
    invitedBy: raw.invitedBy,
    joinedAt: raw.joinedAt,
    revokedAt: raw.revokedAt,
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getAllStaff(opts?: {
  exchangeId?: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<StaffRow[]> {
  try {
    const where: Record<string, unknown> = {};
    if (opts?.exchangeId && opts.exchangeId !== 'all') {
      where.exchangeId = opts.exchangeId;
    }
    if (opts?.query) {
      where.OR = [
        { User: { name: { contains: opts.query, mode: 'insensitive' } } },
        { User: { email: { contains: opts.query, mode: 'insensitive' } } },
        { Exchange: { name: { contains: opts.query, mode: 'insensitive' } } },
      ];
    }
    const rows = await prisma.exchangeStaff.findMany({
      where,
      take: opts?.limit ?? 100,
      skip: opts?.offset ?? 0,
      orderBy: { joinedAt: 'desc' },
      include: {
        Exchange: { select: { name: true } },
        User: { select: { name: true, email: true, image: true } },
      },
    });
    return rows.map(mapStaff);
  } catch {
    return [];
  }
}

// ─── User Search (for invite autocomplete) ───────────────────────────────────

export type UserSearchResult = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export async function searchUsersForStaff(query: string): Promise<UserSearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const auth = await requireAdmin();
    if (!auth.success) return [];
    const rows = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query.trim(), mode: 'insensitive' } },
          { email: { contains: query.trim(), mode: 'insensitive' } },
        ],
      },
      take: 8,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, image: true },
    });
    return rows;
  } catch {
    return [];
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function inviteStaff(input: unknown): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }
  const parsed = StaffInviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION', message: parsed.error.errors[0]?.message ?? 'داده نامعتبر' },
    };
  }
  const d = parsed.data;
  const staff = await prisma.exchangeStaff.upsert({
    where: { exchangeId_userId: { exchangeId: d.exchangeId, userId: d.userId } },
    create: {
      id: createId(),
      exchangeId: d.exchangeId,
      userId: d.userId,
      role: d.role,
      title: d.title ?? null,
      permissions: d.permissions,
      invitedBy: auth.user.id,
    },
    update: {
      role: d.role,
      title: d.title ?? null,
      permissions: d.permissions,
      revokedAt: null,
    },
  });
  revalidateTag('exchange-staff');
  return { success: true, data: { id: staff.id } };
}

export async function updateStaff(
  id: string,
  input: unknown,
): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }
  const parsed = StaffUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION', message: parsed.error.errors[0]?.message ?? 'داده نامعتبر' },
    };
  }
  await prisma.exchangeStaff.update({ where: { id }, data: parsed.data });
  revalidateTag('exchange-staff');
  return { success: true, data: { id } };
}

export async function revokeStaff(id: string): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }
  await prisma.exchangeStaff.update({ where: { id }, data: { revokedAt: new Date() } });
  revalidateTag('exchange-staff');
  return { success: true, data: { id } };
}

export async function removeStaff(id: string): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }
  await prisma.exchangeStaff.delete({ where: { id } });
  revalidateTag('exchange-staff');
  return { success: true, data: { id } };
}
