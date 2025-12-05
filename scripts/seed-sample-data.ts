import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 شروع seed کردن داده‌های نمونه...\n');

  // ایجاد کاربران نمونه
  console.log('👥 ایجاد کاربران...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@biotak.ir' },
    update: {},
    create: {
      email: 'admin@biotak.ir',
      name: 'مدیر سیستم',
      password: await hash('admin123', 10),
      role: 'SUPER_ADMIN',
      status: 'Active',
    },
  });

  const author1 = await prisma.user.upsert({
    where: { email: 'author1@biotak.ir' },
    update: {},
    create: {
      email: 'author1@biotak.ir',
      name: 'علی محمدی',
      password: await hash('author123', 10),
      role: 'AUTHOR',
      status: 'Active',
    },
  });

  const author2 = await prisma.user.upsert({
    where: { email: 'author2@biotak.ir' },
    update: {},
    create: {
      email: 'author2@biotak.ir',
      name: 'سارا احمدی',
      password: await hash('author123', 10),
      role: 'AUTHOR',
      status: 'Active',
    },
  });

  console.log(`✅ ${3} کاربر ایجاد شد`);

  // ایجاد دسته‌بندی‌ها
  console.log('\n📁 ایجاد دسته‌بندی‌ها...');
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'forex' },
      update: {},
      create: { name: 'فارکس', slug: 'forex' },
    }),
    prisma.category.upsert({
      where: { slug: 'crypto' },
      update: {},
      create: { name: 'ارز دیجیتال', slug: 'crypto' },
    }),
    prisma.category.upsert({
      where: { slug: 'stock' },
      update: {},
      create: { name: 'بورس', slug: 'stock' },
    }),
  ]);
  console.log(`✅ ${categories.length} دسته‌بندی ایجاد شد`);

  // ایجاد پست‌های نمونه
  console.log('\n📝 ایجاد پست‌ها...');
  const posts = [];
  const now = new Date();

  for (let i = 1; i <= 20; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    const post = await prisma.post.create({
      data: {
        title: `پست نمونه شماره ${i}`,
        content: `این یک پست نمونه است برای تست سیستم گزارش‌دهی. محتوای کامل پست ${i}.`,
        excerpt: `خلاصه پست ${i}`,
        slug: `sample-post-${i}`,
        status: i <= 15 ? 'PUBLISHED' : i <= 18 ? 'DRAFT' : 'PENDING_REVIEW',
        authorId: i % 2 === 0 ? author1.id : author2.id,
        viewCount: Math.floor(Math.random() * 1000),
        readingTime: Math.floor(Math.random() * 10) + 1,
        createdAt,
        categories: {
          connect: [{ id: categories[i % 3].id }],
        },
      },
    });
    posts.push(post);
  }
  console.log(`✅ ${posts.length} پست ایجاد شد`);

  // ایجاد بازدیدها
  console.log('\n👁️ ایجاد بازدیدها...');
  const publishedPosts = posts.filter((p) => p.status === 'PUBLISHED');
  let viewCount = 0;

  for (const post of publishedPosts) {
    const numViews = Math.floor(Math.random() * 50) + 10;
    for (let i = 0; i < numViews; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const viewDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      await prisma.view.create({
        data: {
          postId: post.id,
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0',
          createdAt: viewDate,
        },
      });
      viewCount++;
    }
  }
  console.log(`✅ ${viewCount} بازدید ایجاد شد`);

  // ایجاد لایک‌ها
  console.log('\n❤️ ایجاد لایک‌ها...');
  let likeCount = 0;
  for (const post of publishedPosts.slice(0, 10)) {
    const numLikes = Math.floor(Math.random() * 20) + 5;
    for (let i = 0; i < numLikes; i++) {
      try {
        const daysAgo = Math.floor(Math.random() * 30);
        const likeDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

        await prisma.like.create({
          data: {
            userId: i % 2 === 0 ? author1.id : author2.id,
            postId: post.id,
            createdAt: likeDate,
          },
        });
        likeCount++;
      } catch (error) {
        // Skip duplicate likes
      }
    }
  }
  console.log(`✅ ${likeCount} لایک ایجاد شد`);

  // ایجاد کامنت‌ها
  console.log('\n💬 ایجاد کامنت‌ها...');
  let commentCount = 0;
  for (const post of publishedPosts.slice(0, 10)) {
    const numComments = Math.floor(Math.random() * 10) + 2;
    for (let i = 0; i < numComments; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const commentDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      await prisma.comment.create({
        data: {
          content: `این یک کامنت نمونه است ${i + 1}`,
          postId: post.id,
          authorId: i % 2 === 0 ? author1.id : author2.id,
          approved: Math.random() > 0.3,
          createdAt: commentDate,
        },
      });
      commentCount++;
    }
  }
  console.log(`✅ ${commentCount} کامنت ایجاد شد`);

  // ایجاد ذخیره‌ها
  console.log('\n🔖 ایجاد ذخیره‌ها...');
  let savedCount = 0;
  for (const post of publishedPosts.slice(0, 8)) {
    try {
      const daysAgo = Math.floor(Math.random() * 30);
      const savedDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      await prisma.savedPost.create({
        data: {
          userId: savedCount % 2 === 0 ? author1.id : author2.id,
          postId: post.id,
          createdAt: savedDate,
        },
      });
      savedCount++;
    } catch (error) {
      // Skip duplicates
    }
  }
  console.log(`✅ ${savedCount} ذخیره ایجاد شد`);

  console.log('\n' + '='.repeat(50));
  console.log('✅ seed کامل شد!');
  console.log('='.repeat(50));
  console.log(`\n📊 خلاصه:`);
  console.log(`   - کاربران: 3`);
  console.log(`   - دسته‌بندی‌ها: ${categories.length}`);
  console.log(`   - پست‌ها: ${posts.length}`);
  console.log(`   - بازدیدها: ${viewCount}`);
  console.log(`   - لایک‌ها: ${likeCount}`);
  console.log(`   - کامنت‌ها: ${commentCount}`);
  console.log(`   - ذخیره‌ها: ${savedCount}`);
  console.log('\n💡 اکنون می‌توانید به صفحه گزارش‌ها بروید و آمار واقعی را مشاهده کنید.');
}

main()
  .catch((e) => {
    console.error('❌ خطا در seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
