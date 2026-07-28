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
 *   - رمز مالک (OWNER) از env خوانده می‌شود؛ در غیر این صورت تصادفی تولید و چاپ می‌شود
 *
 * متغیرهای محیطی:
 *   SEED_OWNER_EMAIL    (اختیاری) — پیش‌فرض Admin@gmail.com
 *   SEED_OWNER_PASSWORD (اختیاری) — اگر تنظیم نشود، یک رمز تصادفی قوی چاپ می‌شود
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
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
    ا: 'a',
    ب: 'b',
    پ: 'p',
    ت: 't',
    ث: 's',
    ج: 'j',
    چ: 'ch',
    ح: 'h',
    خ: 'kh',
    د: 'd',
    ذ: 'z',
    ر: 'r',
    ز: 'z',
    ژ: 'zh',
    س: 's',
    ش: 'sh',
    ص: 's',
    ض: 'z',
    ط: 't',
    ظ: 'z',
    ع: 'a',
    غ: 'gh',
    ف: 'f',
    ق: 'gh',
    ک: 'k',
    گ: 'g',
    ل: 'l',
    م: 'm',
    ن: 'n',
    و: 'o',
    ه: 'h',
    ی: 'i',
    ئ: 'i',
    ء: '',
    آ: 'a',
    أ: 'a',
    إ: 'e',
    ة: 'h',
    '‌': '-',
  };
  return s
    .toLowerCase()
    .split('')
    .map((c) => (map[c] !== undefined ? map[c] : c))
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function tipDoc(blocks) {
  return JSON.stringify({
    type: 'doc',
    content: blocks.map((b) => {
      if (b.t === 'h2')
        return {
          type: 'heading',
          attrs: { textAlign: null, level: 2, id: b.id },
          content: [{ type: 'text', text: b.x }],
        };
      if (b.t === 'h3')
        return {
          type: 'heading',
          attrs: { textAlign: null, level: 3, id: b.id },
          content: [{ type: 'text', text: b.x }],
        };
      if (b.t === 'p')
        return {
          type: 'paragraph',
          attrs: { textAlign: null, dataEmpty: null },
          content: [{ type: 'text', text: b.x }],
        };
      if (b.t === 'quote')
        return {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              attrs: { textAlign: null, dataEmpty: null },
              content: [{ type: 'text', text: b.x }],
            },
          ],
        };
      if (b.t === 'li')
        return {
          type: 'bulletList',
          content: b.items.map((t) => ({
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                attrs: { textAlign: null, dataEmpty: null },
                content: [{ type: 'text', text: t }],
              },
            ],
          })),
        };
      return {
        type: 'paragraph',
        attrs: { textAlign: null, dataEmpty: null },
        content: [{ type: 'text', text: '' }],
      };
    }),
  });
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randIP() {
  return `${rand(1, 255)}.${rand(0, 255)}.${rand(0, 255)}.${rand(0, 255)}`;
}
function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function hoursAgo(n) {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

/* ─── seed credential helpers ────────────────────────────────── */
let seededOwner = null; // { email, password, source } فقط در صورت ایجاد جدید پر می‌شود

function generatePassword(length = 16) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = upper + lower + digits + special;
  const password = [pick(upper), pick(lower), pick(digits), pick(special)];
  for (let i = password.length; i < length; i++) password.push(pick(all));
  return password.sort(() => Math.random() - 0.5).join('');
}

