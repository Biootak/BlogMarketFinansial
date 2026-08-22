'use server';

import { auth } from '@/auth';
import { logActivity } from '@/lib/activity-logger';
import { checkRole } from '@/lib/auth';
// SECURITY-fix (2026-08-22): نسخهٔ lib بدون گارد ادمین — نویسنده‌های AUTHOR
// هم پست می‌سازند و گارد ادمین روی مسیر داخلی، انتشارشان را می‌شکست.
import { invalidateHomePageCache } from '@/lib/cache-invalidation';
import prisma from '@/lib/db';
import { authFailureToActionResult, requirePermission } from '@/lib/require-auth';
import { revalidatePath, revalidateTag } from '@/lib/revalidate';
import { safeCache } from '@/lib/safe-cache';
import { createUniqueSlug } from '@/lib/slugUtils';
import { generateSlug, generateUniqueId, validateSlug } from '@/lib/utils';
import { CreatePostSchema, UpdatePostSchema } from '@/schemas';
import type {
  ActionResult,
  CreatePostInput,
  PostWithRelations,
  RelatedPostWithRelations,
  UpdatePostInput,
} from '@/types/types';
import { PostStatus, type PostType, type Prisma, Role } from '@prisma/client';

export async function createPost(data: CreatePostInput): Promise<ActionResult<PostWithRelations>> {
  const session = await checkRole(['ADMIN', 'AUTHOR', 'SUPERADMIN']);
  if (!session) {
    return { success: false, message: 'شما دسترسی لازم برای ایجاد پست را ندارید.' };
  }

  try {
    let validatedData = CreatePostSchema.parse(data);

    // نویسنده نمی‌تواند مستقیماً منتشر یا featured کند. scheduledAt را
    // نگه می‌داریم تا ادمین بتواند زمان انتشار را ببیند؛ ولی وضعیت
    // همچنان PENDING_REVIEW است تا تأیید ادمین لازم باشد.
    if (session.user.role === Role.AUTHOR) {
      validatedData = {
        ...validatedData,
        status: PostStatus.PENDING_REVIEW,
        isFeatured: false,
      };
    }

    // انتشار یا زمان‌بندی انتشار پست — اکشن حساس `content:publish`
    if (
      validatedData.status === PostStatus.PUBLISHED ||
      validatedData.status === PostStatus.SCHEDULED
    ) {
      const perm = await requirePermission('content:publish');
      if (!perm.success) return authFailureToActionResult(perm);
    }

    const id = generateUniqueId();

    // ایجاد اسلاگ یکتا
    const baseSlug = validatedData.slug || validatedData.title;
    const slug = await createUniqueSlug(baseSlug);

    if (!validateSlug(slug)) {
      return {
        success: false,
        message: 'اسلاگ نامعتبر است. لطفاً فقط از حروف کوچک انگلیسی، اعداد و خط فاصله استفاده کنید.',
      };
    }

    const post = await prisma.post.create({
      data: {
        ...validatedData,
        id,
        slug,
        scheduledAt: validatedData.scheduledAt ?? null,
        author: {
          connect: { id: session.user?.id },
        },
        categories: {
          connect: validatedData.categories.map((categoryId) => ({ id: categoryId })),
        },
        tags: validatedData.tags
          ? {
              connectOrCreate: validatedData.tags.map((name) => ({
                where: { name },
                create: { name, slug: generateSlug(name) },
              })),
            }
          : undefined,
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        categories: true,
        tags: true,
        _count: {
          select: {
            comments: true,
            likes: true,
            savedBy: true,
            tags: true,
          },
        },
      },
    });

    // Invalidate paths
    revalidatePath('/');
    revalidatePath(`/single/${post.slug}`);
    // 2026-06-14: bust post-slug, archive, dashboard-stats caches.
    revalidateTag(`post-${post.id}`);
    revalidateTag('post-slug');
    revalidateTag('archive');
    revalidateTag('dashboard-stats');
    // 2026-07-04: صفحهٔ تقویم (`/dashboard/posts/calendar`) خودش
    // `dynamic = force-dynamic` است؛ نیازی به tag جدا نیست.
    // 2026-06-19: bust home-page data caches so a newly published/updated
    // post appears on the home grid + count immediately instead of after
    // the 60s revalidate window.
    await invalidateHomePageCache();

    // ثبت فعالیت
    await logActivity('ایجاد پست', `پست "${post.title}" ایجاد شد`);

    return {
      success: true,
      message: 'پست با موفقیت ایجاد شد.',
      data: post,
    };
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در ایجاد پست. لطفاً دوباره تلاش کنید.',
      error: 'INTERNAL_ERROR',
    };
  }
}
export async function updatePost(
  postId: string,
  data: UpdatePostInput,
): Promise<ActionResult<PostWithRelations>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        message: 'شما باید وارد شوید.',
      };
    }

    // Get the current post to check ownership
    const currentPost = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true },
    });

    if (!currentPost) {
      return {
        success: false,
        message: 'پست مورد نظر یافت نشد.',
      };
    }

    // Check if user has permission to edit this post
    if (session.user.role === 'AUTHOR' && currentPost.authorId !== session.user.id) {
      return {
        success: false,
        message: 'شما فقط می‌توانید پست‌های خودتان را ویرایش کنید.',
      };
    }

    // Only OWNER, SUPERADMIN, ADMIN, and post owner (AUTHOR) can edit posts
    if (
      !['OWNER', 'SUPERADMIN', 'ADMIN'].includes(session.user.role) &&
      !(session.user.role === 'AUTHOR' && currentPost.authorId === session.user.id)
    ) {
      return {
        success: false,
        message: 'شما دسترسی لازم برای ویرایش این پست را ندارید.',
      };
    }

    const validatedData = UpdatePostSchema.parse(data);

    // 2026-07-08: mirror createPost — authors must not self-publish or
    // feature posts. Keep the post's current status; never let an author
    // move it to PUBLISHED or set isFeatured (H8).
    if (session.user.role === 'AUTHOR') {
      (validatedData as Record<string, unknown>).status = undefined;
      (validatedData as Record<string, unknown>).isFeatured = undefined;
    }

    // انتشار یا زمان‌بندی انتشار پست — اکشن حساس `content:publish`
    if (
      validatedData.status === PostStatus.PUBLISHED ||
      validatedData.status === PostStatus.SCHEDULED
    ) {
      const perm = await requirePermission('content:publish');
      if (!perm.success) return authFailureToActionResult(perm);
    }

    let slug = validatedData.slug;
    if (!slug && validatedData.title) {
      slug = generateSlug(validatedData.title);
    }

    if (slug) {
      slug = generateSlug(slug);
      if (!validateSlug(slug)) {
        return {
          success: false,
          message:
            'اسلاگ نامعتبر است. لطفاً فقط از حروف کوچک انگلیسی، اعداد و خط فاصله استفاده کنید.',
        };
      }

      // Check for unique slug
      const slugExists = await prisma.post.findFirst({
        where: {
          slug,
          NOT: { id: postId },
        },
      });

      if (slugExists) {
        return {
          success: false,
          message: 'این اسلاگ قبلاً استفاده شده است. لطفاً یک اسلاگ دیگر انتخاب کنید.',
        };
      }
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        ...validatedData,
        slug,
        // 2026-07-04: scheduledAt صریح پاس داده می‌شود تا اگر فرم
        // null فرستاد، در DB هم null شود (نه اینکه فیلد تغییر نکند).
        scheduledAt: validatedData.scheduledAt ?? null,
        categories: {
          set: [], // ابتدا همه ارتباطات را حذف می‌کنیم
          connect: validatedData.categories?.map((categoryId) => ({ id: categoryId })) ?? [],
        },
        tags: validatedData.tags
          ? {
              set: [], // ابتدا همه ارتباطات را حذف می‌کنیم
              connectOrCreate: validatedData.tags.map((name) => ({
                where: { name },
                create: { name, slug: generateSlug(name) },
              })),
            }
          : undefined,
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        categories: true,
        tags: true,
        likes: true,
        savedBy: true,
        _count: {
          select: {
            comments: true,
            likes: true,
            savedBy: true,
            tags: true,
          },
        },
      },
    });

    // Invalidate paths
    revalidatePath('/');
    revalidatePath(`/single/${post.slug}`);
    revalidateTag(`post-${post.id}`);
    revalidateTag('post-slug');
    revalidateTag('archive');
    revalidateTag('dashboard-stats');
    await invalidateHomePageCache();

    // ثبت فعالیت
    await logActivity('ویرایش پست', `پست "${post.title}" ویرایش شد`);

    return {
      success: true,
      message: 'پست با موفقیت به‌روزرسانی شد.',
      data: post,
    };
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در به‌روزرسانی پست. لطفاً دوباره تلاش کنید.',
      error: 'INTERNAL_ERROR',
    };
  }
}
export async function updatePostStatus(
  postId: string,
  newStatus: PostStatus,
): Promise<ActionResult<PostWithRelations>> {
  const session = await checkRole(['ADMIN', 'AUTHOR', 'OWNER', 'SUPERADMIN']);

  if (!session || !session.user) {
    return {
      success: false,
      message: 'غیر مجاز',
      error: 'شما مجاز به انجام این عملیات نیستید.',
    };
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, status: true },
    });

    if (!post) {
      return { success: false, message: 'پست یافت نشد.', error: 'پست یافت نشد.' };
    }

    // Check permissions based on role
    if (session.user.role === 'AUTHOR') {
      // Authors can only modify their own posts
      if (post.authorId !== session.user.id) {
        return {
          success: false,
          message: 'غیر مجاز',
          error: 'شما مجاز به به‌روزرسانی این پست نیستید.',
        };
      }

      // Authors can only:
      // 1. Change PUBLISHED -> DRAFT
      // 2. Change DRAFT -> PENDING_REVIEW
      // 3. Change PENDING_REVIEW -> DRAFT
      const validTransitions = {
        PUBLISHED: ['DRAFT'],
        DRAFT: ['PENDING_REVIEW'],
        PENDING_REVIEW: ['DRAFT'],
        SCHEDULED: ['DRAFT'],
      };

      if (!validTransitions[post.status]?.includes(newStatus)) {
        return {
          success: false,
          message: 'تغییر وضعیت غیرمجاز',
          error: 'شما مجاز به انجام این تغییر وضعیت نیستید.',
        };
      }
    }

    // انتشار یا زمان‌بندی انتشار پست — اکشن حساس `content:publish`
    if (newStatus === PostStatus.PUBLISHED || newStatus === PostStatus.SCHEDULED) {
      const perm = await requirePermission('content:publish');
      if (!perm.success) return authFailureToActionResult(perm);
    }

    // Admins can change to any status
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { status: newStatus },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        categories: true,
        tags: true,
        _count: {
          select: {
            comments: true,
            likes: true,
            savedBy: true,
            tags: true,
          },
        },
      },
    });

    // Invalidate paths
    revalidatePath('/');
    revalidatePath(`/single/${updatedPost.slug}`);
    revalidateTag(`post-${updatedPost.id}`);
    revalidateTag('post-slug');
    revalidateTag('archive');
    revalidateTag('dashboard-stats');
    // 2026-06-19: status change (draft→published or unpublish) must
    // immediately reflect on the home grid and post count.
    await invalidateHomePageCache();

    // ثبت فعالیت
    const statusLabels: Record<PostStatus, string> = {
      DRAFT: 'پیش‌نویس',
      PENDING_REVIEW: 'در انتظار بررسی',
      PUBLISHED: 'منتشر شده',
      SCHEDULED: 'زمان‌بندی شده',
    };
    await logActivity(
      'تغییر وضعیت پست',
      `وضعیت پست "${updatedPost.title}" به "${statusLabels[newStatus]}" تغییر کرد`,
    );

    return {
      success: true,
      message: 'وضعیت پست با موفقیت به‌روزرسانی شد.',
      data: updatedPost,
    };
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در به‌روزرسانی وضعیت پست. لطفاً دوباره تلاش کنید.',
      error: 'INTERNAL_ERROR',
    };
  }
}

