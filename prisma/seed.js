/* prisma/seed.js
 * =============================================================
 * Database Seed کامل پروژه BlogMarketFinansial
 * =============================================================
 * این اسکریپت همه داده‌های نمونه مورد نیاز برای تست عملکرد
 * را در یک‌بار اجرا در دیتابیس درج می‌کند.
 *
 * ویژگی‌ها:
 *   - Idempotent: چندبار اجرا بشه مشکلی پیش نمیاد
 *   - Comprehensive: همه 22 مدل Prisma را پوشش می‌دهد
 *   - ترتیب وابستگی‌ها (foreign keys) رعایت شده
 *
 * اجرا:
 *   node prisma/seed.js
 *   یا
 *   npx prisma db seed
 * =============================================================
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

/* ─── helpers ─────────────────────────────────────────────────── */
function slugify(s) {
  const map = {
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
    'ا':'a','ب':'b','پ':'p','ت':'t','ث':'s','ج':'j','چ':'ch','ح':'h','خ':'kh','د':'d','ذ':'z','ر':'r','ز':'z','ژ':'zh','س':'s','ش':'sh','ص':'s','ض':'z','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'gh','ک':'k','گ':'g','ل':'l','م':'m','ن':'n','و':'o','ه':'h','ی':'i','ئ':'i','ء':'','آ':'a','أ':'a','إ':'e','ة':'h','‌':'-'
  };
  return s.toLowerCase().split('').map((c) => (map[c] !== undefined ? map[c] : c)).join('').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

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

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randIP() { return `${rand(1,255)}.${rand(0,255)}.${rand(0,255)}.${rand(0,255)}`; }
function daysAgo(n) { return new Date(Date.now() - n * 24 * 60 * 60 * 1000); }
function hoursAgo(n) { return new Date(Date.now() - n * 60 * 60 * 1000); }

/* ─── 1) SystemSettings (singleton) ──────────────────────────── */
async function seedSystemSettings() {
  const existingCount = await p.systemSettings.findFirst();
  if (existingCount) {
    console.log('   ⏭️  SystemSettings قبلاً وجود دارد');
    return existingCount;
  }
  const created = await p.systemSettings.create({
    data: {
      siteName: 'بازار مالی - وبلاگ تحلیل بازارهای مالی',
      siteDescription: 'مرجع تحلیل بازار طلا، ارز، رمزارز و بورس',
      maintenanceMode: false,
      cacheEnabled: true,
      smtpServer: 'smtp.resend.com',
      smtpPort: '465',
      smtpUsername: 'resend',
      telegram: 'https://t.me/blogmarket',
      instagram: 'https://instagram.com/blogmarket',
      whatsapp: 'https://wa.me/989120000000',
      twitter: 'https://twitter.com/blogmarket',
    },
  });
  console.log('   ✅ SystemSettings ایجاد شد');
  return created;
}

/* ─── 2) Users (نویسنده، ادمین، کاربر عادی) ──────────────────── */
async function seedUsers() {
  const password = await bcrypt.hash('Password123!', 10);
  const usersData = [
    { id: 'cm5qdrd3e0001m4zli12b2rd5', name: 'author',         email: 'author@gmail.com',       role: 'AUTHOR',      status: 'Active', image: 'https://i.pravatar.cc/150?img=12' },
    { id: 'cm5qnptpb0001v8tnms9kwp6j', name: 'biotak',         email: 'bioootak@gmail.com',     role: 'ADMIN',       status: 'Active', image: 'https://i.pravatar.cc/150?img=33' },
    { id: 'cm5kqiap00001ckmow11600x8', name: 'Admin',          email: 'Admin@gmail.com',        role: 'SUPER_ADMIN', status: 'Active', image: 'https://i.pravatar.cc/150?img=68' },
    { id: 'cmqcm407d0002vjpsihhfla61', name: 'تیم تحریریه',  email: 'author@blogmarket.local', role: 'AUTHOR',     status: 'Active', image: 'https://i.pravatar.cc/150?img=5'  },
  ];

  const created = [];
  for (const u of usersData) {
    const exists = await p.user.findUnique({ where: { id: u.id } });
    if (exists) { created.push(exists); continue; }
    const user = await p.user.create({ data: { ...u, password, emailVerified: daysAgo(rand(30, 300)) } });
    created.push(user);
  }

  // کاربران عادی برای تست
  const normalUsers = [
    { name: 'علی محمدی',     email: 'ali.m@test.ir',    role: 'USER' },
    { name: 'مریم احمدی',    email: 'maryam@test.ir',   role: 'USER' },
    { name: 'حسین رضایی',    email: 'hossein@test.ir',  role: 'USER' },
    { name: 'زهرا کریمی',    email: 'zahra@test.ir',    role: 'USER' },
    { name: 'محمد قاسمی',    email: 'mohammad@test.ir', role: 'USER' },
    { name: 'فاطمه نوری',    email: 'fateme@test.ir',   role: 'USER' },
    { name: 'رضا صادقی',     email: 'reza@test.ir',     role: 'USER' },
    { name: 'نگار حسینی',    email: 'negar@test.ir',    role: 'USER' },
  ];
  for (const u of normalUsers) {
    const exists = await p.user.findUnique({ where: { email: u.email } });
    if (exists) { created.push(exists); continue; }
    const user = await p.user.create({
      data: { ...u, password, status: 'Active', image: `https://i.pravatar.cc/150?img=${rand(1, 70)}`, emailVerified: daysAgo(rand(1, 200)) },
    });
    created.push(user);
  }
  console.log(`   ✅ ${created.length} کاربر (${created.filter((x) => x.role !== 'USER').length} تیم + ${created.filter((x) => x.role === 'USER').length} عادی)`);
  return created;
}

/* ─── 3) Profiles ───────────────────────────────────────────── */
async function seedProfiles(users) {
  const bios = [
    'تحلیلگر ارشد بازارهای مالی با ۱۰ سال تجربه در بازار طلا و ارز',
    'معامله‌گر حرفه‌ای رمزارز، تمرکز بر تحلیل تکنیکال',
    'کارشناس اقتصادی و مدرس دوره‌های سرمایه‌گذاری',
    'روزنامه‌نگار اقتصادی، پوشش خبری بازار سرمایه',
  ];
  const jobs = ['تحلیلگر ارشد', 'معامله‌گر', 'کارشناس اقتصادی', 'روزنامه‌نگار', 'مشاور سرمایه‌گذاری'];
  const companies = ['بازار مالی', 'صرافی آنلاین', 'کارگزاری بورس', 'بانک پاسارگاد', 'استارتاپ فینتک'];

  let count = 0;
  for (const user of users.slice(0, 6)) {
    const exists = await p.profile.findUnique({ where: { userId: user.id } });
    if (exists) continue;
    await p.profile.create({
      data: {
        userId: user.id,
        bio: pick(bios),
        avatar: user.image || `https://i.pravatar.cc/300?img=${rand(1, 70)}`,
        bgImage: `https://picsum.photos/seed/bg${user.id}/1200/400`,
        jobName: pick(jobs),
        company: pick(companies),
      },
    });
    count++;
  }
  console.log(`   ✅ ${count} پروفایل جدید ایجاد شد`);
}

/* ─── 4) Categories (۲۰ دسته) ──────────────────────────────── */
async function seedCategories() {
  const cats = [
    { name: 'بیت کوین', color: 'amber' },
    { name: 'اتریوم', color: 'indigo' },
    { name: 'تحلیل تکنیکال', color: 'cyan' },
    { name: 'سرمایه‌گذاری', color: 'emerald' },
    { name: 'صرافی ارز دیجیتال', color: 'blue' },
    { name: 'کیف پول', color: 'purple' },
    { name: 'NFT', color: 'pink' },
    { name: 'وب ۳', color: 'violet' },
    { name: 'قوانین ارز دیجیتال', color: 'slate' },
    { name: 'ماینینگ', color: 'amber' },
    { name: 'بازار جهانی', color: 'blue' },
    { name: 'قیمت لحظه‌ای', color: 'emerald' },
    { name: 'طلا', color: 'yellow' },
    { name: 'بورس', color: 'rose' },
    { name: 'ارز', color: 'green' },
    { name: 'ارزهای دیجیتال', color: 'sky' },
    { name: 'ارز دیجیتال', color: 'teal' },
    { name: 'اخبار', color: 'gray' },
    { name: 'اخبار فوری', color: 'red' },
    { name: 'تحلیل', color: 'orange' },
  ];
  let added = 0;
  for (const c of cats) {
    const exists = await p.category.findFirst({ where: { name: c.name } });
    if (exists) continue;
    const slug = slugify(c.name);
    let uniqueSlug = slug, counter = 1;
    while (await p.category.findUnique({ where: { slug: uniqueSlug } })) { uniqueSlug = `${slug}-${counter}`; counter++; }
    await p.category.create({ data: { name: c.name, slug: uniqueSlug } });
    added++;
  }
  console.log(`   ✅ ${added} دسته جدید اضافه شد`);
}

/* ─── 5) Tags (از روی پست‌ها استخراج می‌شود) ─────────────────── */
async function seedTags() {
  const tagNames = new Set();
  for (const post of POSTS_DATA) post.tags.forEach((t) => tagNames.add(t));
  let added = 0;
  for (const name of tagNames) {
    const slug = slugify(name);
    const exists = await p.tag.findUnique({ where: { slug } });
    if (exists) continue;
    await p.tag.create({ data: { name, slug } });
    added++;
  }
  console.log(`   ✅ ${added} تگ جدید اضافه شد`);
}

/* ─── 6) Posts (۵۰ پست متنوع) ──────────────────────────────── */
async function seedPosts() {
  const AUTHOR_ID = 'cm5qdrd3e0001m4zli12b2rd5';
  let added = 0, skipped = 0;
  for (let i = 0; i < POSTS_DATA.length; i++) {
    const post = POSTS_DATA[i];
    const exists = await p.post.findFirst({ where: { title: post.title } });
    if (exists) { skipped++; continue; }
    const baseSlug = slugify(post.title);
    let uniqueSlug = baseSlug, counter = 1;
    while (await p.post.findUnique({ where: { slug: uniqueSlug } })) { uniqueSlug = `${baseSlug}-${counter}`; counter++; }

    const cats = await p.category.findMany({ where: { slug: { in: post.cats } } });
    const tags = await p.tag.findMany({ where: { slug: { in: post.tags.map(slugify) } } });

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
      viewCount: rand(50, 3000),
      readingTime,
      authorId: AUTHOR_ID,
      createdAt: daysAgo(rand(1, 90)),
      categories: { connect: cats.map((c) => ({ id: c.id })) },
      tags: { connect: tags.map((t) => ({ id: t.id })) },
    };
    if (post.type === 'VIDEO' && post.videoUrl) data.videoUrl = post.videoUrl;
    if (post.type === 'GALLERY' && Array.isArray(post.gallery)) data.galleryImages = post.gallery;
    await p.post.create({ data });
    added++;
  }
  console.log(`   ✅ ${added} پست جدید، ${skipped} پست تکراری رد شد`);
}

