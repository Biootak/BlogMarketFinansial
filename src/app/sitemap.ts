import prisma from '@/lib/db';
import { serverLog } from '@/lib/server-logger';
import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://blogmarketfinansial.ir';

// Bounded limit to keep the sitemap reasonably sized; for very large sites
// prefer a sitemap index with per-page chunks.
const MAX_POSTS = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes = [
    '',
    '/about',
    '/contact',
    '/terms',
    '/archive',
    '/authors',
    '/money-transfer',
    '/online-payment',
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.6,
  }));

  try {
    const [posts, categories, tags, authors] = await Promise.all([
      prisma.post.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: MAX_POSTS,
      }),
      prisma.category.findMany({ select: { slug: true } }),
      prisma.tag.findMany({ select: { slug: true } }),
      prisma.user.findMany({
        select: { id: true },
        where: { role: { in: ['AUTHOR', 'ADMIN', 'OWNER'] } },
      }),
    ]);

    for (const post of posts) {
      entries.push({
        url: `${BASE_URL}/single/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      });
    }

    for (const cat of categories) {
      if (!cat.slug) continue;
      entries.push({
        url: `${BASE_URL}/archive/category/${cat.slug}`,
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      });
    }

    for (const tag of tags) {
      if (!tag.slug) continue;
      entries.push({
        url: `${BASE_URL}/archive/tag/${tag.slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      });
    }

    for (const author of authors) {
      entries.push({
        url: `${BASE_URL}/author/${author.id}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      });
    }
  } catch (error) {
    // Sitemap must never crash the build/route; fall back to static routes.
    serverLog.error('sitemap', 'load-dynamic-routes', error);
  }

  return entries;
}
