'use server';

import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';
import { generateColor } from '@/lib/utils';
import type { ActionResult, PostWithRelations, SidebarData, TaxonomyType } from '@/types/types';
import { type TopAuthor, getTopAuthors } from './getTopAuthors';

// 2026-06-21: همه‌ی cached functions در این فایل از safeCache استفاده می‌کنند.
// قبلاً unstable_cache بود که در Next.js 16 خطای DB را re-throw می‌کرد.
// حالا اگر DB قطع باشد، stale value (اگر قبلاً موفق بود) یا fallback.

export const getRecentPosts = safeCache(
  async (limit: number): Promise<PostWithRelations[]> => {
    const recentPosts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      // 2026-06-14: trim the include — author.password was being
      // selected and shipped through the unstable_cache JSON, which
      // is a security risk (cache entries can be inspected by anyone
      // with read access to the data store). Same fix applied to
      // getSidebarData below.
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        postType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        viewCount: true,
        readingTime: true,
        authorId: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            profile: {
              select: {
                avatar: true,
                jobName: true,
              },
            },
          },
        },
        categories: {
          select: { id: true, name: true, slug: true, thumbnail: true },
        },
        tags: {
          select: { id: true, name: true, slug: true },
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

    return recentPosts as unknown as PostWithRelations[];
  },
  [],
  { key: 'recent-posts', ttl: 3600, tags: ['recent-posts'] },
);

export const getPopularTags = safeCache(
  async (limit: number): Promise<TaxonomyType[]> => {
    const popularTags = await prisma.tag.findMany({
      take: limit,
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return popularTags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      thumbnail: null,
      taxonomy: 'tag',
      color: generateColor(tag.id),
      count: tag._count.posts,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    }));
  },
  [],
  { key: 'popular-tags', ttl: 3600, tags: ['popular-tags'] },
);

export const getPopularCategories = safeCache(
  async (limit: number): Promise<TaxonomyType[]> => {
    const popularCategories = await prisma.category.findMany({
      take: limit,
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      include: {
        _count: {
          select: { posts: true },
        },
        parentCategories: true,
      },
    });

    return popularCategories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      thumbnail: category.thumbnail,
      taxonomy: category.parentCategories.length > 0 ? 'subcategory' : 'category',
      color: generateColor(category.id),
      count: category._count.posts,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));
  },
  [],
  { key: 'popular-categories', ttl: 3600, tags: ['popular-categories'] },
);

export const getPopularAuthors = safeCache(
  async (limit: number): Promise<TopAuthor[]> => {
    return await getTopAuthors(limit);
  },
  [],
  { key: 'popular-authors', ttl: 3600, tags: ['popular-authors'] },
);

export async function getSidebarData(): Promise<SidebarData> {
  return safeCache<[], SidebarData>(
    async () => {
      const [posts, tags, categories, authors, ads] = await Promise.all([
        prisma.post.findMany({
          where: { status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          // 2026-06-14: same security/perf fix as getRecentPosts —
          // author.password was leaked through the cache. author is
          // now name/image/profile.avatar only.
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            featuredImage: true,
            postType: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            viewCount: true,
            readingTime: true,
            authorId: true,
            author: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
                profile: {
                  select: { avatar: true, jobName: true },
                },
              },
            },
            categories: { select: { id: true, name: true, slug: true, thumbnail: true } },
            tags: { select: { id: true, name: true, slug: true } },
            _count: {
              select: { comments: true, likes: true, savedBy: true },
            },
          },
        }),
        prisma.tag.findMany({
          take: 10,
          orderBy: { posts: { _count: 'desc' } },
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: { posts: true },
            },
          },
        }),
        prisma.category.findMany({
          take: 10,
          orderBy: { posts: { _count: 'desc' } },
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: { posts: true },
            },
          },
        }),
        prisma.user.findMany({
          where: { role: 'AUTHOR' },
          take: 5,
          // 2026-06-14: trim — no more emailVerified/phoneNumber/bio/
          // bgImage/company in the sidebar payload. Cache writes are
          // much smaller and we never expose sensitive fields to the
          // client.
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            profile: {
              select: {
                avatar: true,
                jobName: true,
              },
            },
            _count: {
              select: { posts: true },
            },
          },
        }),
        prisma.advertisement.findMany({
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            linkUrl: true,
            startDate: true,
            endDate: true,
            isActive: true,
            size: true,
            position: true,
            customPosition: true,
            order: true,
            customDimensions: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { order: 'asc' },
        }),
      ]);

      return {
        recentPosts: posts as unknown as PostWithRelations[],
        popularTags: tags.map((tag) => ({
          ...tag,
          taxonomy: 'tag' as const,
          count: tag._count.posts,
        })),
        popularCategories: categories.map((category) => ({
          ...category,
          taxonomy: 'category' as const,
          count: category._count.posts,
        })),
        popularAuthors: authors as unknown as SidebarData['popularAuthors'],
        ads: ads,
      };
    },
    // 2026-06-21: fallback ایمن — sidebar سایدبار با همه‌ی فیلدهای خالی
    {
      recentPosts: [],
      popularTags: [],
      popularCategories: [],
      popularAuthors: [],
      ads: [],
    } as SidebarData,
    {
      key: 'sidebar-data',
      ttl: 3600,
      tags: [
        'sidebar-data',
        'sidebar-posts',
        'sidebar-tags',
        'sidebar-categories',
        'sidebar-authors',
        'sidebar-ads',
      ],
    },
  )();
}
