const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const cats = await p.category.findMany({ select: { slug: true, name: true } });
  console.log('CATEGORIES:', JSON.stringify(cats, null, 2));
  const tags = await p.tag.findMany({ select: { slug: true, name: true }, take: 10 });
  console.log('TAGS (first 10):', JSON.stringify(tags, null, 2));
  await p.$disconnect();
})();