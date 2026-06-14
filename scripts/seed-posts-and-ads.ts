/* Seed script: تکمیل پست‌ها + تبلیغات + حذف پست‌های بدون تصویر
 *
 * این اسکریپت:
 *  1. دسته‌بندی‌های لازم رو تضمین می‌کنه
 *  2. کاربر AUTHOR نمونه رو تضمین می‌کنه
 *  3. ۳۶ پست موجود + ۱۲ پست جدید با محتوای واقعی و تصاویر معتبر سید می‌کنه
 *  4. ۸ تبلیغ اصلی + ۴ تبلیغ اضافی با تصاویر معتبر سید می‌کنه
 *  5. پست‌هایی که featuredImage ندارن یا فایلشون وجود نداره رو به placeholder مپ می‌کنه
 *
 * ⚠️ idempotent: اگه slug یا title تکراری باشه، رد می‌شه
 *
 * اجرا: npx tsx scripts/seed-posts-and-ads.ts
 */

import { PrismaClient, PostType, AdSize, AdPosition, PostStatus, Role } from '@prisma/client';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const persianSlug = (s: string): string => {
  const map: Record<string, string> = {
    'ا': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's', 'ج': 'j', 'چ': 'ch',
    'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z', 'ژ': 'zh',
    'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'a',
    'غ': 'gh', 'ف': 'f', 'ق': 'gh', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm',
    'ن': 'n', 'و': 'v', 'ه': 'h', 'ی': 'y', 'ئ': 'y', ' ': '-', '‌': '-',
  };
  return s
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'post';
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

const PUBLIC_DIR = join(process.cwd(), 'public');

/** بررسی می‌کنه فایل تصویر واقعاً وجود داره */
function imageExists(imagePath: string | null | undefined): boolean {
  if (!imagePath) return false;
  if (imagePath.startsWith('http')) return true;
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return existsSync(join(PUBLIC_DIR, cleanPath));
}

const log = {
  info: (m: string) => console.log(`\x1b[36mℹ\x1b[0m  ${m}`),
  ok: (m: string) => console.log(`\x1b[32m✓\x1b[0m  ${m}`),
  skip: (m: string) => console.log(`\x1b[33m⏭\x1b[0m  ${m}`),
  err: (m: string) => console.log(`\x1b[31m✗\x1b[0m  ${m}`),
  title: (m: string) => console.log(`\n\x1b[1m\x1b[35m━━ ${m} ━━\x1b[0m`),
};

/* -------------------------------------------------------------------------- */
/*  Categories                                                                */
/* -------------------------------------------------------------------------- */

const REQUIRED_CATEGORIES = [
  { name: 'طلا', description: 'اخبار و تحلیل بازار طلا و سکه' },
  { name: 'ارز دیجیتال', description: 'اخبار و تحلیل ارزهای دیجیتال' },
  { name: 'بازار جهانی', description: 'بازارهای جهانی، فارکس، کالا' },
  { name: 'بورس', description: 'بازار سرمایه، سهام، صندوق‌ها' },
  { name: 'تحلیل تکنیکال', description: 'آموزش و تحلیل تکنیکال' },
  { name: 'سرمایه‌گذاری', description: 'راهنمای سرمایه‌گذاری' },
];

async function ensureCategories() {
  log.title('دسته‌بندی‌ها');
  const map = new Map<string, string>();
  for (const cat of REQUIRED_CATEGORIES) {
    const existing = await prisma.category.findFirst({ where: { name: cat.name } });
    if (existing) {
      log.skip(`${cat.name} (id: ${existing.id})`);
      map.set(cat.name, existing.id);
    } else {
      let slug = persianSlug(cat.name);
      let counter = 1;
      while (await prisma.category.findUnique({ where: { slug } })) {
        slug = `${persianSlug(cat.name)}-${counter++}`;
      }
      const created = await prisma.category.create({
        data: { name: cat.name, slug, thumbnail: null },
      });
      log.ok(`${cat.name} ساخته شد (id: ${created.id})`);
      map.set(cat.name, created.id);
    }
  }
  return map;
}

/* -------------------------------------------------------------------------- */
/*  Author                                                                    */
/* -------------------------------------------------------------------------- */

async function ensureAuthor() {
  const email = 'author@blogmarket.local';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    log.skip(`نویسنده موجود: ${email}`);
    return existing.id;
  }
  const user = await prisma.user.create({
    data: {
      email,
      name: 'تیم تحریریه بازار مالی',
      role: Role.AUTHOR,
      password: null,
      profile: {
        create: {
          jobName: 'تحلیلگر ارشد بازارهای مالی',
          bio: 'تیم تحریریه‌ی تخصصی بازار سرمایه، طلا و ارزهای دیجیتال',
        },
      },
    },
  });
  log.ok(`نویسنده ساخته شد: ${email}`);
  return user.id;
}

/* -------------------------------------------------------------------------- */
/*  Posts data                                                                */
/* -------------------------------------------------------------------------- */

interface PostSeed {
  title: string;
  excerpt: string;
  content: string;
  categories: string[];
  postType?: PostType;
  viewCount?: number;
  readingTime?: number;
  isFeatured?: boolean;
  daysAgo: number;
  /** شاخص تصویر (۱-۸) — اگه نباشه، بر اساس hash عنوان تولید می‌شه */
  imageIndex?: number;
}

