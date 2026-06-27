import prisma from '@/lib/db';
import { generateSlug } from './utils';

export async function createUniqueSlug(
  baseSlug: string,
  existingId?: string,
  model: 'post' | 'category' = 'post',
): Promise<string> {
  // اگر اسلاگ خالی باشد، یک خطا پرتاب می‌کنیم
  if (!baseSlug) {
    throw new Error('اسلاگ نمی‌تواند خالی باشد');
  }

  // تبدیل اسلاگ به فرمت استاندارد
  const slug = generateSlug(baseSlug);
  let finalSlug = slug;
  let counter = 1;

  while (true) {
    // بررسی وجود اسلاگ در دیتابیس
    const where = {
      slug: finalSlug,
      ...(existingId && { NOT: { id: existingId } }), // برای حالت ویرایش
    };

    const exists =
      model === 'post'
        ? await prisma.post.findFirst({ where })
        : await prisma.category.findFirst({ where });

    // اگر اسلاگ وجود نداشت یا متعلق به همین آیتم بود
    if (!exists) {
      break;
    }

    // اضافه کردن شماره به اسلاگ و تلاش مجدد
    finalSlug = `${slug}-${counter}`;
    counter++;

    // محدودیت تعداد تلاش
    if (counter > 100) {
      throw new Error('خطا در ایجاد اسلاگ یکتا');
    }
  }

  return finalSlug;
}
