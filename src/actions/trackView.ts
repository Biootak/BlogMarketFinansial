'use server';

import db from '@/lib/db';
import { headers } from 'next/headers';

/**
 * Track post view
 * ثبت بازدید پست
 */
export async function trackPostView(postId: string) {
  console.log('🚀 [SERVER] trackPostView called with postId:', postId);
  
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    console.log('📍 [SERVER] IP:', ip);
    console.log('🖥️ [SERVER] User Agent:', userAgent);

    // بررسی وجود پست
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true, viewCount: true },
    });

    if (!post) {
      console.error('❌ [SERVER] Post not found:', postId);
      return { success: false, error: 'Post not found' };
    }

    console.log('✅ [SERVER] Post found:', post.title, 'Current views:', post.viewCount);

    // ثبت بازدید در جدول View
    const view = await db.view.create({
      data: {
        postId,
        ip,
        userAgent,
      },
    });

    console.log('✅ [SERVER] View record created:', view.id);

    // افزایش viewCount در پست
    const updatedPost = await db.post.update({
      where: { id: postId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      select: { viewCount: true },
    });

    console.log('✅ [SERVER] Post viewCount updated to:', updatedPost.viewCount);

    return { success: true, viewCount: updatedPost.viewCount };
  } catch (error) {
    console.error('❌ [SERVER] Error tracking view:', error);
    if (error instanceof Error) {
      console.error('❌ [SERVER] Error message:', error.message);
      console.error('❌ [SERVER] Error stack:', error.stack);
    }
    return { success: false, error: String(error) };
  }
}