export async function updatePostStatusAndInvalidate(
  postId: string,
  newStatus: PostStatus,
): Promise<ActionResult<PostWithRelations>> {
  try {
    // آپدیت وضعیت پست
    const result = await updatePostStatus(postId, newStatus);

    if (result.success) {
      // Invalidate paths
      revalidatePath('/');
    }

    return result;
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در بروزرسانی وضعیت پست',
      error: 'INTERNAL_ERROR',
    };
  }
}

/**
 * شمارندهٔ پست‌ها بر اساس وضعیت — برای KPI strip هدر داشبورد.
 * 2026-07-05: جدید — یک query سبک groupBy به جای چهار count جداگانه.
 * authorId scope مثل listAllPosts: AUTHOR فقط پست‌های خودش را می‌بیند.
 */
export interface PostStatusCounts {
  all: number;
  published: number;
  draft: number;
  pending: number;
  scheduled: number;
}

export async function getPostStatusCounts(): Promise<ActionResult<PostStatusCounts>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'شما باید وارد شوید.' };
    }

    const baseWhere: Prisma.PostWhereInput =
      session.user.role === 'AUTHOR' ? { authorId: session.user.id } : {};

    const grouped = await prisma.post.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { _all: true },
    });

    const counts: PostStatusCounts = {
      all: 0,
      published: 0,
      draft: 0,
      pending: 0,
      scheduled: 0,
    };

    for (const row of grouped) {
      counts.all += row._count._all;
      switch (row.status) {
        case 'PUBLISHED':
          counts.published = row._count._all;
          break;
        case 'DRAFT':
          counts.draft = row._count._all;
          break;
        case 'PENDING_REVIEW':
          counts.pending = row._count._all;
          break;
        case 'SCHEDULED':
          counts.scheduled = row._count._all;
          break;
      }
    }

    return { success: true, message: 'شمارنده‌ها با موفقیت محاسبه شدند.', data: counts };
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در دریافت شمارنده‌ها.',
      error: 'INTERNAL_ERROR',
    };
  }
}