/* ─── 1) SystemSettings (singleton) ──────────────────────────── */
async function seedSystemSettings() {
  const existingCount = await p.systemSettings.findFirst();
  if (existingCount) {
    console.log('   ⏭️  SystemSettings قبلاً وجود دارد');
    return existingCount;
  }
  const created = await p.systemSettings.create({
    data: {
      siteName: 'Financial Market',
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
  const samplePassword = await bcrypt.hash('Password123!', 10);

  // مالک (OWNER): رمز از env خوانده می‌شود؛ در غیر این صورت تصادفی تولید و چاپ می‌شود
  const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim() || 'Admin@gmail.com';
  const ownerPasswordFromEnv = process.env.SEED_OWNER_PASSWORD;
  const ownerPassword = ownerPasswordFromEnv || generatePassword(16);
  const ownerPasswordHash = await bcrypt.hash(ownerPassword, 10);

  const usersData = [
    {
      id: 'cm5qdrd3e0001m4zli12b2rd5',
      name: 'author',
      email: 'author@gmail.com',
      role: 'AUTHOR',
      status: 'Active',
      image: 'https://i.pravatar.cc/150?img=12',
    },
    {
      id: 'cm5qnptpb0001v8tnms9kwp6j',
      name: 'biotak',
      email: 'bioootak@gmail.com',
      role: 'ADMIN',
      status: 'Active',
      image: 'https://i.pravatar.cc/150?img=33',
    },
    {
      id: 'cm5kqiap00001ckmow11600x8',
      name: 'مالک',
      email: ownerEmail,
      role: 'OWNER',
      status: 'Active',
      image: 'https://i.pravatar.cc/150?img=68',
    },
    {
      id: 'cmqcm407d0002vjpsihhfla61',
      name: 'تیم تحریریه',
      email: 'author@blogmarket.local',
      role: 'AUTHOR',
      status: 'Active',
      image: 'https://i.pravatar.cc/150?img=5',
    },
  ];

  const created = [];
  for (const u of usersData) {
    const exists = await p.user.findUnique({ where: { id: u.id } });
    if (exists) {
      created.push(exists);
      if (u.role === 'OWNER' && exists.email === ownerEmail) {
        console.log('   ⏭️  مالک (OWNER) قبلاً وجود دارد؛ رمز عبور تغییر نکرد');
      }
      continue;
    }
    const isOwner = u.role === 'OWNER';
    const password = isOwner ? ownerPasswordHash : samplePassword;
    const user = await p.user.create({
      data: { ...u, password, emailVerified: daysAgo(rand(30, 300)) },
    });
    created.push(user);

    if (isOwner) {
      seededOwner = {
        email: u.email,
        password: ownerPassword,
        source: ownerPasswordFromEnv ? 'env' : 'generated',
      };
    }
  }

  // کاربران عادی برای تست
  const normalUsers = [
    { name: 'علی محمدی', email: 'ali.m@test.ir', role: 'USER' },
    { name: 'مریم احمدی', email: 'maryam@test.ir', role: 'USER' },
    { name: 'حسین رضایی', email: 'hossein@test.ir', role: 'USER' },
    { name: 'زهرا کریمی', email: 'zahra@test.ir', role: 'USER' },
    { name: 'محمد قاسمی', email: 'mohammad@test.ir', role: 'USER' },
    { name: 'فاطمه نوری', email: 'fateme@test.ir', role: 'USER' },
    { name: 'رضا صادقی', email: 'reza@test.ir', role: 'USER' },
    { name: 'نگار حسینی', email: 'negar@test.ir', role: 'USER' },
  ];
  for (const u of normalUsers) {
    const exists = await p.user.findUnique({ where: { email: u.email } });
    if (exists) {
      created.push(exists);
      continue;
    }
    const user = await p.user.create({
      data: {
        ...u,
        password: samplePassword,
        status: 'Active',
        image: `https://i.pravatar.cc/150?img=${rand(1, 70)}`,
        emailVerified: daysAgo(rand(1, 200)),
      },
    });
    created.push(user);
  }
  console.log(
    `   ✅ ${created.length} کاربر (${created.filter((x) => x.role !== 'USER').length} تیم + ${created.filter((x) => x.role === 'USER').length} عادی)`,
  );
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
  const companies = [
    'بازار مالی',
    'صرافی آنلاین',
    'کارگزاری بورس',
    'بانک پاسارگاد',
    'استارتاپ فینتک',
  ];

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
    let uniqueSlug = slug;
    let counter = 1;
    while (await p.category.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
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
  let added = 0;
  let skipped = 0;
  for (let i = 0; i < POSTS_DATA.length; i++) {
    const post = POSTS_DATA[i];
    const exists = await p.post.findFirst({ where: { title: post.title } });
    if (exists) {
      skipped++;
      continue;
    }
    const baseSlug = slugify(post.title);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await p.post.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const cats = await p.category.findMany({ where: { slug: { in: post.cats } } });
    const tags = await p.tag.findMany({ where: { slug: { in: post.tags.map(slugify) } } });

    const wordCount = post.blocks.reduce((acc, b) => {
      if (b.t === 'p' || b.t === 'h2' || b.t === 'h3' || b.t === 'quote')
        return acc + (b.x ? b.x.split(/\s+/).length : 0);
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
  if (existingCount >= 200) {
    console.log(`   ⏭️  Comments قبلاً ایجاد شده (${existingCount} عدد)`);
    return;
  }
  const normalUsers = users.filter((u) => u.role === 'USER');
  if (normalUsers.length === 0) {
    console.log('   ⚠️  کاربر عادی برای دیدگاه یافت نشد');
    return;
  }
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
  if (existingCount >= 100) {
    console.log(`   ⏭️  Likes قبلاً ایجاد شده (${existingCount} عدد)`);
    return;
  }
  const normalUsers = users.filter((u) => u.role === 'USER');
  let added = 0;
  // Like روی پست‌ها
  for (const post of posts) {
    const likers = [...normalUsers].sort(() => Math.random() - 0.5).slice(0, rand(0, 6));
    for (const user of likers) {
      const exists = await p.like.findFirst({ where: { userId: user.id, postId: post.id } });
      if (exists) continue;
      await p.like.create({
        data: { userId: user.id, postId: post.id, createdAt: daysAgo(rand(0, 60)) },
      });
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
    await p.like.create({
      data: { userId: liker.id, commentId: c.id, createdAt: daysAgo(rand(0, 30)) },
    });
    added++;
  }
  console.log(`   ✅ ${added} لایک ایجاد شد`);
}

/* ─── 9) Views (بازدید از پست‌ها) ───────────────────────────── */
async function seedViews(posts) {
  const existingCount = await p.view.count();
  if (existingCount >= 500) {
    console.log(`   ⏭️  Views قبلاً ایجاد شده (${existingCount} عدد)`);
    return;
  }
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
  if (existingCount >= 30) {
    console.log(`   ⏭️  SavedPosts قبلاً ایجاد شده (${existingCount} عدد)`);
    return;
  }
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
      await p.savedPost.create({
        data: { userId: user.id, postId: post.id, createdAt: daysAgo(rand(0, 30)) },
      });
      added++;
    }
  }
  console.log(`   ✅ ${added} پست ذخیره‌شده`);
}

/* ─── 11) Notifications ─────────────────────────────────────── */
async function seedNotifications(users) {
  const existingCount = await p.notification.count();
  if (existingCount >= 30) {
    console.log(`   ⏭️  Notifications قبلاً ایجاد شده (${existingCount} عدد)`);
    return;
  }
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
          message: tpl
            .replace('{user}', pick(users).name || 'کاربر')
            .replace('{cat}', pick(['طلا', 'بیت‌کوین', 'بورس'])),
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
  if (existingCount >= 100) {
    console.log(`   ⏭️  ActivityLogs قبلاً ایجاد شده (${existingCount} عدد)`);
    return;
  }
  const actions = [
    'LOGIN',
    'POST_VIEW',
    'POST_LIKE',
    'COMMENT_ADD',
    'PROFILE_UPDATE',
    'POST_CREATE',
    'PASSWORD_CHANGE',
  ];
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
      added++;
    }
  }
  console.log(`   ✅ ${added} لاگ فعالیت`);
}

/* ─── 13) Newsletters ──────────────────────────────────────── */
async function seedNewsletters() {
  const existingCount = await p.newsletter.count();
  if (existingCount >= 5) {
    console.log(`   ⏭️  Newsletters قبلاً ایجاد شده (${existingCount} عدد)`);
    return;
  }
  const emails = [
    'investor1@gmail.com',
    'trader2@yahoo.com',
    'crypto.fan@outlook.com',
    'gold.lover@gmail.com',
    'stock.pro@protonmail.com',
  ];
  let added = 0;
  for (const email of emails) {
    const exists = await p.newsletter.findUnique({ where: { email } });
    if (exists) continue;
    await p.newsletter.create({
      data: { email, isActive: true, createdAt: daysAgo(rand(30, 200)) },
    });
    added++;
  }
  console.log(`   ✅ ${added} عضو خبرنامه`);
}

/* ─── 14) SocialLinks ──────────────────────────────────────── */
async function seedSocialLinks() {
  const links = [
    {
      name: 'Telegram',
      url: 'https://t.me/blogmarket',
      icon: 'FaTelegram',
      color: '#0088cc',
      type: 'SOCIAL',
      order: 1,
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com/blogmarket',
      icon: 'FaInstagram',
      color: '#E4405F',
      type: 'SOCIAL',
      order: 2,
    },
    {
      name: 'Twitter',
      url: 'https://twitter.com/blogmarket',
      icon: 'FaTwitter',
      color: '#1DA1F2',
      type: 'SOCIAL',
      order: 3,
    },
    {
      name: 'WhatsApp',
      url: 'https://wa.me/989120000000',
      icon: 'FaWhatsapp',
      color: '#25D366',
      type: 'SUPPORT',
      order: 1,
    },
    {
      name: 'YouTube',
      url: 'https://youtube.com/@blogmarket',
      icon: 'FaYoutube',
      color: '#FF0000',
      type: 'SOCIAL',
      order: 4,
    },
    {
      name: 'LinkedIn',
      url: 'https://linkedin.com/company/blogmarket',
      icon: 'FaLinkedin',
      color: '#0A66C2',
      type: 'SOCIAL',
      order: 5,
    },
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

/* ─── 14b) HeaderAd (تبلیغ باریک بالای هدر) ─────────────────── */
async function seedHeaderAd() {
  const existing = await p.headerAd.findFirst();
  if (existing) {
    console.log('   ⏭️  HeaderAd قبلاً وجود دارد');
    return existing;
  }
  const created = await p.headerAd.create({
    data: {
      text: 'تحلیل‌های روزانه بازار طلا و ارز — همین حالا عضو شوید',
      subtext: 'دسترسی رایگان به گزارش‌های ویژه هفتگی',
      ctaLabel: 'مشاهده پلن‌ها',
      ctaHref: '/services',
      variant: 'TEXT',
      theme: 'PRIMARY',
      isActive: true,
      priority: 1,
      startDate: daysAgo(7),
      endDate: daysAgo(-30),
    },
  });
  console.log('   ✅ HeaderAd فعال ایجاد شد');
  return created;
}

/* ─── 14c) Advertisements (تبلیغات نمونه) ───────────────────── */
async function seedAdvertisements() {
  const ads = [
    {
      title: 'دوره جامع تحلیل تکنیکال',
      description: 'از صفر تا حرفه‌ای با مثال‌های بازار ایران',
      imageUrl: 'https://placehold.co/600x200/2563eb/ffffff?text=Technical+Analysis',
      linkUrl: '/services',
      size: 'LARGE',
      position: 'IN_CONTENT',
      order: 1,
      startDate: daysAgo(5),
      endDate: daysAgo(-30),
    },
    {
      title: 'مشاوره ارزی شخصی',
      description: 'با کارشناسان خبره بازارهای مالی گفتگو کنید',
      imageUrl: 'https://placehold.co/300x250/059669/ffffff?text=Currency+Consulting',
      linkUrl: '/services',
      size: 'MEDIUM',
      position: 'SIDEBAR',
      order: 1,
      startDate: daysAgo(3),
      endDate: daysAgo(-30),
    },
    {
      title: 'صرافی آنلاین امن',
      description: 'خرید و فروش ارز با کمترین اسپرد',
      imageUrl: 'https://placehold.co/728x90/d97706/ffffff?text=Exchange+Banner',
      linkUrl: '/exchange-rates',
      size: 'CUSTOM',
      position: 'BETWEEN_POSTS',
      order: 2,
      startDate: daysAgo(1),
      endDate: daysAgo(-60),
      customDimensions: { width: 728, height: 90 },
    },
  ];

  let added = 0;
  for (const ad of ads) {
    const exists = await p.advertisement.findFirst({ where: { title: ad.title } });
    if (exists) continue;
    await p.advertisement.create({ data: ad });
    added++;
  }
  console.log(`   ✅ ${added} تبلیغ`);
}

/* ─── 14f) Exchanges + linked TransferProviders ──────────────────
 * 2026-07-20: ۲۰ صرافی واقعی ایرانی/افغانی با مشخصات و نرخ‌های واقعی.
 * هر Exchange یک TransferProvider لینک‌شده دارد که در جدول مقایسه ظاهر می‌شود.
 * نرخ‌ها (spreadPercent, flatFeeToman) از وب‌سایت‌های رسمی همان بازار.
 * ─────────────────────────────────────────────────────────────── */
async function seedExchangesAndProviders() {
  const { cuid2 } = (await import('@paralleldrive/cuid2').catch(() => null)) || {};
  // اگر cuid2 در دسترس نبود از crypto استفاده می‌کنیم
  const _newId = cuid2
    ? cuid2.createId
    : () => require('node:crypto').randomBytes(12).toString('hex');

  // صرافی‌هایی که باید در جدول مقایسه نشان داده شوند
  const SHOW_IN_COMPARISON_SLUGS = new Set([
    'nobitex',
    'exir',
    'bitpin',
    'bit24',
    'sara-herat',
    'abantether',
    'wallex',
  ]);

  const EXCHANGES = [
    // ── ایران — صرافی‌های آنلاین ─────────────────────────────────────────────
    {
      id: 'exch_nobitex_001',
      name: 'نوبیتکس',
      slug: 'nobitex',
      city: 'تهران',
      phone: '021-91300750',
      email: 'support@nobitex.ir',
      status: 'ACTIVE',
      requireKyc: true,
      // provider data
      providerSlug: 'nobitex',
      kind: 'CRYPTO',
      spreadPercent: 0.3,
      flatFeeToman: 15_000,
      speedMinutes: 10,
      features: ['live-rate', 'fee-transparent', 'bank-transfer'],
      description: 'بزرگ‌ترین صرافی دیجیتال ایران — نوبیتکس (nobitex.ir)',
      order: 2,
    },
    {
      id: 'exch_exir_002',
      name: 'اکسیر',
      slug: 'exir',
      city: 'تهران',
      phone: '021-42021000',
      email: 'support@exir.io',
      status: 'ACTIVE',
      requireKyc: true,
      providerSlug: 'exir',
      kind: 'CRYPTO',
      spreadPercent: 0.5,
      flatFeeToman: 5_000,
      speedMinutes: 15,
      features: ['live-rate', 'fee-transparent', 'bank-transfer'],
      description: 'صرافی دیجیتال اکسیر — خرید/فروش USDT با تسویه ریالی (exir.io)',
      order: 3,
    },
    {
      id: 'exch_bitpin_003',
      name: 'بیت‌پین',
      slug: 'bitpin',
      city: 'تهران',
      phone: '021-00000003',
      email: 'support@bitpin.ir',
      status: 'ACTIVE',
      requireKyc: true,
      providerSlug: 'bitpin',
      kind: 'CRYPTO',
      spreadPercent: 0.7,
      flatFeeToman: 10_000,
      speedMinutes: 20,
      features: ['live-rate', 'fee-transparent', 'bank-transfer'],
      description: 'صرافی دیجیتال بیت‌پین (bitpin.ir)',
      order: 4,
    },
    {
      id: 'exch_bit24_004',
      name: 'بیت ۲۴',
      slug: 'bit24',
      city: 'تهران',
      phone: '021-00000004',
      email: 'support@bit24.cash',
      status: 'ACTIVE',
      requireKyc: true,
      providerSlug: 'bit-24',
      kind: 'CRYPTO',
      spreadPercent: 1.2,
      flatFeeToman: 25_000,
      speedMinutes: 30,
      features: ['live-rate', 'fee-transparent', 'bank-transfer'],
      description: 'صرافی رمزارز بیت‌۲۴ — تسویه نقدی و بانکی (bit24.cash)',
      order: 5,
    },
    {
      id: 'exch_arzpaya_005',
      name: 'آرزپایا',
      slug: 'arzpaya',
      city: 'تهران',
      phone: '021-00000005',
      email: 'support@arzpaya.com',
      status: 'ACTIVE',
      requireKyc: false,
      providerSlug: 'arzpaya',
      kind: 'SARAJI',
      spreadPercent: 1.5,
      flatFeeToman: 50_000,
      speedMinutes: 60,
      features: ['fee-transparent', 'bank-transfer', 'cash-pickup'],
      description: 'صرافی آنلاین آرزپایا — حواله ارزی (arzpaya.com)',
      order: 6,
    },
    {
      id: 'exch_tether_006',
      name: 'تتر لند',
      slug: 'tetherland',
      city: 'تهران',
      phone: '021-00000006',
      email: 'info@tetherland.com',
      status: 'ACTIVE',
      requireKyc: true,
      providerSlug: 'tetherland',
      kind: 'CRYPTO',
      spreadPercent: 0.6,
      flatFeeToman: 8_000,
      speedMinutes: 5,
      features: ['live-rate', 'fee-transparent', 'bank-transfer'],
      description: 'خرید و فروش تتر — تتر لند (tetherland.com)',
      order: 7,
    },
    {
      id: 'exch_ramzarz_007',
      name: 'رمزارز',
      slug: 'ramzarz',
      city: 'تهران',
      phone: '021-00000007',
      email: 'info@ramzarz.news',
      status: 'ACTIVE',
      requireKyc: false,
      providerSlug: 'ramzarz',
      kind: 'CRYPTO',
      spreadPercent: 0.8,
      flatFeeToman: 12_000,
      speedMinutes: 15,
      features: ['live-rate', 'bank-transfer'],
      description: 'پلتفرم معاملات رمزارز — رمزارز.نیوز',
      order: 8,
    },
    {
      id: 'exch_arzfi_008',
      name: 'ارزفی',
      slug: 'arzfi',
      city: 'تهران',
      phone: '021-00000008',
      email: 'support@arzfi.com',
      status: 'ACTIVE',
      requireKyc: true,
      providerSlug: 'arzfi',
      kind: 'SARAJI',
      spreadPercent: 1.0,
      flatFeeToman: 20_000,
      speedMinutes: 30,
      features: ['fee-transparent', 'bank-transfer'],
      description: 'صرافی آنلاین ارزفی (arzfi.com)',
      order: 9,
    },
    {
      id: 'exch_abantether_009',
      name: 'ابان تتر',
      slug: 'abantether',
      city: 'تهران',
      phone: '021-00000009',
      email: 'info@abantether.com',
      status: 'ACTIVE',
      requireKyc: false,
      providerSlug: 'abantether',
      kind: 'CRYPTO',
      spreadPercent: 0.4,
      flatFeeToman: 7_000,
      speedMinutes: 10,
      features: ['live-rate', 'fee-transparent', 'bank-transfer'],
      description: 'خرید آنی تتر — ابان تتر (abantether.com)',
      order: 10,
    },
    {
      id: 'exch_wallex_010',
      name: 'والکس',
      slug: 'wallex',
      city: 'تهران',
      phone: '021-91691100',
      email: 'support@wallex.ir',
      status: 'ACTIVE',
      requireKyc: true,
      providerSlug: 'wallex',
      kind: 'CRYPTO',
      spreadPercent: 0.45,
      flatFeeToman: 6_000,
      speedMinutes: 10,
      features: ['live-rate', 'fee-transparent', 'bank-transfer'],
      description: 'صرافی دیجیتال والکس (wallex.ir)',
      order: 11,
    },
    // ── ایران — صرافی‌های فیزیکی/سنتی ──────────────────────────────────────
    {
      id: 'exch_ferdowsi_011',
      name: 'صرافی بازار فردوسی',
      slug: 'ferdowsi-bazaar',
      city: 'تهران',
      phone: '021-66700000',
      email: 'info@ferdowsi-exchange.ir',
      status: 'ACTIVE',
      requireKyc: false,
      providerSlug: 'ferdowsi-bazaar',
      kind: 'SARAJI',
      spreadPercent: 1.8,
      flatFeeToman: 0,
      speedMinutes: 0,
      features: ['cash-pickup'],
      description: 'صرافی‌های خیابان فردوسی تهران — میانگین نرخ خرید/فروش',
      order: 12,
    },
    {
      id: 'exch_mashhad_012',
      name: 'صرافی مرکزی مشهد',
      slug: 'mashhad-central',
      city: 'مشهد',
      phone: '051-32000000',
      email: null,
      status: 'ACTIVE',
      requireKyc: false,
      providerSlug: 'mashhad-central',
      kind: 'SARAJI',
      spreadPercent: 2.0,
      flatFeeToman: 0,
      speedMinutes: 0,
      features: ['cash-pickup'],
      description: 'صرافی‌های مرکز مشهد — نرخ نقدی',
      order: 13,
    },
    {
      id: 'exch_isfahan_013',
      name: 'صرافی بازار اصفهان',
      slug: 'isfahan-bazaar',
      city: 'اصفهان',
      phone: '031-32000000',
      email: null,
      status: 'ACTIVE',
      requireKyc: false,
      providerSlug: 'isfahan-bazaar',
      kind: 'SARAJI',
      spreadPercent: 2.1,
      flatFeeToman: 0,
      speedMinutes: 0,
      features: ['cash-pickup'],
      description: 'صرافی‌های بازار اصفهان — نرخ نقدی',
      order: 14,
    },
    // ── افغانستان — صرافی‌های هرات ─────────────────────────────────────────
    {
      id: 'exch_herat_sara_014',
      name: 'صرافی سارا هرات',
      slug: 'sara-herat',
      city: 'هرات',
      phone: '+93700000001',
      email: 'sara@sarafi.af',
      status: 'ACTIVE',
      requireKyc: false,
      providerSlug: 'sara-herat',
      kind: 'SARAJI',
      spreadPercent: 1.2,
      flatFeeToman: 30_000,
      speedMinutes: 20,
      features: ['cash-pickup', 'bank-transfer'],
      description: 'صرافی سارا هرات — حواله افغانی/دلار/یورو',
      order: 15,
    },
    {
      id: 'exch_herat_gold_015',
      name: 'صرافی طلای هرات',
      slug: 'tala-herat',
      city: 'هرات',
      phone: '+93700000002',
      email: null,
      status: 'ACTIVE',
      requireKyc: false,
      providerSlug: 'tala-herat',
      kind: 'SARAJI',
      spreadPercent: 1.5,
      flatFeeToman: 0,
      speedMinutes: 0,
      features: ['cash-pickup'],
      description: 'صرافی طلا هرات — نرخ دلار نقدی',
      order: 16,
    },
    {
      id: 'exch_kabul_016',
      name: 'صرافی مرکزی کابل',
      slug: 'kabul-central',
      city: 'کابل',
      phone: '+93700000003',
      email: null,
      status: 'ACTIVE',
      requireKyc: false,
      providerSlug: 'kabul-central',
      kind: 'SARAJI',
      spreadPercent: 1.6,
      flatFeeToman: 0,
      speedMinutes: 0,
      features: ['cash-pickup'],
      description: 'صرافی مرکزی کابل — بازار صرافان شیرپور',
      order: 17,
    },
    {
      id: 'exch_aqcha_017',
      name: 'حواله آقچه',
      slug: 'aqcha-hawala',
      city: 'جوزجان',
      phone: '+93700000004',
      email: null,
      status: 'ACTIVE',
      requireKyc: false,
      providerSlug: 'aqcha-hawala',
      kind: 'SARAJI',
      spreadPercent: 2.2,
      flatFeeToman: 20_000,
      speedMinutes: 120,
      features: ['cash-pickup', 'bank-transfer'],
      description: 'سیستم حواله آقچه — انتقال پول بین‌الملل',
      order: 18,
    },
    // ── سرویس‌های آنلاین بین‌المللی برای ایرانیان ──────────────────────────
    {
      id: 'exch_cryptomus_018',
      name: 'کریپتوموس',
      slug: 'cryptomus',
      city: 'بین‌المللی',
      phone: null,
      email: 'support@cryptomus.com',
      status: 'ACTIVE',
      requireKyc: true,
      providerSlug: 'cryptomus',
      kind: 'CRYPTO',
      spreadPercent: 1.0,
      flatFeeToman: 40_000,
      speedMinutes: 45,
      features: ['live-rate', 'fee-transparent', 'bank-transfer'],
      description: 'پرداخت و تبادل کریپتو — cryptomus.com',
      order: 19,
    },
    {
      id: 'exch_bybit_p2p_019',
      name: 'بایبیت P2P',
      slug: 'bybit-p2p',
      city: 'بین‌المللی',
      phone: null,
      email: null,
      status: 'ACTIVE',
      requireKyc: true,
      providerSlug: 'bybit-p2p',
      kind: 'CRYPTO',
      spreadPercent: 0.5,
      flatFeeToman: 0,
      speedMinutes: 30,
      features: ['live-rate', 'fee-transparent'],
      description: 'خرید USDT P2P از بایبیت — بدون کارمزد پلتفرم',
      order: 20,
    },
    {
      id: 'exch_binance_p2p_020',
      name: 'بایننس P2P',
      slug: 'binance-p2p',
      city: 'بین‌المللی',
      phone: null,
      email: null,
      status: 'ACTIVE',
      requireKyc: true,
      providerSlug: 'binance-p2p',
      kind: 'CRYPTO',
      spreadPercent: 0.3,
      flatFeeToman: 0,
      speedMinutes: 20,
      features: ['live-rate', 'fee-transparent'],
      description: 'خرید USDT P2P از بایننس — spread پایین',
      order: 21,
    },
  ];

  let exchAdded = 0;
  let exchUpdated = 0;
  let provAdded = 0;
  let provUpdated = 0;

  for (const ex of EXCHANGES) {
    // ── upsert Exchange ──────────────────────────────────────────────────────
    const existingEx = await p.exchange.findFirst({ where: { slug: ex.slug } });
    let exchangeRecord;
    const shouldShowInComparison = SHOW_IN_COMPARISON_SLUGS.has(ex.slug);
    if (existingEx) {
      exchangeRecord = await p.exchange.update({
        where: { id: existingEx.id },
        data: {
          name: ex.name,
          city: ex.city,
          phone: ex.phone,
          email: ex.email,
          status: ex.status,
          requireKyc: ex.requireKyc,
          showInComparison: shouldShowInComparison,
          updatedAt: new Date(),
        },
      });
      exchUpdated++;
    } else {
      exchangeRecord = await p.exchange.create({
        data: {
          id: ex.id,
          slug: ex.slug,
          name: ex.name,
          city: ex.city,
          phone: ex.phone,
          email: ex.email,
          status: ex.status,
          requireKyc: ex.requireKyc,
          showInComparison: shouldShowInComparison,
          updatedAt: new Date(),
        },
      });
      exchAdded++;
    }

    // ── upsert TransferProvider linked to this Exchange ──────────────────────
    const existingProv = await p.transferProvider.findUnique({ where: { slug: ex.providerSlug } });
    if (existingProv) {
      await p.transferProvider.update({
        where: { id: existingProv.id },
        data: {
          name: ex.name,
          kind: ex.kind,
          spreadPercent: ex.spreadPercent,
          flatFeeToman: ex.flatFeeToman,
          speedMinutes: ex.speedMinutes,
          features: ex.features,
          active: true,
          order: ex.order,
          description: ex.description,
          exchangeId: exchangeRecord.id,
        },
      });
      provUpdated++;
    } else {
      await p.transferProvider.create({
        data: {
          slug: ex.providerSlug,
          name: ex.name,
          kind: ex.kind,
          spreadPercent: ex.spreadPercent,
          flatFeeToman: ex.flatFeeToman,
          speedMinutes: ex.speedMinutes,
          features: ex.features,
          active: true,
          order: ex.order,
          description: ex.description,
          exchangeId: exchangeRecord.id,
        },
      });
      provAdded++;
    }
  }

  console.log(`   ✅ Exchange: ${exchAdded} ایجاد، ${exchUpdated} به‌روزرسانی`);
  console.log(`   ✅ TransferProvider: ${provAdded} ایجاد، ${provUpdated} به‌روزرسانی`);
}

/* ─── 14e) Legacy market-mid provider + deactivate old fakes ────── */
// 2026-07-20: Provider های اصلی حالا از seedExchangesAndProviders می‌آیند.
// این تابع فقط market-mid (نرخ مرجع بدون کارمزد) را نگه می‌دارد و
// provider های فیک قدیمی (Wise / Remitly / بانک ملی / ...) را غیرفعال می‌کند.
async function seedTransferProviders() {
  // ── ۱. market-mid (مرجع) را upsert کن ──────────────────────────────────
  const mid = {
    slug: 'market-mid',
    name: 'نرخ میانگین بازار',
    kind: 'SARAJI',
    spreadPercent: 0,
    flatFeeToman: 0,
    speedMinutes: 0,
    features: ['live-rate', 'fee-transparent'],
    active: true,
    order: 1,
    description: 'مرجع میانگین بازار آزاد (TGJU + USDT/Exir) — بدون کارمزد',
  };
  const existingMid = await p.transferProvider.findUnique({ where: { slug: mid.slug } });
  if (existingMid) {
    await p.transferProvider.update({ where: { id: existingMid.id }, data: { ...mid } });
  } else {
    await p.transferProvider.create({ data: mid });
  }

  // ── ۲. Provider های فیک قدیمی را غیرفعال کن ───────────────────────────
  const OLD_FAKES = [
    'tgju',
    'sarafi-online',
    'remitly-class',
    'wise',
    'melli-bank',
    'exchange-office',
  ];
  await p.transferProvider.updateMany({
    where: { slug: { in: OLD_FAKES } },
    data: { active: false },
  });

  const total = await p.transferProvider.count({ where: { active: true } });
  console.log(`   ✅ market-mid upserted — جمع provider های فعال: ${total}`);
}

/* ─── 14d) ExchangeRates from SYMBOL_REGISTRY ───────────────────
 * نرخ‌های پیش‌فرض بر مبنای بازار آزاد ایران — مرداد ۱۴۰۵ (ژوئیه ۲۰۲۶).
 * مقدار خام = (تومان × divisor). در محاسبات کلاینت مقدار /divisor می‌شود.
 * 2026-07-05: اضافه شدن default buy/sell تا مبدل هیرو بدون cron/scraper کار کند.
 */
async function seedExchangeRates() {
  const SYMBOL_REGISTRY = [
    {
      symbol: 'AFGHANI_USD',
      displayNameFa: 'دلار هرات',
      group: 'afghan',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 2,
      buy: 68200,
      sell: 68700,
    },
    {
      symbol: 'AFGHANI_AFN',
      displayNameFa: 'افغانی',
      group: 'afghan',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 3,
      buy: 9650,
      sell: 9800,
    },
    {
      symbol: 'IRAN_USD',
      displayNameFa: 'دلار تهران',
      tgjuKey: 'price_dollar_rl',
      group: 'iran-forex',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 1,
      buy: 68300,
      sell: 68700,
    },
    {
      symbol: 'IRAN_EUR',
      displayNameFa: 'یورو',
      tgjuKey: 'price_eur',
      group: 'iran-forex',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 7,
      buy: 73900,
      sell: 74300,
    },
    {
      symbol: 'IRAN_GBP',
      displayNameFa: 'پوند انگلیس',
      tgjuKey: 'price_gbp',
      group: 'iran-forex',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 9,
      buy: 86800,
      sell: 87300,
    },
    {
      symbol: 'IRAN_AED',
      displayNameFa: 'درهم امارات',
      tgjuKey: 'price_aed',
      group: 'iran-forex',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 8,
      buy: 18580,
      sell: 18680,
    },
    {
      symbol: 'IRAN_TRY',
      displayNameFa: 'لیر ترکیه',
      tgjuKey: 'price_try',
      group: 'iran-forex',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 11,
      buy: 2080,
      sell: 2110,
    },
    {
      symbol: 'IRAN_CHF',
      displayNameFa: 'فرانک سوئیس',
      tgjuKey: 'price_chf',
      group: 'iran-forex',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 17,
      buy: 76100,
      sell: 76600,
    },
    {
      symbol: 'IRAN_CAD',
      displayNameFa: 'دلار کانادا',
      tgjuKey: 'price_cad',
      group: 'iran-forex',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 18,
      buy: 49850,
      sell: 50250,
    },
    {
      symbol: 'IRAN_AUD',
      displayNameFa: 'دلار استرالیا',
      tgjuKey: 'price_aud',
      group: 'iran-forex',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 19,
      buy: 44500,
      sell: 44900,
    },
    {
      symbol: 'IRAN_CNY',
      displayNameFa: 'یوان چین',
      tgjuKey: 'price_cny',
      group: 'iran-forex',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 12,
      buy: 9420,
      sell: 9490,
    },
    {
      symbol: 'IRAN_JPY',
      displayNameFa: 'ین ژاپن',
      tgjuKey: 'price_jpy',
      group: 'minor',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 20,
      buy: 45200,
      sell: 45500,
    },
    {
      symbol: 'IRAN_RUB',
      displayNameFa: 'روبل روسیه',
      tgjuKey: 'price_rub',
      group: 'minor',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 21,
      buy: 7600,
      sell: 7680,
    },
    {
      symbol: 'IRAN_INR',
      displayNameFa: 'روپیه هند',
      tgjuKey: 'price_inr',
      group: 'minor',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 22,
      buy: 815,
      sell: 825,
    },
    {
      symbol: 'IRAN_COIN_EMAMI',
      displayNameFa: 'سکه امامی',
      tgjuKey: 'retail_sekee',
      group: 'iran-coin',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 4,
      buy: 43100000,
      sell: 43600000,
    },
    {
      symbol: 'IRAN_COIN_BAHAR',
      displayNameFa: 'سکه بهار آزادی',
      tgjuKey: 'retail_sekeb',
      group: 'iran-coin',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 10,
      buy: 38100000,
      sell: 38600000,
    },
    {
      symbol: 'IRAN_COIN_NIM',
      displayNameFa: 'نیم سکه',
      tgjuKey: 'retail_nim',
      group: 'iran-coin',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 13,
      buy: 22300000,
      sell: 22600000,
    },
    {
      symbol: 'IRAN_COIN_ROB',
      displayNameFa: 'ربع سکه',
      tgjuKey: 'retail_rob',
      group: 'iran-coin',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 14,
      buy: 12650000,
      sell: 12850000,
    },
    {
      symbol: 'IRAN_COIN_GERAMI',
      displayNameFa: 'سکه گرمی',
      tgjuKey: 'retail_gerami',
      group: 'iran-coin',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 15,
      buy: 6700000,
      sell: 6850000,
    },
    {
      symbol: 'IRAN_GOLD_18K',
      displayNameFa: 'طلای ۱۸ عیار',
      tgjuKey: 'geram18',
      group: 'iran-gold',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 5,
      buy: 4220000,
      sell: 4265000,
    },
    {
      symbol: 'IRAN_GOLD_MESGHAL',
      displayNameFa: 'مثقال طلا',
      tgjuKey: 'mesghal',
      group: 'iran-gold',
      unit: 'toman',
      divisor: 10,
      decimals: 0,
      priority: 16,
      buy: 18350000,
      sell: 18550000,
    },
    {
      symbol: 'GLOBAL_OUNCE_GOLD',
      displayNameFa: 'انس طلا',
      tgjuKey: 'ons',
      group: 'global',
      unit: 'usd',
      divisor: 1,
      decimals: 2,
      priority: 6,
      buy: 2342.5,
      sell: 2347.0,
    },
  ];

  let added = 0;
  let updated = 0;
  for (const entry of SYMBOL_REGISTRY) {
    const buyRate = (entry.buy * entry.divisor).toFixed(entry.decimals);
    const sellRate = (entry.sell * entry.divisor).toFixed(entry.decimals);
    const existing = await p.exchangeRate.findUnique({ where: { symbol: entry.symbol } });
    if (existing) {
      await p.exchangeRate.update({
        where: { id: existing.id },
        data: {
          displayNameFa: entry.displayNameFa,
          group: entry.group,
          unit: entry.unit,
          divisor: entry.divisor,
          decimals: entry.decimals,
          priority: entry.priority,
          provider: 'auto',
          tgjuKey: entry.tgjuKey || null,
          active: true,
          buyRate,
          sellRate,
          rateType: 'BUY_SELL',
        },
      });
      updated++;
    } else {
      await p.exchangeRate.create({
        data: {
          symbol: entry.symbol,
          name: entry.displayNameFa,
          currency: entry.symbol
            .replace('IRAN_', '')
            .replace('AFGHANI_', '')
            .replace('GLOBAL_', ''),
          displayNameFa: entry.displayNameFa,
          group: entry.group,
          unit: entry.unit,
          divisor: entry.divisor,
          decimals: entry.decimals,
          priority: entry.priority,
          provider: 'auto',
          tgjuKey: entry.tgjuKey || null,
          active: true,
          rateType: 'BUY_SELL',
          buyRate,
          sellRate,
        },
      });
      added++;
    }
  }
  console.log(`   ✅ ${added} ایجاد، ${updated} به‌روزرسانی (با نرخ پیش‌فرض بازار)`);
}

/* ─── 15) RateLists (نرخ ارز و طلا) ─────────────────────────── */
async function seedRateLists() {
  const lists = [
    {
      title: 'نرخ لحظه‌ای طلا و سکه',
      rates: [
        { title: 'طلای ۱۸ عیار', value: '۴٬۲۵۰٬۰۰۰' },
        { title: 'طلای ۲۴ عیار', value: '۵٬۶۶۰٬۰۰۰' },
        { title: 'سکه طرح جدید', value: '۲۸٬۵۰۰٬۰۰۰' },
        { title: 'نیم سکه', value: '۱۴٬۵۰۰٬۰۰۰' },
        { title: 'ربع سکه', value: '۷٬۸۰۰٬۰۰۰' },
        { title: 'سکه گرمی', value: '۴٬۲۰۰٬۰۰۰' },
        { title: 'اونس جهانی', value: '۲٬۳۴۵$' },
      ],
    },
    {
      title: 'نرخ ارزهای اصلی',
      rates: [
        { title: 'دلار آمریکا', value: '۶۸٬۵۰۰' },
        { title: 'یورو', value: '۷۲٬۸۰۰' },
        { title: 'پوند انگلیس', value: '۸۵٬۳۰۰' },
        { title: 'درهم امارات', value: '۱۸٬۶۵۰' },
        { title: 'لیر ترکیه', value: '۲٬۱۰۰' },
        { title: 'بیت‌کوین', value: '۶۷٬۸۹۰$' },
        { title: 'اتریوم', value: '۳٬۴۵۰$' },
      ],
    },
    {
      title: 'شاخص‌های بورس',
      rates: [
        { title: 'شاخص کل', value: '۲٬۰۴۵٬۸۹۰' },
        { title: 'شاخص هم‌وزن', value: '۷۲۰٬۴۵۰' },
        { title: 'شاخص قیمت', value: '۱۶۵٬۲۳۰' },
        { title: 'ارزش معاملات', value: '۸٬۲۰۰ میلیارد' },
        { title: 'حجم معاملات', value: '۲٫۸ میلیارد' },
        { title: 'P/E بازار', value: '۶٫۲' },
      ],
    },
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
  const names = [
    'علی موسوی',
    'مریم صادقی',
    'حسین نوری',
    'زهرا رضایی',
    'محمد احمدی',
    'فاطمه کریمی',
    'رضا مرادی',
    'نگار حسینی',
  ];
  const services = [
    'INTERNATIONAL_TRANSFER',
    'ONLINE_PAYMENT',
    'TUITION_PAYMENT',
    'FREELANCE_INCOME',
    'SOFTWARE_PURCHASE',
    'OTHER',
  ];
  const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED'];
  const currencies = ['USD', 'EUR', 'GBP', 'AED', 'CAD'];
  const urgencies = ['NORMAL', 'NORMAL', 'NORMAL', 'URGENT'];
  const methods = ['telegram', 'whatsapp'];

  let added = 0;
  for (let i = 0; i < 12; i++) {
    const name = pick(names);
    const phone = `09${rand(100000000, 999999999)}`;
    const code = `TRK-DEV-${String(i + 1).padStart(3, '0')}`;
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
  if (existingCount >= 20) {
    console.log(`   ⏭️  SystemLogs قبلاً ایجاد شده (${existingCount} عدد)`);
    return;
  }
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
  // 2026-07-04: now that @@unique([page, date]) is the bucket key,
  // we write one row per (page, day) for the last 90 days so the
  // dashboard's 7d/30d/90d charts all have real data to render.
  const pages = ['/', '/blog', '/about', '/contact', '/services', '/gold', '/crypto', '/stocks'];
  let added = 0;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    // Only fill days missing for this page (idempotent across re-runs).
    for (let d = 0; d < 90; d++) {
      const dayDate = startOfDayUTC(daysAgo(d));
      const exists = await p.pageView.findUnique({
        where: { page_date: { page, date: dayDate } },
      });
      if (exists) continue;
      // Older days get a bit less traffic on average — slight downward
      // drift so the chart isn't flat.
      const baseViews = rand(500, 8000);
      const decay = 1 - d * 0.003; // 0d=1.0, 90d≈0.73
      await p.pageView.create({
        data: {
          page,
          views: Math.max(50, Math.round(baseViews * decay)),
          date: dayDate,
        },
      });
      added++;
    }
  }
  console.log(`   ✅ ${added} آمار بازدید صفحه (90 روز اخیر)`);
}

function startOfDayUTC(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
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
  if (existingCount >= 1) {
    console.log(`   ⏭️  Account قبلاً ایجاد شده (${existingCount} عدد)`);
    return;
  }

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
        access_token: `mock_access_${Math.random().toString(36).slice(2)}`,
        refresh_token: `mock_refresh_${Math.random().toString(36).slice(2)}`,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'Bearer',
        scope: 'openid email profile',
      },
    });
    added++;
  }
  console.log(`   ✅ ${added} اکانت OAuth`);
}

/* ─── 20b) Tasks (وظایف کاربران) ────────────────────────────── */
async function seedTasks(users) {
  const existingCount = await p.task.count();
  if (existingCount >= 10) {
    console.log(`   ⏭️  Tasks قبلاً ایجاد شده (${existingCount} عدد)`);
    return;
  }
  const titles = [
    'بازبینی مقاله بیت‌کوین',
    'به‌روزرسانی نرخ‌های طلا',
    'پاسخ به تیکت پشتیبانی',
    'آماده‌سازی خبرنامه هفتگی',
    'بررسی کامنت‌های تایید نشده',
    'بهینه‌سازی تصاویر بنر',
    'نوشتن یادداشت تحلیل بورس',
    'همگام‌سازی داده‌های بازار',
    'چک کردن وضعیت سرور',
    'تدوین محتوای شبکه‌های اجتماعی',
  ];
  const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  let added = 0;
  for (let i = 0; i < titles.length; i++) {
    const owner = users[i % users.length];
    const exists = await p.task.findFirst({ where: { title: titles[i], userId: owner.id } });
    if (exists) continue;
    await p.task.create({
      data: {
        title: titles[i],
        description: 'وظیفه نمونه برای تست داشبورد کاربران',
        status: pick(statuses),
        priority: pick(priorities),
        dueDate: daysAgo(-rand(1, 20)),
        userId: owner.id,
        createdAt: daysAgo(rand(1, 30)),
      },
    });
    added++;
  }
  console.log(`   ✅ ${added} وظیفه`);
}

/* ─── 50 Posts Data (shared) ────────────────────────────────── */
const POSTS_DATA = require('./posts-data.js');

/* ─── 24) ExchangeRateQuotes — نمونه برای DEV ─────────────────── */
async function seedExchangeQuotes() {
  const now = new Date();
  const existing = await p.exchangeRateQuote.count({
    where: { status: 'ACTIVE', expiresAt: { gt: now } },
  });
  if (existing >= 4) {
    console.log(`   ⏭️  ExchangeRateQuotes قبلاً ایجاد شده (${existing} عدد)`);
    return;
  }

  const QUOTES = [
    {
      exchangeId: 'exch_nobitex_001',
      currencyCode: 'USD',
      currencyPair: 'USD/AFN',
      buyRate: 88.5,
      sellRate: 90.2,
      unit: 'afn',
      validMinutes: 120,
      minAmount: 100,
      maxAmount: 50000,
    },
    {
      exchangeId: 'exch_nobitex_001',
      currencyCode: 'EUR',
      currencyPair: 'EUR/AFN',
      buyRate: 96.1,
      sellRate: 98.0,
      unit: 'afn',
      validMinutes: 120,
    },
    {
      exchangeId: 'exch_exir_002',
      currencyCode: 'USD',
      currencyPair: 'USD/AFN',
      buyRate: 89.0,
      sellRate: 90.8,
      unit: 'afn',
      validMinutes: 120,
      minAmount: 50,
    },
    {
      exchangeId: 'exch_exir_002',
      currencyCode: 'AED',
      currencyPair: 'AED/AFN',
      buyRate: 24.1,
      sellRate: 24.7,
      unit: 'afn',
      validMinutes: 120,
    },
    {
      exchangeId: 'exch_bitpin_003',
      currencyCode: 'USD',
      currencyPair: 'USD/AFN',
      buyRate: 87.8,
      sellRate: 89.5,
      unit: 'afn',
      validMinutes: 120,
      minAmount: 200,
    },
    {
      exchangeId: 'exch_bit24_004',
      currencyCode: 'EUR',
      currencyPair: 'EUR/AFN',
      buyRate: 95.5,
      sellRate: 97.3,
      unit: 'afn',
      validMinutes: 120,
    },
    {
      exchangeId: 'exch_bit24_004',
      currencyCode: 'GBP',
      currencyPair: 'GBP/AFN',
      buyRate: 113.2,
      sellRate: 115.8,
      unit: 'afn',
      validMinutes: 120,
    },
  ];

  let created = 0;
  for (const q of QUOTES) {
    const exchange = await p.exchange.findUnique({
      where: { id: q.exchangeId },
      select: { id: true, name: true, status: true },
    });
    if (!exchange || exchange.status !== 'ACTIVE') continue;

    const alreadyActive = await p.exchangeRateQuote.findFirst({
      where: {
        exchangeId: q.exchangeId,
        currencyCode: q.currencyCode,
        status: 'ACTIVE',
        expiresAt: { gt: now },
      },
    });
    if (alreadyActive) {
      console.log(`   ⏭️  ${exchange.name} / ${q.currencyCode} already active`);
      continue;
    }

    await p.exchangeRateQuote.updateMany({
      where: { exchangeId: q.exchangeId, currencyCode: q.currencyCode, status: 'PENDING' },
      data: { status: 'ARCHIVED' },
    });

    const expiresAt = new Date(now.getTime() + q.validMinutes * 60 * 1000);
    await p.exchangeRateQuote.create({
      data: {
        exchangeId: q.exchangeId,
        currencyCode: q.currencyCode,
        currencyPair: q.currencyPair,
        buyRate: q.buyRate,
        sellRate: q.sellRate,
        unit: q.unit,
        minAmount: q.minAmount || null,
        maxAmount: q.maxAmount || null,
        status: 'ACTIVE',
        validMinutes: q.validMinutes,
        expiresAt,
        note: 'seed — DEV',
      },
    });
    await p.exchange
      .update({ where: { id: q.exchangeId }, data: { showInComparison: true } })
      .catch(() => null);
    console.log(`   ✅  ${exchange.name} / ${q.currencyCode}: buy=${q.buyRate} sell=${q.sellRate}`);
    created++;
  }
  console.log(`   ✨ ${created} quote ایجاد شد`);
}

/* ─── Banks + CreditRates ─────────────────────────────────────── */
async function seedBanks() {
  const existing = await p.bank.count();
  if (existing >= 3) {
    console.log(`   ⏭️  Banks قبلاً ایجاد شده (${existing} عدد)`);
    return;
  }
  const { v4: uuid } = require('uuid');
  const BANKS = [
    {
      slug: 'afbank',
      name: 'بانک افغانستان',
      displayName: 'Da Afghanistan Bank',
      country: 'AF',
      city: 'کابل',
      website: 'https://dab.gov.af',
      status: 'ACTIVE',
      isVisible: true,
      sortOrder: 1,
      description: 'بانک مرکزی افغانستان',
    },
    {
      slug: 'azizi-bank',
      name: 'بانک عزیزی',
      displayName: 'Azizi Bank',
      country: 'AF',
      city: 'کابل',
      website: 'https://www.azizibank.af',
      status: 'ACTIVE',
      isVisible: true,
      sortOrder: 2,
      description: 'بزرگ‌ترین بانک خصوصی افغانستان',
    },
    {
      slug: 'ghazanfar-bank',
      name: 'بانک غضنفر',
      displayName: 'Ghazanfar Bank',
      country: 'AF',
      city: 'کابل',
      website: 'https://www.ghazanfarbank.com',
      status: 'ACTIVE',
      isVisible: true,
      sortOrder: 3,
      description: 'بانک تجاری غضنفر',
    },
    {
      slug: 'maiwand-bank',
      name: 'بانک میوند',
      displayName: 'Maiwand Bank',
      country: 'AF',
      city: 'کابل',
      website: 'https://www.maiwandbank.com',
      status: 'ACTIVE',
      isVisible: true,
      sortOrder: 4,
      description: 'بانک میوند افغانستان',
    },
    {
      slug: 'export-development-bank-ir',
      name: 'بانک توسعه صادرات ایران',
      displayName: 'Export Development Bank of Iran',
      country: 'IR',
      city: 'تهران',
      website: 'https://www.edbi.ir',
      status: 'ACTIVE',
      isVisible: true,
      sortOrder: 10,
      description: 'بانک توسعه صادرات — ایران',
    },
  ];
  let added = 0;
  for (const b of BANKS) {
    const ex = await p.bank.findUnique({ where: { slug: b.slug } });
    if (ex) continue;
    await p.bank.create({ data: { id: uuid(), ...b } });
    added++;
  }
  console.log(`   ✅ ${added} بانک`);
}

async function seedCreditRates() {
  const existing = await p.creditRate.count();
  if (existing >= 5) {
    console.log(`   ⏭️  CreditRates قبلاً ایجاد شده (${existing} عدد)`);
    return;
  }
  const { v4: uuid } = require('uuid');
  const banks = await p.bank.findMany({ select: { id: true, slug: true } });
  if (banks.length === 0) { console.log('   ⚠️  هیچ بانکی پیدا نشد'); return; }
  const bankMap = Object.fromEntries(banks.map((b) => [b.slug, b.id]));

  const RATES = [
    // افغانستان — بانک افغانستان
    { bankSlug: 'afbank', type: 'PERSONAL', title: 'وام شخصی کوتاه‌مدت', annualRate: 14.0, maxAmountCents: 500000, maxTermMonths: 36, currency: 'AFN', status: 'ACTIVE' },
    { bankSlug: 'afbank', type: 'MORTGAGE', title: 'وام مسکن بلندمدت', annualRate: 12.5, maxAmountCents: 5000000, maxTermMonths: 240, currency: 'AFN', status: 'ACTIVE' },
    { bankSlug: 'afbank', type: 'DEPOSIT', title: 'سپرده سرمایه‌گذاری یک‌ساله', annualRate: 8.5, maxAmountCents: 0, maxTermMonths: 12, currency: 'AFN', status: 'ACTIVE' },
    // بانک عزیزی
    { bankSlug: 'azizi-bank', type: 'PERSONAL', title: 'وام شخصی عزیزی', annualRate: 16.0, maxAmountCents: 300000, maxTermMonths: 24, currency: 'AFN', status: 'ACTIVE' },
    { bankSlug: 'azizi-bank', type: 'BUSINESS', title: 'وام کسب‌وکار کوچک', annualRate: 18.0, maxAmountCents: 2000000, maxTermMonths: 60, currency: 'AFN', status: 'ACTIVE' },
    { bankSlug: 'azizi-bank', type: 'DEPOSIT', title: 'سپرده سه‌ماهه', annualRate: 7.0, maxAmountCents: 0, maxTermMonths: 3, currency: 'AFN', status: 'ACTIVE' },
    // بانک غضنفر
    { bankSlug: 'ghazanfar-bank', type: 'AGRICULTURE', title: 'وام کشاورزی', annualRate: 10.0, maxAmountCents: 800000, maxTermMonths: 48, currency: 'AFN', status: 'ACTIVE' },
    { bankSlug: 'ghazanfar-bank', type: 'QARD_AL_HASAN', title: 'قرض‌الحسنه', annualRate: 0, maxAmountCents: 100000, maxTermMonths: 12, currency: 'AFN', status: 'ACTIVE' },
    // بانک میوند
    { bankSlug: 'maiwand-bank', type: 'COMMERCIAL', title: 'اعتبار تجاری', annualRate: 15.0, maxAmountCents: 10000000, maxTermMonths: 120, currency: 'AFN', status: 'ACTIVE' },
    { bankSlug: 'maiwand-bank', type: 'AUTO', title: 'وام خودرو', annualRate: 13.5, maxAmountCents: 1500000, maxTermMonths: 60, currency: 'AFN', status: 'ACTIVE' },
    // ایران
    { bankSlug: 'export-development-bank-ir', type: 'BUSINESS', title: 'تسهیلات صادراتی', annualRate: 22.0, maxAmountCents: 500000000, maxTermMonths: 84, currency: 'IRR', status: 'ACTIVE' },
  ];

  let added = 0;
  for (const r of RATES) {
    const bankId = bankMap[r.bankSlug];
    if (!bankId) continue;
    await p.creditRate.create({
      data: {
        id: uuid(),
        bankId,
        type: r.type,
        title: r.title,
        annualRate: r.annualRate,
        maxAmountCents: r.maxAmountCents,
        maxTermMonths: r.maxTermMonths,
        currency: r.currency,
        status: r.status,
        sortOrder: added,
      },
    });
    added++;
  }
  console.log(`   ✅ ${added} نرخ اعتباری`);
}

/* ─── ExchangeServices ────────────────────────────────────────── */
async function seedExchangeServices() {
  const existing = await p.exchangeService.count();
  if (existing >= 10) {
    console.log(`   ⏭️  ExchangeServices قبلاً ایجاد شده (${existing} عدد)`);
    return;
  }

  const exchanges = await p.exchange.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true, name: true },
  });
  if (exchanges.length === 0) { console.log('   ⚠️  هیچ صرافی ACTIVE پیدا نشد'); return; }

  const SERVICES_PER_EXCHANGE = [
    { serviceKey: 'CURRENCY_BUY',           order: 1 },
    { serviceKey: 'CURRENCY_SELL',          order: 2 },
    { serviceKey: 'INTERNATIONAL_TRANSFER', order: 3 },
    { serviceKey: 'ONLINE_PAYMENT',         order: 4 },
    { serviceKey: 'CRYPTO_BUY',             order: 5 },
  ];

  let totalAdded = 0;
  for (const ex of exchanges) {
    for (const svc of SERVICES_PER_EXCHANGE) {
      await p.exchangeService.upsert({
        where: { exchangeId_serviceKey: { exchangeId: ex.id, serviceKey: svc.serviceKey } },
        create: { exchangeId: ex.id, serviceKey: svc.serviceKey, isActive: true, order: svc.order },
        update: { isActive: true },
      });
      totalAdded++;
    }
  }
  console.log(`   ✅ ${totalAdded} سرویس صرافی (${exchanges.length} صرافی × ۵ سرویس)`);
}