/* ─── 7) Comments (با reply تو در تو) ────────────────────────── */
async function seedComments(users, posts) {
  const existingCount = await p.comment.count();
  if (existingCount >= 200) { console.log('   ⏭️  Comments قبلاً ایجاد شده (' + existingCount + ' عدد)'); return; }
  const normalUsers = users.filter((u) => u.role === 'USER');
  if (normalUsers.length === 0) { console.log('   ⚠️  کاربر عادی برای دیدگاه یافت نشد'); return; }
  const sampleComments = [
    'مقاله بسیار مفیدی بود، ممنون از تیم تحریریه.',
    'آیا منبع آماری که استفاده کردید رو هم معرفی می‌کنید؟',
    'با نظر شما موافقم، به‌خصوص در مورد تحلیل تکنیکال.',
    'تجربه شخصی من با این روش کاملاً متفاوت بود.',
    'لطفاً در مورد ریسک‌های این روش هم صحبت کنید.',
    'عالی! منتظر مقاله بعدی شما هستم.',
    'این تحلیل خیلی به‌درد من خورد، تشکر.',
    'سؤال: آیا این روش برای بازار ایران هم کار می‌کند؟',
    'نظر متفاوتی دارم، در ادامه توضیح می‌دم.',
    'خیلی ساده و روان توضیح دادید، سپاسگزارم.',
    'این اولین بار است که این مفهوم را این‌طور واضح می‌فهمم.',
    'لطفاً نمونه‌های واقعی بیشتری بررسی کنید.',
  ];
  const replies = [
    'ممنون از بازخورد شما.',
    'در مقاله بعدی به این موضوع می‌پردازم.',
    'دقیقاً، همین نکته خیلی مهمه.',
    'تجربیات شما همیشه ارزشمنده.',
    'موافقم، پیشنهاد خوبیه.',
  ];

  let added = 0;
  for (const post of posts.slice(0, 40)) {
    // هر پست ۲ تا ۸ دیدگاه
    const count = rand(2, 8);
    for (let i = 0; i < count; i++) {
      const author = pick(normalUsers);
      const parentExists = Math.random() > 0.7;
      const data = {
        content: pick(sampleComments),
        postId: post.id,
        authorId: author.id,
        approved: Math.random() > 0.15, // ۸۵٪ تأیید شده
        createdAt: daysAgo(rand(0, 60)),
      };
      const created = await p.comment.create({ data });
      added++;
      // ۲۵٪ شانس reply
      if (parentExists) {
        const replier = pick(normalUsers.filter((u) => u.id !== author.id));
        await p.comment.create({
          data: {
            content: pick(replies),
            postId: post.id,
            authorId: replier.id,
            parentId: created.id,
            approved: true,
            createdAt: daysAgo(rand(0, 30)),
          },
        });
        added++;
      }
    }
  }
  console.log(`   ✅ ${added} دیدگاه (با reply) ایجاد شد`);
}