/**
 * 2026-07-05: کپی یک پست به‌صورت پیش‌نویس — برای دکمهٔ «تکرار» در
 * PostsFloatingToolbar. فیلدهای محتوایی + روابط (categories, tags,
 * featuredImage, postType) کپی می‌شوند؛ شمارنده‌ها صفر می‌شوند؛
 * وضعیت همیشه DRAFT و isFeatured خاموش می‌شود. slug یکتا ساخته
 * می‌شود تا با منبع تداخل نداشته باشد.
 */
export async function duplicatePost(postId: string): Promise<ActionResult<PostWithRelations>> {
  try {
    const session = await checkRole(['OWNER', 'ADMIN', 'AUTHOR', 'SUPERADMIN']);
    if (!session?.user) {
      return { success: false, message: 'شما باید وارد شوید.' };
    }

    const source = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        categories: { select: { id: true } },
        tags: { select: { name: true } },
      },
    });

    if (!source) {
      return { success: false, message: 'پست مبدأ یافت نشد.' };
    }

    // AUTHOR فقط پست‌های خودش را تکرار کند
    if (session.user.role === 'AUTHOR' && source.authorId !== session.user.id) {
      return {
        success: false,
        message: 'شما فقط می‌توانید پست‌های خودتان را تکرار کنید.',
      };
    }

    const newId = generateUniqueId();
    const baseSlug = `${source.slug}-copy`;
    const slug = await createUniqueSlug(baseSlug);

    const post = await prisma.post.create({
      data: {
        id: newId,
        title: `${source.title} (کپی)`,
        slug,
        content: source.content,
        excerpt: source.excerpt,
        featuredImage: source.featuredImage,
        featuredImageWidth: source.featuredImageWidth,
        featuredImageHeight: source.featuredImageHeight,
        galleryImages: source.galleryImages ?? [],
        postType: source.postType,
        videoUrl: source.videoUrl,
        audioUrl: source.audioUrl,
        readingTime: source.readingTime,
        status: PostStatus.DRAFT,
        isFeatured: false,
        viewCount: 0,
        scheduledAt: null,
        author: { connect: { id: session.user.id } },
        categories: {
          connect: source.categories.map((c) => ({ id: c.id })),
        },
        tags: source.tags.length
          ? {
              connectOrCreate: source.tags.map((t) => ({
                where: { name: t.name },
                create: { name: t.name, slug: generateSlug(t.name) },
              })),
            }
          : undefined,
      },
      include: {
        author: { include: { profile: true } },
        categories: true,
        tags: true,
        _count: { select: { comments: true, likes: true, savedBy: true, tags: true } },
      },
    });

    // Invalidate caches
    revalidatePath('/dashboard/posts');
    revalidateTag('posts');
    revalidateTag(`post-${newId}`);
    revalidateTag('post-slug');
    revalidateTag('archive');
    revalidateTag('dashboard-stats');
    await invalidateHomePageCache();

    await logActivity('CREATE', `تکرار پست: ${source.title} → ${newId} (از ${postId})`);

    return { success: true, message: 'پست با موفقیت تکرار شد.', data: post as PostWithRelations };
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در تکرار پست. لطفاً دوباره تلاش کنید.',
    };
  }
}