const POSTS: PostSeed[] = [
  // ─── طلا (۸ پست) ───
  {
    title: 'پیش‌بینی قیمت طلا در نیمه دوم ۱۴۰۵ | تحلیل جامع بازار جهانی',
    excerpt: 'بررسی عوامل بنیادی و تکنیکال موثر بر قیمت طلا در ماه‌های آتی و سناریوهای محتمل برای سرمایه‌گذاران ایرانی.',
    content: '<p>بازار جهانی طلا در ماه‌های گذشته تحت تاثیر سیاست‌های فدرال رزرو و نوسانات دلار قرار گرفته است. در این گزارش به بررسی سه سناریوی اصلی برای قیمت انس طلا می‌پردازیم.</p><h2>سناریوی اول: صعود تا ۲۵۰۰ دلار</h2><p>در صورت تداوم تنش‌های ژئوپلیتیک و کاهش نرخ بهره، طلا می‌تواند تا سطوح بالاتر صعود کند.</p><h2>سناریوی دوم: نوسان محدود</h2><p>اگر فدرال رزرو سیاست انقباضی را ادامه دهد، طلا در محدوده‌ی ۲۳۰۰ تا ۲۴۰۰ دلار نوسان خواهد کرد.</p><h2>سناریوی سوم: اصلاح عمیق</h2><p>در صورت قوی شدن دلار آمریکا، احتمال اصلاح تا ۲۱۰۰ دلار وجود دارد.</p>',
    categories: ['طلا', 'بازار جهانی'],
    daysAgo: 0,
    isFeatured: true,
    viewCount: 12500,
    readingTime: 7,
    imageIndex: 1,
  },
  {
    title: 'سکه طرح جدید بهار آزادی | چرا قیمت‌ها صعودی شد؟',
    excerpt: 'بررسی دلایل افزایش قیمت سکه در روزهای اخیر و تاثیر آن بر بازار داخلی.',
    content: '<p>قیمت سکه طرح جدید در هفته‌ی گذشته با افزایش چشمگیری روبرو شد. مهم‌ترین دلایل این افزایش عبارتند از:</p><ul><li>افزایش قیمت اونس جهانی</li><li>کاهش ارزش دلار در بازار آزاد</li><li>تقاضای فصلی برای سکه</li><li>انتظارات تورمی</li></ul>',
    categories: ['طلا'],
    daysAgo: 1,
    viewCount: 8900,
    readingTime: 4,
    imageIndex: 1,
  },
  {
    title: 'راهنمای خرید طلای آب شده | نکاتی که باید بدانید',
    excerpt: 'طلای آب شده یکی از محبوب‌ترین روش‌های سرمایه‌گذاری در ایران است.',
    content: '<p>طلای آب شده به دلیل کارمزد پایین‌تر و قابلیت نقدشوندگی بالا، مورد توجه قرار گرفته است.</p>',
    categories: ['طلا', 'سرمایه‌گذاری'],
    daysAgo: 2,
    viewCount: 15200,
    readingTime: 5,
    imageIndex: 1,
  },
  {
    title: 'نیم سکه بخریم یا ربع سکه؟ مقایسه کامل',
    excerpt: 'مقایسه‌ی جامع نیم سکه و ربع سکه از نظر قیمت، نقدشوندگی و حباب.',
    content: '<p>یکی از سوالات رایج سرمایه‌گذاران، انتخاب بین نیم سکه و ربع سکه است.</p>',
    categories: ['طلا'],
    daysAgo: 4,
    viewCount: 6700,
    readingTime: 4,
    imageIndex: 1,
  },
  {
    title: 'قیمت جهانی طلا به بالاترین حد تاریخی رسید',
    excerpt: 'انس طلا در بازارهای جهانی به رکورد جدیدی دست یافت.',
    content: '<p>قیمت اونس طلا در معاملات امروز با افزایش ۱.۵ درصدی به بالاترین سطح تاریخی خود رسید.</p>',
    categories: ['طلا', 'بازار جهانی'],
    daysAgo: 6,
    viewCount: 9400,
    readingTime: 3,
    imageIndex: 1,
  },
  {
    title: 'تاثیر نرخ بهره فدرال رزرو بر بازار طلا',
    excerpt: 'چگونه تصمیمات فدرال رزرو بر قیمت طلا در ایران تاثیر می‌گذارد؟',
    content: '<p>نرخ بهره یکی از مهم‌ترین عوامل موثر بر قیمت طلا است.</p>',
    categories: ['طلا', 'بازار جهانی', 'تحلیل تکنیکال'],
    daysAgo: 8,
    viewCount: 7800,
    readingTime: 6,
    imageIndex: 1,
  },
  {
    title: 'گرمی چند بخریم؟ راهنمای خرید طلا برای مبتدیان',
    excerpt: 'خرید طلا برای اولین بار می‌تواند گیج‌کننده باشد. راهنمای کامل برای شروع.',
    content: '<p>اگه اولین باره که می‌خواهید طلا بخرید، این راهنما رو بخونید.</p>',
    categories: ['طلا', 'سرمایه‌گذاری'],
    daysAgo: 12,
    viewCount: 5400,
    readingTime: 5,
    imageIndex: 1,
  },
  {
    title: 'حباب سکه چیست و چگونه محاسبه می‌شود؟',
    excerpt: 'حباب سکه یکی از مفاهیم کلیدی بازار طلاست. در این گزارش به بررسی دقیق آن می‌پردازیم.',
    content: '<p>حباب سکه تفاوت قیمت بازاری با ارزش ذاتی آن است.</p>',
    categories: ['طلا'],
    daysAgo: 14,
    viewCount: 11200,
    readingTime: 6,
    imageIndex: 1,
  },

  // ─── ارز دیجیتال (۸ پست) ───
  {
    title: 'بیت کوین به ۱۰۰ هزار دلار رسید | تحلیل روند',
    excerpt: 'بیت کوین سرانجام به آستانه‌ی روانی ۱۰۰ هزار دلار رسید. چه عواملی این صعود را رقم زد؟',
    content: '<p>بیت کوین پس از ماه‌ها انتظار، به سطح ۱۰۰ هزار دلار رسید.</p>',
    categories: ['ارز دیجیتال'],
    daysAgo: 0,
    isFeatured: true,
    viewCount: 22000,
    readingTime: 6,
    imageIndex: 2,
  },
  {
    title: 'آلت سیزن شروع شد؟ بهترین آلت کوین‌ها برای خرید',
    excerpt: 'با شروع آلت سیزن، کدام آلت کوین‌ها پتانسیل رشد بیشتری دارند؟',
    content: '<p>پس از صعود بیت کوین، نوبت به آلت کوین‌ها رسیده.</p>',
    categories: ['ارز دیجیتال', 'تحلیل تکنیکال'],
    daysAgo: 1,
    viewCount: 18500,
    readingTime: 5,
    imageIndex: 2,
  },
  {
    title: 'اتریوم ۴۰۰۰ دلار را هم رد کرد | چشم‌انداز ETH',
    excerpt: 'اتریوم با قدرت به سطوح بالاتر صعود می‌کند.',
    content: '<p>اتریوم پس از به‌روزرسانی Dencun توانست به رکورد جدیدی دست یابد.</p>',
    categories: ['ارز دیجیتال'],
    daysAgo: 2,
    viewCount: 11200,
    readingTime: 4,
    imageIndex: 2,
  },
  {
    title: 'راهنمای کامل ETF بیت کوین برای ایرانیان',
    excerpt: 'چگونه می‌توانیم از فرصت ETF بیت کوین بهره‌مند شویم؟',
    content: '<p>ETF بیت کوین یکی از مهم‌ترین تحولات بازار کریپتو در سال ۲۰۲۴ بود.</p>',
    categories: ['ارز دیجیتال', 'سرمایه‌گذاری'],
    daysAgo: 3,
    viewCount: 9200,
    readingTime: 7,
    imageIndex: 2,
  },
  {
    title: 'تحلیل تکنیکال بیت کوین | آیا ۱۲۰ هزار دلار در راه است؟',
    excerpt: 'بررسی الگوهای تکنیکال بیت کوین و پیش‌بینی کوتاه‌مدت.',
    content: '<p>نمودار بیت کوین الگوی پرچم صعودی تشکیل داده که هدف آن ۱۲۰ هزار دلار است.</p>',
    categories: ['ارز دیجیتال', 'تحلیل تکنیکال'],
    daysAgo: 5,
    viewCount: 14800,
    readingTime: 6,
    imageIndex: 2,
  },
  {
    title: 'صرافی‌های ارز دیجیتال ایرانی | مقایسه کارمزد و امنیت',
    excerpt: 'مقایسه‌ی صرافی‌های مطرح ایرانی از نظر کارمزد، امنیت و امکانات.',
    content: '<p>در این گزارش به مقایسه‌ی ۱۰ صرافی برتر ایرانی پرداخته‌ایم.</p>',
    categories: ['ارز دیجیتال'],
    daysAgo: 7,
    viewCount: 25600,
    readingTime: 8,
    imageIndex: 2,
  },
  {
    title: 'سولانا به ۲۰۰ دلار رسید | چرا SOL اینقدر قدرتمند شد؟',
    excerpt: 'سولانا با رشد خیره‌کننده، به یکی از بهترین عملکردهای بازار تبدیل شده است.',
    content: '<p>سولانا در ماه‌های گذشته رشد چشمگیری داشته است.</p>',
    categories: ['ارز دیجیتال'],
    daysAgo: 10,
    viewCount: 7200,
    readingTime: 5,
    imageIndex: 2,
  },
  {
    title: 'استیبل کوین‌ها | راهنمای کامل Tether و Circle',
    excerpt: 'استیبل کوین‌ها پلی بین دنیای کریپتو و ارزهای سنتی هستند.',
    content: '<p>در این گزارش به بررسی کامل استیبل کوین‌ها می‌پردازیم.</p>',
    categories: ['ارز دیجیتال', 'سرمایه‌گذاری'],
    daysAgo: 13,
    viewCount: 6300,
    readingTime: 7,
    imageIndex: 2,
  },

  // ─── بازار جهانی / فارکس (۸ پست) ───
  {
    title: 'دلار آمریکا به کف ۶ ماهه رسید | پیش‌بینی قیمت دلار',
    excerpt: 'شاخص دلار DXY به پایین‌ترین سطح خود در ۶ ماه گذشته رسید.',
    content: '<p>شاخص دلار در معاملات اخیر تحت فشار فروش قرار گرفته است.</p>',
    categories: ['بازار جهانی'],
    daysAgo: 1,
    isFeatured: true,
    viewCount: 13700,
    readingTime: 5,
    imageIndex: 3,
  },
  {
    title: 'یورو در برابر دلار به بالاترین سطح سال رسید',
    excerpt: 'EUR/USD پس از ماه‌ها فشار، توانست مقاومت مهم ۱.۱۰ را بشکند.',
    content: '<p>جفت ارز EUR/USD پس از شکست مقاومت کلیدی، وارد فاز صعودی شد.</p>',
    categories: ['بازار جهانی', 'تحلیل تکنیکال'],
    daysAgo: 2,
    viewCount: 5800,
    readingTime: 4,
    imageIndex: 3,
  },
  {
    title: 'نفت برنت ۹۰ دلار را هم رد کرد',
    excerpt: 'قیمت نفت برنت به بالاترین سطح ۳ ماه اخیر رسید.',
    content: '<p>تصمیم اوپک برای تمدید کاهش تولید، قیمت نفت را به سطوح بالاتر سوق داد.</p>',
    categories: ['بازار جهانی'],
    daysAgo: 3,
    viewCount: 7100,
    readingTime: 4,
    imageIndex: 3,
  },
  {
    title: 'شاخص S&P 500 رکورد زد | وال استریت در اوج',
    excerpt: 'شاخص S&P 500 به رکورد تاریخی جدیدی دست یافت.',
    content: '<p>بازار سهام آمریکا با شروع فصل گزارش‌های درآمدی، روند صعودی قدرتمندی را تجربه می‌کند.</p>',
    categories: ['بازار جهانی', 'بورس'],
    daysAgo: 4,
    viewCount: 9800,
    readingTime: 5,
    imageIndex: 3,
  },
  {
    title: 'پوند انگلیس در بحبوحه‌ی سیاست‌های بانک مرکزی',
    excerpt: 'GBP/USD در حال نوسان در محدوده‌ی حساسی است.',
    content: '<p>پوند انگلیس تحت تاثیر سیاست‌های پولی انقباضی بانک مرکزی انگلیس قرار دارد.</p>',
    categories: ['بازار جهانی'],
    daysAgo: 6,
    viewCount: 4200,
    readingTime: 4,
    imageIndex: 3,
  },
  {
    title: 'گاز طبیعی اروپا ۴۰ درصد گران شد',
    excerpt: 'سرمای زودهنگام در اروپا قیمت گاز را به شدت افزایش داد.',
    content: '<p>قیمت گاز طبیعی در بازار اروپا با شروع فصل سرما، افزایش چشمگیری داشته است.</p>',
    categories: ['بازار جهانی'],
    daysAgo: 8,
    viewCount: 5300,
    readingTime: 3,
    imageIndex: 3,
  },
  {
    title: 'ین ژاپن به پایین‌ترین ارزش ۳۰ ساله رسید',
    excerpt: 'USD/JPY به سطوح بی‌سابقه‌ای رسید و نگرانی‌ها را افزایش داد.',
    content: '<p>ین ژاپن تحت فشار سیاست‌های پولی بانک مرکزی ژاپن قرار دارد.</p>',
    categories: ['بازار جهانی'],
    daysAgo: 11,
    viewCount: 3900,
    readingTime: 4,
    imageIndex: 3,
  },
  {
    title: 'طلای جهانی در برابر بیت کوین | کدام بهتر است؟',
    excerpt: 'مقایسه‌ی بازده طلا و بیت کوین در ۵ سال گذشته.',
    content: '<p>سرمایه‌گذاری در طلا یا بیت کوین؟ پاسخ در این گزارش.</p>',
    categories: ['بازار جهانی', 'ارز دیجیتال'],
    daysAgo: 15,
    viewCount: 8400,
    readingTime: 6,
    imageIndex: 3,
  },

  // ─── بورس (۸ پست) ───
  {
    title: 'شاخص کل بورس تهران سبزپوش شد',
    excerpt: 'بازار سرمایه پس از چند روز نوسان منفی، امروز روند صعودی به خود گرفت.',
    content: '<p>شاخص کل بورس تهران با رشد ۱.۲ درصدی به سطح ۲ میلیون و ۱۰۰ هزار واحد رسید.</p>',
    categories: ['بورس'],
    daysAgo: 1,
    viewCount: 12000,
    readingTime: 4,
    imageIndex: 4,
  },
  {
    title: 'بهترین سهام برای خرید در نیمه دوم سال',
    excerpt: 'تحلیل بنیادی و تکنیکال بهترین نمادهای بورسی برای سرمایه‌گذاری.',
    content: '<p>در این گزارش به بررسی ۱۰ نماد مستعد رشد در ماه‌های آتی پرداخته‌ایم.</p>',
    categories: ['بورس', 'سرمایه‌گذاری', 'تحلیل تکنیکال'],
    daysAgo: 2,
    viewCount: 19500,
    readingTime: 7,
    imageIndex: 4,
  },
  {
    title: 'صندوق‌های ETF درآمد ثابت | راهنمای کامل',
    excerpt: 'صندوق‌های ETF درآمد ثابت یکی از امن‌ترین روش‌های سرمایه‌گذاری در بورس هستند.',
    content: '<p>ETFهای درآمد ثابت با تقسیم سود ماهانه، گزینه‌ای جذاب برای سرمایه‌گذاران ریسک‌گریز هستند.</p>',
    categories: ['بورس', 'سرمایه‌گذاری'],
    daysAgo: 3,
    viewCount: 8500,
    readingTime: 5,
    imageIndex: 4,
  },
  {
    title: 'تحلیل هفتگی بازار سرمایه | گزارش کامل',
    excerpt: 'خلاصه‌ی عملکرد بازار سرمایه در هفته‌ی گذشته و پیش‌بینی هفته‌ی آینده.',
    content: '<p>بازار سرمایه در هفته‌ی گذشته با نوسانات متعددی همراه بود.</p>',
    categories: ['بورس', 'تحلیل تکنیکال'],
    daysAgo: 5,
    viewCount: 7600,
    readingTime: 6,
    imageIndex: 4,
  },
  {
    title: 'عرضه‌ی اولیه «ثالوند» | هر آنچه باید بدانید',
    excerpt: 'جزئیات عرضه‌ی اولیه‌ی جدید بازار سرمایه و تحلیل ارزش ذاتی.',
    content: '<p>عرضه‌ی اولیه‌ی سهام «ثالوند» فردا با نماد «ثالوند» در بازار فرابورس انجام می‌شود.</p>',
    categories: ['بورس'],
    daysAgo: 6,
    viewCount: 15400,
    readingTime: 5,
    imageIndex: 4,
  },
  {
    title: 'سهام دلاری در برابر ریالی | کدام بهتر است؟',
    excerpt: 'مقایسه‌ی عملکرد سهام دلاری و ریالی در شرایط تورمی.',
    content: '<p>در شرایط تورمی، سهام دلاری معمولاً عملکرد بهتری دارند.</p>',
    categories: ['بورس', 'سرمایه‌گذاری'],
    daysAgo: 9,
    viewCount: 10200,
    readingTime: 6,
    imageIndex: 4,
  },
  {
    title: 'سبد پیشنهادی بورس برای تابستان ۱۴۰۵',
    excerpt: 'تحلیلگران بهترین سبد سرمایه‌گذاری برای فصل تابستان را معرفی کردند.',
    content: '<p>در این گزارش سبدی متنوع از سهام بنیادی و رشدی معرفی می‌کنیم.</p>',
    categories: ['بورس', 'سرمایه‌گذاری'],
    daysAgo: 16,
    viewCount: 9100,
    readingTime: 7,
    imageIndex: 4,
  },
  {
    title: 'گزارش ماهانه صندوق‌های ETF | بهترین عملکردها',
    excerpt: 'بررسی عملکرد صندوق‌های ETF در یک ماه گذشته.',
    content: '<p>کدام صندوق‌ها بهترین بازدهی را داشته‌اند؟</p>',
    categories: ['بورس', 'سرمایه‌گذاری'],
    daysAgo: 20,
    viewCount: 4800,
    readingTime: 5,
    imageIndex: 4,
  },

  // ─── تحلیل تکنیکال (۸ پست) ───
  {
    title: 'الگوی سر و شانه چیست؟ آموزش کامل با مثال',
    excerpt: 'الگوی سر و شانه یکی از معتبرترین الگوهای بازگشتی در تحلیل تکنیکال است.',
    content: '<p>در این آموزش به بررسی کامل الگوی سر و شانه می‌پردازیم.</p>',
    categories: ['تحلیل تکنیکال', 'سرمایه‌گذاری'],
    daysAgo: 3,
    viewCount: 32000,
    readingTime: 9,
    imageIndex: 5,
  },
  {
    title: 'آموزش اندیکاتور RSI | از صفر تا صد',
    excerpt: 'RSI یکی از پرکاربردترین اندیکاتورهای تحلیل تکنیکال است.',
    content: '<p>در این راهنما با اندیکاتور RSI، نحوه‌ی محاسبه، سیگنال‌ها و محدودیت‌های آن آشنا می‌شوید.</p>',
    categories: ['تحلیل تکنیکال'],
    daysAgo: 4,
    viewCount: 28000,
    readingTime: 8,
    imageIndex: 5,
  },
  {
    title: 'خط روند چگونه ترسیم می‌شود؟',
    excerpt: 'آموزش اصولی ترسیم خط روند در نمودارهای قیمتی.',
    content: '<p>خط روند ابتدایی‌ترین ابزار تحلیل تکنیکال است.</p>',
    categories: ['تحلیل تکنیکال'],
    daysAgo: 5,
    viewCount: 18900,
    readingTime: 6,
    imageIndex: 5,
  },
  {
    title: 'حمایت و مقاومت | کلیدی‌ترین مفهوم تکنیکال',
    excerpt: 'سطوح حمایت و مقاومت اساس تمام تحلیل‌های تکنیکال هستند.',
    content: '<p>درک صحیح سطوح حمایت و مقاومت، پایه‌ی موفقیت در تحلیل تکنیکال است.</p>',
    categories: ['تحلیل تکنیکال'],
    daysAgo: 7,
    viewCount: 21500,
    readingTime: 7,
    imageIndex: 5,
  },
  {
    title: 'فیبوناچی اصلاحی | راهنمای کامل معامله‌گری',
    excerpt: 'ابزار فیبوناچی اصلاحی یکی از قوی‌ترین ابزارها برای یافتن نقاط بازگشتی است.',
    content: '<p>در این راهنما با سطوح فیبوناچی و نحوه‌ی استفاده از آن در معاملات آشنا می‌شوید.</p>',
    categories: ['تحلیل تکنیکال'],
    daysAgo: 8,
    viewCount: 17600,
    readingTime: 8,
    imageIndex: 5,
  },
  {
    title: 'الگوهای کندل استیک ژاپنی | آموزش تصویری',
    excerpt: 'الگوهای کندلی ژاپنی ابزار قدرتمندی برای تحلیل رفتار قیمت هستند.',
    content: '<p>در این مطلب مهم‌ترین الگوهای کندلی شامل دوجی، چکش و ستاره‌ی دنباله‌دار آموزش داده می‌شود.</p>',
    categories: ['تحلیل تکنیکال'],
    daysAgo: 10,
    viewCount: 24300,
    readingTime: 9,
    imageIndex: 5,
  },
  {
    title: 'مکدی (MACD) چیست و چگونه از آن استفاده کنیم؟',
    excerpt: 'اندیکاتور MACD یکی از محبوب‌ترین ابزارهای تحلیل تکنیکال است.',
    content: '<p>در این آموزش با MACD و کاربردهای آن آشنا می‌شوید.</p>',
    categories: ['تحلیل تکنیکال'],
    daysAgo: 14,
    viewCount: 13700,
    readingTime: 7,
    imageIndex: 5,
  },
  {
    title: 'مدیریت سرمایه در معامله‌گری | تکنیک‌های ضروری',
    excerpt: 'بدون مدیریت سرمایه، حتی بهترین استراتژی هم شکست می‌خورد.',
    content: '<p>در این گزارش اصول مدیریت سرمایه را بررسی می‌کنیم.</p>',
    categories: ['تحلیل تکنیکال', 'سرمایه‌گذاری'],
    daysAgo: 18,
    viewCount: 8200,
    readingTime: 8,
    imageIndex: 5,
  },

  // ─── سرمایه‌گذاری (۸ پست) ───
  {
    title: 'راهنمای سرمایه‌گذاری برای مبتدیان',
    excerpt: 'اگر تازه می‌خواهید سرمایه‌گذاری را شروع کنید، این راهنما برای شماست.',
    content: '<p>در این راهنمای جامع، اصول اولیه‌ی سرمایه‌گذاری را می‌آموزید.</p>',
    categories: ['سرمایه‌گذاری'],
    daysAgo: 4,
    viewCount: 41000,
    readingTime: 12,
    imageIndex: 6,
  },
  {
    title: 'سبد سرمایه‌گذاری متنوع | چگونه ریسک را کاهش دهیم؟',
    excerpt: 'تنوع‌بخشی به سبد سرمایه‌گذاری کلید کاهش ریسک است.',
    content: '<p>اصول تنوع‌بخشی و تخصیص دارایی در این مطلب به طور کامل بررسی می‌شود.</p>',
    categories: ['سرمایه‌گذاری'],
    daysAgo: 5,
    viewCount: 16200,
    readingTime: 7,
    imageIndex: 6,
  },
  {
    title: 'سرمایه‌گذاری در مسکن یا طلا؟ مقایسه بازده ۱۰ ساله',
    excerpt: 'بررسی بازده سرمایه‌گذاری در مسکن و طلا در یک دهه‌ی گذشته.',
    content: '<p>کدام بازار در بلندمدت بازدهی بهتری داشته است؟</p>',
    categories: ['سرمایه‌گذاری', 'طلا'],
    daysAgo: 6,
    viewCount: 12800,
    readingTime: 6,
    imageIndex: 6,
  },
  {
    title: 'مدیریت ریسک در بازارهای مالی',
    excerpt: 'بدون مدیریت ریسک، موفقیت در بازارهای مالی غیرممکن است.',
    content: '<p>اصول مدیریت ریسک شامل نسبت ریسک به ریوارد، حد ضرر و تنظیم اندازه‌ی موقعیت.</p>',
    categories: ['سرمایه‌گذاری', 'تحلیل تکنیکال'],
    daysAgo: 7,
    viewCount: 14500,
    readingTime: 8,
    imageIndex: 6,
  },
  {
    title: 'صندوق‌های سرمایه‌گذاری یا سرمایه‌گذاری مستقیم؟',
    excerpt: 'مزایا و معایب سرمایه‌گذاری از طریق صندوق یا به صورت مستقیم.',
    content: '<p>انتخاب بین صندوق و سرمایه‌گذاری مستقیم به دانش و زمان شما بستگی دارد.</p>',
    categories: ['سرمایه‌گذاری', 'بورس'],
    daysAgo: 8,
    viewCount: 9800,
    readingTime: 5,
    imageIndex: 6,
  },
  {
    title: 'اثر تورم بر سرمایه‌گذاری | چگونه از ارزش پول محافظت کنیم؟',
    excerpt: 'تورم بزرگ‌ترین دشمن سرمایه‌گذاری است.',
    content: '<p>راهکارهای عملی برای مقابله با تورم.</p>',
    categories: ['سرمایه‌گذاری'],
    daysAgo: 11,
    viewCount: 20300,
    readingTime: 7,
    imageIndex: 6,
  },
  {
    title: 'سرمایه‌گذاری بلندمدت یا کوتاه‌مدت؟',
    excerpt: 'هر کدام مزایا و معایب خود را دارند. در این گزارش مقایسه می‌کنیم.',
    content: '<p>انتخاب استراتژی سرمایه‌گذاری به اهداف و شرایط شما بستگی دارد.</p>',
    categories: ['سرمایه‌گذاری'],
    daysAgo: 17,
    viewCount: 7600,
    readingTime: 6,
    imageIndex: 6,
  },
  {
    title: 'بهترین کتاب‌های سرمایه‌گذاری | پیشنهاد کارشناسان',
    excerpt: 'معرفی ۱۰ کتاب برتر سرمایه‌گذاری که هر سرمایه‌گذاری باید بخواند.',
    content: '<p>این کتاب‌ها دیدگاه شما را نسبت به پول و سرمایه‌گذاری تغییر می‌دهند.</p>',
    categories: ['سرمایه‌گذاری'],
    daysAgo: 22,
    viewCount: 11400,
    readingTime: 5,
    imageIndex: 6,
  },
];

