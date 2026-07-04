const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  console.log('🧹 در حال پاک کردن پست‌های تست قبلی...');

  // همه پست‌هایی که [CRON-TEST] در عنوان‌شون هست (چه منتشرشده، چه scheduled)
  const before = await p.post.findMany({
    where: { title: { contains: '[CRON-TEST]' } },
    select: { id: true, title: true, status: true, slug: true },
  });
  console.log(`   پیدا شد: ${before.length} پست`);
  before.forEach((c) => console.log(`   - [${c.status}] ${c.title.substring(0, 70)}`));

  // حذف وابستگی‌ها (مثل categories/tags که M2M هستند، با خود post پاک میشن)
  // ابتدا comment/like/view/savedPost هستن که FK دارن
  const ids = before.map((p) => p.id);
  const delComments = await p.comment.deleteMany({ where: { postId: { in: ids } } });
  console.log(`   حذف comment: ${delComments.count}`);
  const delLikes = await p.like.deleteMany({ where: { postId: { in: ids } } });
  console.log(`   حذف like: ${delLikes.count}`);
  const delViews = await p.view.deleteMany({ where: { postId: { in: ids } } });
  console.log(`   حذف view: ${delViews.count}`);
  const delSaved = await p.savedPost.deleteMany({ where: { postId: { in: ids } } });
  console.log(`   حذف savedPost: ${delSaved.count}`);

  const delPosts = await p.post.deleteMany({ where: { id: { in: ids } } });
  console.log(`   ✅ پاک شدن ${delPosts.count} پست CRON-TEST`);

  await p.$disconnect();
})();