export async function deletePost(postId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        message: 'شما باید وارد شوید.',
      };
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return {
        success: false,
        message: 'پست مورد نظر یافت نشد.',
      };
    }

    if (session.user.role === 'AUTHOR' && post.authorId !== session.user.id) {
      return {
        success: false,
        message: 'شما فقط می‌توانید پست‌های خودتان را حذف کنید.',
      };
    }

    if (
      !['OWNER', 'SUPERADMIN', 'ADMIN'].includes(session.user.role) &&
      !(session.user.role === 'AUTHOR' && post.authorId === session.user.id)
    ) {
      return {
        success: false,
        message: 'شما دسترسی لازم برای حذف این پست را ندارید.',
      };
    }

    const postTitle = post.title;
    await prisma.post.delete({ where: { id: postId } });

    // Invalidate paths
    revalidatePath('/');
    revalidatePath('/archive');
    revalidateTag(`post-${postId}`);
    revalidateTag('post-slug');
    revalidateTag('archive');
    revalidateTag('comments');
    revalidateTag('dashboard-stats');
    await invalidateHomePageCache();

    // ثبت فعالیت
    await logActivity('حذف پست', `پست "${postTitle}" حذف شد`);

    return {
      success: true,
      message: 'پست با موفقیت حذف شد.',
    };
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در حذف پست. لطفاً دوباره تلاش کنید.',
    };
  }
}

export async function deletePostAndInvalidate(postId: string): Promise<ActionResult> {
  try {
    // حذف پست
    const result = await deletePost(postId);

    if (result.success) {
      // 2026-06-14: removed the duplicate `revalidatePath('/')` that
      // existed in the original. deletePost already revalidates the
      // home + archive paths + the relevant cache tags, so calling
      // revalidatePath again here just doubled the work.
    }

    return result;
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در حذف پست',
    };
  }
}

export async function getPostById(postId: string): Promise<ActionResult<PostWithRelations>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'شما باید وارد شوید.' };
    }
    const currentUser = session.user;
    // 2026-06-14: this is called from the edit page, which only needs
    // the post body, author, categories, tags and counters — not the
    // entire comments tree, all likers or all savers. Trimmed select
    // to avoid hauling megabytes of relation data for one form.
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        featuredImage: true,
        galleryImages: true,
        postType: true,
        status: true,
        videoUrl: true,
        audioUrl: true,
        isFeatured: true,
        viewCount: true,
        readingTime: true,
        authorId: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            profile: { select: { avatar: true, jobName: true, bio: true } },
          },
        },
        categories: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        _count: {
          select: { comments: true, likes: true, savedBy: true },
        },
      },
    });

    if (!post) {
      return { success: false, message: 'پست یافت نشد.', error: 'پست یافت نشد.' };
    }

    // A user may only load a post they own, unless they are ADMIN/OWNER.
    // This blocks any logged-in user from reading other authors' DRAFT /
    // PENDING_REVIEW / SCHEDULED posts by id.
    const isPrivileged =
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'OWNER' ||
      currentUser.role === 'SUPERADMIN';
    if (!isPrivileged && post.authorId !== currentUser.id) {
      return { success: false, message: 'شما مجوز دسترسی به این پست را ندارید.' };
    }

    return {
      success: true,
      message: 'پست با موفقیت بازیابی شد.',
      data: post as unknown as PostWithRelations,
    };
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در بازیابی پست. لطفاً دوباره تلاش کنید.',
      error: 'INTERNAL_ERROR',
    };
  }
}

export async function getPostBySlug(slug: string): Promise<
  ActionResult<
    PostWithRelations & {
      relatedPosts: RelatedPostWithRelations[];
      moreFromAuthor: RelatedPostWithRelations[];
    }
  >
> {
  if (!slug) {
    return {
      success: false,
      message: 'اسلاگ نامعتبر است.',
      error: 'اسلاگ نمی‌تواند خالی باشد.',
    };
  }
  return getCachedPostBySlug(slug);
}