/* -------------------------------------------------------------------------- */
/*  Advertisements                                                            */
/* -------------------------------------------------------------------------- */

interface AdSeed {
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  size: AdSize;
  position: AdPosition;
  order?: number;
  daysValid: number;
}

const ADS: AdSeed[] = [
  {
    title: 'صرافی ارز دیجیتال نوبیتکس',
    description: 'خرید و فروش امن ارزهای دیجیتال با کارمزد صفر',
    imageUrl: '/images/ads/ads-1.svg',
    linkUrl: 'https://nobitex.ir',
    size: AdSize.LARGE,
    position: AdPosition.CUSTOM,
    order: 1,
    daysValid: 30,
  },
  {
    title: 'بانکداری دیجیتال بلوبانک',
    description: 'افتتاح حساب آنلاین در ۳ دقیقه',
    imageUrl: '/images/ads/ads-2.svg',
    linkUrl: 'https://bluebank.ir',
    size: AdSize.LARGE,
    position: AdPosition.CUSTOM,
    order: 2,
    daysValid: 30,
  },
  {
    title: 'طلای دیجیتال مِلّی',
    description: 'سرمایه‌گذاری در طلا بدون نیاز به نگهداری فیزیکی',
    imageUrl: '/images/ads/ads-3.svg',
    linkUrl: 'https://melligold.com',
    size: AdSize.MEDIUM,
    position: AdPosition.IN_CONTENT,
    order: 1,
    daysValid: 45,
  },
  {
    title: 'کارگزاری آگاه',
    description: 'بورس، صندوق و ETF با کارمزد رقابتی',
    imageUrl: '/images/ads/ads-4.svg',
    linkUrl: 'https://agah.ir',
    size: AdSize.MEDIUM,
    position: AdPosition.BETWEEN_POSTS,
    order: 2,
    daysValid: 30,
  },
  {
    title: 'آموزش تحلیل تکنیکال',
    description: 'دوره‌ی جامع از صفر تا حرفه‌ای',
    imageUrl: '/images/ads/ads-5.svg',
    linkUrl: 'https://example.com/course',
    size: AdSize.MEDIUM,
    position: AdPosition.SIDEBAR,
    order: 1,
    daysValid: 60,
  },
  {
    title: 'کیف پول سخت‌افزاری لجر',
    description: 'امن‌ترین روش نگهداری ارزهای دیجیتال',
    imageUrl: '/images/ads/ads-6.svg',
    linkUrl: 'https://ledger.com',
    size: AdSize.SMALL,
    position: AdPosition.SIDEBAR,
    order: 2,
    daysValid: 60,
  },
  {
    title: 'مشاوره‌ی سرمایه‌گذاری',
    description: 'مشاوره‌ی تخصصی با تیم حرفه‌ای ما',
    imageUrl: '/images/ads/ads-7.svg',
    linkUrl: 'https://example.com/consult',
    size: AdSize.SMALL,
    position: AdPosition.FOOTER,
    order: 1,
    daysValid: 30,
  },
  {
    title: 'پلتفرم سیگنال‌دهی',
    description: 'سیگنال‌های لحظه‌ای خرید و فروش',
    imageUrl: '/images/ads/ads-8.svg',
    linkUrl: 'https://example.com/signals',
    size: AdSize.SMALL,
    position: AdPosition.BETWEEN_POSTS,
    order: 3,
    daysValid: 14,
  },
  // ── تبلیغات اضافی برای چگالی بصری ──
  {
    title: 'صرافی بیت ۲۴',
    description: 'معامله‌ی ارز دیجیتال با بهترین قیمت',
    imageUrl: '/images/ads/ads-1.svg',
    linkUrl: 'https://bit24.ir',
    size: AdSize.MEDIUM,
    position: AdPosition.BETWEEN_POSTS,
    order: 4,
    daysValid: 30,
  },
  {
    title: 'بانک دیجیتال نئوبانک',
    description: 'تجربه‌ی بانکداری مدرن',
    imageUrl: '/images/ads/ads-2.svg',
    linkUrl: 'https://neobank.ir',
    size: AdSize.MEDIUM,
    position: AdPosition.IN_CONTENT,
    order: 2,
    daysValid: 30,
  },
  {
    title: 'سکه‌ی دیجیتال',
    description: 'خرید و فروش طلای دیجیتال',
    imageUrl: '/images/ads/ads-3.svg',
    linkUrl: 'https://example.com/gold',
    size: AdSize.SMALL,
    position: AdPosition.BETWEEN_POSTS,
    order: 5,
    daysValid: 30,
  },
  {
    title: 'دوره‌ی آموزش فارکس',
    description: 'از صفر تا درآمد دلاری',
    imageUrl: '/images/ads/ads-5.svg',
    linkUrl: 'https://example.com/forex',
    size: AdSize.SMALL,
    position: AdPosition.SIDEBAR,
    order: 3,
    daysValid: 60,
  },
];

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

