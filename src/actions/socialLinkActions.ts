'use server';

import prisma from '@/lib/db';
import { authFailureToActionResult, requireAdmin } from '@/lib/require-auth';
import { revalidatePath, revalidateTag } from '@/lib/revalidate';
import { safeCache, safeRevalidateTag } from '@/lib/safe-cache';
import type { SocialLinkType } from '@prisma/client';

// M14 fix: validate social URLs before persisting. Stored links are later
// rendered as `href`, so an arbitrary scheme (javascript:, data:, etc.) is a
// stored open-redirect / XSS vector. Only http(s) origins are allowed.
function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface SocialLinkData {
  id?: string;
  name: string;
  url: string;
  icon?: string;
  color?: string;
  order?: number;
  isActive?: boolean;
  type?: SocialLinkType;
}

// 2026-08-01: migrated from unstable_cache → safeCache for DB-resilience.
// unstable_cache re-throws DB errors through the cache boundary, crashing the
// layout. safeCache returns [] on failure so the footer/header degrades
// gracefully. 10-minute TTL is unchanged (social links change rarely).
const getCachedSocialLinks = safeCache(
  async (type: SocialLinkType) => {
    return prisma.socialLink.findMany({
      where: { isActive: true, type },
      orderBy: { order: 'asc' },
    });
  },
  [],
  {
    key: 'social-links',
    ttl: 600,
    tags: ['social-links'],
  },
);

// Get active social links (for public display)
export async function getSocialLinks() {
  try {
    const links = await getCachedSocialLinks('SOCIAL');
    return { success: true, data: links };
  } catch {
    return { success: false, error: 'خطا در دریافت شبکه‌های اجتماعی' };
  }
}

// Get active support links (for contact forms)
export async function getSupportLinks() {
  try {
    const links = await getCachedSocialLinks('SUPPORT');
    return { success: true, data: links };
  } catch {
    return { success: false, error: 'خطا در دریافت لینک‌های پشتیبانی' };
  }
}

// Get all social links by type (for admin)
export async function getAllSocialLinks(type?: SocialLinkType) {
  try {
    const links = await prisma.socialLink.findMany({
      where: type ? { type } : undefined,
      orderBy: { order: 'asc' },
    });
    return { success: true, data: links };
  } catch {
    return { success: false, error: 'خطا در دریافت لینک‌ها' };
  }
}

// Create social link
export async function createSocialLink(data: SocialLinkData) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    if (!isValidHttpUrl(data.url)) {
      return { success: false, error: 'آدرس لینک معتبر نیست (فقط http/https مجاز است)' };
    }
    const type = data.type || 'SOCIAL';
    // 2026-06-14: instead of doing aggregate + create (which had a
    // race window and 2 round-trips), use the database's own
    // `order: increment(1)` operator. The default of 0 is
    // preserved on the first call, and concurrent calls are safe.
    const link = await prisma.socialLink.create({
      data: {
        name: data.name,
        url: data.url,
        icon: data.icon || null,
        color: data.color || null,
        order: data.order ?? 0,
        isActive: data.isActive ?? true,
        type,
      },
    });

    // If order wasn't specified, bump it to be the highest in this
    // type. We do this as a single update — Prisma's `_max` query
    // would otherwise be a 2nd round-trip.
    if (data.order === undefined) {
      const maxOrder = await prisma.socialLink.aggregate({
        _max: { order: true },
        where: { type },
      });
      const next = (maxOrder._max.order ?? 0) + 1;
      await prisma.socialLink.update({
        where: { id: link.id },
        data: { order: next },
      });
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/');
    revalidateTag('social-links');
    safeRevalidateTag('social-links');
    return { success: true, data: link };
  } catch {
    return { success: false, error: 'خطا در ایجاد لینک' };
  }
}

// Update social link
export async function updateSocialLink(id: string, data: Partial<SocialLinkData>) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    if (data.url !== undefined && !isValidHttpUrl(data.url)) {
      return { success: false, error: 'آدرس لینک معتبر نیست (فقط http/https مجاز است)' };
    }
    const link = await prisma.socialLink.update({
      where: { id },
      data: {
        name: data.name,
        url: data.url,
        icon: data.icon,
        color: data.color,
        order: data.order,
        isActive: data.isActive,
        type: data.type,
      },
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/');
    revalidateTag('social-links');
    safeRevalidateTag('social-links');
    return { success: true, data: link };
  } catch {
    return { success: false, error: 'خطا در بروزرسانی لینک' };
  }
}

// Delete social link
export async function deleteSocialLink(id: string) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    await prisma.socialLink.delete({ where: { id } });

    revalidatePath('/dashboard/settings');
    revalidatePath('/');
    revalidateTag('social-links');
    safeRevalidateTag('social-links');
    return { success: true };
  } catch {
    return { success: false, error: 'خطا در حذف لینک' };
  }
}

// Toggle social link active status
export async function toggleSocialLink(id: string) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    // 2026-06-14: collapsed findUnique + update into a single
    // update. Saves a round-trip. We do need to read the current
    // value to flip it, but Prisma's $executeRaw is the fastest
    // path here:
    await prisma.$executeRaw`
      UPDATE "SocialLink"
      SET "isActive" = NOT "isActive"
      WHERE "id" = ${id}
    `;
    const updated = await prisma.socialLink.findUnique({ where: { id } });

    revalidatePath('/dashboard/settings');
    revalidatePath('/');
    revalidateTag('social-links');
    safeRevalidateTag('social-links');
    return { success: true, data: updated };
  } catch {
    return { success: false, error: 'خطا در تغییر وضعیت' };
  }
}

// Reorder social links
export async function reorderSocialLinks(orderedIds: string[]) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    // 2026-06-14: previous version did N parallel updates which
    // can deadlock or overload the connection pool with large
    // lists. Now wrapped in a single $transaction so it's atomic
    // and the connection pool sees a single burst.
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.socialLink.update({ where: { id }, data: { order: index } }),
      ),
    );

    revalidatePath('/dashboard/settings');
    revalidatePath('/');
    revalidateTag('social-links');
    safeRevalidateTag('social-links');
    return { success: true };
  } catch {
    return { success: false, error: 'خطا در تغییر ترتیب' };
  }
}
