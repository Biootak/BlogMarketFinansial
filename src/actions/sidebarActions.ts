'use server';

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { generateColor } from '@/lib/utils';
import type { ActionResult, TaxonomyType, PostWithRelations, SidebarData } from '@/types/types';
import { getTopAuthors, type TopAuthor } from './getTopAuthors';

export const getRecentPosts = unstable_cache(
  async (limit: number): Promise<PostWithRelations[]> => {
    try {
      const recentPosts = await prisma.post.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              role: true,
              password: true,
              emailVerified: true,
              phoneNumber: true,
              profile: {
                select: {
                  bio: true,
                  avatar: true,
                  bgImage: true,
                  jobName: true,
                  company: true,
                  userId: true,
                  id: true
                }
              }
            }
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

      return recentPosts;
    } catch (error) {
      console.error('خطا در بازیابی پست‌های اخیر:', error);
      return [];
    }
  },
  ['recent-posts'],
  {
    tags: ['recent-posts'],
    revalidate: 3600 // Cache for 1 hour
  }
);

export const getPopularTags = unstable_cache(
  async (limit: number): Promise<TaxonomyType[]> => {
    try {
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
    } catch (error) {
      console.error('خطا در بازیابی تگ‌های محبوب:', error);
      return [];
    }
  },
  ['popular-tags'],
  {
    tags: ['popular-tags'],
    revalidate: 3600 // Cache for 1 hour
  }
);

export const getPopularCategories = unstable_cache(
  async (limit: number): Promise<TaxonomyType[]> => {
    try {
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
    } catch (error) {
      console.error('خطا در بازیابی دسته‌بندی‌های محبوب:', error);
      return [];
    }
  },
  ['popular-categories'],
  {
    tags: ['popular-categories'],
    revalidate: 3600 // Cache for 1 hour
  }
);

export const getPopularAuthors = unstable_cache(
  async (limit: number): Promise<TopAuthor[]> => {
    try {
      return await getTopAuthors(limit);
    } catch (error) {
      console.error('خطا در بازیابی نویسندگان محبوب:', error);
      return [];
    }
  },
  ['popular-authors'],
  {
    tags: ['popular-authors'],
    revalidate: 3600 // Cache for 1 hour
  }
);

export async function getSidebarData(): Promise<SidebarData> {
  return unstable_cache(
    async () => {
      const [
        posts,
        tags,
        categories,
        authors,
        ads
      ] = await Promise.all([
        prisma.post.findMany({
          where: { status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                role: true,
                password: true,
                emailVerified: true,
                phoneNumber: true,
                profile: {
                  select: {
                    bio: true,
                    avatar: true,
                    bgImage: true,
                    jobName: true,
                    company: true,
                    userId: true,
                    id: true
                  }
                }
              }
            },
            categories: true,
            tags: true,
            _count: {
              select: {
                comments: true,
                likes: true,
                savedBy: true,
                tags: true
              }
            }
          }
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
              select: { posts: true }
            }
          }
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
              select: { posts: true }
            }
          }
        }),
        prisma.user.findMany({
          where: { role: 'AUTHOR' },
          take: 5,
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            phoneNumber: true,
            image: true,
            profile: {
              select: {
                bio: true,
                avatar: true,
                bgImage: true,
                jobName: true,
                company: true
              }
            },
            _count: {
              select: { posts: true }
            }
          }
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
            type: true,
            status: true,
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                phoneNumber: true,
                image: true,
                profile: {
                  select: {
                    bio: true,
                    avatar: true,
                    bgImage: true,
                    jobName: true,
                    company: true
                  }
                }
              }
            }
          },
          orderBy: { order: 'asc' }
        })
      ]);

      return {
        recentPosts: posts,
        popularTags: tags.map(tag => ({
          ...tag,
          taxonomy: 'tag' as const,
          count: tag._count.posts
        })),
        popularCategories: categories.map(category => ({
          ...category,
          taxonomy: 'category' as const,
          count: category._count.posts
        })),
        popularAuthors: authors,
        ads: ads
      };
    },
    ['sidebar-data'],
    {
      tags: [
        'sidebar-data',
        'sidebar-posts',
        'sidebar-tags', 
        'sidebar-categories',
        'sidebar-authors',
        'sidebar-ads'
      ],
      revalidate: 3600 // Cache for 1 hour
    }
  )();
}