// ---------- Cache wrapper for getPostBySlug ----------
// 2026-06-14: heavy single-post fetcher. 3 inner queries are Promise.all'd.
// Invalidated by revalidatePostCache() (tag 'post-${id}') and 'posts' tag.
// 2026-08-01: unstable_cache → safeCache — DB failure returns fallback, not crash.
async function fetchPostBySlugRaw(slug: string): Promise<
  ActionResult<
    PostWithRelations & {
      relatedPosts: RelatedPostWithRelations[];
      moreFromAuthor: RelatedPostWithRelations[];
    }
  >
> {
  // 2026-06-14: post + related + moreFromAuthor run in parallel.
  // The post needs its category ids so the related-posts query can
  // use them. We fetch categories with a separate, cheap select
  // before kicking off the parallel batch.
  const categoryRows = await prisma.post.findUnique({
    where: { slug: slug, status: PostStatus.PUBLISHED },
    select: {
      id: true,
      authorId: true,
      categories: { select: { id: true } },
    },
  });

  if (!categoryRows) {
    return { success: false, message: 'پست یافت نشد.', error: 'پست یافت نشد.' };
  }

  const categoryIds = categoryRows.categories.map((c) => c.id);

  const [post, relatedPosts, moreFromAuthor] = await Promise.all([
    prisma.post.findUnique({
      where: { slug: slug, status: PostStatus.PUBLISHED },
      // 2026-06-14: trim heavy includes on the main post too. Full
      // comments + replies tree is not needed for the page header
      // (rendered separately) and was the single biggest N+1 source.
      // The page still shows a small preview of comments via
      // _count + a separate, smaller fetch if needed.
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: { select: { avatar: true, jobName: true, bio: true } },
          },
        },
        categories: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        _count: {
          select: { comments: true, likes: true, savedBy: true },
        },
      },
    }),
    prisma.post.findMany({
      where: {
        id: { not: categoryRows.id },
        status: PostStatus.PUBLISHED,
        categories: {
          some: {
            id: { in: categoryIds },
          },
        },
      },
      take: 4,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: { select: { avatar: true, jobName: true } },
          },
        },
        categories: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        _count: { select: { comments: true, likes: true } },
      },
    }),
    prisma.post.findMany({
      where: {
        authorId: categoryRows.authorId,
        id: { not: categoryRows.id },
        status: PostStatus.PUBLISHED,
      },
      take: 4,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: { select: { avatar: true, jobName: true } },
          },
        },
        categories: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        _count: { select: { comments: true, likes: true } },
      },
    }),
  ]);

  if (!post) {
    return { success: false, message: 'پست یافت نشد.', error: 'پست یافت نشد.' };
  }

  return {
    success: true,
    message: 'پست و محتوای مرتبط با موفقیت بازیابی شد.',
    data: {
      ...(post as unknown as PostWithRelations),
      relatedPosts: relatedPosts as unknown as RelatedPostWithRelations[],
      moreFromAuthor: moreFromAuthor as unknown as RelatedPostWithRelations[],
    },
  };
}

const STATS_FALLBACK: ActionResult<{
  views: { today: number; data: number[] };
  comments: { new: number; data: number[] };
  shares: { total: number; data: number[] };
  likes: { total: number; data: number[] };
  publishedPosts: { total: number; data: number[] };
  drafts: { total: number; data: number[] };
}> = {
  success: false,
  message: 'خطا در بازیابی آمار. لطفاً دوباره تلاش کنید.',
};

const getCachedPostBySlug = safeCache(
  fetchPostBySlugRaw,
  { success: false, message: 'پست یافت نشد.' } as Awaited<ReturnType<typeof fetchPostBySlugRaw>>,
  {
    key: 'post-by-slug',
    ttl: 300,
    tags: ['posts', 'post-slug'],
  },
);

/**
 * getPostsForStaticParams — bounded slug list for single-page ISR prerender.
 * Only PUBLISHED posts; limits to the most recent N (build-time DB stays small).
 *
 * 2026-08-12: optional `postType` filter added so the single-audio/video/gallery
 * variants prerender only their own type at build (cache key already includes
 * args via safeCache's makeKey, so typed calls never collide with the unfiltered
 * list used by /single).
 */
export const getPostsForStaticParams = safeCache(
  async (postType?: PostType): Promise<string[]> => {
    try {
      const rows = await prisma.post.findMany({
        where: {
          status: PostStatus.PUBLISHED,
          ...(postType ? { postType } : {}),
        },
        select: { slug: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      return rows.map((r) => r.slug);
    } catch {
      return [];
    }
  },
  [],
  {
    key: 'posts:static-params',
    ttl: 300,
    tags: ['posts', 'post-slug'],
  },
);

export async function listAllPosts(
  page = 1,
  limit = 12,
  searchTerm = '',
  filter: 'همه' | PostStatus = 'همه',
): Promise<ActionResult<{ posts: PostWithRelations[]; total: number; pages: number }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        message: 'شما باید وارد شوید.',
      };
    }

    const skip = (page - 1) * limit;

    let whereCondition: Prisma.PostWhereInput = searchTerm
      ? {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
          ],
        }
      : {};

    // اگر نویسنده است، فقط پست‌های خودش را ببیند
    if (session.user.role === 'AUTHOR') {
      whereCondition = {
        ...whereCondition,
        authorId: session.user.id,
      };
    }

    // اعمال فیلتر وضعیت
    if (filter !== 'همه') {
      whereCondition = {
        ...whereCondition,
        status: filter,
      };
    }

    const [posts, total] = await Promise.all([
      // 2026-06-14: dashboard list view only needs author name/image,
      // category/tag slugs and counters. The previous include pulled
      // full comment trees, every liker, every saver and full profiles
      // — for a 12-row table that easily exceeded a megabyte of JSON.
      prisma.post.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          postType: true,
          status: true,
          isFeatured: true,
          viewCount: true,
          readingTime: true,
          authorId: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
              profile: { select: { avatar: true, jobName: true } },
            },
          },
          categories: { select: { id: true, name: true, slug: true } },
          tags: { select: { id: true, name: true, slug: true } },
          _count: {
            select: { comments: true, likes: true, savedBy: true },
          },
        },
      }),
      prisma.post.count({ where: whereCondition }),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'پست‌ها با موفقیت بازیابی شدند.',
      data: { posts: posts as unknown as PostWithRelations[], total, pages },
    };
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در بازیابی پست‌ها. لطفاً دوباره تلاش کنید.',
      error: 'INTERNAL_ERROR',
    };
  }
}

