import prisma from '@/lib/db';
import type { ActionResult, PostWithRelations } from '@/types/types';
import { PostType, PostStatus } from '@prisma/client';

export async function getGalleryPosts(
  page = 1,
  pageSize = 10,
): Promise<ActionResult<PostWithRelations[]>> {
  try {
    const skip = (page - 1) * pageSize;

    const posts = await prisma.post.findMany({
      where: {
        postType: PostType.GALLERY,
        status: PostStatus.PUBLISHED,
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
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: pageSize,
    });

    const totalPosts = await prisma.post.count({
      where: {
        postType: PostType.GALLERY,
        status: PostStatus.PUBLISHED,
      },
    });

    return {
      success: true,
      message: 'پست‌های گالری با موفقیت بازیابی شدند.',
      data: posts,
      meta: {
        currentPage: page,
        pageSize,
        totalPages: Math.ceil(totalPosts / pageSize),
        totalItems: totalPosts,
      },
    };
  } catch (error) {
    console.error('خطا در بازیابی پست‌های گالری:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست‌های گالری. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
