/* runner: reads scripts/posts.ndjson and inserts 50 posts.
 * اجرا: node scripts/reset-and-seed-50-posts.js
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Never wipe the database in production.
if (process.env.NODE_ENV === 'production') {
  console.error('❌ refusing to reset/seed in production (NODE_ENV=production)');
  process.exit(1);
}

const AUTHOR_ID = 'cm5qdrd3e0001m4zli12b2rd5';

// Source data lives in prisma/posts-data.js (array of post objects), not an
// ndjson file. Require it directly so `db:reset` works out of the box.
const POSTS = require(path.join(__dirname, '..', 'prisma', 'posts-data.js'));

function tipDoc(blocks) {
  return JSON.stringify({
    type: 'doc',
    content: blocks.map((b) => {
      if (b.t === 'h2') return { type: 'heading', attrs: { textAlign: null, level: 2, id: b.id }, content: [{ type: 'text', text: b.x }] };
      if (b.t === 'h3') return { type: 'heading', attrs: { textAlign: null, level: 3, id: b.id }, content: [{ type: 'text', text: b.x }] };
      if (b.t === 'p')  return { type: 'paragraph', attrs: { textAlign: null, dataEmpty: null }, content: [{ type: 'text', text: b.x }] };
      if (b.t === 'quote') return { type: 'blockquote', content: [{ type: 'paragraph', attrs: { textAlign: null, dataEmpty: null }, content: [{ type: 'text', text: b.x }] }] };
      if (b.t === 'li') return { type: 'bulletList', content: b.items.map((t) => ({ type: 'listItem', content: [{ type: 'paragraph', attrs: { textAlign: null, dataEmpty: null }, content: [{ type: 'text', text: t }] }] })) };
      return { type: 'paragraph', attrs: { textAlign: null, dataEmpty: null }, content: [{ type: 'text', text: '' }] };
    }),
  });
}

function slugify(s) {
  const map = {'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','ا':'a','ب':'b','پ':'p','ت':'t','ث':'s','ج':'j','چ':'ch','ح':'h','خ':'kh','د':'d','ذ':'z','ر':'r','ز':'z','ژ':'zh','س':'s','ش':'sh','ص':'s','ض':'z','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'gh','ک':'k','گ':'g','ل':'l','م':'m','ن':'n','و':'o','ه':'h','ی':'i','ئ':'i','ء':'','آ':'a','أ':'a','إ':'e','ة':'h','‌':'-'};
  return s.toLowerCase().split('').map((c) => (map[c] !== undefined ? map[c] : c)).join('').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

async function main() {
  console.log('🧹 حذف پست‌های قبلی...');
  await p.view.deleteMany({});
  await p.comment.deleteMany({});
  await p.like.deleteMany({});
  await p.savedPost.deleteMany({});
  const del = await p.post.deleteMany({});
  console.log(`   - ${del.count} پست حذف شد`);

  console.log('\n🌱 خواندن فایل داده...');
  const lines = POSTS.map((post) => JSON.stringify(post));
  console.log(`   - ${lines.length} پست در فایل یافت شد`);

  console.log('\n🌱 شروع درج...');
  const tagCache = new Map();
  async function getOrCreateTag(name) {
    if (tagCache.has(name)) return tagCache.get(name);
    const tagSlug = slugify(name);
    let tag = await p.tag.findUnique({ where: { slug: tagSlug } });
    if (!tag) tag = await p.tag.create({ data: { name, slug: tagSlug } });
    tagCache.set(name, tag);
    return tag;
  }

  let added = 0, failed = 0;
  for (let i = 0; i < lines.length; i++) {
    const post = JSON.parse(lines[i]);
    try {
      let baseSlug = slugify(post.title) || ('post-' + Date.now() + '-' + i);
      let uniqueSlug = baseSlug, counter = 1;
      while (await p.post.findUnique({ where: { slug: uniqueSlug } })) { uniqueSlug = baseSlug + '-' + counter; counter++; }

      const cats = await p.category.findMany({ where: { slug: { in: post.cats } } });
      if (cats.length === 0) { console.log('⚠️  [' + (i+1) + '] "' + post.title + '" - هیچ دسته‌ای پیدا نشد'); failed++; continue; }

      const tags = await Promise.all(post.tags.map((t) => getOrCreateTag(t)));

      const wordCount = post.blocks.reduce((acc, b) => {
        if (b.t === 'p' || b.t === 'h2' || b.t === 'h3' || b.t === 'quote') return acc + (b.x ? b.x.split(/\s+/).length : 0);
        if (b.t === 'li') return acc + b.items.reduce((a, t) => a + t.split(/\s+/).length, 0);
        return acc;
      }, 0);
      const readingTime = Math.max(1, Math.ceil(wordCount / 180));

      const data = {
        title: post.title,
        slug: uniqueSlug,
        excerpt: post.excerpt,
        content: tipDoc(post.blocks),
        featuredImage: post.image,
        status: 'PUBLISHED',
        postType: post.type || 'STANDARD',
        isFeatured: !!post.featured,
        viewCount: 0,
        readingTime,
        authorId: AUTHOR_ID,
        categories: { connect: cats.map((c) => ({ id: c.id })) },
        tags: { connect: tags.map((t) => ({ id: t.id })) },
      };
      if (post.type === 'VIDEO' && post.videoUrl) data.videoUrl = post.videoUrl;
      if (post.type === 'GALLERY' && Array.isArray(post.gallery)) data.galleryImages = post.gallery;
      if (post.type === 'AUDIO' && post.audioUrl) data.audioUrl = post.audioUrl;

      const created = await p.post.create({ data });
      console.log('✅ [' + (i+1) + '/50] ' + (created.postType || 'STANDARD').padEnd(8) + ' | ' + created.title.slice(0, 55));
      added++;
    } catch (err) {
      console.log('❌ [' + (i+1) + '] "' + post.title + '" - ' + err.message);
      failed++;
    }
  }

  console.log('\n📊 نتیجه: ' + added + ' اضافه شد، ' + failed + ' شکست');
  const total = await p.post.count();
  const byType = await p.post.groupBy({ by: ['postType'], _count: { _all: true } });
  const byFeat = await p.post.groupBy({ by: ['isFeatured'], _count: { _all: true } });
  console.log('\n📈 کل پست‌ها: ' + total);
  console.log('   بر اساس نوع: ' + byType.map((b) => b.postType + '=' + b._count._all).join(', '));
  console.log('   ویژه: ' + (byFeat.find((b) => b.isFeatured)?._count._all || 0) + ' | عادی: ' + (byFeat.find((b) => !b.isFeatured)?._count._all || 0));
}

main().catch((e) => { console.error('❌ خطای کلی:', e); process.exit(1); }).finally(async () => { await p.$disconnect(); });