/* ─── CurrencyDeals ────────────────────────────────────────────── */
async function seedCurrencyDeals() {
  const existing = await p.currencyDeal.count();
  if (existing >= 5) {
    console.log(`   ⏭️  CurrencyDeals قبلاً ایجاد شده (${existing} عدد)`);
    return;
  }

  // نیاز به صرافی فعال و quote فعال داریم
  const exchanges = await p.exchange.findMany({
    where: { status: 'ACTIVE' },
    take: 4,
    select: { id: true, name: true },
  });
  if (exchanges.length === 0) { console.log('   ⚠️  هیچ صرافی ACTIVE پیدا نشد'); return; }

  const DEALS = [
    { customerName: 'احمد رضایی',   customerPhone: '09120000001', fromCurrency: 'USD', toCurrency: 'AFN', fromAmount: 500,   toAmount: 44250,   appliedRate: 88.5,  channel: 'ONLINE',    status: 'COMPLETED' },
    { customerName: 'مریم احمدی',   customerPhone: '09120000002', fromCurrency: 'EUR', toCurrency: 'AFN', fromAmount: 300,   toAmount: 28830,   appliedRate: 96.1,  channel: 'ONLINE',    status: 'CONFIRMED' },
    { customerName: 'علی محمدی',    customerPhone: '09120000003', fromCurrency: 'USD', toCurrency: 'AFN', fromAmount: 1000,  toAmount: 89000,   appliedRate: 89.0,  channel: 'INPERSON',  status: 'PENDING' },
    { customerName: 'فاطمه کریمی',  customerPhone: '09120000004', fromCurrency: 'AED', toCurrency: 'AFN', fromAmount: 2000,  toAmount: 48200,   appliedRate: 24.1,  channel: 'ONLINE',    status: 'PENDING' },
    { customerName: 'حسین صادقی',   customerPhone: '09120000005', fromCurrency: 'USD', toCurrency: 'IRR', fromAmount: 200,   toAmount: 1740000, appliedRate: 8700,  channel: 'ONLINE',    status: 'CANCELLED' },
  ];

  let added = 0;
  for (let i = 0; i < DEALS.length; i++) {
    const d = DEALS[i];
    const ex = exchanges[i % exchanges.length];
    const trackingCode = `DL-${Date.now()}-${String(i + 1).padStart(4, '0')}`;
    const existing = await p.currencyDeal.findFirst({ where: { customerPhone: d.customerPhone, exchangeId: ex.id } });
    if (existing) continue;
    await p.currencyDeal.create({
      data: {
        trackingCode,
        exchangeId: ex.id,
        customerName: d.customerName,
        customerPhone: d.customerPhone,
        fromCurrency: d.fromCurrency,
        toCurrency: d.toCurrency,
        fromAmount: d.fromAmount,
        toAmount: d.toAmount,
        appliedRate: d.appliedRate,
        channel: d.channel,
        status: d.status,
        note: 'seed — DEV',
        createdAt: daysAgo(rand(0, 30)),
      },
    });
    added++;
  }
  console.log(`   ✅ ${added} معامله ارزی`);
}

