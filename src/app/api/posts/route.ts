import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

import { withActivityLogging } from '@/lib/activity-middleware';
import db from '@/lib/db';

export const GET = async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const posts = await db.post.findMany({
      include: {
        author: {
          select: {
            name: true,
            email: true
          }
        },
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ success: true, data: posts });
  } catch (error) {
    console.error('[POSTS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
};

export const POST = withActivityLogging(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user || !['SUPER_ADMIN', 'ADMIN', 'AUTHOR'].includes(session.user.role)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { title, content, categoryId, status = 'DRAFT' } = body;

    const post = await db.post.create({
      data: {
        title,
        content,
        categoryId,
        status,
        authorId: session.user.id
      }
    });

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('[POSTS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
});

export const PUT = withActivityLogging(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { id, title, content, categoryId, status } = body;

    // Check if user has permission to edit this post
    const existingPost = await db.post.findUnique({
      where: { id },
      select: { authorId: true }
    });

    if (!existingPost) {
      return new NextResponse('Post not found', { status: 404 });
    }

    if (existingPost.authorId !== session.user.id && session.user.role === 'AUTHOR') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const post = await db.post.update({
      where: { id },
      data: {
        title,
        content,
        categoryId,
        status
      }
    });

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('[POSTS_PUT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
});

export const DELETE = withActivityLogging(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return new NextResponse('Missing post ID', { status: 400 });
    }

    // Check if user has permission to delete this post
    const existingPost = await db.post.findUnique({
      where: { id },
      select: { authorId: true }
    });

    if (!existingPost) {
      return new NextResponse('Post not found', { status: 404 });
    }

    if (existingPost.authorId !== session.user.id && session.user.role === 'AUTHOR') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    await db.post.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POSTS_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
});