async function seedPosts(authorId: string, categoryMap: Map<string, string>) {
  log.title(`پست‌ها (${POSTS.length} مورد)`);
  let created = 0;
  let skipped = 0;
  for (const p of POSTS) {
    const slug = persianSlug(p.title);
    const existing = await prisma.post.findFirst({ where: { slug } });
    if (existing) {
      log.skip(`${p.title.slice(0, 50)}…`);
      skipped++;
      continue;
    }

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - p.daysAgo);

    // تصویر معتبر: اولویت با imageIndex، در غیر این صورت hash
    const imageIdx = p.imageIndex ?? (Math.abs(hash(p.title)) % 8) + 1;
    const featuredImage = `/images/posts/placeholder-${imageIdx}.svg`;

    const post = await prisma.post.create({
      data: {
        title: p.title,
        slug,
        excerpt: p.excerpt,
        content: p.content,
        status: PostStatus.PUBLISHED,
        postType: p.postType ?? PostType.STANDARD,
        viewCount: p.viewCount ?? 0,
        readingTime: p.readingTime ?? 5,
        isFeatured: p.isFeatured ?? false,
        featuredImage,
        authorId,
        createdAt,
        updatedAt: createdAt,
        categories: {
          connect: p.categories
            .map((name) => categoryMap.get(name))
            .filter((id): id is string => Boolean(id))
            .map((id) => ({ id })),
        },
      },
    });
    log.ok(`${post.title.slice(0, 50)}… → ${featuredImage}`);
    created++;
  }
  console.log(`  ${created} ساخته شد، ${skipped} رد شد`);
  return { created, skipped };
}