/* ─── 8) Likes (پست و دیدگاه) ───────────────────────────────── */
async function seedLikes(users, posts) {
  const existingCount = await p.like.count();
  if (existingCount >= 100) { console.log('   ⏭️  Likes قبلاً ایجاد شده (' + existingCount + ' عدد)'); return; }
  const normalUsers = users.filter((u) => u.role === 'USER');
  let added = 0;
  // Like روی پست‌ها
  for (const post of posts) {
    const likers = [...normalUsers].sort(() => Math.random() - 0.5).slice(0, rand(0, 6));
    for (const user of likers) {
      const exists = await p.like.findFirst({ where: { userId: user.id, postId: post.id } });
      if (exists) continue;
      await p.like.create({ data: { userId: user.id, postId: post.id, createdAt: daysAgo(rand(0, 60)) } });
      added++;
    }
  }
  // Like روی دیدگاه‌ها
  const comments = await p.comment.findMany({ take: 100 });
  for (const c of comments) {
    if (Math.random() > 0.4) continue;
    const liker = pick(normalUsers);
    const exists = await p.like.findFirst({ where: { userId: liker.id, commentId: c.id } });
    if (exists) continue;
    await p.like.create({ data: { userId: liker.id, commentId: c.id, createdAt: daysAgo(rand(0, 30)) } });
    added++;
  }
  console.log(`   ✅ ${added} لایک ایجاد شد`);
}

