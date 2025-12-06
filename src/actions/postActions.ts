'use server';

import { auth } from '@/auth';
import { logActivity } from '@/lib/activity-logger';
import prisma from '@/lib/db';
import { calculateReadingTime } from '@/lib/readingTime';
import { createUniqueSlug } from '@/lib/slugUtils';
import { checkRole, generateSlug, generateUniqueId, validateSlug } from '@/lib/utils';
import { CreatePostSchema, UpdatePostSchema } from '@/schemas';
import type {
  ActionResult,
  CreatePostInput,
  PostWithRelations,
  RelatedPostWithRelations,
  UpdatePostInput,
} from '@/types/types';
import { PostStatus, type Prisma, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function createPost(data: CreatePostInput): Promise<ActionResult<PostWithRelations>> {
  const session = await checkRole(['ADMIN', 'AUTHOR']);

  try {
    const validatedData = CreatePostSchema.parse(data);
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

    // محاسبه زمان مطالعه
    const readingTime = calculateReadingTime(validatedData.content);

    const post = await prisma.post.create({
      data: {
        ...validatedData,
        id,
        slug,
        readingTime,
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
        comments: {
          include: {
            author: {
              include: {
                profile: true,
              },
            },
            post: true,
            replies: true,
            likes: {
              include: {
                user: true,
              },
            },
            _count: true,
          },
        },
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
    revalidatePath(`/blog/${post.id}`);

    // ثبت فعالیت
    await logActivity('ایجاد پست', `پست "${post.title}" ایجاد شد`);

    return {
      success: true,
      message: 'پست با موفقیت ایجاد شد.',
      data: post,
    };
  } catch (error) {
    console.error('خطا در ایجاد پست:', error);
    return {
      success: false,
      message: 'خطا در ایجاد پست. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
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

    // Only SUPER_ADMIN, ADMIN, and post owner (AUTHOR) can edit posts
    if (
      !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role) &&
      !(session.user.role === 'AUTHOR' && currentPost.authorId === session.user.id)
    ) {
      return {
        success: false,
        message: 'شما دسترسی لازم برای ویرایش این پست را ندارید.',
      };
    }

    const validatedData = UpdatePostSchema.parse(data);

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

    // محاسبه زمان مطالعه اگر محتوا تغییر کرده باشد
    const readingTime = validatedData.content
      ? calculateReadingTime(validatedData.content)
      : undefined;

    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        ...validatedData,
        slug,
        ...(readingTime !== undefined && { readingTime }),
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
    revalidatePath(`/blog/${post.id}`);

    // ثبت فعالیت
    await logActivity('ویرایش پست', `پست "${post.title}" ویرایش شد`);

    return {
      success: true,
      message: 'پست با موفقیت به‌روزرسانی شد.',
      data: post,
    };
  } catch (error) {
    console.error('خطا در به‌روزرسانی پست:', error);
    return {
      success: false,
      message: 'خطا در به‌روزرسانی پست. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
export async function updatePostStatus(
  postId: string,
  newStatus: PostStatus,
): Promise<ActionResult<PostWithRelations>> {
  const session = await checkRole(['ADMIN', 'AUTHOR', 'SUPER_ADMIN']);

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
      };

      if (!validTransitions[post.status]?.includes(newStatus)) {
        return {
          success: false,
          message: 'تغییر وضعیت غیرمجاز',
          error: 'شما مجاز به انجام این تغییر وضعیت نیستید.',
        };
      }
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
        comments: {
          include: {
            author: {
              include: {
                profile: true,
              },
            },
            post: true,
            replies: true,
            likes: {
              include: {
                user: true,
              },
            },
            _count: true,
          },
        },
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
    revalidatePath(`/blog/${updatedPost.id}`);

    // ثبت فعالیت
    const statusLabels: Record<PostStatus, string> = {
      DRAFT: 'پیش‌نویس',
      PENDING_REVIEW: 'در انتظار بررسی',
      PUBLISHED: 'منتشر شده',
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
  } catch (error) {
    console.error('خطا در به‌روزرسانی وضعیت پست:', error);
    return {
      success: false,
      message: 'خطا در به‌روزرسانی وضعیت پست. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
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
      revalidatePath(`/blog/${postId}`);
    }

    return result;
  } catch (error) {
    console.error('Error updating post status:', error);
    return {
      success: false,
      message: 'خطا در بروزرسانی وضعیت پست',
      error: error instanceof Error ? error.message : 'خطای ناشناخته',
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
      !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role) &&
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

    // ثبت فعالیت
    await logActivity('حذف پست', `پست "${postTitle}" حذف شد`);

    return {
      success: true,
      message: 'پست با موفقیت حذف شد.',
    };
  } catch (error) {
    console.error('خطا در حذف پست:', error);
    return {
      success: false,
      message: 'خطا در حذف پست. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deletePostAndInvalidate(postId: string): Promise<ActionResult> {
  try {
    // حذف پست
    const result = await deletePost(postId);

    if (result.success) {
      // Invalidate paths
      revalidatePath('/');
      revalidatePath('/archive');
      revalidatePath('/');
    }

    return result;
  } catch (error) {
    console.error('Error deleting post:', error);
    return {
      success: false,
      message: 'خطا در حذف پست',
      error: error instanceof Error ? error.message : 'خطای ناشناخته',
    };
  }
}

export async function getPostById(postId: string): Promise<ActionResult<PostWithRelations>> {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        categories: true,
        comments: {
          include: {
            author: {
              include: {
                profile: true,
              },
            },
            post: true,
            replies: true,
            likes: {
              include: {
                user: true,
              },
            },
            _count: true,
          },
        },
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

    if (!post) {
      return { success: false, message: 'پست یافت نشد.', error: 'پست یافت نشد.' };
    }

    return { success: true, message: 'پست با موفقیت بازیابی شد.', data: post };
  } catch (error) {
    console.error('خطا در بازیابی پست:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
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

  try {
    const post = await prisma.post.findUnique({
      where: { slug: slug, status: PostStatus.PUBLISHED },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        categories: true,
        comments: {
          include: {
            author: {
              include: {
                profile: true,
              },
            },
            post: true,
            replies: {
              include: {
                author: true,
              },
            },
            likes: {
              include: {
                user: true,
              },
            },
            _count: true,
          },
        },
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
    if (!post) {
      return { success: false, message: 'پست یافت نشد.', error: 'پست یافت نشد.' };
    }

    // Get related posts
    const relatedPosts = await prisma.post.findMany({
      where: {
        id: { not: post.id },
        categories: {
          some: {
            id: { in: post.categories.map((cat) => cat.id) },
          },
        },
      },
      take: 4,
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
          },
        },
      },
    });

    // Get more posts from the same author
    const moreFromAuthor = await prisma.post.findMany({
      where: {
        authorId: post.authorId,
        id: { not: post.id },
      },
      take: 4,
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
          },
        },
      },
    });

    return {
      success: true,
      message: 'پست و محتوای مرتبط با موفقیت بازیابی شد.',
      data: { ...post, relatedPosts, moreFromAuthor },
    };
  } catch (error) {
    return {
      success: false,
      message: 'خطا در بازیابی پست. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

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
      prisma.post.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            include: {
              profile: true,
            },
          },
          categories: true,
          comments: {
            include: {
              author: {
                include: {
                  profile: true,
                },
              },
              post: true,
              replies: true,
              likes: {
                include: {
                  user: true,
                },
              },
              _count: true,
            },
          },
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
      }),
      prisma.post.count({ where: whereCondition }),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'پست‌ها با موفقیت بازیابی شدند.',
      data: { posts, total, pages },
    };
  } catch (error) {
    console.error('خطا در بازیابی پست‌ها:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست‌ها. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
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
  try {
    const skip = (page - 1) * limit;
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
        // اگر هم دسته‌بندی اصلی و هم زیردسته‌بندی داریم
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
        // اگر فقط دسته‌بندی اصلی داریم
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
        take: limit,
        skip: skip,
        orderBy: orderBy,
        include: {
          author: {
            include: {
              profile: true,
            },
          },
          categories: {
            include: {
              childCategories: true,
            },
          },
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
      }),
      prisma.post.count({ where: whereCondition }),
    ]);

    return {
      success: true,
      message: 'پست‌ها با موفقیت بازیابی شدند.',
      data: {
        posts,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('خطا در بازیابی پست‌ها:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست‌ها. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export async function likeItem(
  itemId: string,
  itemType: 'post' | 'comment',
): Promise<ActionResult> {
  const session = await checkRole(['USER', 'AUTHOR', 'ADMIN']);

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
    return { success: true, message: 'وضعیت لایک با موفقیت به‌روزرسانی شد.' };
  } catch (error) {
    console.error('خطا در به‌روزرسانی وضعیت لایک:', error);
    return {
      success: false,
      message: 'خطا در به‌روزرسانی وضعیت لایک. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
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
    return {
      success: true,
      message: existingSave ? 'پست از لیست ذخیره‌ها حذف شد.' : 'پست با موفقیت ذخیره شد.',
    };
  } catch (error) {
    console.error('خطا در ذخیره/حذف پست:', error);
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

  try {
    // شرط‌های پایه برای کوئری
    const baseWhere: Prisma.PostWhereInput = {
      OR: [{ status: 'DRAFT' }, { status: 'PENDING_REVIEW' }, { status: 'PUBLISHED' }],
    };

    // اگر نویسنده است، فقط پست‌های خودش را ببیند
    if (user.role === 'AUTHOR') {
      baseWhere.authorId = user.id;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // بازدیدهای امروز از View model
    const viewsToday = await prisma.view.count({
      where: {
        createdAt: { gte: today },
      },
    });

    // بازدیدهای هفته اخیر
    const viewsWeeklyData = await prisma.view.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: { createdAt: { gte: weekAgo } },
      orderBy: { createdAt: 'asc' },
    });

    const [
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

    const fillWeeklyData = (
      data: Array<{ createdAt: Date; _count?: unknown }>,
      isViewData = false,
    ) => {
      const filledData = new Array(7).fill(0);
      data.forEach((item) => {
        const itemDate = new Date(item.createdAt);
        itemDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
        const dayIndex = 6 - daysDiff;

        if (dayIndex >= 0 && dayIndex < 7) {
          if (isViewData) {
            // For view data, _count is an object with id property
            const count = item._count as { id?: number } | undefined;
            filledData[dayIndex] += count?.id || 0;
          } else {
            // For other data, _count is a number or true (from groupBy)
            const count = item._count;
            if (typeof count === 'number') {
              filledData[dayIndex] += count;
            } else if (count === true) {
              filledData[dayIndex] += 1;
            }
          }
        }
      });
      return filledData;
    };

    return {
      success: true,
      message: 'آمار با موفقیت بازیابی شد.',
      data: {
        views: { today: viewsToday, data: fillWeeklyData(viewsWeeklyData, true) },
        comments: { new: commentsNew, data: fillWeeklyData(commentsWeekly) },
        shares: { total: sharesTotal, data: fillWeeklyData(sharesWeekly) },
        likes: { total: likesTotal, data: fillWeeklyData(likesWeekly) },
        publishedPosts: { total: publishedPostsTotal, data: fillWeeklyData(publishedPostsWeekly) },
        drafts: { total: draftsTotal, data: fillWeeklyData(draftsWeekly) },
      },
    };
  } catch (error) {
    console.error('خطا در بازیابی آمار:', error);
    return {
      success: false,
      message: 'خطا در بازیابی آمار. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

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
    const where: Prisma.PostWhereInput = {
      status: 'PUBLISHED',
      updatedAt: { gt: new Date() },
    };

    // اگر نویسنده است، فقط پست‌های خودش را ببیند
    if (user.role === 'AUTHOR') {
      where.authorId = user.id;
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        categories: true,
        comments: {
          include: {
            author: {
              include: {
                profile: true,
              },
            },
            post: true,
            replies: true,
            likes: {
              include: {
                user: true,
              },
            },
            _count: true,
          },
        },
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
      orderBy: { updatedAt: 'asc' },
    });

    return {
      success: true,
      message: 'پست‌های زمان‌بندی شده با موفقیت دریافت شدند',
      data: posts,
    };
  } catch (error) {
    console.error('Error in getScheduledPosts:', error);
    return {
      success: false,
      message: 'خطا در دریافت پست‌های زمان‌بندی شده',
    };
  }
}
