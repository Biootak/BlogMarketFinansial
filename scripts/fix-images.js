const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const replacements = [
  {
    match: { titleContains: 'دینجر' },
    image: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=1600&q=80&auto=format&fit=crop',
  },
  {
    match: { titleContains: 'معرفی ارزهای دیجیتال' },
    image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=1600&q=80&auto=format&fit=crop',
  },
  {
    match: { titleContains: 'کدام کشور شما را بیشتر' },
    // The slug-based match: only the duplicate one (older, still references Liara)
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&q=80&auto=format&fit=crop',
  },
];

(async () => {
  let updated = 0;
  for (const r of replacements) {
    // For "کدام کشور" there are two posts. Update only the one whose image still references Liara.
    const where = { featuredImage: { contains: 'liara.space' } };
    if (r.match.titleContains) where.title = { contains: r.match.titleContains };
    const targets = await p.post.findMany({ where, select: { id: true, title: true, featuredImage: true } });
    for (const t of targets) {
      await p.post.update({ where: { id: t.id }, data: { featuredImage: r.image } });
      console.log('✅ ' + t.title);
      console.log('   was: ' + t.featuredImage);
      console.log('   now: ' + r.image);
      updated++;
    }
  }
  console.log('\nTotal updated: ' + updated);
  await p.$disconnect();
})();