/* ─── 9) Views (بازدید از پست‌ها) ───────────────────────────── */
async function seedViews(posts) {
  const existingCount = await p.view.count();
  if (existingCount >= 500) { console.log('   ⏭️  Views قبلاً ایجاد شده (' + existingCount + ' عدد)'); return; }
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101',
  ];
  let added = 0;
  for (const post of posts) {
    const count = rand(5, 40);
    for (let i = 0; i < count; i++) {
      await p.view.create({
        data: {
          postId: post.id,
          ip: randIP(),
          userAgent: pick(userAgents),
          createdAt: daysAgo(rand(0, 60)),
        },
      });
      added++;
    }
  }
  console.log(`   ✅ ${added} بازدید ثبت شد`);
}

/* ─── 10) SavedPosts (نشان‌شده‌ها) ──────────────────────────── */
async function seedSavedPosts(users, posts) {
  const existingCount = await p.savedPost.count();
  if (existingCount >= 30) { console.log('   ⏭️  SavedPosts قبلاً ایجاد شده (' + existingCount + ' عدد)'); return; }
  const normalUsers = users.filter((u) => u.role === 'USER');
  let added = 0;
  for (const user of normalUsers) {
    const count = rand(1, 8);
    const shuffled = [...posts].sort(() => Math.random() - 0.5).slice(0, count);
    for (const post of shuffled) {
      const exists = await p.savedPost.findUnique({
        where: { userId_postId: { userId: user.id, postId: post.id } },
      });
      if (exists) continue;
      await p.savedPost.create({ data: { userId: user.id, postId: post.id, createdAt: daysAgo(rand(0, 30)) } });
      added++;
    }
  }
  console.log(`   ✅ ${added} پست ذخیره‌شده`);
}

