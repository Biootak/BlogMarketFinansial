'use server';

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { PostStatus } from '@prisma/client';
import type { PostWithRelations } from '@/types/types';
import { revalidatePath } from 'next/cache';
import { revalidateTag } from '@/lib/revalidate';

interface GetLatestPostsParams {
  count?: number;
  skip?: number;
  category?: string;
}

/* ---------- CACHE VERSION ----------
 * هر بار که seed یا داده‌ها به شکل قابل‌توجهی عوض می‌شن، این عدد رو زیاد کنید.
 * چرا؟ unstable_cache در Next.js کلیدش ترکیب [name, ...args, tags] هست و
 * وقتی داخل خود تابع fetch می‌کنیم، تغییر DB بدون تغییر key هیچ تاثیری نداره.
 * revalidateTag فقط از Server Action کار می‌کنه و seed مستقیم به DB می‌زنه.
 * ساده‌ترین راه: version رو hard-code زیاد کنیم تا کلید cache عوض شه.
 *
 * بعد از seed، تگ `posts` در حافظه‌ی Next باطل می‌شه چون:
 *  1. Seed فقط به DB می‌زنه — کش Next.js بدون تغییر باقی می‌مونه
 *  2. Revalidate API فقط revalidatePath می‌کنه (که روی data cache اثر نداره)
 *  3. unstable_cache فقط با revalidateTag باطل می‌شه
 *
 * راه‌حل: VERSION رو با هر تغییر شدید (seed یا schema) عوض کن.
 */
const CACHE_VERSION = 'v5-2026-06-14'; // 2026-06-14: filter posts with valid featuredImage.

// Internal fetch function
async function fetchLatestPosts(
  count: number,
  skip: number,
  category: string | undefined,
): Promise<PostWithRelations[]> {
    try {
      const whereClause = {
        status: PostStatus.PUBLISHED,
        featuredImage: {
          not: null,
        },
        AND: [
          {
            featuredImage: {
              not: '',
            },
          },
          {
            featuredImage: {
              not: ' ',
            },
          },
        ],
        ...(category && category !== 'همه'
          ? {
              categories: {
                some: {
                  name: category,
                },
              },
            }
          : {}),
      };

      const posts = await prisma.post.findMany({
        where: whereClause,
        take: count,
        skip: skip,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: {
                  avatar: true,
                  jobName: true,
                },
              },
            },
          },
          categories: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          tags: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
              savedBy: true,
            },
          },
        },
      });

      // فیلتر ثانویه: حذف رشته‌های خالی / placeholder های broken
      const cleaned = posts.filter((p) => {
        const img = (p as { featuredImage?: string | null }).featuredImage;
        return typeof img === 'string' && img.trim().length > 0;
      });
      return cleaned as PostWithRelations[];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching posts:', error);
      }
      return [];
    }
}

// Cached version
const getCachedLatestPosts = unstable_cache(
  fetchLatestPosts,
  // کلید cache — VERSION توش هست تا با عوض شدنش، کش قبلی باطل بشه
  ['latest-posts', CACHE_VERSION],
  {
    revalidate: 60, // 1 minute
    tags: ['posts', 'latest-posts'],
  }
);

// Public API
export async function getLatestPosts({
  count = 6,
  skip = 0,
  category,
}: GetLatestPostsParams = {}): Promise<PostWithRelations[]> {
  return getCachedLatestPosts(count, skip, category);
}

export async function invalidatePostsCache() {
  revalidatePath('/posts');
  revalidateTag('posts');
  revalidateTag('latest-posts');
}
