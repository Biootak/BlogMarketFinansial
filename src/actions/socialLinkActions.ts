'use server';

import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';

export interface SocialLinkData {
  id?: string;
  name: string;
  url: string;
  icon?: string;
  color?: string;
  order?: number;
  isActive?: boolean;
}

// Get all social links
export async function getSocialLinks() {
  try {
    const links = await prisma.socialLink.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    return { success: true, data: links };
  } catch (error) {
    console.error('Error fetching social links:', error);
    return { success: false, error: 'خطا در دریافت شبکه‌های اجتماعی' };
  }
}

// Get all social links (including inactive) for admin
export async function getAllSocialLinks() {
  try {
    const links = await prisma.socialLink.findMany({
      orderBy: { order: 'asc' },
    });
    return { success: true, data: links };
  } catch (error) {
    console.error('Error fetching social links:', error);
    return { success: false, error: 'خطا در دریافت شبکه‌های اجتماعی' };
  }
}

// Create social link
export async function createSocialLink(data: SocialLinkData) {
  try {
    const maxOrder = await prisma.socialLink.aggregate({ _max: { order: true } });
    const newOrder = (maxOrder._max.order ?? 0) + 1;

    const link = await prisma.socialLink.create({
      data: {
        name: data.name,
        url: data.url,
        icon: data.icon || null,
        color: data.color || null,
        order: data.order ?? newOrder,
        isActive: data.isActive ?? true,
      },
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/');
    return { success: true, data: link };
  } catch (error) {
    console.error('Error creating social link:', error);
    return { success: false, error: 'خطا در ایجاد شبکه اجتماعی' };
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
      },
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/');
    return { success: true, data: link };
  } catch (error) {
    console.error('Error updating social link:', error);
    return { success: false, error: 'خطا در بروزرسانی شبکه اجتماعی' };
  }
}

// Delete social link
export async function deleteSocialLink(id: string) {
  try {
    await prisma.socialLink.delete({ where: { id } });

    revalidatePath('/dashboard/settings');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting social link:', error);
    return { success: false, error: 'خطا در حذف شبکه اجتماعی' };
  }
}

// Toggle social link active status
export async function toggleSocialLink(id: string) {
  try {
    const link = await prisma.socialLink.findUnique({ where: { id } });
    if (!link) return { success: false, error: 'شبکه اجتماعی یافت نشد' };

    const updated = await prisma.socialLink.update({
      where: { id },
      data: { isActive: !link.isActive },
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error toggling social link:', error);
    return { success: false, error: 'خطا در تغییر وضعیت' };
  }
}

// Reorder social links
export async function reorderSocialLinks(orderedIds: string[]) {
  try {
    await Promise.all(
      orderedIds.map((id, index) =>
        prisma.socialLink.update({ where: { id }, data: { order: index } })
      )
    );

    revalidatePath('/dashboard/settings');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error reordering social links:', error);
    return { success: false, error: 'خطا در تغییر ترتیب' };
  }
}