/* ─── 11) Notifications ─────────────────────────────────────── */
async function seedNotifications(users) {
  const existingCount = await p.notification.count();
  if (existingCount >= 30) { console.log('   ⏭️  Notifications قبلاً ایجاد شده (' + existingCount + ' عدد)'); return; }
  const normalUsers = users.filter((u) => u.role === 'USER');
  const samples = [
    'پاسخ به دیدگاه شما توسط {user} ارسال شد.',
    '{user} مقاله شما را پسندید.',
    'مقاله جدیدی در دسته {cat} منتشر شد.',
    'خبر فوری: {user} به شما پیام داد.',
    'دیدگاه شما توسط مدیر تأیید شد.',
    'پست ذخیره‌شده شما به‌روزرسانی شد.',
    'پاسخ جدید در گفتگوی شما',
  ];
  let added = 0;
  for (const user of normalUsers) {
    const count = rand(2, 6);
    for (let i = 0; i < count; i++) {
      const tpl = pick(samples);
      await p.notification.create({
        data: {
          userId: user.id,
          message: tpl.replace('{user}', pick(users).name || 'کاربر').replace('{cat}', pick(['طلا', 'بیت‌کوین', 'بورس'])),
          createdAt: daysAgo(rand(0, 30)),
        },
      });
      added++;
    }
  }
  console.log(`   ✅ ${added} اعلان`);
}

/* ─── 12) ActivityLog + Activity ───────────────────────────── */
async function seedActivityLogs(users) {
  const existingCount = await p.activityLog.count();
  if (existingCount >= 100) { console.log('   ⏭️  ActivityLogs قبلاً ایجاد شده (' + existingCount + ' عدد)'); return; }
  const actions = ['LOGIN', 'POST_VIEW', 'POST_LIKE', 'COMMENT_ADD', 'PROFILE_UPDATE', 'POST_CREATE', 'PASSWORD_CHANGE'];
  let added = 0;
  for (const user of users) {
    const count = rand(5, 15);
    for (let i = 0; i < count; i++) {
      const action = pick(actions);
      await p.activityLog.create({
        data: {
          userId: user.id,
          action,
          details: `کاربر ${action} را انجام داد`,
          createdAt: daysAgo(rand(0, 60)),
        },
      });
      // Activity مدل هم پر کنیم
      await p.activity.create({
        data: {
          userId: user.id,
          action,
          details: `فعالیت: ${action}`,
          createdAt: daysAgo(rand(0, 60)),
        },
      });
      added++;
    }
  }
  console.log(`   ✅ ${added} لاگ فعالیت`);
}

/* ─── 13) Newsletters ──────────────────────────────────────── */
async function seedNewsletters() {
  const existingCount = await p.newsletter.count();
  if (existingCount >= 5) { console.log('   ⏭️  Newsletters قبلاً ایجاد شده (' + existingCount + ' عدد)'); return; }
  const emails = ['investor1@gmail.com', 'trader2@yahoo.com', 'crypto.fan@outlook.com', 'gold.lover@gmail.com', 'stock.pro@protonmail.com'];
  let added = 0;
  for (const email of emails) {
    const exists = await p.newsletter.findUnique({ where: { email } });
    if (exists) continue;
    await p.newsletter.create({ data: { email, isActive: true, createdAt: daysAgo(rand(30, 200)) } });
    added++;
  }
  console.log(`   ✅ ${added} عضو خبرنامه`);
}

/* ─── 14) SocialLinks ──────────────────────────────────────── */
async function seedSocialLinks() {
  const links = [
    { name: 'Telegram', url: 'https://t.me/blogmarket', icon: 'FaTelegram', color: '#0088cc', type: 'SOCIAL', order: 1 },
    { name: 'Instagram', url: 'https://instagram.com/blogmarket', icon: 'FaInstagram', color: '#E4405F', type: 'SOCIAL', order: 2 },
    { name: 'Twitter', url: 'https://twitter.com/blogmarket', icon: 'FaTwitter', color: '#1DA1F2', type: 'SOCIAL', order: 3 },
    { name: 'WhatsApp', url: 'https://wa.me/989120000000', icon: 'FaWhatsapp', color: '#25D366', type: 'SUPPORT', order: 1 },
    { name: 'YouTube', url: 'https://youtube.com/@blogmarket', icon: 'FaYoutube', color: '#FF0000', type: 'SOCIAL', order: 4 },
    { name: 'LinkedIn', url: 'https://linkedin.com/company/blogmarket', icon: 'FaLinkedin', color: '#0A66C2', type: 'SOCIAL', order: 5 },
  ];
  let added = 0;
  for (const l of links) {
    const exists = await p.socialLink.findFirst({ where: { name: l.name } });
    if (exists) continue;
    await p.socialLink.create({ data: l });
    added++;
  }
  console.log(`   ✅ ${added} لینک اجتماعی`);
}

