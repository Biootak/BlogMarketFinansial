import prisma from '@/lib/db';
import type { PostWithRelations, ActionResult, PaginationParams } from '@/types/types';

interface GetPostsByAuthorParams extends PaginationParams {
  filter?: string;
}

export async function getPostsByAuthor(
  authorId: string,
  { page = 1, limit = 12, filter = 'جدیدترین' }: GetPostsByAuthorParams,
): Promise<ActionResult<{ posts: PostWithRelations[]; total: number; pages: number }>> {
  try {
    const skip = (page - 1) * limit;

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    let orderBy: any = { createdAt: 'desc' };
    switch (filter) {
      case 'قدیمی‌ترین':
        orderBy = { createdAt: 'asc' };
        break;
      case 'محبوب‌ترین':
        orderBy = { likes: { _count: 'desc' } };
        break;
      case 'پربحث‌ترین':
        orderBy = { comments: { _count: 'desc' } };
        break;
    }

    const [posts, total] = await prisma.$transaction([
      prisma.post.findMany({
        where: { authorId },
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
        orderBy,
        skip,
        take: limit,
      }),
      prisma.post.count({ where: { authorId } }),
    ]);

    return {
      success: true,
      message: 'پست‌های نویسنده با موفقیت دریافت شدند.',
      data: {
        posts,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('خطا در دریافت پست‌های نویسنده:', error);
    return {
      success: false,
      message: 'خطا در دریافت پست‌های نویسنده. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