export const getArchivePosts = async (
  page = 1,
  limit = 12,
  filter?: string,
  category?: string,
  subcategory?: string,
  tag?: string,
  searchQuery?: string, // جستجوی متنی
): Promise<ActionResult<{ posts: PostWithRelations[]; total: number; pages: number }>> => {
  return getCachedArchivePosts(page, limit, filter, category, subcategory, tag, searchQuery);
};

// ---------- Cache wrapper for getArchivePosts ----------
// 2026-06-14: heavy archive query. Invalidated on post/category/tag writes.
// Per-arg cache keys via safeCache makeKey() keep distinct entries per filter.
// 2026-08-01: unstable_cache → safeCache.
type ArchiveResult = { posts: PostWithRelations[]; total: number; pages: number };

async function fetchArchivePostsRaw(
  page: number,
  limit: number,
  filter: string | undefined,
  category: string | undefined,
  subcategory: string | undefined,
  tag: string | undefined,
  searchQuery: string | undefined,
): Promise<ActionResult<ArchiveResult>> {
  // Pass 2 fix: defensive clamp — NaN/negative/huge page or limit from a URL
  // must never reach Prisma as skip/take (NaNs and negatives throw; huge
  // offsets become a deep-pagination scan). Mirrors the L2 clamp in
  // api/categories + api/tags.
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit >= 1 ? Math.min(Math.floor(limit), 100) : 15;
  const skip = (safePage - 1) * safeLimit;
  let whereCondition: Prisma.PostWhereInput = { status: PostStatus.PUBLISHED };
  let orderBy: Prisma.PostOrderByWithRelationInput = { createdAt: 'desc' };

  // اعمال جستجوی متنی
  if (searchQuery && searchQuery.length >= 2) {
    whereCondition = {
      ...whereCondition,
      title: { contains: searchQuery, mode: 'insensitive' },
    };
  }

  // اعمال فیلتر دسته‌بندی
  if (category) {
    if (subcategory) {
      whereCondition = {
        ...whereCondition,
        categories: {
          some: {
            slug: category,
            childCategories: {
              some: {
                slug: subcategory,
              },
            },
          },
        },
        AND: [
          {
            categories: {
              some: {
                slug: subcategory,
              },
            },
          },
        ],
      };
    } else {
      whereCondition = {
        ...whereCondition,
        categories: {
          some: {
            slug: category,
          },
        },
      };
    }
  }

  // اعمال فیلتر تگ
  if (tag) {
    whereCondition = {
      ...whereCondition,
      tags: {
        some: {
          slug: tag,
        },
      },
    };
  }

  // اعمال فیلتر مرتب‌سازی
  switch (filter) {
    case 'جدیدترین':
      orderBy = { createdAt: 'desc' };
      break;
    case 'قدیمی‌ترین':
      orderBy = { createdAt: 'asc' };
      break;
    case 'محبوب‌ترین':
      orderBy = { likes: { _count: 'desc' } };
      break;
    default:
      orderBy = { createdAt: 'desc' };
  }

  // استفاده از تراکنش برای اجرای همزمان دو کوئری
  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      where: whereCondition,
      take: safeLimit,
      skip,
      orderBy: orderBy,
      // 2026-06-14: trim heavy includes — likes/savedBy were full records
      // (not just counts) which made list queries 10–100x heavier than
      // needed. Counters via _count are enough for the archive cards.
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        postType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        viewCount: true,
        authorId: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: { select: { avatar: true, jobName: true } },
          },
        },
        categories: {
          select: { id: true, name: true, slug: true },
        },
        tags: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { comments: true, likes: true, savedBy: true },
        },
      },
    }),
    prisma.post.count({ where: whereCondition }),
  ]);

  return {
    success: true,
    message: 'پست‌ها با موفقیت بازیابی شدند.',
    data: {
      posts: posts as unknown as PostWithRelations[],
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

// 2026-08-01: unstable_cache → safeCache. Fallback: empty result page.
const ARCHIVE_FALLBACK: ArchiveResult = { posts: [], total: 0, pages: 0 };
const getCachedArchivePosts = safeCache(
  fetchArchivePostsRaw,
  { success: true, data: ARCHIVE_FALLBACK } as ActionResult<ArchiveResult>,
  {
    key: 'archive-posts',
    ttl: 120,
    tags: ['posts', 'archive', 'categories', 'tags'],
  },
);

export async function likeItem(
  itemId: string,
  itemType: 'post' | 'comment',
): Promise<ActionResult> {
  const session = await checkRole(['USER', 'AUTHOR', 'ADMIN', 'SUPERADMIN']);
  if (!session) {
    return { success: false, message: 'برای ثبت پسند باید وارد شوید.' };
  }

  try {
    const existingLike = await prisma.like.findFirst({
      where: {
        userId: session.user.id,
        [itemType === 'post' ? 'postId' : 'commentId']: itemId,
      },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
    } else {
      await prisma.like.create({
        data: {
          user: { connect: { id: session.user.id } },
          [itemType]: { connect: { id: itemId } },
        },
      });
    }

    let path: string;
    if (itemType === 'post') {
      path = `/single/${itemId}`;
    } else {
      const comment = await prisma.comment.findUnique({
        where: { id: itemId },
        select: { postId: true },
      });
      path = `/single/${comment?.postId}`;
    }

    revalidatePath(path);
    revalidateTag('comments');
    if (itemType === 'post') {
      revalidateTag(`post-${itemId}`);
    }
    return { success: true, message: 'وضعیت لایک با موفقیت به‌روزرسانی شد.' };
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در به‌روزرسانی وضعیت لایک. لطفاً دوباره تلاش کنید.',
      error: 'INTERNAL_ERROR',
    };
  }
}

export async function savePost(postId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      success: false,
      message: 'برای ذخیره پست باید وارد شوید.',
    };
  }

  try {
    const existingSave = await prisma.savedPost.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id as string,
          postId: postId,
        },
      },
    });

    if (existingSave) {
      await prisma.savedPost.delete({
        where: { id: existingSave.id },
      });
    } else {
      await prisma.savedPost.create({
        data: {
          user: { connect: { id: session.user.id } },
          post: { connect: { id: postId } },
        },
      });
    }

    revalidatePath(`/posts/${postId}`);
    revalidateTag(`post-${postId}`);
    return {
      success: true,
      message: existingSave ? 'پست از لیست ذخیره‌ها حذف شد.' : 'پست با موفقیت ذخیره شد.',
    };
  } catch (_error) {
    return {
      success: false,
      message: 'عملیات با خطا مواجه شد. لطفاً دوباره تلاش کنید.',
    };
  }
}

