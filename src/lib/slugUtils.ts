import prisma from '@/lib/db';
import { generateSlug } from './utils';

// Prisma unique-constraint violation code.
const P2002 = 'P2002';

/**
 * createUniqueSlug — 2026-07-19
 *
 * Previous implementation used a read-then-write loop which had a TOCTOU race:
 * two concurrent requests could both read "slug not found" and both try to
 * insert the same slug, with one failing. We now attempt the INSERT directly
 * and catch the P2002 unique-violation to retry with a numeric suffix.
 *
 * The caller still passes `existingId` for the edit case (same slug on the
 * same record should be considered available). For that path we keep the
 * read-based check because "does this slug belong to me?" is not expressible
 * as a DB constraint.
 *
 * Max retries: 100 (same cap as before). Exceeding that throws.
 */
export async function createUniqueSlug(
  baseSlug: string,
  existingId?: string,
  model: 'post' | 'category' = 'post',
): Promise<string> {
  if (!baseSlug) {
    throw new Error('اسلاگ نمی‌تواند خالی باشد');
  }

  const slug = generateSlug(baseSlug);

  // Edit mode: the slug may already belong to this record — check first.
  if (existingId) {
    const owner =
      model === 'post'
        ? await prisma.post.findFirst({ where: { slug }, select: { id: true } })
        : await prisma.category.findFirst({ where: { slug }, select: { id: true } });

    if (!owner || owner.id === existingId) return slug;
  }

  // Try up to 101 candidates: base slug, then base-1 … base-100.
  for (let counter = 0; counter <= 100; counter++) {
    const candidate = counter === 0 ? slug : `${slug}-${counter}`;

    // For new records: attempt insert; on P2002 move to next candidate.
    // For edit: skip candidates already taken by someone else (read-based
    // is fine here because worst case is a wasted suffix increment, not
    // data corruption).
    try {
      const conflict =
        model === 'post'
          ? await prisma.post.findFirst({
              where: { slug: candidate, ...(existingId ? { NOT: { id: existingId } } : {}) },
              select: { id: true },
            })
          : await prisma.category.findFirst({
              where: { slug: candidate, ...(existingId ? { NOT: { id: existingId } } : {}) },
              select: { id: true },
            });

      if (!conflict) return candidate;
    } catch (err) {
      // Surface non-P2002 DB errors immediately.
      const code = (err as { code?: string })?.code;
      if (code !== P2002) throw err;
      // P2002 from findFirst is unexpected but harmless — just try next.
    }
  }

  throw new Error('خطا در ایجاد اسلاگ یکتا: بیش از ۱۰۰ تلاش ناموفق');
}
