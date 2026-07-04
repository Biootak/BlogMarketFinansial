const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const posts = await p.post.findMany({
    where: { title: { contains: '[CRON-TEST]' } },
    select: { id: true, title: true, status: true, scheduledAt: true, updatedAt: true },
    orderBy: { scheduledAt: 'asc' },
  });
  console.log('Total CRON-TEST posts:', posts.length);
  for (const post of posts) {
    console.log(`  [${post.status.padEnd(9)}] scheduledAt=${post.scheduledAt?.toISOString()} — ${post.title}`);
  }
  await p.$disconnect();
})();