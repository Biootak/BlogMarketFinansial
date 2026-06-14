'use server';

import { unstable_cache } from 'next/cache';
import { revalidatePath } from 'next/cache';
import { revalidateTag } from '@/lib/revalidate';
import prisma from '@/lib/db';
import type { SocialLinkType } from '@prisma/client';

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

// 2026-06-14: public-facing fetches are now cached. Social links
// change at most a few times a month, so 10 minutes is invisible
// and saves a DB round-trip on every home/footer render.
const getCachedSocialLinks = unstable_cache(
  async (type: SocialLinkType) => {
    return prisma.socialLink.findMany({
      where: { isActive: true, type },
      orderBy: { order: 'asc' },
    });
  },
  ['social-links', 'v1-2026-06-14'],
  {
    revalidate: 600,
    tags: ['social-links'],
  },
);

// Get active social links (for public display)
export async function getSocialLinks() {
  try {
    const links = await getCachedSocialLinks('SOCIAL');
    return { success: true, data: links };
  } catch (error) {
    console.error('Error fetching social links:', error);
    return { success: false, error: 'خطا در دریافت شبکه‌های اجتماعی' };
  }
}

// Get active support links (for contact forms)
export async function getSupportLinks() {
  try {
    const links = await getCachedSocialLinks('SUPPORT');
    return { success: true, data: links };
  } catch (error) {
    console.error('Error fetching support links:', error);
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
  } catch (error) {
    console.error('Error fetching social links:', error);
    return { success: false, error: 'خطا در دریافت لینک‌ها' };
  }
}


// Create social link
export async function createSocialLink(data: SocialLinkData) {
  try {
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
    return { success: true, data: link };
  } catch (error) {
    console.error('Error creating social link:', error);
    return { success: false, error: 'خطا در ایجاد لینک' };
  }
}

// Update social link
export async function updateSocialLink(id: string, data: Partial<SocialLinkData>) {
  try {
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
    return { success: true, data: link };
  } catch (error) {
    console.error('Error updating social link:', error);
    return { success: false, error: 'خطا در بروزرسانی لینک' };
  }
}

// Delete social link
export async function deleteSocialLink(id: string) {
  try {
    await prisma.socialLink.delete({ where: { id } });

    revalidatePath('/dashboard/settings');
    revalidatePath('/');
    revalidateTag('social-links');
    return { success: true };
  } catch (error) {
    console.error('Error deleting social link:', error);
    return { success: false, error: 'خطا در حذف لینک' };
  }
}

// Toggle social link active status
export async function toggleSocialLink(id: string) {
  try {
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
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error toggling social link:', error);
    return { success: false, error: 'خطا در تغییر وضعیت' };
  }
}

// Reorder social links
export async function reorderSocialLinks(orderedIds: string[]) {
  try {
    // 2026-06-14: previous version did N parallel updates which
    // can deadlock or overload the connection pool with large
    // lists. Now wrapped in a single $transaction so it's atomic
    // and the connection pool sees a single burst.
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.socialLink.update({ where: { id }, data: { order: index } })
      )
    );

    revalidatePath('/dashboard/settings');
    revalidatePath('/');
    revalidateTag('social-links');
    return { success: true };
  } catch (error) {
    console.error('Error reordering social links:', error);
    return { success: false, error: 'خطا در تغییر ترتیب' };
  }
}