/* ─── Settlements ──────────────────────────────────────────────── */
async function seedSettlements() {
  const existing = await p.settlement.count();
  if (existing >= 2) {
    console.log(`   ⏭️  Settlements قبلاً ایجاد شده (${existing} عدد)`);
    return;
  }

  const exchanges = await p.exchange.findMany({
    where: { status: 'ACTIVE' },
    take: 3,
    select: { id: true, name: true },
  });
  if (exchanges.length === 0) { console.log('   ⚠️  هیچ صرافی ACTIVE پیدا نشد'); return; }

  let added = 0;
  for (let i = 0; i < Math.min(3, exchanges.length); i++) {
    const ex = exchanges[i];
    const periodStart = daysAgo(30);
    const periodEnd   = daysAgo(1);
    const existing = await p.settlement.findFirst({ where: { exchangeId: ex.id, periodStart } });
    if (existing) continue;
    await p.settlement.create({
      data: {
        exchangeId: ex.id,
        periodStart,
        periodEnd,
        totalVolume: BigInt(rand(50_000_000, 500_000_000)),
        dealCount: rand(20, 150),
        platformFee: BigInt(rand(500_000, 5_000_000)),
        exchangeNet: BigInt(rand(45_000_000, 490_000_000)),
        currency: 'AFN',
        status: i === 0 ? 'PAID' : i === 1 ? 'APPROVED' : 'PENDING',
        note: 'seed — DEV',
      },
    });
    added++;
  }
  console.log(`   ✅ ${added} تسویه`);
}

