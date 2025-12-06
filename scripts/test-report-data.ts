import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testReportData() {
  console.log('🔍 تست داده‌های گزارش...\n');

  try {
    // تست 1: تعداد کل کاربران
    const totalUsers = await prisma.user.count();
    console.log(`✅ تعداد کل کاربران: ${totalUsers}`);

    // تست 2: تعداد پست‌های منتشر شده
    const publishedPosts = await prisma.post.count({
      where: { status: 'PUBLISHED' },
    });
    console.log(`✅ تعداد پست‌های منتشر شده: ${publishedPosts}`);

    // تست 3: مجموع viewCount
    const viewCountSum = await prisma.post.aggregate({
      where: { status: 'PUBLISHED' },
      _sum: { viewCount: true },
    });
    console.log(`✅ مجموع viewCount: ${viewCountSum._sum?.viewCount || 0}`);

    // تست 4: نمونه پست‌ها با viewCount
    const samplePosts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        viewCount: true,
        createdAt: true,
      },
      orderBy: { viewCount: 'desc' },
      take: 5,
    });

    console.log('\n📊 نمونه پست‌ها:');
    samplePosts.forEach((post) => {
      console.log(
        `  - ${post.title}: ${post.viewCount} بازدید (${post.createdAt.toLocaleDateString('fa-IR')})`,
      );
    });

    // تست 5: بازه زمانی 30 روز گذشته
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const now = new Date();

    console.log(
      `\n📅 بازه زمانی: ${thirtyDaysAgo.toLocaleDateString('fa-IR')} تا ${now.toLocaleDateString('fa-IR')}`,
    );

    const recentPosts = await prisma.post.count({
      where: {
        status: 'PUBLISHED',
        createdAt: {
          gte: thirtyDaysAgo,
          lte: now,
        },
      },
    });
    console.log(`✅ پست‌های 30 روز گذشته: ${recentPosts}`);

    const recentViews = await prisma.post.aggregate({
      where: {
        status: 'PUBLISHED',
        createdAt: {
          gte: thirtyDaysAgo,
          lte: now,
        },
      },
      _sum: { viewCount: true },
    });
    console.log(`✅ بازدیدهای 30 روز گذشته: ${recentViews._sum?.viewCount || 0}`);

    // تست 6: تعداد لایک‌ها
    const totalLikes = await prisma.like.count();
    console.log(`\n✅ تعداد کل لایک‌ها: ${totalLikes}`);

    // تست 7: تعداد کامنت‌ها
    const totalComments = await prisma.comment.count();
    console.log(`✅ تعداد کل کامنت‌ها: ${totalComments}`);

    // تست 8: محاسبه نرخ تعامل
    const totalEngagements = totalLikes + totalComments;
    const totalViews = viewCountSum._sum?.viewCount || 0;
    const engagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;
    console.log(`\n📈 نرخ تعامل: ${engagementRate.toFixed(2)}%`);
    console.log(`   (${totalEngagements} تعامل / ${totalViews} بازدید)`);

    console.log('\n✅ همه تست‌ها موفق بود!');
  } catch (error) {
    console.error('\n❌ خطا:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testReportData();
