import prisma from '@/lib/db';

// 2026-06-30: case-insensitive email lookup. The shared `emailSchema`
// in src/schemas/index.ts now normalizes input to lowercase + trim,
// but legacy rows (e.g. seeded `Admin@gmail.com`) were stored with
// the original casing. Using `mode: 'insensitive'` lets both old
// (mixed-case) and new (lowercase) rows be found by the same call.
// Storage stays whatever the caller wrote; new writes go through the
// normalized schema so future rows are consistent.
export const getUserByEmail = async (email: string) => {
  try {
    const normalized = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
    });
    return user;
  } catch {
    return null;
  }
};

export const getUserById = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    return user;
  } catch {
    return null;
  }
};