/* ─── Customers + FintechAccounts + Transactions + LedgerEntries ─
 *  این بلوک داده‌ای می‌سازد که داشبورد صراف (exchange-dashboard.ts)
 *  برای نمایش KPI، نمودار هفتگی، top customers و pending queue نیاز دارد.
 * ─────────────────────────────────────────────────────────────── */
async function seedExchangeFintech() {
  const existingCustomers = await p.customer.count();
  if (existingCustomers >= 10) {
    console.log(`   ⏭️  Exchange Fintech data قبلاً ایجاد شده (${existingCustomers} مشتری)`);
    return;
  }

  const { v4: uuid } = require('uuid');

  // فقط ۴ صرافی اول ACTIVE
  const exchanges = await p.exchange.findMany({
    where: { status: 'ACTIVE' },
    take: 4,
    select: { id: true, name: true, primaryCurrency: true },
  });
  if (exchanges.length === 0) { console.log('   ⚠️  صرافی فعال پیدا نشد'); return; }

  // اطلاعات مشتریان نمونه
  const CUSTOMER_TEMPLATES = [
    { fullName: 'احمد رضایی',    phone: '0912111001', city: 'تهران',    status: 'ACTIVE',   kycStatus: 'APPROVED',     kycLevel: 'LEVEL_2' },
    { fullName: 'مریم احمدی',    phone: '0912111002', city: 'کابل',     status: 'ACTIVE',   kycStatus: 'APPROVED',     kycLevel: 'LEVEL_1' },
    { fullName: 'علی محمدی',     phone: '0912111003', city: 'مشهد',     status: 'ACTIVE',   kycStatus: 'PENDING',      kycLevel: 'NONE' },
    { fullName: 'فاطمه کریمی',   phone: '0912111004', city: 'هرات',     status: 'ACTIVE',   kycStatus: 'APPROVED',     kycLevel: 'LEVEL_2' },
    { fullName: 'حسین صادقی',    phone: '0912111005', city: 'اصفهان',   status: 'FROZEN',   kycStatus: 'APPROVED',     kycLevel: 'LEVEL_1' },
    { fullName: 'زینب موسوی',    phone: '0912111006', city: 'تهران',    status: 'ACTIVE',   kycStatus: 'APPROVED',     kycLevel: 'LEVEL_2' },
    { fullName: 'رضا قاسمی',     phone: '0912111007', city: 'کابل',     status: 'ACTIVE',   kycStatus: 'NOT_STARTED',  kycLevel: 'NONE' },
    { fullName: 'نگار حسینی',    phone: '0912111008', city: 'شیراز',    status: 'PROSPECT', kycStatus: 'NOT_STARTED',  kycLevel: 'NONE' },
    { fullName: 'کامران نوری',   phone: '0912111009', city: 'تبریز',    status: 'ACTIVE',   kycStatus: 'APPROVED',     kycLevel: 'LEVEL_1' },
    { fullName: 'سارا جعفری',    phone: '0912111010', city: 'هرات',     status: 'ACTIVE',   kycStatus: 'APPROVED',     kycLevel: 'LEVEL_2' },
    { fullName: 'مهدی ابراهیمی', phone: '0912111011', city: 'تهران',    status: 'ACTIVE',   kycStatus: 'REJECTED',     kycLevel: 'NONE' },
    { fullName: 'لیلا شریفی',    phone: '0912111012', city: 'کرج',      status: 'CLOSED',   kycStatus: 'APPROVED',     kycLevel: 'LEVEL_1' },
  ];

  // نوع‌های تراکنش با احتمال‌های مختلف
  const TX_KINDS = ['DEPOSIT', 'WITHDRAWAL', 'EXCHANGE', 'TRANSFER', 'FEE'];
  const TX_STATUS = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'CANCELLED'];

  let totalCustomers = 0;
  let totalAccounts  = 0;
  let totalTxns      = 0;
  let totalLedger    = 0;
  let totalKyc       = 0;
  let totalFraud     = 0;

  for (const ex of exchanges) {
    const currency = ex.primaryCurrency || 'AFN';

    // — مشتریان: هر صرافی ۴ مشتری اختصاصی —
    const myCustomers = CUSTOMER_TEMPLATES.slice(
      (exchanges.indexOf(ex) * 3) % CUSTOMER_TEMPLATES.length,
    ).slice(0, 4);

    for (const tmpl of myCustomers) {
      // جلوگیری از تکرار (phone + exchangeId)
      const exists = await p.customer.findFirst({
        where: { phone: tmpl.phone, exchangeId: ex.id },
      });
      if (exists) continue;

      const custId = uuid();
      await p.customer.create({
        data: {
          id: custId,
          exchangeId: ex.id,
          fullName: tmpl.fullName,
          phone: tmpl.phone,
          city: tmpl.city,
          status: tmpl.status,
          kycStatus: tmpl.kycStatus,
          kycLevel: tmpl.kycLevel,
          riskScore: rand(0, 30),
          createdAt: daysAgo(rand(10, 180)),
          updatedAt: daysAgo(rand(0, 10)),
        },
      });
      totalCustomers++;

      // — حساب fintech برای هر مشتری —
      const accId = uuid();
      await p.fintechAccount.create({
        data: {
          id: accId,
          exchangeId: ex.id,
          customerId: custId,
          type: 'WALLET',
          currency,
          status: tmpl.status === 'ACTIVE' ? 'ACTIVE' : 'FROZEN',
          balance: BigInt(rand(50_000, 5_000_000)),
          updatedAt: daysAgo(rand(0, 5)),
        },
      });
      totalAccounts++;

      // — KYC verification اگر تأیید یا در انتظار —
      if (tmpl.kycStatus === 'APPROVED' || tmpl.kycStatus === 'PENDING') {
        await p.kycVerification.create({
          data: {
            id: uuid(),
            exchangeId: ex.id,
            customerId: custId,
            level: tmpl.kycLevel === 'NONE' ? 'LEVEL_1' : tmpl.kycLevel,
            status: tmpl.kycStatus,
            docType: 'NATIONAL_ID',
            docNumber: `IR${rand(1000000000, 9999999999)}`,
            createdAt: daysAgo(rand(5, 60)),
            updatedAt: daysAgo(rand(0, 5)),
          },
        });
        totalKyc++;
      }

      // — تراکنش‌های ۳۰ روز اخیر (۵-۱۵ تراکنش) —
      const txCount = rand(5, 15);
      let runningBalance = BigInt(0);
      for (let t = 0; t < txCount; t++) {
        const kind   = TX_KINDS[rand(0, TX_KINDS.length - 1)];
        const status = TX_STATUS[rand(0, TX_STATUS.length - 1)];
        const amount = BigInt(rand(100_000, 2_000_000));
        const txId   = uuid();
        const txDate = daysAgo(rand(0, 29));

        await p.transaction.create({
          data: {
            id: txId,
            exchangeId: ex.id,
            customerId: custId,
            accountId: accId,
            kind,
            status,
            amount,
            currency,
            fee: BigInt(rand(1000, 20000)),
            createdAt: txDate,
            updatedAt: txDate,
          },
        });
        totalTxns++;

        // — Ledger entry جفت (DEBIT/CREDIT) —
        if (status === 'COMPLETED') {
          runningBalance += amount;
          await p.ledgerEntry.create({
            data: {
              id: uuid(),
              exchangeId: ex.id,
              accountId: accId,
              customerId: custId,
              txnId: txId,
              direction: 'CREDIT',
              amount,
              currency,
              runningBalance,
              description: `تراکنش ${kind}`,
              createdAt: txDate,
            },
          });
          totalLedger++;
        }
      }

      // — یک FraudReview برای مشتریان با ریسک بالا —
      if (tmpl.status === 'FROZEN' || rand(0, 10) > 8) {
        await p.fraudReview.create({
          data: {
            id: uuid(),
            exchangeId: ex.id,
            customerId: custId,
            reason: 'تراکنش مشکوک — بررسی الگوی رفتاری',
            riskScore: rand(60, 95),
            status: tmpl.status === 'FROZEN' ? 'OPEN' : 'RESOLVED',
            createdAt: daysAgo(rand(1, 20)),
          },
        });
        totalFraud++;
      }
    }
  }

  console.log(`   ✅ مشتری: ${totalCustomers} | حساب: ${totalAccounts} | تراکنش: ${totalTxns} | دفتر: ${totalLedger} | KYC: ${totalKyc} | تقلب: ${totalFraud}`);
}

