import db from '@/lib/db';

/**
 * Debug script for view tracking
 * اسکریپت دیباگ برای بررسی سیستم ثبت بازدید
 * 
 * Usage: npx tsx scripts/debug-view-tracking.ts
 */

async function debugViewTracking() {
  console.log('🔍 Starting view tracking debug...\n');

  try {
    // 1. بررسی اتصال دیتابیس
    console.log('1️⃣ Checking database connection...');
    await db.$queryRaw`SELECT 1`;
    console.log('✅ Database connected\n');

    // 2. بررسی وجود پست‌ها
    console.log('2️⃣ Checking posts...');
    const posts = await db.post.findMany({
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (posts.length === 0) {
      console.log('❌ No posts found in database');
      return;
    }

    console.log(`✅ Found ${posts.length} posts:`);
    for (const post of posts) {
      console.log(`   - ${post.title} (${post.slug})`);
      console.log(`     ID: ${post.id}`);
      console.log(`     Status: ${post.status}`);
      console.log(`     Views: ${post.viewCount}`);
    }
    console.log('');

    // 3. بررسی جدول View
    console.log('3️⃣ Checking View table...');
    const viewCount = await db.view.count();
    console.log(`✅ View table has ${viewCount} records\n`);

    if (viewCount > 0) {
      const recentViews = await db.view.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            select: { title: true },
          },
        },
      });

      console.log('Recent views:');
      for (const view of recentViews) {
        console.log(`   - ${view.post.title}`);
        console.log(`     IP: ${view.ip}`);
        console.log(`     Time: ${view.createdAt.toLocaleString()}`);
      }
      console.log('');
    }

    // 4. تست ثبت بازدید
    console.log('4️⃣ Testing view tracking...');
    const testPost = posts[0];
    console.log(`Testing with post: ${testPost.title}`);
    console.log(`Current viewCount: ${testPost.viewCount}`);

    // ثبت بازدید تست
    const view = await db.view.create({
      data: {
        postId: testPost.id,
        ip: 'test-debug-script',
        userAgent: 'debug-script',
      },
    });

    console.log(`✅ View record created: ${view.id}`);

    // افزایش viewCount
    const updatedPost = await db.post.update({
      where: { id: testPost.id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      select: { viewCount: true },
    });

    console.log(`✅ Post viewCount updated: ${testPost.viewCount} → ${updatedPost.viewCount}`);
    console.log('');

    // 5. خلاصه نهایی
    console.log('📊 Summary:');
    console.log(`   Total posts: ${posts.length}`);
    console.log(`   Total views in View table: ${viewCount + 1}`);
    console.log(`   Test post URL: http://localhost:3000/single/${testPost.slug}`);
    console.log(`   Test API: http://localhost:3000/api/test-view-tracking?postId=${testPost.id}`);
    console.log('');

    console.log('✅ All checks passed! View tracking should work.');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Visit the test post URL in your browser');
    console.log('   2. Open browser console (F12)');
    console.log('   3. Look for ViewTracker logs');
    console.log('   4. Wait 2 seconds');
    console.log('   5. Check if viewCount increased');
  } catch (error) {
    console.error('❌ Error during debug:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    await db.$disconnect();
  }
}

debugViewTracking();
