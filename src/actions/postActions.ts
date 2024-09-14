'use server';

import type { PostStatus, Prisma, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { auth } from '@/auth';
import { checkRole, generateSlug, generateUniqueId, sanitizeSlug, validateSlug } from '@/lib/utils';
import type {
  ActionResult,
  CreatePostInput,
  PostWithRelations,
  RelatedPostWithRelations,
  UpdatePostInput,
} from '@/types/types';
import { CreatePostSchema, UpdatePostSchema } from '@/schemas';

export async function createPost(data: CreatePostInput): Promise<ActionResult<PostWithRelations>> {
  const session = await checkRole(['ADMIN', 'AUTHOR']);

  try {
    const validatedData = CreatePostSchema.parse(data);

    const id = generateUniqueId();
    let slug = validatedData.slug
      ? sanitizeSlug(validatedData.slug)
      : generateSlug(validatedData.title);

    if (!validateSlug(slug)) {
      return {
        success: false,
        message: 'اسلاگ نامعتبر است. لطفاً فقط از حروف کوچک انگلیسی، اعداد و خط فاصله استفاده کنید.',
      };
    }

    // Check for unique slug
    let slugExists = await prisma.post.findUnique({ where: { slug } });
    let slugAttempt = 1;
    while (slugExists) {
      slug = `${slug}-${slugAttempt}`;
      slugExists = await prisma.post.findUnique({ where: { slug } });
      slugAttempt++;
    }

    const post = await prisma.post.create({
      data: {
        ...validatedData,
        id,
        slug,
        author: {
          connect: { id: session.user?.id },
        },
        categories: {
          connectOrCreate: validatedData.categories.map((name) => ({
            where: { slug: generateSlug(name) },
            create: { name, slug: generateSlug(name) },
          })),
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

    revalidatePath('/dashboard');
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
    const validatedData = UpdatePostSchema.parse(data);

    let slug = validatedData.slug;
    if (!slug && validatedData.title) {
      slug = generateSlug(validatedData.title);
    }

    if (slug) {
      slug = sanitizeSlug(slug);
      if (!validateSlug(slug)) {
        return {
          success: false,
          message:
            'اسلاگ نامعتبر است. لطفاً فقط از حروف کوچک انگلیسی، اعداد و خط فاصله استفاده کنید.',
        };
      }
    }

    // Check for unique slug
    if (slug) {
      const currentPost = await prisma.post.findUnique({ where: { id: postId } });
      if (currentPost && currentPost.slug !== slug) {
        let slugExists = await prisma.post.findFirst({ where: { slug, NOT: { id: postId } } });
        let slugAttempt = 1;
        while (slugExists) {
          slug = `${slug}-${slugAttempt}`;
          slugExists = await prisma.post.findFirst({ where: { slug, NOT: { id: postId } } });
          slugAttempt++;
        }
      }
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        ...validatedData,
        slug,
        categories: validatedData.categories
          ? {
              set: [],
              connectOrCreate: validatedData.categories.map((name) => ({
                where: { slug: generateSlug(name) },
                create: { name, slug: generateSlug(name) },
              })),
            }
          : undefined,
        tags: validatedData.tags
          ? {
              set: [],
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

    revalidatePath('/dashboard');
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
  const session = await checkRole(['ADMIN', 'AUTHOR']);

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
      select: { authorId: true },
    });

    if (!post) {
      return { success: false, message: 'پست یافت نشد.', error: 'پست یافت نشد.' };
    }

    if (post.authorId !== session.user.id && session.user.role !== 'ADMIN') {
      return {
        success: false,
        message: 'غیر مجاز',
        error: 'شما مجاز به به‌روزرسانی این پست نیستید.',
      };
    }

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

    revalidatePath(`/post/${postId}`);
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
export async function deletePost(postId: string): Promise<ActionResult> {
  await checkRole(['ADMIN', 'AUTHOR']);

  try {
    await prisma.post.delete({ where: { id: postId } });
    revalidatePath('/dashboard/posts');
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

export async function getPostById(postId: string): Promise<ActionResult<PostWithRelations>> {
  console.log('getPostById called with ID:', postId);
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

    console.log('Post fetched from database:', post);

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
  console.log('getPostBySlug: Called with slug:', slug);
  if (!slug) {
    console.log('getPostBySlug: Invalid slug');
    return {
      success: false,
      message: 'اسلاگ نامعتبر است.',
      error: 'اسلاگ نمی‌تواند خالی باشد.',
    };
  }

  try {
    console.log('getPostBySlug: Querying database for post');
    const post = await prisma.post.findUnique({
      where: { slug: slug },
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
      console.log('getPostBySlug: No post found with slug:', slug);
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

    console.log('getPostBySlug: Post and related content found:', post.slug);
    return {
      success: true,
      message: 'پست و محتوای مرتبط با موفقیت بازیابی شد.',
      data: { ...post, relatedPosts, moreFromAuthor },
    };
  } catch (error) {
    console.error('getPostBySlug: Error retrieving post:', error);
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
  await checkRole(['ADMIN', 'AUTHOR']);

  const skip = (page - 1) * limit;

  let whereCondition: Prisma.PostWhereInput = searchTerm
    ? {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { content: { contains: searchTerm, mode: 'insensitive' } },
        ],
      }
    : {};

  // اصلاح شده: شرط فیلتر
  if (filter !== 'همه') {
    whereCondition = {
      ...whereCondition,
      status: filter,
    };
  }

  try {
    const [posts, total] = await prisma.$transaction([
      prisma.post.findMany({
        where: whereCondition,
        take: limit,
        skip: skip,
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
}

export async function getArchivePosts(
  page = 1,
  limit = 12,
  filter?: string,
  category?: string,
  subcategory?: string,
): Promise<ActionResult<{ posts: any[]; total: number; pages: number }>> {
  try {
    const skip = (page - 1) * limit;
    const whereCondition: Prisma.PostWhereInput = { status: 'PUBLISHED' };
    let orderBy: Prisma.PostOrderByWithRelationInput = { createdAt: 'desc' };

    if (category) {
      whereCondition.categories = { some: { slug: category } };
      if (subcategory) {
        whereCondition.categories = {
          some: {
            AND: [{ slug: category }, { childCategories: { some: { slug: subcategory } } }],
          },
        };
      }
    }

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
}
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

    revalidatePath(`/post/${postId}`);
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
  await checkRole(['ADMIN', 'AUTHOR']);

  try {
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
        where: { updatedAt: { gte: today } },
      }),
      prisma.post.groupBy({
        by: ['updatedAt'],
        _sum: { viewCount: true },
        where: { updatedAt: { gte: weekAgo } },
        orderBy: { updatedAt: 'asc' },
      }),
      prisma.comment.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.comment.groupBy({
        by: ['createdAt'],
        _count: true,
        where: { createdAt: { gte: weekAgo } },
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
        where: { status: 'PUBLISHED' },
      }),
      prisma.post.groupBy({
        by: ['createdAt'],
        _count: true,
        where: { status: 'PUBLISHED', createdAt: { gte: weekAgo } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.post.count({
        where: { status: 'DRAFT' },
      }),
      prisma.post.groupBy({
        by: ['createdAt'],
        _count: true,
        where: { status: 'DRAFT', createdAt: { gte: weekAgo } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const fillWeeklyData = (data: any[]) => {
      const filledData = new Array(7).fill(0);
      data.forEach((item) => {
        const dayIndex =
          6 -
          Math.floor(
            (today.getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24),
          );
        filledData[dayIndex] = item._count || item._sum?.viewCount || 0;
      });
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
  await checkRole(['ADMIN', 'AUTHOR']);

  try {
    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: 'PENDING_REVIEW',
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      success: true,
      message: 'پست‌های زمان‌بندی شده با موفقیت بازیابی شدند.',
      data: scheduledPosts,
    };
  } catch (error) {
    console.error('خطا در بازیابی پست‌های زمان‌بندی شده:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست‌های زمان‌بندی شده. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