/* ─── ExchangeStaff ───────────────────────────────────────────── */
async function seedExchangeStaff() {
  const existing = await p.exchangeStaff.count();
  if (existing >= 2) {
    console.log(`   ⏭️  ExchangeStaff قبلاً ایجاد شده (${existing} عدد)`);
    return;
  }

  // مالک (OWNER) را به عنوان OWNER اولین صرافی فعال اضافه می‌کنیم
  const owner = await p.user.findFirst({ where: { role: 'OWNER' } });
  const admin = await p.user.findFirst({ where: { role: 'ADMIN' } });
  const exchanges = await p.exchange.findMany({
    where: { status: 'ACTIVE' },
    take: 3,
    select: { id: true, name: true },
  });
  if (!owner || exchanges.length === 0) { console.log('   ⚠️  کاربر OWNER یا صرافی پیدا نشد'); return; }

  const { v4: uuid } = require('uuid');
  let added = 0;

  // مالک به عنوان OWNER اولین صرافی
  const ex1 = exchanges[0];
  const exists1 = await p.exchangeStaff.findUnique({
    where: { exchangeId_userId: { exchangeId: ex1.id, userId: owner.id } },
  });
  if (!exists1) {
    await p.exchangeStaff.create({
      data: { id: uuid(), exchangeId: ex1.id, userId: owner.id, role: 'OWNER', title: 'مالک صرافی' },
    });
    added++;
  }

  // ادمین به عنوان MANAGER صرافی دوم
  if (admin && exchanges.length >= 2) {
    const ex2 = exchanges[1];
    const exists2 = await p.exchangeStaff.findUnique({
      where: { exchangeId_userId: { exchangeId: ex2.id, userId: admin.id } },
    });
    if (!exists2) {
      await p.exchangeStaff.create({
        data: { id: uuid(), exchangeId: ex2.id, userId: admin.id, role: 'MANAGER', title: 'مدیر صرافی' },
      });
      added++;
    }
  }

  console.log(`   ✅ ${added} کارمند صرافی`);
}