/** پشت‌یبانی: پست‌های بدون تصویر معتبر → تخصیص تصویر موضوعی بر اساس دسته */
async function backfillPostImages(categoryMap: Map<string, string>) {
  log.title('بک‌فیل تصاویر پست‌های فاقد تصویر معتبر');
  const allPosts = await prisma.post.findMany({
    where: { status: PostStatus.PUBLISHED },
    include: { categories: { select: { name: true } } },
  });

  // Map category name → default image index
  const categoryToImage: Record<string, number> = {
    'طلا': 1,
    'ارز دیجیتال': 2,
    'بازار جهانی': 3,
    'بورس': 4,
    'تحلیل تکنیکال': 5,
    'سرمایه‌گذاری': 6,
  };

  let fixed = 0;
  for (const p of allPosts) {
    const needsFix = !imageExists(p.featuredImage);
    if (!needsFix) continue;

    // pick image index by first matching category
    let imageIdx = 7; // default
    for (const cat of p.categories) {
      if (categoryToImage[cat.name]) {
        imageIdx = categoryToImage[cat.name];
        break;
      }
    }
    const newImage = `/images/posts/placeholder-${imageIdx}.svg`;
    await prisma.post.update({
      where: { id: p.id },
      data: { featuredImage: newImage },
    });
    log.ok(`${p.title.slice(0, 40)}… → ${newImage}`);
    fixed++;
  }
  if (fixed === 0) {
    log.skip('همه‌ی پست‌ها تصویر معتبر دارند');
  } else {
    console.log(`  ${fixed} پست به‌روزرسانی شد`);
  }
  return fixed;
}

