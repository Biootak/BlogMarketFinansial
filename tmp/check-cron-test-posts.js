const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const crons = await p.post.findMany({
    where: { title: { contains: '[CRON-TEST]' } },
    select: { id: true, title: true, status: true, scheduledAt: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log('Found CRON-TEST posts:', crons.length);
  crons.forEach((c) => {
    const when = c.scheduledAt ? c.scheduledAt.toISOString() : 'null';
    console.log(`- ${c.status.padEnd(9)} scheduled=${when}  ${c.title.substring(0, 70)}`);
  });
  await p.$disconnect();
})();