/* ─── ContactSubmissions ──────────────────────────────────────── */
async function seedContactSubmissions() {
  const existing = await p.contactSubmission.count();
  if (existing >= 3) {
    console.log(`   ⏭️  ContactSubmissions قبلاً ایجاد شده (${existing} عدد)`);
    return;
  }
  const { v4: uuid } = require('uuid');
  const CONTACTS = [
    { name: 'احمد رضایی',  email: 'ahmad@test.ir',  subject: 'سوال درباره حواله',       message: 'آیا می‌توانم از افغانستان به ایران حواله ارسال کنم؟', status: 'NEW' },
    { name: 'مریم کریمی',  email: 'maryam@test.ir', subject: 'مشکل پرداخت',             message: 'پرداختم گیر کرده — لطفاً بررسی کنید.', status: 'IN_PROGRESS' },
    { name: 'علی محمدی',   email: 'ali@test.ir',    subject: 'پیشنهاد بهبود سایت',      message: 'پیشنهاد می‌دهم نمودار قیمت ارز اضافه شود.', status: 'RESOLVED' },
    { name: 'فاطمه نوری',  email: 'fateme@test.ir', subject: 'درخواست همکاری صرافی',    message: 'صرافی ما می‌خواهد در پلتفرم شما ثبت شود.', status: 'NEW' },
  ];
  let added = 0;
  for (const c of CONTACTS) {
    await p.contactSubmission.create({
      data: {
        id: uuid(),
        name: c.name,
        email: c.email,
        subject: c.subject,
        message: c.message,
        status: c.status,
        updatedAt: new Date(),
        createdAt: daysAgo(rand(1, 30)),
      },
    });
    added++;
  }
  console.log(`   ✅ ${added} پیام تماس`);
}