/* ─── 15) RateLists (نرخ ارز و طلا) ─────────────────────────── */
async function seedRateLists() {
  const lists = [
    { title: 'نرخ لحظه‌ای طلا و سکه', rates: [
      { title: 'طلای ۱۸ عیار', value: '۴٬۲۵۰٬۰۰۰' },
      { title: 'طلای ۲۴ عیار', value: '۵٬۶۶۰٬۰۰۰' },
      { title: 'سکه طرح جدید', value: '۲۸٬۵۰۰٬۰۰۰' },
      { title: 'نیم سکه', value: '۱۴٬۵۰۰٬۰۰۰' },
      { title: 'ربع سکه', value: '۷٬۸۰۰٬۰۰۰' },
      { title: 'سکه گرمی', value: '۴٬۲۰۰٬۰۰۰' },
      { title: 'اونس جهانی', value: '۲٬۳۴۵$' },
    ]},
    { title: 'نرخ ارزهای اصلی', rates: [
      { title: 'دلار آمریکا', value: '۶۸٬۵۰۰' },
      { title: 'یورو', value: '۷۲٬۸۰۰' },
      { title: 'پوند انگلیس', value: '۸۵٬۳۰۰' },
      { title: 'درهم امارات', value: '۱۸٬۶۵۰' },
      { title: 'لیر ترکیه', value: '۲٬۱۰۰' },
      { title: 'بیت‌کوین', value: '۶۷٬۸۹۰$' },
      { title: 'اتریوم', value: '۳٬۴۵۰$' },
    ]},
    { title: 'شاخص‌های بورس', rates: [
      { title: 'شاخص کل', value: '۲٬۰۴۵٬۸۹۰' },
      { title: 'شاخص هم‌وزن', value: '۷۲۰٬۴۵۰' },
      { title: 'شاخص قیمت', value: '۱۶۵٬۲۳۰' },
      { title: 'ارزش معاملات', value: '۸٬۲۰۰ میلیارد' },
      { title: 'حجم معاملات', value: '۲٫۸ میلیارد' },
      { title: 'P/E بازار', value: '۶٫۲' },
    ]},
  ];
  let added = 0;
  for (const l of lists) {
    const exists = await p.rateList.findFirst({ where: { title: l.title } });
    if (exists) continue;
    await p.rateList.create({ data: l });
    added++;
  }
  console.log(`   ✅ ${added} لیست نرخ`);
}

/* ─── 16) ServiceRequests (درخواست خدمات) ───────────────────── */
async function seedServiceRequests() {
  const names = ['علی موسوی', 'مریم صادقی', 'حسین نوری', 'زهرا رضایی', 'محمد احمدی', 'فاطمه کریمی', 'رضا مرادی', 'نگار حسینی'];
  const services = ['INTERNATIONAL_TRANSFER', 'ONLINE_PAYMENT', 'TUITION_PAYMENT', 'FREELANCE_INCOME', 'SOFTWARE_PURCHASE', 'OTHER'];
  const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED'];
  const currencies = ['USD', 'EUR', 'GBP', 'AED', 'CAD'];
  const urgencies = ['NORMAL', 'NORMAL', 'NORMAL', 'URGENT'];
  const methods = ['telegram', 'whatsapp'];

  let added = 0;
  for (let i = 0; i < 12; i++) {
    const name = pick(names);
    const phone = `09${rand(100000000, 999999999)}`;
    const code = `TRK-${Date.now().toString().slice(-6)}-${i}`;
    const exists = await p.serviceRequest.findUnique({ where: { trackingCode: code } });
    if (exists) continue;
    await p.serviceRequest.create({
      data: {
        trackingCode: code,
        fullName: name,
        phone,
        email: Math.random() > 0.3 ? `${name.replace(' ', '.').toLowerCase()}@test.ir` : null,
        serviceType: pick(services),
        amount: String(rand(100, 50000)),
        currency: pick(currencies),
        description: 'درخواست تستی برای بررسی عملکرد سیستم',
        urgency: pick(urgencies),
        contactMethod: pick(methods),
        status: pick(statuses),
        adminNotes: Math.random() > 0.6 ? 'بررسی شد، منتظر پرداخت هستیم' : null,
        createdAt: daysAgo(rand(0, 60)),
      },
    });
    added++;
  }
  console.log(`   ✅ ${added} درخواست خدمات`);
}

