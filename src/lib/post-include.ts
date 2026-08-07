/**
 * post-include — Prisma `include` های مشترک برای کوئری‌های پست.
 * هر کوئری که `PostWithRelations` برمی‌گرداند باید از این ثابت‌ها استفاده کند تا
 * شکل payload (و اندازه‌ی RSC) در همه‌ی مسیرها یکسان بماند.
 */
import type { Prisma } from '@prisma/client';

/** فیلدهای نویسنده که کارت/هدر پست نمایش می‌دهد. */
export const postAuthorSelect = {
  id: true,
  name: true,
  image: true,
  profile: {
    select: { avatar: true, jobName: true },
  },
} satisfies Prisma.UserSelect;

/** فیلدهای مشترک دسته و تگ (نمایش chip). */
export const taxonomySelect = { id: true, name: true, slug: true } as const;

/** include استاندارد لیست پست‌ها — author + دسته + تگ + شمارش تعامل. */
export const postCardInclude = {
  author: { select: postAuthorSelect },
  categories: { select: taxonomySelect },
  tags: { select: taxonomySelect },
  _count: {
    select: {
      comments: true,
      likes: true,
      savedBy: true,
    },
  },
} satisfies Prisma.PostInclude;

/**
 * نسخه‌ی سبک‌تر برای گرید گالری: حداکثر ۵ تگ (بیشتر در کارت جا نمی‌شود) و
 * بدون شمارش `savedBy`.
 */
export const galleryPostCardInclude = {
  ...postCardInclude,
  tags: { select: taxonomySelect, take: 5 },
  _count: {
    select: {
      comments: true,
      likes: true,
    },
  },
} satisfies Prisma.PostInclude;