export async function getStats(): Promise<
  ActionResult<{
    views: { today: number; data: number[] };
    comments: { new: number; data: number[] };
    shares: { total: number; data: number[] };
    likes: { total: number; data: number[] };
    publishedPosts: { total: number; data: number[] };
    drafts: { total: number; data: number[] };
  }>
> {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return {
      success: false,
      message: 'لطفاً وارد حساب کاربری خود شوید.',
    };
  }

  // 2026-06-19: auth()/headers() can't run inside a cache scope (Next 16
  // forbids dynamic data sources). Resolve the user above and pass role
  // scope as an argument — safeCache keys on (baseKey + JSON.stringify(args))
  // so the authorId scopes the cache per-author automatically.
  return getCachedStats({ authorId: user.role === 'AUTHOR' ? user.id : undefined });
}

// ---------- Cache wrapper for getStats ----------
// 2026-06-14: dashboard's getStats ran 12 queries. Cached 120s.
// 2026-08-01: unstable_cache → safeCache. On DB failure returns STATS_FALLBACK.
async function fetchStatsRaw(roleScope: { authorId?: string }): Promise<
  ActionResult<{
    views: { today: number; data: number[] };
    comments: { new: number; data: number[] };
    shares: { total: number; data: number[] };
    likes: { total: number; data: number[] };
    publishedPosts: { total: number; data: number[] };
    drafts: { total: number; data: number[] };
  }>
