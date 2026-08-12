'use server';

/**
 * tag-actions — مدیریت برچسب‌ها (ادمین).
 *
 * مدل Tag سال‌ها در دیتابیس بود (و «برچسب‌های پرطرفدار» در سایت نمایش داده
 * می‌شد) اما هیچ صفحهٔ مدیریتی نداشت — فقط دسته‌بندی‌ها مدیریت می‌شدند.
 * این ماژول CRUD کامل برچسب را فراهم می‌کند.
 */

import prisma from '@/lib/db';
import { authFailureToActionResult, requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { generateSlug, validateSlug } from '@/lib/utils';
import type { ActionResult } from '@/types/types';

export type TagRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  postCount: number;
};

export type TagsListResult = ActionResult<{
  rows: TagRow[];
  total: number;
}>;

/** لیست همهٔ برچسب‌ها به همراه تعداد پست — پرتکرارترین‌ها اول. */
export async function getTags(): Promise<TagsListResult> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });

    return {
      success: true,
      message: 'برچسب‌ها با موفقیت بازیابی شدند',
      data: {
        rows: tags.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          createdAt: t.createdAt,
          postCount: t._count.posts,
        })),
        total: tags.length,
      },
    };
  } catch {
    return { success: false, message: 'خطا در بارگذاری برچسب‌ها' };
  }
}

export type TagInput = { name: string; slug?: string };

/** ساخت برچسب جدید — اسلاگ خودکار از نام، با جلوگیری از تکرار. */
export async function createTag(input: TagInput): Promise<ActionResult<TagRow>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const name = input.name?.trim();
    if (!name) return { success: false, message: 'نام برچسب الزامی است' };
    if (name.length > 60)
      return { success: false, message: 'نام برچسب نباید بیشتر از ۶۰ حرف باشد' };

    const slug = input.slug?.trim() || generateSlug(name);
    if (!validateSlug(slug)) {
      return {
        success: false,
        message: 'اسلاگ نامعتبر است — فقط حروف کوچک انگلیسی، اعداد و خط فاصله',
      };
    }

    const existing = await prisma.tag.findFirst({ where: { OR: [{ name }, { slug }] } });
    if (existing) {
      return {
        success: false,
        message:
          existing.name === name ? 'برچسبی با این نام وجود دارد' : 'برچسبی با این اسلاگ وجود دارد',
      };
    }

    const created = await prisma.tag.create({
      data: { name, slug },
      include: { _count: { select: { posts: true } } },
    });

    revalidateTag('tags');
    return {
      success: true,
      message: 'برچسب ساخته شد',
      data: {
        id: created.id,
        name: created.name,
        slug: created.slug,
        createdAt: created.createdAt,
        postCount: created._count.posts,
      },
    };
  } catch {
    return { success: false, message: 'خطا در ساخت برچسب' };
  }
}

/** ویرایش نام/اسلاگ برچسب. */
export async function updateTag(id: string, input: TagInput): Promise<ActionResult<TagRow>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const name = input.name?.trim();
    if (!name) return { success: false, message: 'نام برچسب الزامی است' };

    const slug = input.slug?.trim() || generateSlug(name);
    if (!validateSlug(slug)) {
      return {
        success: false,
        message: 'اسلاگ نامعتبر است — فقط حروف کوچک انگلیسی، اعداد و خط فاصله',
      };
    }

    const clash = await prisma.tag.findFirst({
      where: { OR: [{ name }, { slug }], NOT: { id } },
    });
    if (clash) {
      return {
        success: false,
        message:
          clash.name === name ? 'برچسبی با این نام وجود دارد' : 'برچسبی با این اسلاگ وجود دارد',
      };
    }

    const updated = await prisma.tag.update({
      where: { id },
      data: { name, slug },
      include: { _count: { select: { posts: true } } },
    });

    revalidateTag('tags');
    return {
      success: true,
      message: 'برچسب ویرایش شد',
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        createdAt: updated.createdAt,
        postCount: updated._count.posts,
      },
    };
  } catch {
    return { success: false, message: 'خطا در ویرایش برچسب' };
  }
}

/**
 * ادغام دو برچسب — همهٔ پست‌های برچسبِ مبدأ به برچسبِ مقصد منتقل می‌شوند و
 * برچسبِ مبدأ حذف می‌شود. یک تراکنش اتمی: یا همه‌چیز اعمال می‌شود یا هیچ.
 */
export async function mergeTags(
  sourceId: string,
  targetId: string,
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    if (sourceId === targetId) {
      return { success: false, message: 'نمی‌توان برچسب را با خودش ادغام کرد' };
    }

    const [source, target] = await Promise.all([
      prisma.tag.findUnique({ where: { id: sourceId }, select: { id: true, name: true } }),
      prisma.tag.findUnique({ where: { id: targetId }, select: { id: true, name: true } }),
    ]);
    if (!source || !target) return { success: false, message: 'برچسبی یافت نشد' };

    const sourcePosts = await prisma.post.findMany({
      where: { tags: { some: { id: sourceId } } },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.tag.update({
        where: { id: targetId },
        data: { posts: { connect: sourcePosts.map((p) => ({ id: p.id })) } },
      }),
      prisma.tag.delete({ where: { id: sourceId } }),
    ]);

    revalidateTag('tags');
    return {
      success: true,
      message: `"${source.name}" در "${target.name}" ادغام شد`,
      data: { id: targetId, name: target.name },
    };
  } catch {
    return { success: false, message: 'خطا در ادغام برچسب‌ها' };
  }
}

/** حذف برچسب — رابطهٔ پست‌ها (many-to-many) به‌صورت خودکار قطع می‌شود. */
export async function deleteTag(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    await prisma.tag.delete({ where: { id } });

    revalidateTag('tags');
    return { success: true, message: 'برچسب حذف شد', data: { id } };
  } catch {
    return { success: false, message: 'خطا در حذف برچسب' };
  }
}
