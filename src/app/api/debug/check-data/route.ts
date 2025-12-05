import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      userCount,
      postCount,
      publishedCount,
      viewCount,
      likeCount,
      commentCount,
      savedPostCount,
    ] = await Promise.all([
      db.user.count(),
      db.post.count(),
      db.post.count({ where: { status: 'PUBLISHED' } }),
      db.view.count(),
      db.like.count(),
      db.comment.count(),
      db.savedPost.count(),
    ]);

    // Get date range of data
    let dateRange = null;
    if (postCount > 0) {
      const [oldest, newest] = await Promise.all([
        db.post.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        }),
        db.post.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

      dateRange = {
        oldest: oldest?.createdAt,
        newest: newest?.createdAt,
      };
    }

    // Get sample data
    const samplePosts = await db.post.findMany({
      take: 3,
      select: {
        id: true,
        title: true,
        status: true,
        viewCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const recentViews = await db.view.findMany({
      take: 5,
      select: {
        id: true,
        postId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      counts: {
        users: userCount,
        posts: postCount,
        publishedPosts: publishedCount,
        views: viewCount,
        likes: likeCount,
        comments: commentCount,
        savedPosts: savedPostCount,
      },
      dateRange,
      samples: {
        posts: samplePosts,
        recentViews,
      },
      status:
        userCount === 0 && postCount === 0
          ? 'EMPTY_DATABASE'
          : viewCount === 0 && likeCount === 0
            ? 'NO_ENGAGEMENT_DATA'
            : 'HAS_DATA',
      message:
        userCount === 0 && postCount === 0
          ? 'دیتابیس خالی است'
          : viewCount === 0 && likeCount === 0
            ? 'داده‌های تعاملی وجود ندارد'
            : 'دیتابیس دارای داده است',
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'خطا در بررسی دیتابیس',
      },
      { status: 500 }
    );
  }
}
