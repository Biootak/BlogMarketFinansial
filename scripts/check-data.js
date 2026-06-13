const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const cats = await p.category.findMany({ include: { _count: { select: { posts: true } } } });
  const posts = await p.post.findMany({ take: 10, select: { id: true, title: true, categories: { select: { name: true } } } });
  console.log('Categories with post counts:');
  cats.forEach(c => console.log('  ' + c.name + ': ' + c._count.posts + ' posts'));
  console.log('\nTotal categories: ' + cats.length);
  console.log('First 5 posts:');
  posts.forEach(p => console.log('  - ' + p.title + ' [' + p.categories.map(c => c.name).join(', ') + ']'));
  await p.$disconnect();
})();
