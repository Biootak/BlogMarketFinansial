/* prisma/seed.js
 * =============================================================
 * Database Seed کامل پروژه BlogMarketFinansial
 * =============================================================
 * این اسکریپت همه داده‌های نمونه مورد نیاز برای تست عملکرد
 * را در یک‌بار اجرا در دیتابیس درج می‌کند.
 *
 * ویژگی‌ها:
 *   - فقط وقتی SEED_WIPE=true باشد داده‌های قبلی TRUNCATE می‌شوند؛
 *     در غیر این صورت idempotent است (در دیپلوی‌های بعدی امن)
 *   - Comprehensive: همه مدل‌های Prisma را پوشش می‌دهد
 *   - ترتیب وابستگی‌ها (foreign keys) رعایت شده
 *   - داده‌ها واقع‌گرایانه‌اند: تاریخ‌ها در طول عمر سایت (> ۱ سال) پخش شده،
 *     نام‌ها/شماره‌ها/ایمیل‌ها واقعی‌نما، بازدیدها همبسته با سن پست
 *   - مالک (OWNER): هرگز از seed ساخته نمی‌شود — ساخت مالک فقط و فقط از
 *     صفحه /setup ممکن است (یک‌بار برای همیشه). wipe هم حساب مالک را
 *     حفظ می‌کند.
 *
 * متغیرهای محیطی:
 *   SEED_WIPE           (اختیاری) — true/1 = پاکسازی کامل قبل از seed
 *     (مالک/OWNER هرگز پاک نمی‌شود)
 *
 * اجرا:
 *   node prisma/seed.js              (بدون پاکسازی — idempotent)
 *   SEED_WIPE=true node prisma/seed.js (پاکسازی + seed کامل)
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
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
/** تاریخ تصادفی بین createdAt یک رکورد و امروز — برای کامنت/لایک/بازدید */
function afterDate(baseDate, minDays, maxDays) {
  const age = (Date.now() - new Date(baseDate).getTime()) / (24 * 60 * 60 * 1000);
  const lo = Math.max(0, Math.min(age, minDays ?? 0));
  const hi = Math.max(lo, Math.min(age, maxDays ?? age));
  return daysAgo(Math.floor(age - rand(lo, hi)));
}
/** آی‌پی‌های واقع‌گرایانه — رنج‌های ایران و افغانستان (به‌جای ۲۵۵.۲۵۵.۲۵۵) */
const IR_IP_PREFIXES = [
  '5.112',
  '46.32',
  '78.39',
  '91.99',
  '94.182',
  '128.65',
  '151.238',
  '185.126',
  '213.217',
  '37.63',
  '93.110',
  '5.234',
];
const AF_IP_PREFIXES = [
  '103.91',
  '113.203',
  '124.29',
  '149.20',
  '182.180',
  '202.162',
  '103.21',
  '197.154',
];
function randIP() {
  const prefix = pick([...IR_IP_PREFIXES, ...AF_IP_PREFIXES]);
  return `${prefix}.${rand(1, 254)}`;
}
/** شماره موبایل افغانستان: +93 7X XXX XXXX */
function afghanPhone() {
  return `+937${rand(0, 9)}${rand(1000000, 9999999)}`;
}
/** شماره موبایل ایران: 09XX XXX XXXX */
function iranPhone() {
  return `09${rand(100000000, 999999999)}`;
}
/* ─── wipe: پاکسازی کامل دیتابیس قبل از seed ───────────────────
 * فقط وقتی SEED_WIPE=true تنظیم شده باشد اجرا می‌شود — تا دیپلوی‌های
 * بعدی (که seed در build-time اجرا می‌شود) دیتابیس production را پاک نکنند.
 * ─────────────────────────────────────────────────────────────── */
async function wipeDatabase() {
  console.log('🗑️  پاکسازی کامل دیتابیس (حذف داده‌های قبلی)...');

  // ── حفاظت مالک: حساب OWNER/SUPERADMIN هرگز پاک نمی‌شود، حتی در wipe. ──
  // اگر کسی SEED_WIPE را روی production اجرا کند (سهوا یا عمداً)، مالک
  // (که فقط از طریق /setup ساخته می‌شود) از بین نمی‌رود — فقط کاربران
  // عادی حذف و دوباره سید می‌شوند.
  const owners = await p.user.findMany({
    where: { role: { in: ['OWNER', 'SUPERADMIN'] } },
    select: { id: true, email: true },
  });

  const tables = await p.$queryRawUnsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  if (tables.length === 0) {
    console.log('   (دیتابیس خالی است)');
    return;
  }
  const allNames = tables.map((t) => `"${t.tablename}"`);

  if (owners.length > 0) {
    // جدول User از TRUNCATE خارج می‌شود؛ فقط کاربران غیرمالک حذف می‌شوند.
    // (بقیه‌ی جدول‌ها CASCADE می‌شوند؛ User در لیست نیست پس دست‌نخورده می‌ماند.)
    const withoutUser = allNames.filter((t) => t !== '"User"');
    if (withoutUser.length > 0) {
      await p.$executeRawUnsafe(
        `TRUNCATE TABLE ${withoutUser.join(', ')} RESTART IDENTITY CASCADE`,
      );
    }
    await p.$executeRawUnsafe(`DELETE FROM "User" WHERE role NOT IN ('OWNER', 'SUPERADMIN')`);
    console.log(
      `   ✅ ${withoutUser.length} جدول پاکسازی شد؛ ${owners.length} حساب مالک (OWNER) حفظ شد`,
    );
    for (const o of owners) {
      console.log(`   🔒 مالک حفظ شد: ${o.email}`);
    }
  } else {
    await p.$executeRawUnsafe(`TRUNCATE TABLE ${allNames.join(', ')} RESTART IDENTITY CASCADE`);
    console.log(`   ✅ ${allNames.length} جدول پاکسازی شد`);
  }
}

/* ─── step: اجرای هر بخش با تلاش مجدد روی خطاهای موقتی اتصال ── */
function isConnError(e) {
  return !!(
    e &&
    (e.code === 'P1001' ||
      e.code === 'P1008' ||
      e.code === 'P1017' ||
      /Can't reach database|connection.*(?:closed|reset|timed out|terminated)/i.test(
        e.message || '',
      ))
  );
}
async function step(label, fn) {
  console.log(label);
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!isConnError(e) || attempt === 5) throw e;
      console.log(`   🔁 اتصال موقتاً قطع شد — تلاش مجدد (${attempt}/4)...`);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
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
      siteUrl: 'https://financialmarket.page',
      contactEmail: 'info@financialmarket.af',
      contactPhone: '+93701234567',
      contactAddress: 'کابل، شهر نو، سرک حاجی نجار، مارکت مالی',
      maintenanceMode: false,
      cacheEnabled: true,
      smtpServer: 'smtp.resend.com',
      smtpPort: '465',
      smtpUsername: 'resend',
      telegram: 'https://t.me/blogmarket',
      instagram: 'https://instagram.com/blogmarket',
      whatsapp: 'https://wa.me/93701234567',
      twitter: 'https://twitter.com/blogmarket',
    },
  });
  console.log('   ✅ SystemSettings ایجاد شد');
  return created;
}