/* ─── 17) SystemLogs ────────────────────────────────────────── */
async function seedSystemLogs() {
  const existingCount = await p.systemLog.count();
  if (existingCount >= 20) { console.log('   ⏭️  SystemLogs قبلاً ایجاد شده (' + existingCount + ' عدد)'); return; }
  const levels = ['INFO', 'INFO', 'INFO', 'WARNING', 'ERROR'];
  const sources = ['api/auth', 'api/posts', 'api/payment', 'cron/rates', 'middleware', 'cache'];
  const messages = [
    'درخواست ورود موفق',
    'پست جدید ایجاد شد',
    'خطای اتصال به دروازه پرداخت',
    'نرخ‌های ارز به‌روزرسانی شد',
    'کش Redis بازسازی شد',
    'هشدار: ترافیک غیرعادی',
    'Timeout در درخواست API',
    'پشتیبان‌گیری روزانه تکمیل شد',
  ];
  let added = 0;
  for (let i = 0; i < 25; i++) {
    await p.systemLog.create({
      data: {
        level: pick(levels),
        source: pick(sources),
        message: pick(messages),
        timestamp: hoursAgo(rand(1, 240)),
      },
    });
    added++;
  }
  console.log(`   ✅ ${added} لاگ سیستم`);
}

/* ─── 18) PageViews (آمار بازدید صفحات) ─────────────────────── */
async function seedPageViews() {
  const pages = ['/', '/blog', '/about', '/contact', '/services', '/gold', '/crypto', '/stocks'];
  let added = 0;
  for (let i = 0; i < pages.length; i++) {
    const exists = await p.pageView.findUnique({ where: { page: pages[i] } });
    if (exists) continue;
    await p.pageView.create({
      data: {
        page: pages[i],
        views: rand(500, 8000),
        date: daysAgo(rand(0, 7)),
      },
    });
    added++;
  }
  console.log(`   ✅ ${added} آمار بازدید صفحه`);
}

/* ─── 19) CurrencyPatterns ─────────────────────────────────── */
async function seedCurrencyPatterns() {
  const patterns = [
    { type: 'currency', pattern: 'تومان' },
    { type: 'currency', pattern: 'ریال' },
    { type: 'currency', pattern: 'دلار' },
    { type: 'currency', pattern: 'یورو' },
    { type: 'currency', pattern: 'پوند' },
    { type: 'format', pattern: 'fa-IR' },
    { type: 'format', pattern: 'en-US' },
    { type: 'prefix', pattern: '﷼' },
    { type: 'prefix', pattern: '$' },
    { type: 'prefix', pattern: '€' },
    { type: 'prefix', pattern: '£' },
    { type: 'suffix', pattern: ' تومان' },
    { type: 'suffix', pattern: ' دلار' },
    { type: 'separator', pattern: '/' },
    { type: 'separator', pattern: ',' },
    { type: 'multiplier', pattern: 'تومان', value: 1 },
    { type: 'multiplier', pattern: 'ریال', value: 0.1 },
    { type: 'multiplier', pattern: 'هزار تومان', value: 1000 },
    { type: 'multiplier', pattern: 'میلیون تومان', value: 1000000 },
    { type: 'multiplier', pattern: 'میلیارد تومان', value: 1000000000 },
  ];
  let added = 0;
  for (const cp of patterns) {
    const exists = await p.currencyPattern.findUnique({
      where: { type_pattern: { type: cp.type, pattern: cp.pattern } },
    });
    if (exists) continue;
    await p.currencyPattern.create({ data: cp });
    added++;
  }
  console.log(`   ✅ ${added} الگوی ارزی`);
}

