import { revalidateTag } from '@/lib/revalidate';

/**
 * Revalidate the site-identity cache.
 *
 * This lives in its own file so that callers in client-facing import chains
 * (e.g. SiteLogo) do not pull in `next/cache` at build time.
 */
export async function revalidateSiteIdentity(): Promise<void> {
  await revalidateTag('site-identity');
}
