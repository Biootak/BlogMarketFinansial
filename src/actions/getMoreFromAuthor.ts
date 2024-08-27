import prisma from '@/lib/db';
import type { ActionResult, PostWithRelations } from '@/types/types';

export async function getMoreFromAuthor(
  authorId: string,
  postId: string,
): Promise<ActionResult<PostWithRelations[]>> {
  try {
    const moreFromAuthor = await prisma.post.findMany({
      where: {
        authorId: authorId,
        id: { not: postId },
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
            tags: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'پست‌های بیشتر از این نویسنده با موفقیت بازیابی شدند.',
      data: moreFromAuthor,
    };
  } catch (error) {
    console.error('Error retrieving more posts from author:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست‌های بیشتر از این نویسنده. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