/* ─── 20) Accounts (OAuth providers) ────────────────────────── */
async function seedAccounts(users) {
  const existingCount = await p.account.count();
  if (existingCount >= 1) { console.log('   ⏭️  Account قبلاً ایجاد شده (' + existingCount + ' عدد)'); return; }

  const providers = [
    { provider: 'google', providerAccountId: 'google-123456' },
    { provider: 'github', providerAccountId: 'github-789012' },
  ];
  let added = 0;
  for (let i = 0; i < providers.length; i++) {
    await p.account.create({
      data: {
        userId: users[i].id,
        type: 'oauth',
        ...providers[i],
        access_token: 'mock_access_' + Math.random().toString(36).slice(2),
        refresh_token: 'mock_refresh_' + Math.random().toString(36).slice(2),
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      },
    });
    added++;
  }
  console.log(`   ✅ ${added} اکانت OAuth`);
}

/* ─── 50 Posts Data (shared) ────────────────────────────────── */
const POSTS_DATA = require('./posts-data.js');

/* ─── main: اجرای ترتیبی seed ───────────────────────────────── */
async function main() {
  console.log('🌱 شروع Seed کامل دیتابیس BlogMarketFinansial\n');

  console.log('1️⃣  SystemSettings:');
  await seedSystemSettings();

  console.log('\n2️⃣  Users:');
  const users = await seedUsers();

  console.log('\n3️⃣  Profiles:');
  await seedProfiles(users);

  console.log('\n4️⃣  Categories:');
  await seedCategories();

  console.log('\n5️⃣  Tags:');
  await seedTags();

  console.log('\n6️⃣  Posts:');
  await seedPosts();
  const posts = await p.post.findMany();

  console.log('\n7️⃣  Comments:');
  await seedComments(users, posts);

  console.log('\n8️⃣  Likes:');
  await seedLikes(users, posts);

  console.log('\n9️⃣  Views:');
  await seedViews(posts);

  console.log('\n🔟  SavedPosts:');
  await seedSavedPosts(users, posts);

  console.log('\n1️⃣1️⃣  Notifications:');
  await seedNotifications(users);

  console.log('\n1️⃣2️⃣  ActivityLogs + Activities:');
  await seedActivityLogs(users);

  console.log('\n1️⃣3️⃣  Newsletters:');
  await seedNewsletters();

  console.log('\n1️⃣4️⃣  SocialLinks:');
  await seedSocialLinks();

  console.log('\n1️⃣5️⃣  RateLists:');
  await seedRateLists();

  console.log('\n1️⃣6️⃣  ServiceRequests:');
  await seedServiceRequests();

  console.log('\n1️⃣7️⃣  SystemLogs:');
  await seedSystemLogs();

  console.log('\n1️⃣8️⃣  PageViews:');
  await seedPageViews();

  console.log('\n1️⃣9️⃣  CurrencyPatterns:');
  await seedCurrencyPatterns();

  console.log('\n2️⃣0️⃣  Accounts:');
  await seedAccounts(users);

  /* ─── گزارش نهایی ─── */
  const stats = {
    users: await p.user.count(),
    posts: await p.post.count(),
    categories: await p.category.count(),
    tags: await p.tag.count(),
    comments: await p.comment.count(),
    likes: await p.like.count(),
    views: await p.view.count(),
    savedPosts: await p.savedPost.count(),
    notifications: await p.notification.count(),
    profiles: await p.profile.count(),
    activityLogs: await p.activityLog.count(),
    activities: await p.activity.count(),
    newsletters: await p.newsletter.count(),
    socialLinks: await p.socialLink.count(),
    rateLists: await p.rateList.count(),
    serviceRequests: await p.serviceRequest.count(),
    systemLogs: await p.systemLog.count(),
    pageViews: await p.pageView.count(),
    currencyPatterns: await p.currencyPattern.count(),
    accounts: await p.account.count(),
  };
  console.log('\n' + '═'.repeat(50));
  console.log('📊 آمار نهایی دیتابیس:');
  Object.entries(stats).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log('   ' + k.padEnd(20) + ': ' + v.toString().padStart(6));
  });
  console.log('═'.repeat(50));
  console.log('\n✨ Seed کامل با موفقیت تمام شد!');
}

main()
  .catch((e) => { console.error('\n❌ خطای کلی:', e); process.exit(1); })
  .finally(async () => { await p.$disconnect(); });
