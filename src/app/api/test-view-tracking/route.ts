import db from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify view tracking
 * دسترسی: GET /api/test-view-tracking?postId=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    console.log('🧪 [TEST] Testing view tracking for postId:', postId);

    // بررسی وجود پست
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true, viewCount: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    console.log('✅ [TEST] Post found:', post);

    // ثبت بازدید
    const view = await db.view.create({
      data: {
        postId,
        ip: 'test-ip',
        userAgent: 'test-agent',
      },
    });

    console.log('✅ [TEST] View created:', view);

    // افزایش viewCount
    const updatedPost = await db.post.update({
      where: { id: postId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      select: { id: true, title: true, viewCount: true },
    });

    console.log('✅ [TEST] Post updated:', updatedPost);

    return NextResponse.json({
      success: true,
      message: 'View tracked successfully',
      before: post.viewCount,
      after: updatedPost.viewCount,
      viewId: view.id,
    });
  } catch (error) {
    console.error('❌ [TEST] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to track view',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
