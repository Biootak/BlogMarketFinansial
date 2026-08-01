import {
  revalidatePath as nextRevalidatePath,
  revalidateTag as nextRevalidateTag,
} from 'next/cache';
import { safeRevalidateTag } from '@/lib/safe-cache';

/**
 * 2026-06-14: Next.js 16 type definition for `revalidateTag` requires
 * a second `profile` argument (`'max' | 'page' | 'hours' | ...`) at the
 * type level. At runtime, the single-arg form still works for the
 * `unstable_cache` Data Cache. To keep call sites readable (and to
 * centralize the policy decision of which profile to use), we wrap
 * it here. Default profile is `'max'` which busts Data Cache entries
 * regardless of their `revalidate` TTL — exactly what every write
 * path in this project wants.
 *
 * 2026-08: safeRevalidateTag نیز صدا زده می‌شود تا in-memory safeCache
 * همزمان با Next.js data cache invalidate بشود (H5).
 */
export function revalidateTag(tag: string): void {
  // Bust Next.js Data Cache (unstable_cache entries)
  (nextRevalidateTag as unknown as (t: string, p?: string) => void)(tag, 'max');
  // Bust in-memory safeCache entries for the same tag
  safeRevalidateTag(tag);
}

/**
 * Re-export revalidatePath so all callers can import from '@/lib/revalidate'
 * instead of 'next/cache' directly — keeps the import policy consistent.
 */
export function revalidatePath(path: string, type?: 'layout' | 'page'): void {
  nextRevalidatePath(path, type);
}