/* ─── 2) Users (نویسنده، ادمین، کاربر عادی) ──────────────────── */
async function seedUsers() {
  // امنیت: مالک (OWNER) هرگز از seed ساخته نمی‌شود — ساخت مالک فقط از
  // صفحه /setup ممکن است تا هیچ مسیر جانبی (env، اسکریپت، دیپلوی) نتواند
  // یک مالک دوم بسازد یا /setup را بلاک کند.
  const samplePassword = await bcrypt.hash('Password123!', 10);

  // ── تیم سایت — نام/ایمیل/شماره واقعی‌نما، عضویت از ماه‌های قبل ──
  const usersData = [
    {
      id: 'cm5qdrd3e0001m4zli12b2rd5',
      name: 'امید رحیمی',
      email: 'omid.rahimi@financialmarket.af',
      role: 'AUTHOR',
      status: 'Active',
      phoneNumber: '+93701234567',
      image: 'https://i.pravatar.cc/150?img=12',
      createdAt: daysAgo(rand(360, 410)),
    },
    {
      id: 'cm5qnptpb0001v8tnms9kwp6j',
      name: 'بهرام قادری',
      email: 'bahram.ghaderi@financialmarket.af',
      role: 'ADMIN',
      status: 'Active',
      phoneNumber: '09121234567',
      image: 'https://i.pravatar.cc/150?img=33',
      createdAt: daysAgo(rand(330, 380)),
    },
    {
      id: 'cmqcm407d0002vjpsihhfla61',
      name: 'سارا محمدی',
      email: 'sara.mohammadi@financialmarket.af',
      role: 'AUTHOR',
      status: 'Active',
      phoneNumber: '+93713334455',
      image: 'https://i.pravatar.cc/150?img=47',
      createdAt: daysAgo(rand(280, 340)),
    },
    {
      id: 'cmqcm407d0002vjpsihhfla62',
      name: 'تیم تحریریه',
      email: 'editorial@financialmarket.af',
      role: 'AUTHOR',
      status: 'Active',
      image: 'https://i.pravatar.cc/150?img=5',
      createdAt: daysAgo(rand(400, 440)),
    },
    {
      id: 'cmqcm407d0002vjpsihhfla63',
      name: 'نرگس احمدی',
      email: 'narges.ahmadi@financialmarket.af',
      role: 'SUPPORT',
      status: 'Active',
      phoneNumber: '+93702333445',
      image: 'https://i.pravatar.cc/150?img=20',
      createdAt: daysAgo(rand(220, 280)),
    },
    {
      id: 'cmqcm407d0002vjpsihhfla64',
      name: 'محمد عظیمی',
      email: 'm.azimi@sarafi.af',
      role: 'EXCHANGE',
      status: 'Active',
      phoneNumber: '+93704455667',
      image: 'https://i.pravatar.cc/150?img=15',
      createdAt: daysAgo(rand(180, 240)),
    },
  ];

  const created = [];
  for (const u of usersData) {
    const exists = await p.user.findUnique({ where: { id: u.id } });
    if (exists) {
      created.push(exists);
      continue;
    }
    const user = await p.user.create({
      data: {
        ...u,
        password: samplePassword,
        emailVerified: addDays(u.createdAt, rand(1, 5)),
      },
    });
    created.push(user);
  }

  // ── کاربران عادی — افغانستان + ایران، عضویت از ۱ هفته تا ~۱۳ ماه قبل ──
  const normalUsers = [
    {
      name: 'احمد رحیمی',
      email: 'ahmad.rahimi@gmail.com',
      phoneNumber: '+93701239876',
      city: 'کابل',
    },
    {
      name: 'مریم نوری',
      email: 'maryam.nouri@gmail.com',
      phoneNumber: '+93713334455',
      city: 'هرات',
    },
    {
      name: 'عبدالرحمن عظیمی',
      email: 'abdulrahman.azimi@gmail.com',
      phoneNumber: '+93774455667',
      city: 'مزار شریف',
    },
    {
      name: 'حسین رضایی',
      email: 'hossein.rezaei@gmail.com',
      phoneNumber: '09124567890',
      city: 'تهران',
    },
    {
      name: 'زهرا کریمی',
      email: 'zahra.karimi@gmail.com',
      phoneNumber: '+93715566778',
      city: 'کابل',
    },
    {
      name: 'فرشته احمدی',
      email: 'fereshte.ahmadi@gmail.com',
      phoneNumber: '+93726677889',
      city: 'هرات',
    },
    {
      name: 'رضا قاسمی',
      email: 'reza.ghasemi@gmail.com',
      phoneNumber: '09135566778',
      city: 'مشهد',
    },
    {
      name: 'وحیدالله صافی',
      email: 'wahid.safi@gmail.com',
      phoneNumber: '+93737788990',
      city: 'قندهار',
    },
    {
      name: 'فاطمه موسوی',
      email: 'fateme.mousavi@gmail.com',
      phoneNumber: '09126677889',
      city: 'اصفهان',
    },
    {
      name: 'سمیع‌الله نوری',
      email: 'sami.noori@gmail.com',
      phoneNumber: '+93748899001',
      city: 'بلخ',
    },
    {
      name: 'نگار صادقی',
      email: 'negar.sadeghi@gmail.com',
      phoneNumber: '09147788990',
      city: 'شیراز',
    },
    {
      name: 'ظاهر حسینی',
      email: 'zaher.hosseini@gmail.com',
      phoneNumber: '+93759900112',
      city: 'جلال‌آباد',
    },
    {
      name: 'علی محمدی',
      email: 'ali.mohammadi@gmail.com',
      phoneNumber: '09158899001',
      city: 'تبریز',
    },
    {
      name: 'حمیرا شریفی',
      email: 'homeira.sharifi@gmail.com',
      phoneNumber: '+93760011223',
      city: 'هرات',
    },
  ];
  for (const u of normalUsers) {
    const exists = await p.user.findUnique({ where: { email: u.email } });
    if (exists) {
      created.push(exists);
      continue;
    }
    const joinedAt = daysAgo(rand(7, 390));
    const { city, ...userFields } = u; // city فقط برای اطلاعات است — در مدل User نیست
    const user = await p.user.create({
      data: {
        ...userFields,
        password: samplePassword,
        status: 'Active',
        image: `https://i.pravatar.cc/150?img=${rand(1, 70)}`,
        emailVerified: addDays(joinedAt, rand(1, 3)),
        createdAt: joinedAt,
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
  const AUTHORS = await p.user.findMany({
    where: { role: 'AUTHOR' },
    select: { id: true },
  });
  if (AUTHORS.length === 0) {
    console.log('   ⚠️  نویسنده‌ای برای پست‌ها یافت نشد');
    return;
  }
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

    // انتشار در طول ~۱۳ ماه گذشته پخش می‌شود تا سایت قدیمی به نظر برسد
    const publishedAt = daysAgo(rand(3, 400));
    const featured = !!post.featured;
    // بازدید با سن پست همبسته است — پست قدیمی‌تر بازدید بیشتری دارد
    const ageDays = (Date.now() - publishedAt.getTime()) / (24 * 60 * 60 * 1000);
    const viewCount = Math.min(
      60000,
      Math.round(ageDays * (featured ? 42 : 16) * (0.75 + Math.random() * 0.5)),
    );
    const author = AUTHORS[i % AUTHORS.length] || AUTHORS[0];

    const data = {
      title: post.title,
      slug: uniqueSlug,
      excerpt: post.excerpt,
      content: tipDoc(post.blocks),
      featuredImage: post.image,
      status: 'PUBLISHED',
      postType: post.type || 'STANDARD',
      isFeatured: featured,
      viewCount,
      readingTime,
      authorId: author.id,
      createdAt: publishedAt,
      updatedAt: addDays(publishedAt, rand(0, 20)),
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
// دیدگاه‌های مرتبط با موضوع مقاله — به‌جای متن‌های تکراری عمومی
const TOPIC_COMMENTS = {
  crypto: [
    'تحلیل خوبی بود، ولی به نظر من نوسانات بیت‌کوین در کوتاه‌مدت قابل پیش‌بینی نیست.',
    'من چند ساله در این بازار هستم؛ دقیقاً همین نکته‌ای که گفتید باعث ضرر خیلی‌ها شده.',
    'کاش در مورد ریسک نگهداری دارایی در صرافی‌ها هم بیشتر توضیح می‌دادید.',
    'با این تحلیل موافقم، مخصوصاً بخش مربوط به ETFها.',
    'سؤال: همین الان برای خرید وارد شویم یا منتظر اصلاح بمانیم؟',
    'مطلب مفیدی بود؛ لطفاً نمودارهای بیشتری بگذارید.',
  ],
  gold: [
    'با توجه به تورم منطقه، به نظر من طلا هنوز جای رشد دارد.',
    'تحلیل خوبی بود؛ ولی قیمت سکه در بازار ما همیشه یک حباب دارد.',
    'من از پارسال سکه خریدم و سود خوبی کردم؛ ولی الان ریسکش بالاست.',
    'اونس طلا این هفته خیلی نوسان داشت؛ لطفاً تحلیل هفتگی را ادامه بدهید.',
    'ممنون از مقاله؛ لطفاً در مورد حباب سکه هم مطلب بنویسید.',
  ],
  stocks: [
    'بازار سهام این روزها واقعاً غیرقابل پیش‌بینی شده.',
    'کاش می‌گفتید کدام گروه الان ارزنده‌تر است.',
    'تحلیل خوبی بود، ولی نباید فقط P/E کل بازار را ملاک قرار داد.',
    'ممنون؛ منتظر تحلیل گروه فلزات اساسی هستم.',
  ],
  analysis: [
    'این سبک تحلیل برای من تازه بود؛ خیلی روان توضیح دادید.',
    'لطفاً یک مقاله کامل درباره پرایس اکشن بنویسید.',
    'نمودارها خیلی کمک‌کننده بودند؛ منبع داده‌هایتان کجاست؟',
    'کاش فایل PDF تحلیل را هم می‌گذاشتید.',
  ],
  news: [
    'خبر مهمی بود؛ ممنون که سریع پوشش دادید.',
    'منبع این خبر کجاست؟ لطفاً لینک بگذارید.',
    'به‌روزرسانی بعدی این خبر کی منتشر می‌شود؟',
  ],
  general: [
    'مقاله بسیار مفیدی بود، ممنون از تیم تحریریه.',
    'عالی! منتظر مقاله بعدی شما هستم.',
    'این تحلیل خیلی به‌درد من خورد، تشکر.',
    'خیلی ساده و روان توضیح دادید، سپاسگزارم.',
  ],
};

function pickTopicPool(post) {
  const text = `${post.title || ''} ${post.slug || ''}`;
  if (
    /(بیت|کریپتو|ارز دیجیتال|بلاکچین|توکن|NFT|ماینینگ|کیف پول|اتریوم|صرافی|وب ۳|دیفای|متامسک|فانتوم|بیت‌کوین)/.test(
      text,
    )
  )
    return TOPIC_COMMENTS.crypto;
  if (/(طلا|سکه|اونس|حباب)/.test(text)) return TOPIC_COMMENTS.gold;
  if (/(بورس|سهام|شاخص|سرمایه‌گذاری|صندوق|IPO)/.test(text)) return TOPIC_COMMENTS.stocks;
  if (/(تحلیل|تکنیکال|نمودار|کندل|DXY)/.test(text)) return TOPIC_COMMENTS.analysis;
  if (/(خبر|رکورد|فوری)/.test(text)) return TOPIC_COMMENTS.news;
  return TOPIC_COMMENTS.general;
}

async function seedComments(users, posts) {
  const existingCount = await p.comment.count();
  if (existingCount > 0) {
    console.log(`   ⏭️  دیدگاه‌ها قبلاً ایجاد شده (${existingCount} عدد)`);
    return;
  }
  const normalUsers = users.filter((u) => u.role === 'USER');
  if (normalUsers.length === 0) {
    console.log('   ⚠️  کاربر عادی برای دیدگاه یافت نشد');
    return;
  }
  const staff = users.filter((u) => ['AUTHOR', 'ADMIN', 'SUPPORT'].includes(u.role));
  const replies = [
    'ممنون از بازخورد شما.',
    'در مقاله بعدی به این موضوع می‌پردازیم.',
    'دقیقاً، همین نکته خیلی مهمه.',
    'تجربیات شما همیشه ارزشمنده.',
    'موافقم؛ پیشنهاد خوبیه.',
  ];

  let added = 0;
  for (const post of posts) {
    // تعداد دیدگاه متناسب با بازدید مقاله — مقاله پرمخاطب کامنت بیشتری دارد
    const baseCount = Math.round(post.viewCount / 700);
    const count = Math.min(14, Math.max(0, baseCount + rand(-1, 2)));
    for (let i = 0; i < count; i++) {
      const author = pick(normalUsers);
      const createdAt = afterDate(post.createdAt, 0, 180);
      const data = {
        content: pick(pickTopicPool(post)),
        postId: post.id,
        authorId: author.id,
        approved: Math.random() > 0.12,
        createdAt,
      };
      const created = await p.comment.create({ data });
      added++;
      // ~۲۰٪ دیدگاه‌ها پاسخ دارند (کاربر دیگر یا تیم)
      if (Math.random() > 0.8) {
        const replierPool = Math.random() > 0.4 ? normalUsers : staff;
        const replier = pick(replierPool.filter((u) => u.id !== author.id)) || pick(replierPool);
        await p.comment.create({
          data: {
            content: pick(replies),
            postId: post.id,
            authorId: replier.id,
            parentId: created.id,
            approved: true,
            createdAt: afterDate(createdAt, 0, 10),
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
    const rows = likers.map((user) => ({
      userId: user.id,
      postId: post.id,
      createdAt: afterDate(post.createdAt, 0, 120),
    }));
    if (rows.length) {
      const res = await p.like.createMany({ data: rows, skipDuplicates: true });
      added += res.count;
    }
  }
  // Like روی دیدگاه‌ها
  const comments = await p.comment.findMany({ take: 100 });
  const cRows = [];
  for (const c of comments) {
    if (Math.random() > 0.4) continue;
    const liker = pick(normalUsers);
    cRows.push({
      userId: liker.id,
      commentId: c.id,
      createdAt: afterDate(c.createdAt, 0, 30),
    });
  }
  if (cRows.length) {
    const res = await p.like.createMany({ data: cRows, skipDuplicates: true });
    added += res.count;
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
    const count = rand(8, 30);
    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push({
        postId: post.id,
        ip: randIP(),
        userAgent: pick(userAgents),
        createdAt: afterDate(post.createdAt, 0, 120),
      });
    }
    const res = await p.view.createMany({ data: rows });
    added += res.count;
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
    const rows = shuffled.map((post) => ({
      userId: user.id,
      postId: post.id,
      createdAt: afterDate(post.createdAt, 0, 120),
    }));
    if (!rows.length) continue;
    const res = await p.savedPost.createMany({ data: rows, skipDuplicates: true });
    added += res.count;
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
    'دیدگاه شما توسط مدیر تأیید شد.',
    'پست ذخیره‌شده شما به‌روزرسانی شد.',
    'نرخ جدید در دسته {cat} ثبت شد.',
  ];
  const rows = [];
  for (const user of normalUsers) {
    const count = rand(2, 6);
    for (let i = 0; i < count; i++) {
      const tpl = pick(samples);
      rows.push({
        userId: user.id,
        message: tpl
          .replace('{user}', pick(users).name || 'کاربر')
          .replace('{cat}', pick(['طلا', 'بیت‌کوین', 'بورس', 'ارز', 'سرمایه‌گذاری'])),
        createdAt: daysAgo(rand(0, 90)),
      });
    }
  }
  let added = 0;
  if (rows.length) {
    const res = await p.notification.createMany({ data: rows });
    added += res.count;
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
    ['LOGIN', 'وارد حساب کاربری شد'],
    ['POST_VIEW', 'مقاله «{t}» را مشاهده کرد'],
    ['POST_LIKE', 'مقاله «{t}» را پسندید'],
    ['COMMENT_ADD', 'روی مقاله «{t}» دیدگاه گذاشت'],
    ['PROFILE_UPDATE', 'پروفایل خود را به‌روزرسانی کرد'],
    ['POST_CREATE', 'مقاله جدید «{t}» منتشر شد'],
    ['PASSWORD_CHANGE', 'رمز عبور خود را تغییر داد'],
    ['NEWSLETTER_SUBSCRIBE', 'در خبرنامه عضویت کرد'],
  ];
  const topics = [
    'تحلیل طلا',
    'پیش‌بینی بیت‌کوین',
    'بازار بورس',
    'راهنمای کیف پول',
    'نرخ لحظه‌ای ارز',
  ];
  const rows = [];
  for (const user of users) {
    const count = rand(3, 10);
    for (let i = 0; i < count; i++) {
      const [action, tpl] = pick(actions);
      rows.push({
        userId: user.id,
        action,
        details: tpl.replace('{t}', pick(topics)),
        createdAt: daysAgo(rand(1, 380)),
      });
    }
  }
  let added = 0;
  if (rows.length) {
    const res = await p.activityLog.createMany({ data: rows });
    added += res.count;
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
    'm.karimi@gmail.com',
    's.tawakoli@yahoo.com',
    'a.rahimi@outlook.com',
    'noori.mohammad@gmail.com',
    'zahra.sadeghi@yahoo.com',
    'h.azizi@gmail.com',
    'fereshte.a@outlook.com',
    'wali.mohmand@gmail.com',
  ];
  const rows = emails.map((email) => ({
    email,
    isActive: true,
    createdAt: daysAgo(rand(30, 200)),
  }));
  const res = await p.newsletter.createMany({ data: rows, skipDuplicates: true });
  console.log(`   ✅ ${res.count} عضو خبرنامه`);
}

/* ─── 14) SocialLinks ──────────────────────────────────────── */
async function seedSocialLinks() {
  const links = [
    {
      name: 'Telegram',
      url: 'https://t.me/blogmarket',
      icon: null,
      color: '#0088cc',
      type: 'SOCIAL',
      order: 1,
      // nonaktif: URL placeholder است و آیکون برند ندارد.
      // از پنل تنظیمات آپلود کنید.
      isActive: false,
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com/blogmarket',
      icon: null,
      color: '#E4405F',
      type: 'SOCIAL',
      order: 2,
      isActive: false,
    },
    {
      name: 'Twitter',
      url: 'https://twitter.com/blogmarket',
      icon: null,
      color: '#1DA1F2',
      type: 'SOCIAL',
      order: 3,
      isActive: false,
    },
    {
      name: 'WhatsApp',
      url: 'https://wa.me/989120000000',
      icon: null,
      color: '#25D366',
      type: 'SUPPORT',
      order: 1,
      isActive: false,
    },
    {
      name: 'YouTube',
      url: 'https://youtube.com/@blogmarket',
      icon: null,
      color: '#FF0000',
      type: 'SOCIAL',
      order: 4,
      isActive: false,
    },
    {
      name: 'LinkedIn',
      url: 'https://linkedin.com/company/blogmarket',
      icon: null,
      color: '#0A66C2',
      type: 'SOCIAL',
      order: 5,
      isActive: false,
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
      imageUrl: 'https://placehold.co/600x200/2563eb/ffffff.png?text=Technical+Analysis',
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
      imageUrl: 'https://placehold.co/300x250/059669/ffffff.png?text=Currency+Consulting',
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
      imageUrl: 'https://placehold.co/728x90/d97706/ffffff.png?text=Exchange+Banner',
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
  const existingCount = await p.serviceRequest.count();
  if (existingCount >= 30) {
    console.log(`   ⏭️  ServiceRequests قبلاً ایجاد شده (${existingCount} عدد)`);
    return;
  }
  const admin = await p.user.findFirst({ where: { role: { in: ['ADMIN', 'OWNER'] } } });
  const afghanExchanges = await p.exchange.findMany({
    where: { status: 'ACTIVE', city: { in: ['هرات', 'کابل', 'جوزجان', 'قندهار'] } },
    select: { id: true },
  });
  const exchangeIds = afghanExchanges.map((e) => e.id);

  const REQUESTERS = [
    { fullName: 'احمد رحیمی', phone: '+93701239876', email: 'ahmad.rahimi@gmail.com' },
    { fullName: 'عبدالرحمن عظیمی', phone: '+93774455667' },
    { fullName: 'زهرا کریمی', phone: '+93715566778', email: 'zahra.karimi@gmail.com' },
    { fullName: 'رضا قاسمی', phone: '09135566778' },
    { fullName: 'وحیدالله صافی', phone: '+93737788990', email: 'wahid.safi@gmail.com' },
    { fullName: 'فاطمه موسوی', phone: '09126677889', email: 'fateme.mousavi@gmail.com' },
    { fullName: 'سمیع‌الله نوری', phone: '+93748899001' },
    { fullName: 'حمیرا شریفی', phone: '+93760011223', email: 'homeira.sharifi@gmail.com' },
    { fullName: 'محمد رفیع عثمانی', phone: '+93781234567' },
    { fullName: 'نادره حبیبی', phone: '+93794455667', email: 'nadera.habibi@gmail.com' },
    { fullName: 'علی محمدی', phone: '09158899001' },
    { fullName: 'ظاهر حسینی', phone: '+93759900112', email: 'zaher.hosseini@gmail.com' },
  ];

  // هر خدمت با توضیح و مبلغ واقعیِ همان خدمت
  const SERVICES = [
    {
      type: 'INTERNATIONAL_TRANSFER',
      desc: 'ارسال حواله از کابل به دبی برای هزینه خانواده',
      amount: () => `${rand(200, 5000)}`,
      currency: 'USD',
    },
    {
      type: 'TUITION_PAYMENT',
      desc: 'پرداخت شهریه ترم جدید دانشگاه در ترکیه',
      amount: () => `${rand(500, 4000)}`,
      currency: 'USD',
    },
    {
      type: 'FREELANCE_INCOME',
      desc: 'دریافت درآمد فریلنسری از Upwork به حساب بانکی',
      amount: () => `${rand(100, 3000)}`,
      currency: 'USD',
    },
    {
      type: 'ONLINE_PAYMENT',
      desc: 'خرید نرم‌افزار و سرویس‌های آنلاین از فروشگاه خارجی',
      amount: () => `${rand(50, 1500)}`,
      currency: 'USD',
    },
    {
      type: 'CURRENCY_BUY',
      desc: 'خرید دلار نقدی برای سفر',
      amount: () => `${rand(15000, 900000)}`,
      currency: 'AFN',
    },
    {
      type: 'CURRENCY_SELL',
      desc: 'فروش افغانی و تبدیل به دلار برای حواله',
      amount: () => `${rand(20000, 800000)}`,
      currency: 'AFN',
    },
    {
      type: 'CRYPTO_BUY',
      desc: 'خرید تتر برای پرداخت آنلاین',
      amount: () => `${rand(100, 4000)}`,
      currency: 'USDT',
    },
    {
      type: 'SOFTWARE_PURCHASE',
      desc: 'خرید اشتراک نرم‌افزار طراحی و اداری',
      amount: () => `${rand(20, 800)}`,
      currency: 'USD',
    },
    {
      type: 'GIFT_CARD',
      desc: 'خرید کارت هدیه فروشگاه خارجی',
      amount: () => `${rand(25, 500)}`,
      currency: 'USD',
    },
    {
      type: 'PAYPAL_TRANSFER',
      desc: 'واریز وجه به حساب پی‌پال',
      amount: () => `${rand(100, 2000)}`,
      currency: 'USD',
    },
  ];
  const STATUS_WEIGHTS = [
    'COMPLETED',
    'COMPLETED',
    'COMPLETED',
    'IN_PROGRESS',
    'IN_PROGRESS',
    'PENDING',
    'PENDING',
    'CANCELLED',
  ];
  const METHODS = ['telegram', 'whatsapp', 'phone', 'website'];
  const NOTES = {
    COMPLETED: [
      'حواله با موفقیت انجام و رسید ارسال شد.',
      'تراکنش تکمیل شد؛ رسید برای مشتری ارسال گردید.',
    ],
    IN_PROGRESS: ['در حال هماهنگی با صرافی مقصد.', 'منتظر تأیید پرداخت از سمت صرافی.'],
    PENDING: ['در صف بررسی؛ مدارک کامل است.', 'نیازمند تکمیل مدارک از سمت مشتری.'],
    CANCELLED: ['مشتری به دلیل تغییر شرایط انصراف داد.', 'عدم تطابق مدارک؛ درخواست لغو شد.'],
  };
  // کد پیگیری قطعی بر اساس ایندکس — در تلاش‌های مجدد تکراری ایجاد نمی‌شود
  const genCode = (i) => `SR-${1000 + i}`;

  let added = 0;
  for (let i = 0; i < 30; i++) {
    const requester = pick(REQUESTERS);
    const svc = pick(SERVICES);
    const status = pick(STATUS_WEIGHTS);
    const createdAt = daysAgo(rand(2, 330));
    const code = genCode(i);
    const exists = await p.serviceRequest.findUnique({ where: { trackingCode: code } });
    if (exists) continue;

    const data = {
      trackingCode: code,
      fullName: requester.fullName,
      phone: requester.phone,
      email: requester.email || null,
      serviceType: svc.type,
      amount: svc.amount(),
      currency: svc.currency,
      description: svc.desc,
      urgency: Math.random() < 0.18 ? 'URGENT' : 'NORMAL',
      contactMethod: pick(METHODS),
      status,
      adminNotes: Math.random() < 0.6 ? pick(NOTES[status]) : null,
      targetExchangeId: exchangeIds.length && Math.random() < 0.45 ? pick(exchangeIds) : null,
      createdAt,
      estimatedCompletionAt:
        status === 'COMPLETED' || status === 'IN_PROGRESS' ? addDays(createdAt, rand(1, 5)) : null,
      statusLogs: { create: buildStatusLogs(status, createdAt, admin) },
    };
    await p.serviceRequest.create({ data });
    added++;
  }
  console.log(`   ✅ ${added} درخواست خدمات`);
}

function buildStatusLogs(status, createdAt, admin) {
  const changedBy = admin ? admin.id : 'SYSTEM';
  const logs = [
    {
      fromStatus: null,
      toStatus: 'PENDING',
      changedBy: 'SYSTEM',
      note: 'ثبت درخواست توسط مشتری',
      createdAt,
    },
  ];
  if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
    logs.push({
      fromStatus: 'PENDING',
      toStatus: 'IN_PROGRESS',
      changedBy,
      note: 'شروع بررسی توسط پشتیبانی',
      createdAt: addDays(createdAt, rand(0, 2)),
    });
  }
  if (status === 'COMPLETED') {
    logs.push({
      fromStatus: 'IN_PROGRESS',
      toStatus: 'COMPLETED',
      changedBy,
      note: 'انجام درخواست و ارسال رسید',
      createdAt: addDays(createdAt, rand(2, 5)),
    });
  }
  if (status === 'CANCELLED') {
    logs.push({
      fromStatus: 'PENDING',
      toStatus: 'CANCELLED',
      changedBy,
      note: 'لغو درخواست',
      createdAt: addDays(createdAt, rand(1, 10)),
    });
  }
  return logs;
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
  const rows = [];
  for (let i = 0; i < 25; i++) {
    rows.push({
      level: pick(levels),
      source: pick(sources),
      message: pick(messages),
      timestamp: hoursAgo(rand(1, 240)),
    });
  }
  const res = await p.systemLog.createMany({ data: rows });
  console.log(`   ✅ ${res.count} لاگ سیستم`);
}

/* ─── 18) PageViews (آمار بازدید صفحات) ─────────────────────── */
async function seedPageViews() {
  // یک سال داده روزانه — با روند رشد تدریجی، نوسان هفتگی و نویز واقعی
  const pages = [
    { page: '/', base: 2400 },
    { page: '/blog', base: 1350 },
    { page: '/exchange-rates', base: 900 },
    { page: '/gold', base: 680 },
    { page: '/crypto', base: 620 },
    { page: '/services', base: 430 },
    { page: '/stocks', base: 380 },
    { page: '/about', base: 210 },
    { page: '/contact', base: 170 },
  ];
  let added = 0;
  for (const { page, base } of pages) {
    const rows = [];
    for (let d = 0; d < 365; d++) {
      const dayDate = startOfDayUTC(daysAgo(d));
      const dow = dayDate.getUTCDay(); // 0=Sun..6=Sat
      // جمعه (تعطیل) ترافیک کمتر، اوایل هفته بیشتر
      const weekday = dow === 5 ? 0.55 : dow === 6 ? 0.8 : dow === 1 ? 0.9 : 1;
      // سایت در یک سال گذشته رشد کرده — روزهای قدیمی‌تر کمی کمتر
      const growth = 1 + (364 - d) * 0.0012;
      const noise = 0.75 + Math.random() * 0.5;
      const views = Math.max(25, Math.round(base * weekday * growth * noise));
      rows.push({ page, views, date: dayDate });
    }
    const res = await p.pageView.createMany({ data: rows, skipDuplicates: true });
    added += res.count;
  }
  console.log(`   ✅ ${added} آمار بازدید صفحه (۳۶۵ روز اخیر)`);
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
  // اکانت‌های OAuth فقط توسط خود جریان ورود ساخته می‌شوند — seed نمی‌کند
  console.log('   ⏭️  اکانت‌های OAuth توسط جریان ورود کاربران ساخته می‌شوند');
}

/* ─── 20b) Tasks (وظایف کاربران) ────────────────────────────── */
async function seedTasks(users) {
  const existingCount = await p.task.count();
  if (existingCount > 0) {
    console.log(`   ⏭️  Tasks قبلاً ایجاد شده (${existingCount} عدد)`);
    return;
  }
  const TASKS = [
    {
      title: 'بازبینی مقاله هفتگی بیت‌کوین',
      description: 'بررسی نهایی و انتشار تحلیل هفتگی',
      status: 'COMPLETED',
    },
    {
      title: 'به‌روزرسانی نرخ‌های طلا و سکه',
      description: 'همگام‌سازی نرخ‌ها با بازار امروز',
      status: 'COMPLETED',
    },
    {
      title: 'پاسخ به تیکت‌های پشتیبانی',
      description: 'بررسی تیکت‌های باز امروز',
      status: 'IN_PROGRESS',
    },
    {
      title: 'آماده‌سازی خبرنامه هفتگی',
      description: 'تدوین و ارسال خبرنامه به اعضا',
      status: 'PENDING',
    },
    {
      title: 'بررسی دیدگاه‌های در انتظار تأیید',
      description: 'تأیید یا رد دیدگاه‌های جدید',
      status: 'IN_PROGRESS',
    },
    {
      title: 'بهینه‌سازی تصاویر صفحه اول',
      description: 'فشرده‌سازی و به‌روزرسانی تصاویر',
      status: 'COMPLETED',
    },
    {
      title: 'نوشتن یادداشت تحلیل بورس هفته',
      description: 'گزارش هفتگی بازار سهام',
      status: 'PENDING',
    },
    {
      title: 'همگام‌سازی داده‌های نرخ ارز',
      description: 'اجرای cron و بررسی صحت نرخ‌ها',
      status: 'COMPLETED',
    },
    {
      title: 'بررسی وضعیت سرور و پشتیبان‌گیری',
      description: 'لاگ‌ها و پشتیبان شبانه',
      status: 'COMPLETED',
    },
    {
      title: 'تدوین محتوای شبکه‌های اجتماعی',
      description: 'پست هفتگی تلگرام و اینستاگرام',
      status: 'PENDING',
    },
  ];
  const staffUsers = users.filter((u) => ['AUTHOR', 'ADMIN', 'SUPPORT', 'OWNER'].includes(u.role));
  if (staffUsers.length === 0) {
    console.log('   ⚠️  کاربر تیم برای وظایف یافت نشد');
    return;
  }
  const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH'];
  let added = 0;
  for (let i = 0; i < TASKS.length; i++) {
    const owner = staffUsers[i % staffUsers.length];
    const createdAt = daysAgo(rand(1, 60));
    await p.task.create({
      data: {
        title: TASKS[i].title,
        description: TASKS[i].description,
        status: TASKS[i].status || pick(statuses),
        priority: pick(priorities),
        dueDate: addDays(createdAt, rand(2, 10)),
        userId: owner.id,
        createdAt,
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
        note: 'نرخ لحظه‌ای صرافی',
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
  if (banks.length === 0) {
    console.log('   ⚠️  هیچ بانکی پیدا نشد');
    return;
  }
  const bankMap = Object.fromEntries(banks.map((b) => [b.slug, b.id]));

  const RATES = [
    // افغانستان — بانک افغانستان
    {
      bankSlug: 'afbank',
      type: 'PERSONAL',
      title: 'وام شخصی کوتاه‌مدت',
      annualRate: 14.0,
      maxAmountCents: 500000,
      maxTermMonths: 36,
      currency: 'AFN',
      status: 'ACTIVE',
    },
    {
      bankSlug: 'afbank',
      type: 'MORTGAGE',
      title: 'وام مسکن بلندمدت',
      annualRate: 12.5,
      maxAmountCents: 5000000,
      maxTermMonths: 240,
      currency: 'AFN',
      status: 'ACTIVE',
    },
    {
      bankSlug: 'afbank',
      type: 'DEPOSIT',
      title: 'سپرده سرمایه‌گذاری یک‌ساله',
      annualRate: 8.5,
      maxAmountCents: 0,
      maxTermMonths: 12,
      currency: 'AFN',
      status: 'ACTIVE',
    },
    // بانک عزیزی
    {
      bankSlug: 'azizi-bank',
      type: 'PERSONAL',
      title: 'وام شخصی عزیزی',
      annualRate: 16.0,
      maxAmountCents: 300000,
      maxTermMonths: 24,
      currency: 'AFN',
      status: 'ACTIVE',
    },
    {
      bankSlug: 'azizi-bank',
      type: 'BUSINESS',
      title: 'وام کسب‌وکار کوچک',
      annualRate: 18.0,
      maxAmountCents: 2000000,
      maxTermMonths: 60,
      currency: 'AFN',
      status: 'ACTIVE',
    },
    {
      bankSlug: 'azizi-bank',
      type: 'DEPOSIT',
      title: 'سپرده سه‌ماهه',
      annualRate: 7.0,
      maxAmountCents: 0,
      maxTermMonths: 3,
      currency: 'AFN',
      status: 'ACTIVE',
    },
    // بانک غضنفر
    {
      bankSlug: 'ghazanfar-bank',
      type: 'AGRICULTURE',
      title: 'وام کشاورزی',
      annualRate: 10.0,
      maxAmountCents: 800000,
      maxTermMonths: 48,
      currency: 'AFN',
      status: 'ACTIVE',
    },
    {
      bankSlug: 'ghazanfar-bank',
      type: 'QARD_AL_HASAN',
      title: 'قرض‌الحسنه',
      annualRate: 0,
      maxAmountCents: 100000,
      maxTermMonths: 12,
      currency: 'AFN',
      status: 'ACTIVE',
    },
    // بانک میوند
    {
      bankSlug: 'maiwand-bank',
      type: 'COMMERCIAL',
      title: 'اعتبار تجاری',
      annualRate: 15.0,
      maxAmountCents: 10000000,
      maxTermMonths: 120,
      currency: 'AFN',
      status: 'ACTIVE',
    },
    {
      bankSlug: 'maiwand-bank',
      type: 'AUTO',
      title: 'وام خودرو',
      annualRate: 13.5,
      maxAmountCents: 1500000,
      maxTermMonths: 60,
      currency: 'AFN',
      status: 'ACTIVE',
    },
    // ایران
    {
      bankSlug: 'export-development-bank-ir',
      type: 'BUSINESS',
      title: 'تسهیلات صادراتی',
      annualRate: 22.0,
      maxAmountCents: 500000000,
      maxTermMonths: 84,
      currency: 'IRR',
      status: 'ACTIVE',
    },
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
  if (exchanges.length === 0) {
    console.log('   ⚠️  هیچ صرافی ACTIVE پیدا نشد');
    return;
  }

  const SERVICES_PER_EXCHANGE = [
    { serviceKey: 'CURRENCY_BUY', order: 1 },
    { serviceKey: 'CURRENCY_SELL', order: 2 },
    { serviceKey: 'INTERNATIONAL_TRANSFER', order: 3 },
    { serviceKey: 'ONLINE_PAYMENT', order: 4 },
    { serviceKey: 'CRYPTO_BUY', order: 5 },
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
  const exchanges = await p.exchange.findMany({
    where: { status: 'ACTIVE' },
    take: 4,
    select: { id: true, name: true },
  });
  if (exchanges.length === 0) {
    console.log('   ⚠️  هیچ صرافی ACTIVE پیدا نشد');
    return;
  }

  const DEALS = [
    {
      customerName: 'احمد رحیمی',
      customerPhone: '+93701239876',
      fromCurrency: 'USD',
      toCurrency: 'AFN',
      fromAmount: 500,
      appliedRate: 88.5,
    },
    {
      customerName: 'مریم نوری',
      customerPhone: '+93713334455',
      fromCurrency: 'EUR',
      toCurrency: 'AFN',
      fromAmount: 300,
      appliedRate: 96.1,
    },
    {
      customerName: 'عبدالرحمن عظیمی',
      customerPhone: '+93774455667',
      fromCurrency: 'USD',
      toCurrency: 'AFN',
      fromAmount: 1000,
      appliedRate: 89.0,
    },
    {
      customerName: 'فرشته احمدی',
      customerPhone: '+93726677889',
      fromCurrency: 'AED',
      toCurrency: 'AFN',
      fromAmount: 2000,
      appliedRate: 24.1,
    },
    {
      customerName: 'رضا قاسمی',
      customerPhone: '09135566778',
      fromCurrency: 'USD',
      toCurrency: 'IRR',
      fromAmount: 200,
      appliedRate: 8700,
    },
    {
      customerName: 'وحیدالله صافی',
      customerPhone: '+93737788990',
      fromCurrency: 'USD',
      toCurrency: 'AFN',
      fromAmount: 750,
      appliedRate: 88.8,
    },
    {
      customerName: 'فاطمه موسوی',
      customerPhone: '09126677889',
      fromCurrency: 'EUR',
      toCurrency: 'AFN',
      fromAmount: 120,
      appliedRate: 95.9,
    },
    {
      customerName: 'حمیرا شریفی',
      customerPhone: '+93760011223',
      fromCurrency: 'GBP',
      toCurrency: 'AFN',
      fromAmount: 250,
      appliedRate: 113.4,
    },
  ];
  const STATUS_WEIGHTS = [
    'COMPLETED',
    'COMPLETED',
    'COMPLETED',
    'CONFIRMED',
    'PENDING',
    'CANCELLED',
  ];

  let added = 0;
  for (let i = 0; i < DEALS.length; i++) {
    const d = DEALS[i];
    const ex = exchanges[i % exchanges.length];
    const createdAt = daysAgo(rand(3, 150));
    const trackingCode = `DL-${new Date(createdAt).getFullYear()}-${String(1000 + i).padStart(4, '0')}`;
    const status = pick(STATUS_WEIGHTS);
    const toAmount = Math.round(d.fromAmount * d.appliedRate);
    const existing = await p.currencyDeal.findFirst({
      where: { customerPhone: d.customerPhone, exchangeId: ex.id },
    });
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
        toAmount,
        appliedRate: d.appliedRate,
        feeAmount: Math.round(d.fromAmount * 0.005 * 100) / 100,
        channel: Math.random() > 0.3 ? 'ONLINE' : 'INPERSON',
        status,
        confirmedAt:
          status === 'COMPLETED' || status === 'CONFIRMED' ? addDays(createdAt, rand(0, 1)) : null,
        completedAt: status === 'COMPLETED' ? addDays(createdAt, rand(1, 2)) : null,
        createdAt,
        updatedAt: addDays(createdAt, rand(0, 3)),
      },
    });
    added++;
  }
  console.log(`   ✅ ${added} معامله ارزی`);
}

/* ─── Settlements ──────────────────────────────────────────────── */
function monthStartUTC(n) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function monthEndUTC(n) {
  const start = monthStartUTC(n);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

async function seedSettlements() {
  const exchanges = await p.exchange.findMany({
    where: { status: 'ACTIVE' },
    take: 3,
    select: { id: true, name: true },
  });
  if (exchanges.length === 0) {
    console.log('   ⚠️  هیچ صرافی ACTIVE پیدا نشد');
    return;
  }

  let added = 0;
  for (let i = 0; i < Math.min(3, exchanges.length); i++) {
    const ex = exchanges[i];
    // تسویه ماهانه برای سه ماه گذشته — قدیمی‌ترین ماه پرداخت‌شده
    const periodStart = monthStartUTC(i);
    const periodEnd = monthEndUTC(i);
    const existing = await p.settlement.findFirst({ where: { exchangeId: ex.id, periodStart } });
    if (existing) continue;
    const totalVolume = BigInt(rand(120_000_000, 420_000_000));
    const platformFee = (totalVolume * 10n) / 1000n; // ~۱٪ کارمزد پلتفرم
    const dealCount = Math.round(Number(totalVolume) / rand(1_800_000, 2_600_000));
    // قدیمی‌ترین ماه (i=2) پرداخت‌شده، ماه جاری (i=0) در انتظار
    await p.settlement.create({
      data: {
        exchangeId: ex.id,
        periodStart,
        periodEnd,
        totalVolume,
        dealCount,
        platformFee,
        exchangeNet: totalVolume - platformFee,
        currency: 'AFN',
        status: i === 2 ? 'PAID' : i === 1 ? 'APPROVED' : 'PENDING',
        approvedAt: i >= 1 ? addDays(periodEnd, rand(2, 5)) : null,
        paidAt: i === 2 ? addDays(periodEnd, rand(6, 9)) : null,
        note: 'تسویه ماهانه معاملات',
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
  const { v4: uuid } = require('uuid');

  // فقط ۴ صرافی اول ACTIVE
  const exchanges = await p.exchange.findMany({
    where: { status: 'ACTIVE' },
    take: 4,
    select: { id: true, name: true, primaryCurrency: true },
  });
  if (exchanges.length === 0) {
    console.log('   ⚠️  صرافی فعال پیدا نشد');
    return;
  }

  // مشتریان واقعی‌نما — نام/شماره افغانستانی و ایرانی
  const CUSTOMERS = [
    {
      fullName: 'احمد رحیمی',
      phone: '+93701239876',
      city: 'کابل',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      kycLevel: 'LEVEL_2',
    },
    {
      fullName: 'مریم نوری',
      phone: '+93713334455',
      city: 'هرات',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      kycLevel: 'LEVEL_1',
    },
    {
      fullName: 'عبدالرحمن عظیمی',
      phone: '+93774455667',
      city: 'مزار شریف',
      status: 'ACTIVE',
      kycStatus: 'PENDING',
      kycLevel: 'NONE',
    },
    {
      fullName: 'فرشته احمدی',
      phone: '+93726677889',
      city: 'هرات',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      kycLevel: 'LEVEL_2',
    },
    {
      fullName: 'وحیدالله صافی',
      phone: '+93737788990',
      city: 'قندهار',
      status: 'FROZEN',
      kycStatus: 'APPROVED',
      kycLevel: 'LEVEL_1',
    },
    {
      fullName: 'سمیع‌الله نوری',
      phone: '+93748899001',
      city: 'بلخ',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      kycLevel: 'LEVEL_2',
    },
    {
      fullName: 'ظاهر حسینی',
      phone: '+93759900112',
      city: 'جلال‌آباد',
      status: 'ACTIVE',
      kycStatus: 'NOT_STARTED',
      kycLevel: 'NONE',
    },
    {
      fullName: 'حمیرا شریفی',
      phone: '+93760011223',
      city: 'هرات',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      kycLevel: 'LEVEL_1',
    },
    {
      fullName: 'محمد رفیع عثمانی',
      phone: '+93781234567',
      city: 'کابل',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      kycLevel: 'LEVEL_2',
    },
    {
      fullName: 'نادره حبیبی',
      phone: '+93794455667',
      city: 'هرات',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      kycLevel: 'LEVEL_2',
    },
    {
      fullName: 'علی محمدی',
      phone: '09158899001',
      city: 'تهران',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      kycLevel: 'LEVEL_1',
    },
    {
      fullName: 'رضا قاسمی',
      phone: '09135566778',
      city: 'مشهد',
      status: 'PROSPECT',
      kycStatus: 'NOT_STARTED',
      kycLevel: 'NONE',
    },
    {
      fullName: 'فاطمه موسوی',
      phone: '09126677889',
      city: 'اصفهان',
      status: 'ACTIVE',
      kycStatus: 'REJECTED',
      kycLevel: 'NONE',
    },
    {
      fullName: 'نگار صادقی',
      phone: '09147788990',
      city: 'شیراز',
      status: 'CLOSED',
      kycStatus: 'APPROVED',
      kycLevel: 'LEVEL_1',
    },
  ];

  const TX_KINDS = ['DEPOSIT', 'WITHDRAWAL', 'EXCHANGE', 'TRANSFER', 'FEE'];
  let totalCustomers = 0;
  let totalAccounts = 0;
  let totalTxns = 0;
  let totalLedger = 0;
  let totalKyc = 0;
  let totalFraud = 0;

  for (const ex of exchanges) {
    const currency = ex.primaryCurrency || 'AFN';
    // هر صرافی ۳ مشتری اختصاصی — بدون هم‌پوشانی بین صرافی‌ها
    const per = 3;
    const start = exchanges.indexOf(ex) * per;
    const myCustomers = CUSTOMERS.slice(start, start + per);

    for (const tmpl of myCustomers) {
      const exists = await p.customer.findFirst({
        where: { phone: tmpl.phone, exchangeId: ex.id },
      });
      if (exists) continue;

      const custId = uuid();
      const joinedAt = daysAgo(rand(15, 300));
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
          riskScore: rand(5, 45),
          createdAt: joinedAt,
          updatedAt: addDays(joinedAt, rand(1, 30)),
        },
      });
      totalCustomers++;

      // — حساب کیف پول — مانده در پایان از تراکنش‌های تکمیل‌شده محاسبه می‌شود
      const accId = uuid();
      await p.fintechAccount.create({
        data: {
          id: accId,
          exchangeId: ex.id,
          customerId: custId,
          type: 'WALLET',
          currency,
          status:
            tmpl.status === 'ACTIVE' ? 'ACTIVE' : tmpl.status === 'FROZEN' ? 'FROZEN' : 'CLOSED',
          balance: BigInt(0),
          updatedAt: addDays(joinedAt, rand(1, 30)),
        },
      });
      totalAccounts++;

      // — KYC —
      if (['APPROVED', 'PENDING', 'REJECTED'].includes(tmpl.kycStatus)) {
        const kycAt = addDays(joinedAt, rand(2, 15));
        await p.kycVerification.create({
          data: {
            id: uuid(),
            exchangeId: ex.id,
            customerId: custId,
            level: tmpl.kycLevel === 'NONE' ? 'LEVEL_1' : tmpl.kycLevel,
            status: tmpl.kycStatus,
            docType: 'NATIONAL_ID',
            docNumber: `AF${rand(1000000000, 9999999999)}`,
            reviewedAt:
              tmpl.kycStatus === 'APPROVED' || tmpl.kycStatus === 'REJECTED'
                ? addDays(kycAt, rand(1, 4))
                : null,
            createdAt: kycAt,
            updatedAt: addDays(kycAt, rand(1, 4)),
          },
        });
        totalKyc++;
      }

      // — تراکنش‌ها از زمان عضویت تا امروز، به ترتیب زمان —
      const txCount = rand(6, 16);
      const txDates = Array.from({ length: txCount }, () => {
        const span = Date.now() - joinedAt.getTime();
        return new Date(joinedAt.getTime() + Math.random() * span);
      }).sort((a, b) => a - b);

      let runningBalance = BigInt(0);
      for (let t = 0; t < txCount; t++) {
        const kind = t === 0 ? 'DEPOSIT' : pick(TX_KINDS);
        const status = t === txCount - 1 && Math.random() < 0.15 ? 'PENDING' : 'COMPLETED';
        const amount = BigInt(rand(20_000, 2_500_000));
        const fee =
          kind === 'DEPOSIT' || kind === 'EXCHANGE' ? BigInt(rand(500, 20_000)) : BigInt(0);
        const txId = uuid();
        const txDate = txDates[t];

        // جلوگیری از منفی شدن مانده — مبلغ برداشت به اندازه موجودی محدود می‌شود
        const isDebit = ['WITHDRAWAL', 'EXCHANGE', 'TRANSFER', 'FEE'].includes(kind);
        let finalAmount = amount;
        if (status === 'COMPLETED' && isDebit && runningBalance - (amount + fee) < 0n) {
          finalAmount = runningBalance > fee ? runningBalance - fee : BigInt(0);
          if (finalAmount === 0n) continue;
        }

        await p.transaction.create({
          data: {
            id: txId,
            exchangeId: ex.id,
            customerId: custId,
            accountId: accId,
            kind,
            status,
            amount: finalAmount,
            currency,
            fee,
            createdAt: txDate,
            updatedAt: txDate,
          },
        });
        totalTxns++;

        if (status === 'COMPLETED') {
          const isCredit = kind === 'DEPOSIT';
          runningBalance = isCredit
            ? runningBalance + finalAmount
            : runningBalance - finalAmount - fee;
          await p.ledgerEntry.create({
            data: {
              id: uuid(),
              exchangeId: ex.id,
              accountId: accId,
              customerId: custId,
              txnId: txId,
              direction: isCredit ? 'CREDIT' : 'DEBIT',
              amount: finalAmount,
              currency,
              runningBalance,
              description: isCredit
                ? 'واریز به حساب'
                : kind === 'WITHDRAWAL'
                  ? 'برداشت از حساب'
                  : kind === 'EXCHANGE'
                    ? 'تبدیل ارز'
                    : kind === 'TRANSFER'
                      ? 'حواله'
                      : 'کارمزد',
              createdAt: txDate,
            },
          });
          totalLedger++;
        }
      }
      await p.fintechAccount.update({ where: { id: accId }, data: { balance: runningBalance } });

      // — بررسی تقلب برای حساب‌های مشکوک —
      if (tmpl.status === 'FROZEN' || Math.random() < 0.12) {
        await p.fraudReview.create({
          data: {
            id: uuid(),
            exchangeId: ex.id,
            customerId: custId,
            reason:
              tmpl.status === 'FROZEN'
                ? 'فعالیت غیرعادی — حساب برای بررسی مسدود شد'
                : 'تراکنش با الگوی غیرعادی — بررسی لازم است',
            riskScore: rand(55, 92),
            status: tmpl.status === 'FROZEN' ? 'OPEN' : 'RESOLVED',
            createdAt: addDays(joinedAt, rand(10, 60)),
            resolvedAt: tmpl.status !== 'FROZEN' ? addDays(joinedAt, rand(12, 65)) : null,
          },
        });
        totalFraud++;
      }
    }
  }

  console.log(
    `   ✅ مشتری: ${totalCustomers} | حساب: ${totalAccounts} | تراکنش: ${totalTxns} | دفتر: ${totalLedger} | KYC: ${totalKyc} | تقلب: ${totalFraud}`,
  );
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
  if (!owner || exchanges.length === 0) {
    console.log('   ⚠️  کاربر OWNER یا صرافی پیدا نشد');
    return;
  }

  const { v4: uuid } = require('uuid');
  let added = 0;

  // مالک به عنوان OWNER اولین صرافی
  const ex1 = exchanges[0];
  const exists1 = await p.exchangeStaff.findUnique({
    where: { exchangeId_userId: { exchangeId: ex1.id, userId: owner.id } },
  });
  if (!exists1) {
    await p.exchangeStaff.create({
      data: {
        id: uuid(),
        exchangeId: ex1.id,
        userId: owner.id,
        role: 'OWNER',
        title: 'مالک صرافی',
      },
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
        data: {
          id: uuid(),
          exchangeId: ex2.id,
          userId: admin.id,
          role: 'MANAGER',
          title: 'مدیر صرافی',
        },
      });
      added++;
    }
  }

  // کارکنان صرافی‌های افغانستان (هرات/کابل/...) از تیم پلتفرم
  const support = await p.user.findFirst({ where: { role: 'SUPPORT' } });
  const exchangeUser = await p.user.findFirst({ where: { role: 'EXCHANGE' } });
  const author = await p.user.findFirst({ where: { role: 'AUTHOR' } });
  const afghanExchanges = await p.exchange.findMany({
    where: { status: 'ACTIVE', city: { in: ['هرات', 'کابل', 'جوزجان', 'قندهار'] } },
    select: { id: true, name: true },
  });
  const staffAssignments = [
    { user: support, role: 'STAFF', title: 'کارشناس پشتیبانی' },
    { user: exchangeUser, role: 'MANAGER', title: 'مدیر عملیات صرافی' },
    { user: author, role: 'STAFF', title: 'مسئول نرخ‌ها' },
  ];
  let staffIdx = 0;
  for (const ex of afghanExchanges) {
    const assign = staffAssignments[staffIdx % staffAssignments.length];
    staffIdx++;
    if (!assign.user) continue;
    const exists = await p.exchangeStaff.findUnique({
      where: { exchangeId_userId: { exchangeId: ex.id, userId: assign.user.id } },
    });
    if (exists) continue;
    await p.exchangeStaff.create({
      data: {
        id: uuid(),
        exchangeId: ex.id,
        userId: assign.user.id,
        role: assign.role,
        title: assign.title,
      },
    });
    added++;
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
    {
      name: 'احمد رحیمی',
      email: 'ahmad.rahimi@gmail.com',
      subject: 'سوال درباره حواله',
      message: 'آیا می‌توانم از کابل به دبی حواله ارسال کنم؟ کارمزد و زمان چقدر است؟',
      status: 'RESOLVED',
    },
    {
      name: 'مریم نوری',
      email: 'maryam.nouri@gmail.com',
      subject: 'مشکل پرداخت شهریه',
      message: 'پرداخت شهریه دانشگاه ارسال کردم اما هنوز تأیید نشده. لطفاً بررسی کنید.',
      status: 'IN_PROGRESS',
    },
    {
      name: 'علی محمدی',
      email: 'ali.mohammadi@gmail.com',
      subject: 'پیشنهاد بهبود سایت',
      message: 'پیشنهاد می‌کنم نمودار تغییرات قیمت دلار در ۳۰ روز اخیر هم اضافه شود.',
      status: 'RESOLVED',
    },
    {
      name: 'وحیدالله صافی',
      email: 'wahid.safi@gmail.com',
      subject: 'درخواست همکاری صرافی',
      message: 'صرافی ما در قندهار می‌خواهد در پلتفرم شما ثبت شود؛ راهنمایی کنید.',
      status: 'NEW',
    },
    {
      name: 'فرشته احمدی',
      email: 'fereshte.ahmadi@gmail.com',
      subject: 'سوال درباره نرخ روز',
      message: 'نرخ خرید دلار در صرافی‌های هرات امروز چند است؟',
      status: 'NEW',
    },
    {
      name: 'رضا قاسمی',
      email: 'reza.ghasemi@gmail.com',
      subject: 'گزارش مشکل فنی',
      message: 'صفحه نرخ ارز در موبایل درست نمایش داده نمی‌شود.',
      status: 'IN_PROGRESS',
    },
  ];
  let added = 0;
  for (const c of CONTACTS) {
    const createdAt = daysAgo(rand(5, 200));
    await p.contactSubmission.create({
      data: {
        id: uuid(),
        name: c.name,
        email: c.email,
        subject: c.subject,
        message: c.message,
        status: c.status,
        ipAddress: randIP(),
        createdAt,
        updatedAt: addDays(createdAt, rand(1, 7)),
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
  const users = await p.user.findMany({
    where: { role: 'USER' },
    take: 5,
    select: { id: true },
  });
  if (users.length === 0) {
    console.log('   ⚠️  کاربری پیدا نشد');
    return;
  }

  // چرخه واقعی اشتراک: رایگان → پایه → حرفه‌ای با تمدید/تنزل
  const EVENTS = [
    { kind: 'UPGRADE', fromPlan: null, toPlan: 'FREE', amount: 0, method: null },
    { kind: 'UPGRADE', fromPlan: 'FREE', toPlan: 'BASIC', amount: 499000, method: 'CARD' },
    { kind: 'RENEWAL', fromPlan: 'BASIC', toPlan: 'BASIC', amount: 499000, method: 'HAWALA' },
    { kind: 'UPGRADE', fromPlan: 'BASIC', toPlan: 'PRO', amount: 1290000, method: 'BANK_TRANSFER' },
    { kind: 'DOWNGRADE', fromPlan: 'PRO', toPlan: 'BASIC', amount: 0, method: null },
    { kind: 'RENEWAL', fromPlan: 'BASIC', toPlan: 'BASIC', amount: 499000, method: 'CARD' },
  ];
  const PAYMENT_STATUS = ['PAID', 'PAID', 'PAID', 'PENDING'];

  let added = 0;
  let i = 0;
  for (const user of users) {
    const ev = EVENTS[i % EVENTS.length];
    i++;
    const createdAt = daysAgo(rand(20, 360));
    const status = pick(PAYMENT_STATUS);
    const invoiceNo = `INV-${new Date(createdAt).getFullYear()}-${String(rand(1000, 9999))}`;
    await p.subscriptionEvent.create({
      data: {
        id: uuid(),
        userId: user.id,
        kind: ev.kind,
        fromPlan: ev.fromPlan,
        toPlan: ev.toPlan,
        amount: BigInt(ev.amount),
        currency: 'AFN',
        status,
        invoiceNo: status === 'PAID' ? invoiceNo : null,
        paymentMethod: ev.method,
        validUntil:
          ev.toPlan !== 'FREE' && ev.toPlan !== ev.fromPlan
            ? addDays(createdAt, 365)
            : ev.toPlan !== 'FREE'
              ? addDays(createdAt, 365)
              : null,
        createdAt,
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
  if (exchanges.length === 0) {
    console.log('   ⚠️  صرافی فعال پیدا نشد');
    return;
  }

  const SERVICES = [
    'CURRENCY_BUY',
    'INTERNATIONAL_TRANSFER',
    'ONLINE_PAYMENT',
    'CRYPTO_BUY',
    'CURRENCY_SELL',
  ];
  const SOURCES = ['exchange-page', 'marketplace', 'homepage', 'comparison-table'];
  const UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; SM-A156) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1',
  ];

  const rows = [];
  for (let i = 0; i < 40; i++) {
    const ex = exchanges[i % exchanges.length];
    rows.push({
      exchangeId: ex.id,
      serviceKey: SERVICES[i % SERVICES.length],
      source: SOURCES[i % SOURCES.length],
      ipAddress: randIP(),
      userAgent: pick(UAS),
      createdAt: daysAgo(rand(0, 200)),
    });
  }
  const res = await p.serviceClick.createMany({ data: rows });
  console.log(`   ✅ ${res.count} کلیک سرویس (analytics)`);
}

/* ─── main: اجرای ترتیبی seed ───────────────────────────────── */
async function main() {
  console.log('🌱 شروع Seed کامل دیتابیس BlogMarketFinansial\n');

  const shouldWipe = ['true', '1'].includes((process.env.SEED_WIPE || '').toLowerCase());
  if (shouldWipe) {
    await step('0️⃣  پاکسازی داده‌های قبلی:', () => wipeDatabase());
  } else {
    console.log('⏭️  پاکسازی رد شد (SEED_WIPE تنظیم نشده) — فقط داده‌های از دست رفته سید می‌شوند');
  }

  await step('\n1️⃣  SystemSettings:', () => seedSystemSettings());

  const users = await step('\n2️⃣  Users:', () => seedUsers());

  await step('\n3️⃣  Profiles:', () => seedProfiles(users));

  await step('\n4️⃣  Categories:', () => seedCategories());

  await step('\n5️⃣  Tags:', () => seedTags());

  await step('\n6️⃣  Posts:', () => seedPosts());
  const posts = await p.post.findMany();

  await step('\n7️⃣  Comments:', () => seedComments(users, posts));

  await step('\n8️⃣  Likes:', () => seedLikes(users, posts));

  await step('\n9️⃣  Views:', () => seedViews(posts));

  await step('\n🔟  SavedPosts:', () => seedSavedPosts(users, posts));

  await step('\n1️⃣1️⃣  Notifications:', () => seedNotifications(users));

  await step('\n1️⃣2️⃣  ActivityLogs + Activities:', () => seedActivityLogs(users));

  await step('\n1️⃣3️⃣  Newsletters:', () => seedNewsletters());

  await step('\n1️⃣4️⃣  SocialLinks:', () => seedSocialLinks());

  await step('\n1️⃣4️⃣b  HeaderAd:', () => seedHeaderAd());

  await step('\n1️⃣4️⃣c  Advertisements:', () => seedAdvertisements());

  await step('\n1️⃣5️⃣  RateLists:', () => seedRateLists());

  await step('\n1️⃣6️⃣  ServiceRequests:', () => seedServiceRequests());

  await step('\n1️⃣7️⃣  SystemLogs:', () => seedSystemLogs());

  await step('\n1️⃣8️⃣  PageViews:', () => seedPageViews());

  await step('\n1️⃣9️⃣  CurrencyPatterns:', () => seedCurrencyPatterns());

  await step('\n2️⃣0️⃣  Accounts (OAuth):', () => seedAccounts(users));

  await step('\n2️⃣0️⃣b  Tasks:', () => seedTasks(users));

  await step('\n2️⃣1️⃣  ExchangeRates:', () => seedExchangeRates());

  await step('\n2️⃣2️⃣  Exchanges + linked TransferProviders:', () => seedExchangesAndProviders());

  await step('\n2️⃣3️⃣  Legacy TransferProviders (market-mid + tgju):', () => seedTransferProviders());

  await step('\n2️⃣4️⃣  Sample ExchangeRateQuotes:', () => seedExchangeQuotes());

  await step('\n2️⃣5️⃣  ExchangeServices:', () => seedExchangeServices());

  await step('\n2️⃣6️⃣  Banks:', () => seedBanks());

  await step('\n2️⃣7️⃣  CreditRates:', () => seedCreditRates());

  await step('\n2️⃣8️⃣  CurrencyDeals:', () => seedCurrencyDeals());

  await step('\n2️⃣9️⃣  Settlements:', () => seedSettlements());

  await step('\n3️⃣0️⃣  Exchange Fintech (Customers + Accounts + Transactions + KYC + Fraud):', () =>
    seedExchangeFintech(),
  );

  await step('\n3️⃣1️⃣  ExchangeStaff:', () => seedExchangeStaff());

  await step('\n3️⃣2️⃣  ContactSubmissions:', () => seedContactSubmissions());

  await step('\n3️⃣3️⃣  SubscriptionEvents:', () => seedSubscriptionEvents());

  await step('\n3️⃣4️⃣  ServiceClicks:', () => seedServiceClicks());

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
    customers: await p.customer.count(),
    fintechAccounts: await p.fintechAccount.count(),
    transactions: await p.transaction.count(),
    ledgerEntries: await p.ledgerEntry.count(),
    kycVerifications: await p.kycVerification.count(),
    fraudReviews: await p.fraudReview.count(),
    exchangeStaff: await p.exchangeStaff.count(),
    banks: await p.bank.count(),
    creditRates: await p.creditRate.count(),
    currencyDeals: await p.currencyDeal.count(),
    settlements: await p.settlement.count(),
    serviceClicks: await p.serviceClick.count(),
    contactSubmissions: await p.contactSubmission.count(),
    subscriptionEvents: await p.subscriptionEvent.count(),
    exchangeRates: await p.exchangeRate.count(),
    exchangeRateQuotes: await p.exchangeRateQuote.count(),
    serviceRequestStatusLogs: await p.serviceRequestStatusLog.count(),
    systemSettings: await p.systemSettings.count(),
  };
  console.log(`\n${'═'.repeat(50)}`);
  console.log('📊 آمار نهایی دیتابیس:');
  Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => {
      console.log(`   ${k.padEnd(20)}: ${v.toString().padStart(6)}`);
    });
  console.log('═'.repeat(50));

  /* ─── مالک (OWNER) ─── */
  console.log(`\n${'═'.repeat(50)}`);
  console.log('ℹ️  مالک (OWNER) از seed ساخته نمی‌شود.');
  console.log('   ساخت حساب مالک فقط از صفحه /setup ممکن است (یک‌بار برای همیشه).');
  console.log('═'.repeat(50));

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