> {
  try {
    // شرط‌های پایه برای کوئری
    const baseWhere: Prisma.PostWhereInput = {
      OR: [{ status: 'DRAFT' }, { status: 'PENDING_REVIEW' }, { status: 'PUBLISHED' }],
    };

    // اگر نویسنده است، فقط پست‌های خودش را ببیند
    if (roleScope.authorId) {
      baseWhere.authorId = roleScope.authorId;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      viewsToday,
      viewsWeekly,
      commentsNew,
      commentsWeekly,
      sharesTotal,
      sharesWeekly,
      likesTotal,
      likesWeekly,
      publishedPostsTotal,
      publishedPostsWeekly,
      draftsTotal,
      draftsWeekly,
    ] = await prisma.$transaction([
      prisma.post.aggregate({
        _sum: { viewCount: true },
        where: { ...baseWhere, createdAt: { gte: today } },
      }),
      prisma.post.groupBy({
        by: ['createdAt'],
        _sum: { viewCount: true },
        where: { ...baseWhere, createdAt: { gte: weekAgo } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.comment.count({
        where: {
          postId: { not: undefined },
          createdAt: { gte: today },
        },
      }),
      prisma.comment.groupBy({
        by: ['createdAt'],
        _count: true,
        where: {
          postId: { not: undefined },
          createdAt: { gte: weekAgo },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.savedPost.count(),
      prisma.savedPost.groupBy({
        by: ['createdAt'],
        _count: true,
        where: { createdAt: { gte: weekAgo } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.like.count(),
      prisma.like.groupBy({
        by: ['createdAt'],
        _count: true,
        where: { createdAt: { gte: weekAgo } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.post.count({
        where: { ...baseWhere, status: 'PUBLISHED' },
      }),
      prisma.post.groupBy({
        by: ['createdAt'],
        _count: true,
        where: { ...baseWhere, status: 'PUBLISHED', createdAt: { gte: weekAgo } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.post.count({
        where: { ...baseWhere, status: 'DRAFT' },
      }),
      prisma.post.groupBy({
        by: ['createdAt'],
        _count: true,
        where: { ...baseWhere, status: 'DRAFT', createdAt: { gte: weekAgo } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Prisma groupBy with _count:true returns `_count: true | { _all?: number; ... }`.
    // We only need the aggregated scalar per day; using a flexible shape avoids
    // fighting the exact generated union type while keeping the logic correct.
    type WeeklyGroupItem = {
      createdAt: Date;
      _count?: unknown;
      _sum?: { viewCount?: number | null };
    };
    const fillWeeklyData = (data: WeeklyGroupItem[]) => {
      const filledData = new Array(7).fill(0);
      for (const item of data) {
        const dayIndex =
          6 -
          Math.floor(
            (today.getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24),
          );
        // _count from Prisma groupBy _count:true is an object like { _all: N, field: N }.
        // When groupBy is called with `_count: true`, Prisma returns an object, not a number.
        const countObj = item._count as { _all?: number } | undefined;
        const countVal = countObj?._all ?? 0;
        filledData[dayIndex] = countVal || item._sum?.viewCount || 0;
      }
      return filledData;
    };

    return {
      success: true,
      message: 'آمار با موفقیت بازیابی شد.',
      data: {
        views: { today: viewsToday._sum.viewCount || 0, data: fillWeeklyData(viewsWeekly) },
        comments: { new: commentsNew, data: fillWeeklyData(commentsWeekly) },
        shares: { total: sharesTotal, data: fillWeeklyData(sharesWeekly) },
        likes: { total: likesTotal, data: fillWeeklyData(likesWeekly) },
        publishedPosts: { total: publishedPostsTotal, data: fillWeeklyData(publishedPostsWeekly) },
        drafts: { total: draftsTotal, data: fillWeeklyData(draftsWeekly) },
      },
    };
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در بازیابی آمار. لطفاً دوباره تلاش کنید.',
    };
  }
}

// 2026-08-01: unstable_cache → safeCache. Fallback reuses STATS_FALLBACK
// defined above getCachedPostBySlug.
const getCachedStats = safeCache(fetchStatsRaw, STATS_FALLBACK, {
  key: 'dashboard-stats',
  ttl: 120,
  tags: ['posts', 'comments', 'dashboard-stats'],
});

/**
 * getScheduledPosts — پست‌های «پنجرهٔ تقویم انتشار» برای داشبورد.
 *
 * 2026-07-04: نسخهٔ قبلی پنجرهٔ ۳ هفته‌ای (یکی قبل + جاری + یکی بعد)
 * می‌گرفت و فقط بر اساس createdAt/updatedAt بود. این برای تقویم
 * انتشار کافی نبود چون پست‌هایی که برای ماه‌های آینده برنامه‌ریزی
 * شده‌اند را نشان نمی‌داد. حالا:
 *
 *   - پنجرهٔ وسیع: ۶ ماه قبل + ۱۲ ماه بعد (از امروز)
 *   - فیلتر: `scheduledAt` در پنجره **یا** `createdAt`/`updatedAt` در
 *     پنجره. پست‌های قدیمیِ بدون scheduledAt هم دیده می‌شوند.
 *   - همهٔ وضعیت‌ها (DRAFT/PENDING_REVIEW/SCHEDULED/PUBLISHED) — تقویم
 *     خالی به نظر نرسد.
 *
 * `AtelierMonthCalendar` بعداً با `scheduledAt ?? createdAt` bucketing
 * می‌کند، پس پست‌های برنامه‌ریزی‌شده دقیقاً زیر سلول روز انتشارشان
 * ظاهر می‌شوند.
 */
export async function getScheduledPosts(): Promise<ActionResult<PostWithRelations[]>> {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return {
      success: false,
      message: 'لطفاً وارد حساب کاربری خود شوید.',
    };
  }

  try {
    const now = new Date();
    // شروع: ۶ ماه قبل از نیمه‌شب امروز
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setMonth(start.getMonth() - 6);
    // پایان: ۱۲ ماه بعد از نیمه‌شب امروز
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 12);
    end.setDate(end.getDate() + 1); // نیمه‌شبِ روز بعد، تا پوشش کامل

    const where: Prisma.PostWhereInput = {
      OR: [
        { scheduledAt: { gte: start, lt: end } },
        { createdAt: { gte: start, lt: end } },
        { updatedAt: { gte: start, lt: end } },
      ],
    };

    // اگر نویسنده است، فقط پست‌های خودش را ببیند
    if (user.role === 'AUTHOR') {
      where.authorId = user.id;
    }

    const posts = await prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        postType: true,
        status: true,
        viewCount: true,
        readingTime: true,
        authorId: true,
        createdAt: true,
        updatedAt: true,
        // 2026-07-04: scheduledAt برای bucketing تقویم لازم است.
        scheduledAt: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            profile: { select: { avatar: true, jobName: true } },
          },
        },
        categories: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        _count: {
          select: { comments: true, likes: true, savedBy: true },
        },
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: 100, // Reduce from 500 to 100 for faster calendar loading
    });

    return {
      success: true,
      message: 'پست‌های پنجرهٔ تقویم با موفقیت دریافت شدند',
      data: posts as unknown as PostWithRelations[],
    };
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در دریافت پست‌های پنجرهٔ تقویم',
    };
  }
}
