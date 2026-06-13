const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  console.log('🔗 در حال ربط دادن پست‌ها به همه دسته‌بندی‌ها...');

  const posts = await p.post.findMany({ select: { id: true, categories: { select: { id: true } } } });
  const categories = await p.category.findMany({ select: { id: true, name: true } });

  // برای هر پست، ۳ دسته‌بندی تصادفی وصل کن (اگه قبلاً وصل نیست)
  for (const post of posts) {
    const existingIds = new Set(post.categories.map(c => c.id));
    // انتخاب تصادفی ۳ دسته
    const shuffled = categories.sort(() => 0.5 - Math.random());
    const toAdd = shuffled.slice(0, 3).filter(c => !existingIds.has(c.id));

    if (toAdd.length === 0) {
      console.log('  پست ' + post.id + ': از قبل ' + existingIds.size + ' دسته دارد');
      continue;
    }

    await p.post.update({
      where: { id: post.id },
      data: {
        categories: {
          connect: toAdd.map(c => ({ id: c.id })),
        },
      },
    });
    console.log('  پست ' + post.id + ': ' + toAdd.length + ' دسته اضافه شد');
  }

  // گزارش نهایی
  console.log('\n📊 دسته‌بندی‌ها با تعداد پست:');
  const updated = await p.category.findMany({
    include: { _count: { select: { posts: true } } },
    orderBy: { posts: { _count: 'desc' } },
  });
  updated.forEach(c => console.log('  ' + c.name + ': ' + c._count.posts + ' پست'));

  await p.$disconnect();
})();
