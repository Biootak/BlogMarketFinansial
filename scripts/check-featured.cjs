const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.post.findMany({
    where: { status: 'PUBLISHED', isFeatured: true },
    select: { id: true, title: true, slug: true, featuredImage: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  console.log(JSON.stringify(r, null, 2));
  await p['\']();
})().catch(e => { console.error(e); process.exit(1); });
