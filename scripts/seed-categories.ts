/* Seed script: اضافه کردن دسته‌بندی‌های محبوب به دیتابیس
 * برای اجرا: npx tsx scripts/seed-categories.ts
 */
import { PrismaClient } from '@prisma/client';
import { generateSlug } from '../src/lib/utils';

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'بیت کوین', color: 'amber' },
  { name: 'اتریوم', color: 'indigo' },
  { name: 'تحلیل تکنیکال', color: 'cyan' },
  { name: 'سرمایه‌گذاری', color: 'emerald' },
  { name: 'صرافی ارز دیجیتال', color: 'blue' },
  { name: 'کیف پول', color: 'purple' },
  { name: 'NFT', color: 'pink' },
  { name: 'وب ۳', color: 'violet' },
  { name: 'قوانین ارز دیجیتال', color: 'slate' },
  { name: 'ماینینگ', color: 'amber' },
  { name: 'بازار جهانی', color: 'blue' },
  { name: 'قیمت لحظه‌ای', color: 'emerald' },
];

async function main() {
  console.log('🌱 شروع اضافه کردن دسته‌بندی‌ها...');

  let added = 0;
  let skipped = 0;

  for (const cat of CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name },
    });

    if (existing) {
      console.log(`⏭️  "${cat.name}" قبلاً وجود دارد`);
      skipped++;
      continue;
    }

    const slug = generateSlug(cat.name);
    let uniqueSlug = slug;
    let counter = 1;
    while (await prisma.category.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    await prisma.category.create({
      data: {
        name: cat.name,
        slug: uniqueSlug,
      },
    });
    console.log(`✅ "${cat.name}" اضافه شد`);
    added++;
  }

  console.log(`\n📊 نتیجه: ${added} اضافه شد، ${skipped} رد شد`);
}

main()
  .catch((e) => {
    console.error('❌ خطا:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
