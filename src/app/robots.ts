import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

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
