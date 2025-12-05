import db from '@/lib/db';
import { calculateReadingTime } from '@/lib/readingTime';

/**
 * Update reading times for all existing posts
 * به‌روزرسانی زمان مطالعه برای تمام پست‌های موجود
 * 
 * Usage: npx tsx scripts/update-reading-times.ts
 */

async function updateReadingTimes() {
  console.log('🔄 Starting reading time update...\n');

  try {
    // دریافت تمام پست‌ها
    const posts = await db.post.findMany({
      select: {
        id: true,
        title: true,
        content: true,
        readingTime: true,
      },
    });

    console.log(`📚 Found ${posts.length} posts\n`);

    let updated = 0;
    let skipped = 0;

    for (const post of posts) {
      const newReadingTime = calculateReadingTime(post.content);

      if (post.readingTime !== newReadingTime) {
        await db.post.update({
          where: { id: post.id },
          data: { readingTime: newReadingTime },
        });

        console.log(`✅ Updated: ${post.title}`);
        console.log(`   ${post.readingTime} min → ${newReadingTime} min`);
        updated++;
      } else {
        console.log(`⏭️  Skipped: ${post.title} (already ${post.readingTime} min)`);
        skipped++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total posts: ${posts.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('\n✅ Reading time update completed!');
  } catch (error) {
    console.error('❌ Error updating reading times:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    await db.$disconnect();
  }
}

updateReadingTimes();
