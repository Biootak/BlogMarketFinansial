const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const replacements = [
  {
    match: { titleContains: 'دینجر' },
    image:
      'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=1600&q=80&auto=format&fit=crop',
  },
  {
    match: { titleContains: 'معرفی ارزهای دیجیتال' },
    image:
      'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=1600&q=80&auto=format&fit=crop',
  },
  {
    match: { titleContains: 'کدام کشور شما را بیشتر' },
    // The slug-based match: only the duplicate one (older, still references the old bucket)
    image:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&q=80&auto=format&fit=crop',
  },
  // 2026-06-22: photo-1601933470928-c4b1c5b4b1f5 is a dead Unsplash ID
  // (returns 404, breaks next/image). Same image was reused for two
  // unrelated posts; replace each with a topic-appropriate one.
  {
    match: {
      titleContains: 'طلا یا سهام',
      featuredImageContains: '1601933470928-c4b1c5b4b1f5',
    },
    image:
      'https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?w=1600&q=80&auto=format&fit=crop',
  },
  {
    match: {
      titleContains: 'نمودار قیمت مس',
      featuredImageContains: '1601933470928-c4b1c5b4b1f5',
    },
    image:
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&q=80&auto=format&fit=crop',
  },
];

(async () => {
  let updated = 0;
  for (const r of replacements) {
    // For "کدام کشور" there are two posts. Update only the one whose image still references the old bucket.
    const where = {};
    if (r.match.titleContains) where.title = { contains: r.match.titleContains };
    if (r.match.featuredImageContains) {
      where.featuredImage = { contains: r.match.featuredImageContains };
    } else if (r.match.titleContains === 'کدام کشور شما را بیشتر') {
      where.featuredImage = { contains: 'liara.space' };
    }
    const targets = await p.post.findMany({
      where,
      select: { id: true, title: true, featuredImage: true },
    });
    for (const t of targets) {
      await p.post.update({ where: { id: t.id }, data: { featuredImage: r.image } });
      console.log(`✅ ${t.title}`);
      console.log(`   was: ${t.featuredImage}`);
      console.log(`   now: ${r.image}`);
      updated++;
    }
  }
  console.log(`\nTotal updated: ${updated}`);
  await p.$disconnect();
})();
