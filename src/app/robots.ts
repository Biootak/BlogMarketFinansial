import { getSiteUrl } from '@/lib/site-url';
import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const BASE_URL = await getSiteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/api', '/setup', '/auth', '/signin', '/signup'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