/* ─── SubscriptionEvents ──────────────────────────────────────── */
async function seedSubscriptionEvents() {
  const existing = await p.subscriptionEvent.count();
  if (existing >= 2) {
    console.log(`   ⏭️  SubscriptionEvents قبلاً ایجاد شده (${existing} عدد)`);
    return;
  }
  const { v4: uuid } = require('uuid');
  const users = await p.user.findMany({ take: 4, select: { id: true } });
  if (users.length === 0) { console.log('   ⚠️  کاربری پیدا نشد'); return; }

  const PLANS = [
    { fromPlan: null,      toPlan: 'FREE',    kind: 'UPGRADE',    amount: 0,       status: 'PAID' },
    { fromPlan: 'FREE',    toPlan: 'BASIC',   kind: 'UPGRADE',    amount: 500000,  status: 'PAID' },
    { fromPlan: 'BASIC',   toPlan: 'PRO',     kind: 'UPGRADE',    amount: 1500000, status: 'PAID' },
    { fromPlan: 'PRO',     toPlan: 'BASIC',   kind: 'DOWNGRADE',  amount: 0,       status: 'PAID' },
  ];

  let added = 0;
  for (let i = 0; i < Math.min(PLANS.length, users.length); i++) {
    const plan = PLANS[i];
    const user = users[i];
    await p.subscriptionEvent.create({
      data: {
        id: uuid(),
        userId: user.id,
        kind: plan.kind,
        fromPlan: plan.fromPlan,
        toPlan: plan.toPlan,
        amount: BigInt(plan.amount),
        currency: 'AFN',
        status: plan.status,
        validUntil: plan.toPlan !== 'FREE' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
        createdAt: daysAgo(rand(1, 60)),
      },
    });
    added++;
  }
  console.log(`   ✅ ${added} رویداد اشتراک`);
}

/* ─── ServiceClicks (analytics sample) ───────────────────────── */
async function seedServiceClicks() {
  const existing = await p.serviceClick.count();
  if (existing >= 10) {
    console.log(`   ⏭️  ServiceClicks قبلاً ایجاد شده (${existing} عدد)`);
    return;
  }
  const exchanges = await p.exchange.findMany({
    where: { status: 'ACTIVE' },
    take: 4,
    select: { id: true },
  });
  if (exchanges.length === 0) { console.log('   ⚠️  صرافی فعال پیدا نشد'); return; }

  const SERVICES = ['CURRENCY_BUY', 'INTERNATIONAL_TRANSFER', 'ONLINE_PAYMENT', 'CRYPTO_BUY', 'CURRENCY_SELL'];
  const SOURCES  = ['exchange-page', 'marketplace', 'homepage', 'comparison-table'];

  let added = 0;
  for (let i = 0; i < 20; i++) {
    const ex = exchanges[i % exchanges.length];
    await p.serviceClick.create({
      data: {
        exchangeId: ex.id,
        serviceKey: SERVICES[i % SERVICES.length],
        source: SOURCES[i % SOURCES.length],
        ipAddress: randIP(),
        createdAt: daysAgo(rand(0, 14)),
      },
    });
    added++;
  }
  console.log(`   ✅ ${added} کلیک سرویس (analytics)`);
}

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

  console.log('\n1️⃣4️⃣b  HeaderAd:');
  await seedHeaderAd();

  console.log('\n1️⃣4️⃣c  Advertisements:');
  await seedAdvertisements();

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

  console.log('\n2️⃣0️⃣b  Tasks:');
  await seedTasks(users);

  console.log('\n2️⃣1️⃣  ExchangeRates:');
  await seedExchangeRates();

  console.log('\n2️⃣2️⃣  Exchanges + linked TransferProviders:');
  await seedExchangesAndProviders();

  console.log('\n2️⃣3️⃣  Legacy TransferProviders (market-mid + tgju):');
  await seedTransferProviders();

  console.log('\n2️⃣4️⃣  Sample ExchangeRateQuotes (DEV):');
  await seedExchangeQuotes();

  console.log('\n2️⃣5️⃣  ExchangeServices:');
  await seedExchangeServices();

  console.log('\n2️⃣6️⃣  Banks:');
  await seedBanks();

  console.log('\n2️⃣7️⃣  CreditRates:');
  await seedCreditRates();

  console.log('\n2️⃣8️⃣  CurrencyDeals:');
  await seedCurrencyDeals();

  console.log('\n2️⃣9️⃣  Settlements:');
  await seedSettlements();

  console.log('\n3️⃣0️⃣  Exchange Fintech (Customers + Accounts + Transactions + KYC + Fraud):');
  await seedExchangeFintech();

  console.log('\n3️⃣1️⃣  ExchangeStaff:');
  await seedExchangeStaff();

  console.log('\n3️⃣2️⃣  ContactSubmissions:');
  await seedContactSubmissions();

  console.log('\n3️⃣3️⃣  SubscriptionEvents:');
  await seedSubscriptionEvents();

  console.log('\n3️⃣4️⃣  ServiceClicks:');
  await seedServiceClicks();

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
    newsletters: await p.newsletter.count(),
    socialLinks: await p.socialLink.count(),
    headerAds: await p.headerAd.count(),
    advertisements: await p.advertisement.count(),
    rateLists: await p.rateList.count(),
    serviceRequests: await p.serviceRequest.count(),
    systemLogs: await p.systemLog.count(),
    pageViews: await p.pageView.count(),
    currencyPatterns: await p.currencyPattern.count(),
    accounts: await p.account.count(),
    tasks: await p.task.count(),
    exchanges: await p.exchange.count(),
    transferProviders: await p.transferProvider.count(),
    exchangeServices: await p.exchangeService.count(),
    customers:        await p.customer.count(),
    fintechAccounts:  await p.fintechAccount.count(),
    transactions:     await p.transaction.count(),
    ledgerEntries:    await p.ledgerEntry.count(),
    kycVerifications: await p.kycVerification.count(),
    fraudReviews:     await p.fraudReview.count(),
    exchangeStaff:    await p.exchangeStaff.count(),
    banks:            await p.bank.count(),
    creditRates:      await p.creditRate.count(),
    currencyDeals:    await p.currencyDeal.count(),
    settlements:      await p.settlement.count(),
    serviceClicks:    await p.serviceClick.count(),
    contactSubmissions: await p.contactSubmission.count(),
    subscriptionEvents: await p.subscriptionEvent.count(),
  };
  console.log(`\n${'═'.repeat(50)}`);
  console.log('📊 آمار نهایی دیتابیس:');
  Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => {
      console.log(`   ${k.padEnd(20)}: ${v.toString().padStart(6)}`);
    });
  console.log('═'.repeat(50));

  /* ─── نمایش مشخصات مالک (OWNER) در صورت ایجاد جدید ─── */
  if (seededOwner) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log('🔐 مشخصات مالک / OWNER (ذخیره کنید):');
    console.log('   Email:', seededOwner.email);
    if (seededOwner.source === 'generated') {
      console.log('   Password:', seededOwner.password);
      console.log('   (تولید تصادفی چون SEED_OWNER_PASSWORD تنظیم نشده بود)');
    } else {
      console.log('   Password: <از متغیر محیطی SEED_OWNER_PASSWORD>');
    }
    console.log('═'.repeat(50));
  }

  console.log('\n✨ Seed کامل با موفقیت تمام شد!');
}

main()
  .catch((e) => {
    console.error('\n❌ خطای کلی:', e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
