import { revalidateTag as nextRevalidateTag } from 'next/cache';

/**
 * 2026-06-14: Next.js 16 type definition for `revalidateTag` requires
 * a second `profile` argument (`'max' | 'page' | 'hours' | ...`) at the
 * type level. At runtime, the single-arg form still works for the
 * `unstable_cache` Data Cache. To keep call sites readable (and to
 * centralize the policy decision of which profile to use), we wrap
 * it here. Default profile is `'max'` which busts Data Cache entries
 * regardless of their `revalidate` TTL — exactly what every write
 * path in this project wants.
 */
export function revalidateTag(tag: string): void {
  // The cast is necessary because Next 16's signature marks the second
  // arg required, but the runtime accepts one. We always pass 'max' to
  // also invalidate any time-based caches the same call would touch.
  (nextRevalidateTag as unknown as (t: string, p?: string) => void)(tag, 'max');
}