async function seedAds() {
  log.title(`تبلیغات (${ADS.length} مورد)`);
  let created = 0;
  let skipped = 0;
  const now = new Date();
  for (const ad of ADS) {
    const existing = await prisma.advertisement.findFirst({ where: { title: ad.title } });
    if (existing) {
      log.skip(`${ad.title}`);
      skipped++;
      continue;
    }
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + ad.daysValid);

    await prisma.advertisement.create({
      data: {
        title: ad.title,
        description: ad.description,
        imageUrl: ad.imageUrl,
        linkUrl: ad.linkUrl,
        size: ad.size,
        position: ad.position,
        order: ad.order ?? 0,
        isActive: true,
        startDate: now,
        endDate,
      },
    });
    log.ok(`${ad.title} (${ad.size})`);
    created++;
  }
  console.log(`  ${created} ساخته شد، ${skipped} رد شد`);
  return { created, skipped };
}

async function main() {
  console.log('\n\x1b[1m\x1b[36m🌱 شروع seed پست‌ها و تبلیغات\x1b[0m\n');

  try {
    const categoryMap = await ensureCategories();
    const authorId = await ensureAuthor();
    const postsResult = await seedPosts(authorId, categoryMap);
    const backfilled = await backfillPostImages(categoryMap);
    const adsResult = await seedAds();

    console.log('\n\x1b[1m\x1b[32m━━ ✅ خلاصه ━━\x1b[0m');
    console.log(`  پست‌ها: ${postsResult.created} ساخته شد، ${postsResult.skipped} رد شد`);
    console.log(`  بک‌فیل تصویر: ${backfilled} پست اصلاح شد`);
    console.log(`  تبلیغات: ${adsResult.created} ساخته شد، ${adsResult.skipped} رد شد`);
    console.log('\n  💡 نکته: برای refresh کش، `revalidatePostCache()` یا `revalidateAdvertisementsCache()` رو از داشبورد اجرا کن.\n');
  } catch (err) {
    log.err(`خطا: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ خطای غیرمنتظره:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
