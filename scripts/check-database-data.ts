import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseData() {
  try {
    console.log('🔍 بررسی داده‌های دیتابیس...\n');

    // بررسی کاربران
    const userCount = await prisma.user.count();
    console.log(`👥 تعداد کاربران: ${userCount}`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({
        take: 3,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });
      console.log('   نمونه کاربران:', users);
    }

    // بررسی پست‌ها
    const postCount = await prisma.post.count();
    const publishedCount = await prisma.post.count({ where: { status: 'PUBLISHED' } });
    const draftCount = await prisma.post.count({ where: { status: 'DRAFT' } });
    const pendingCount = await prisma.post.count({ where: { status: 'PENDING_REVIEW' } });

    console.log(`\n📝 تعداد پست‌ها: ${postCount}`);
    console.log(`   - منتشر شده: ${publishedCount}`);
    console.log(`   - پیش‌نویس: ${draftCount}`);
    console.log(`   - در انتظار بررسی: ${pendingCount}`);

    if (postCount > 0) {
      const posts = await prisma.post.findMany({
        take: 3,
        select: {
          id: true,
          title: true,
          status: true,
          viewCount: true,
          createdAt: true,
        },
      });
      console.log('   نمونه پست‌ها:', posts);
    }

    // بررسی بازدیدها
    const viewCount = await prisma.view.count();
    console.log(`\n👁️ تعداد بازدیدها: ${viewCount}`);

    if (viewCount > 0) {
      const recentViews = await prisma.view.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          postId: true,
          createdAt: true,
        },
      });
      console.log('   آخرین بازدیدها:', recentViews);
    }

    // بررسی لایک‌ها
    const likeCount = await prisma.like.count();
    console.log(`\n❤️ تعداد لایک‌ها: ${likeCount}`);

    // بررسی کامنت‌ها
    const commentCount = await prisma.comment.count();
    const approvedComments = await prisma.comment.count({ where: { approved: true } });
    console.log(`\n💬 تعداد کامنت‌ها: ${commentCount}`);
    console.log(`   - تایید شده: ${approvedComments}`);

    // بررسی ذخیره‌ها
    const savedPostCount = await prisma.savedPost.count();
    console.log(`\n🔖 تعداد پست‌های ذخیره شده: ${savedPostCount}`);

    // بررسی بازه زمانی داده‌ها
    if (postCount > 0) {
      const oldestPost = await prisma.post.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });
      const newestPost = await prisma.post.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      console.log(`\n📅 بازه زمانی داده‌ها:`);
      console.log(`   - قدیمی‌ترین پست: ${oldestPost?.createdAt.toLocaleDateString('fa-IR')}`);
      console.log(`   - جدیدترین پست: ${newestPost?.createdAt.toLocaleDateString('fa-IR')}`);
    }

    // خلاصه
    console.log('\n' + '='.repeat(50));
    if (userCount === 0 && postCount === 0) {
      console.log('⚠️ دیتابیس خالی است! لطفاً داده‌های نمونه اضافه کنید.');
    } else if (viewCount === 0 && likeCount === 0 && commentCount === 0) {
      console.log('⚠️ داده‌های تعاملی (بازدید، لایک، کامنت) وجود ندارد!');
      console.log('💡 برای نمایش آمار دقیق، نیاز به ثبت بازدید و تعاملات است.');
    } else {
      console.log('✅ دیتابیس دارای داده است و آمار باید نمایش داده شود.');
    }
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ خطا در بررسی دیتابیس:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseData();
