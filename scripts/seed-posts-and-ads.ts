/* Seed script: نمونه پست و تبلیغ برای تست
 *
 * کارهایی که انجام می‌ده:
 *  1. مطمئن می‌شه دسته‌بندی‌های اصلی (طلا، ارز دیجیتال، بازار جهانی، بورس، تحلیل تکنیکال)
 *     وجود دارن. اگه نیستن، می‌سازه.
 *  2. یک کاربر AUTHOR می‌سازه (اگه نباشه) — برای author پست‌ها.
 *  3. ۳۶ پست منتشرشده با محتوای واقعی مالی می‌سازه (idempotent بر اساس slug).
 *  4. ۸ تبلیغ در سایزهای مختلف می‌سازه (idempotent بر اساس title).
 *
 * برای اجرا: npx tsx scripts/seed-posts-and-ads.ts
 *
 * ⚠️ این اسکریپت DB رو پاک نمی‌کنه — فقط چیزهای جدید اضافه می‌کنه.
 *    اگه می‌خوای از اول شروع کنی، اول:
 *      npx prisma migrate reset --force
 *    بعد: npx tsx scripts/seed-categories.ts && npx tsx scripts/seed-posts-and-ads.ts
 */

import { PrismaClient, PostType, AdSize, AdPosition, PostStatus, Role } from '@prisma/client';

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

const log = {
  info: (m: string) => console.log(`\x1b[36mℹ\x1b[0m  ${m}`),
  ok: (m: string) => console.log(`\x1b[32m✓\x1b[0m  ${m}`),
  skip: (m: string) => console.log(`\x1b[33m⏭\x1b[0m  ${m}`),
  err: (m: string) => console.log(`\x1b[31m✗\x1b[0m  ${m}`),
  title: (m: string) => console.log(`\n\x1b[1m\x1b[35m━━ ${m} ━━\x1b[0m`),
};

/* -------------------------------------------------------------------------- */
/*  Categories (مطمئن می‌شیم وجود دارن)                                       */
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
  const map = new Map<string, string>(); // name -> id
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
/*  Author (نویسنده‌ی نمونه)                                                   */
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
/*  Posts (نمونه محتوا)                                                        */
/* -------------------------------------------------------------------------- */

interface PostSeed {
  title: string;
  excerpt: string;
  content: string;
  categories: string[]; // names
  postType?: PostType;
  viewCount?: number;
  readingTime?: number;
  isFeatured?: boolean;
  daysAgo: number;
}

const POSTS: PostSeed[] = [
  // ─── طلا (۶ پست) ───
  {
    title: 'پیش‌بینی قیمت طلا در نیمه دوم ۱۴۰۵ | تحلیل جامع بازار جهانی',
    excerpt: 'بررسی عوامل بنیادی و تکنیکال موثر بر قیمت طلا در ماه‌های آتی و سناریوهای محتمل برای سرمایه‌گذاران ایرانی.',
    content: '<p>بازار جهانی طلا در ماه‌های گذشته تحت تاثیر سیاست‌های فدرال رزرو و نوسانات دلار قرار گرفته است. در این گزارش به بررسی سه سناریوی اصلی برای قیمت انس طلا می‌پردازیم.</p><h2>سناریوی اول: صعود تا ۲۵۰۰ دلار</h2><p>در صورت تداوم تنش‌های ژئوپلیتیک و کاهش نرخ بهره، طلا می‌تواند تا سطوح بالاتر صعود کند.</p><h2>سناریوی دوم: نوسان محدود</h2><p>اگر فدرال رزرو سیاست انقباضی را ادامه دهد، طلا در محدوده‌ی ۲۳۰۰ تا ۲۴۰۰ دلار نوسان خواهد کرد.</p><h2>سناریوی سوم: اصلاح عمیق</h2><p>در صورت قوی شدن دلار آمریکا، احتمال اصلاح تا ۲۱۰۰ دلار وجود دارد.</p>',
    categories: ['طلا', 'بازار جهانی'],
    daysAgo: 0,
    isFeatured: true,
    viewCount: 12500,
    readingTime: 7,
  },
  {
    title: 'سکه طرح جدید بهار آزادی | چرا قیمت‌ها صعودی شد؟',
    excerpt: 'بررسی دلایل افزایش قیمت سکه در روزهای اخیر و تاثیر آن بر بازار داخلی.',
    content: '<p>قیمت سکه طرح جدید در هفته‌ی گذشته با افزایش چشمگیری روبرو شد. مهم‌ترین دلایل این افزایش عبارتند از:</p><ul><li>افزایش قیمت اونس جهانی</li><li>کاهش ارزش دلار در بازار آزاد</li><li>تقاضای فصلی برای سکه</li><li>انتظارات تورمی</li></ul><p>کارشناسان معتقدند در کوتاه‌مدت نوسان ادامه خواهد داشت.</p>',
    categories: ['طلا'],
    daysAgo: 1,
    viewCount: 8900,
    readingTime: 4,
  },
  {
    title: 'راهنمای خرید طلای آب شده | نکاتی که باید بدانید',
    excerpt: 'طلای آب شده یکی از محبوب‌ترین روش‌های سرمایه‌گذاری در ایران است. در این مطلب به بررسی مزایا و معایب آن می‌پردازیم.',
    content: '<p>طلای آب شده به دلیل کارمزد پایین‌تر و قابلیت نقدشوندگی بالا، مورد توجه سرمایه‌گذاران قرار گرفته است. اما نکات مهمی وجود دارد که باید رعایت کنید.</p><h2>مزایا</h2><ul><li>کارمزد کمتر نسبت به سکه</li><li>قابلیت خرید در مقادیر کم</li><li>نقدشوندگی بالا</li></ul><h2>معایب</h2><ul><li>ریسک تقلب</li><li>عدم وجود شناسنامه‌ی رسمی</li></ul>',
    categories: ['طلا', 'سرمایه‌گذاری'],
    daysAgo: 2,
    viewCount: 15200,
    readingTime: 5,
  },
  {
    title: 'نیم سکه بخریم یا ربع سکه؟ مقایسه کامل',
    excerpt: 'مقایسه‌ی جامع نیم سکه و ربع سکه از نظر قیمت، نقدشوندگی و حباب.',
    content: '<p>یکی از سوالات رایج سرمایه‌گذاران، انتخاب بین نیم سکه و ربع سکه است. در این گزارش به مقایسه‌ی این دو می‌پردازیم.</p>',
    categories: ['طلا'],
    daysAgo: 4,
    viewCount: 6700,
    readingTime: 4,
  },
  {
    title: 'قیمت جهانی طلا به بالاترین حد تاریخی رسید',
    excerpt: 'انس طلا در بازارهای جهانی به رکورد جدیدی دست یافت.',
    content: '<p>قیمت اونس طلا در معاملات امروز با افزایش ۱.۵ درصدی به بالاترین سطح تاریخی خود رسید.</p>',
    categories: ['طلا', 'بازار جهانی'],
    daysAgo: 6,
    viewCount: 9400,
    readingTime: 3,
  },
  {
    title: 'تاثیر نرخ بهره فدرال رزرو بر بازار طلا',
    excerpt: 'چگونه تصمیمات فدرال رزرو بر قیمت طلا در ایران تاثیر می‌گذارد؟',
    content: '<p>نرخ بهره یکی از مهم‌ترین عوامل موثر بر قیمت طلا است. در این مطلب رابطه‌ی این دو را بررسی می‌کنیم.</p>',
    categories: ['طلا', 'بازار جهانی', 'تحلیل تکنیکال'],
    daysAgo: 8,
    viewCount: 7800,
    readingTime: 6,
  },

  // ─── ارز دیجیتال (۶ پست) ───
  {
    title: 'بیت کوین به ۱۰۰ هزار دلار رسید | تحلیل روند',
    excerpt: 'بیت کوین سرانجام به آستانه‌ی روانی ۱۰۰ هزار دلار رسید. چه عواملی این صعود را رقم زد؟',
    content: '<p>بیت کوین پس از ماه‌ها انتظار، به سطح ۱۰۰ هزار دلار رسید. این صعود تاریخی نتیجه‌ی:</p><ul><li>تایید ETF اسپات</li><li>کاهش ذخایر صرافی‌ها</li><li>پذیرش نهادی</li><li>سیاست‌های پولی آمریکا</li></ul>',
    categories: ['ارز دیجیتال'],
    daysAgo: 0,
    isFeatured: true,
    viewCount: 22000,
    readingTime: 6,
  },
  {
    title: 'آلت سیزن شروع شد؟ بهترین آلت کوین‌ها برای خرید',
    excerpt: 'با شروع آلت سیزن، کدام آلت کوین‌ها پتانسیل رشد بیشتری دارند؟',
    content: '<p>پس از صعود بیت کوین، نوبت به آلت کوین‌ها رسیده. در این گزارش بهترین گزینه‌ها را بررسی می‌کنیم.</p>',
    categories: ['ارز دیجیتال', 'تحلیل تکنیکال'],
    daysAgo: 1,
    viewCount: 18500,
    readingTime: 5,
  },
  {
    title: 'اتریوم ۴۰۰۰ دلار را هم رد کرد | چشم‌انداز ETH',
    excerpt: 'اتریوم با قدرت به سطوح بالاتر صعود می‌کند.',
    content: '<p>اتریوم پس از به‌روزرسانی Dencun و کاهش کارمزدها، توانست به رکورد جدیدی دست یابد.</p>',
    categories: ['ارز دیجیتال'],
    daysAgo: 2,
    viewCount: 11200,
    readingTime: 4,
  },
  {
    title: 'راهنمای کامل ETF بیت کوین برای ایرانیان',
    excerpt: 'چگونه می‌توانیم از فرصت ETF بیت کوین بهره‌مند شویم؟',
    content: '<p>ETF بیت کوین یکی از مهم‌ترین تحولات بازار کریپتو در سال ۲۰۲۴ بود. در این راهنما به بررسی همه‌ی جوانب آن می‌پردازیم.</p>',
    categories: ['ارز دیجیتال', 'سرمایه‌گذاری'],
    daysAgo: 3,
    viewCount: 9200,
    readingTime: 7,
  },
  {
    title: 'تحلیل تکنیکال بیت کوین | آیا ۱۲۰ هزار دلار در راه است؟',
    excerpt: 'بررسی الگوهای تکنیکال بیت کوین و پیش‌بینی کوتاه‌مدت.',
    content: '<p>نمودار بیت کوین الگوی پرچم صعودی تشکیل داده که هدف آن ۱۲۰ هزار دلار است.</p>',
    categories: ['ارز دیجیتال', 'تحلیل تکنیکال'],
    daysAgo: 5,
    viewCount: 14800,
    readingTime: 6,
  },
  {
    title: 'صرافی‌های ارز دیجیتال ایرانی | مقایسه کارمزد و امنیت',
    excerpt: 'مقایسه‌ی صرافی‌های مطرح ایرانی از نظر کارمزد، امنیت و امکانات.',
    content: '<p>در این گزارش به مقایسه‌ی ۱۰ صرافی برتر ایرانی پرداخته‌ایم.</p>',
    categories: ['ارز دیجیتال'],
    daysAgo: 7,
    viewCount: 25600,
    readingTime: 8,
  },

  // ─── بازار جهانی / فارکس (۶ پست) ───
  {
    title: 'دلار آمریکا به کف ۶ ماهه رسید | پیش‌بینی قیمت دلار',
    excerpt: 'شاخص دلار DXY به پایین‌ترین سطح خود در ۶ ماه گذشته رسید. این برای بازارها چه معنایی دارد؟',
    content: '<p>شاخص دلار در معاملات اخیر تحت فشار فروش قرار گرفته است. مهم‌ترین دلایل این افت:</p><ul><li>انتظار کاهش نرخ بهره</li><li>ضعف اقتصاد آمریکا</li><li>تقویت ارزهای آسیایی</li></ul>',
    categories: ['بازار جهانی'],
    daysAgo: 1,
    isFeatured: true,
    viewCount: 13700,
    readingTime: 5,
  },
  {
    title: 'یورو در برابر دلار به بالاترین سطح سال رسید',
    excerpt: 'EUR/USD پس از ماه‌ها فشار، توانست مقاومت مهم ۱.۱۰ را بشکند.',
    content: '<p>جفت ارز EUR/USD پس از شکست مقاومت کلیدی، وارد فاز صعودی شد.</p>',
    categories: ['بازار جهانی', 'تحلیل تکنیکال'],
    daysAgo: 2,
    viewCount: 5800,
    readingTime: 4,
  },
  {
    title: 'نفت برنت ۹۰ دلار را هم رد کرد',
    excerpt: 'قیمت نفت برنت به بالاترین سطح ۳ ماه اخیر رسید.',
    content: '<p>تصمیم اوپک برای تمدید کاهش تولید، قیمت نفت را به سطوح بالاتر سوق داد.</p>',
    categories: ['بازار جهانی'],
    daysAgo: 3,
    viewCount: 7100,
    readingTime: 4,
  },
  {
    title: 'شاخص S&P 500 رکورد زد | وال استریت در اوج',
    excerpt: 'شاخص S&P 500 به رکورد تاریخی جدیدی دست یافت.',
    content: '<p>بازار سهام آمریکا با شروع فصل گزارش‌های درآمدی، روند صعودی قدرتمندی را تجربه می‌کند.</p>',
    categories: ['بازار جهانی', 'بورس'],
    daysAgo: 4,
    viewCount: 9800,
    readingTime: 5,
  },
  {
    title: 'پوند انگلیس در بحبوحه‌ی سیاست‌های بانک مرکزی',
    excerpt: 'GBP/USD در حال نوسان در محدوده‌ی حساسی است.',
    content: '<p>پوند انگلیس تحت تاثیر سیاست‌های پولی انقباضی بانک مرکزی انگلیس قرار دارد.</p>',
    categories: ['بازار جهانی'],
    daysAgo: 6,
    viewCount: 4200,
    readingTime: 4,
  },
  {
    title: 'گاز طبیعی اروپا ۴۰ درصد گران شد',
    excerpt: 'سرمای زودهنگام در اروپا قیمت گاز را به شدت افزایش داد.',
    content: '<p>قیمت گاز طبیعی در بازار اروپا با شروع فصل سرما، افزایش چشمگیری داشته است.</p>',
    categories: ['بازار جهانی'],
    daysAgo: 8,
    viewCount: 5300,
    readingTime: 3,
  },

  // ─── بورس (۶ پست) ───
  {
    title: 'شاخص کل بورس تهران سبزپوش شد',
    excerpt: 'بازار سرمایه پس از چند روز نوسان منفی، امروز روند صعودی به خود گرفت.',
    content: '<p>شاخص کل بورس تهران با رشد ۱.۲ درصدی به سطح ۲ میلیون و ۱۰۰ هزار واحد رسید.</p>',
    categories: ['بورس'],
    daysAgo: 1,
    viewCount: 12000,
    readingTime: 4,
  },
  {
    title: 'بهترین سهام برای خرید در نیمه دوم سال',
    excerpt: 'تحلیل بنیادی و تکنیکال بهترین نمادهای بورسی برای سرمایه‌گذاری.',
    content: '<p>در این گزارش به بررسی ۱۰ نماد مستعد رشد در ماه‌های آتی پرداخته‌ایم.</p>',
    categories: ['بورس', 'سرمایه‌گذاری', 'تحلیل تکنیکال'],
    daysAgo: 2,
    viewCount: 19500,
    readingTime: 7,
  },
  {
    title: 'صندوق‌های ETF درآمد ثابت | راهنمای کامل',
    excerpt: 'صندوق‌های ETF درآمد ثابت یکی از امن‌ترین روش‌های سرمایه‌گذاری در بورس هستند.',
    content: '<p>ETFهای درآمد ثابت با تقسیم سود ماهانه، گزینه‌ای جذاب برای سرمایه‌گذاران ریسک‌گریز هستند.</p>',
    categories: ['بورس', 'سرمایه‌گذاری'],
    daysAgo: 3,
    viewCount: 8500,
    readingTime: 5,
  },
  {
    title: 'تحلیل هفتگی بازار سرمایه | گزارش کامل',
    excerpt: 'خلاصه‌ی عملکرد بازار سرمایه در هفته‌ی گذشته و پیش‌بینی هفته‌ی آینده.',
    content: '<p>بازار سرمایه در هفته‌ی گذشته با نوسانات متعددی همراه بود. در این گزارش به بررسی دقیق آن می‌پردازیم.</p>',
    categories: ['بورس', 'تحلیل تکنیکال'],
    daysAgo: 5,
    viewCount: 7600,
    readingTime: 6,
  },
  {
    title: 'عرضه‌ی اولیه «ثالوند» | هر آنچه باید بدانید',
    excerpt: 'جزئیات عرضه‌ی اولیه‌ی جدید بازار سرمایه و تحلیل ارزش ذاتی.',
    content: '<p>عرضه‌ی اولیه‌ی سهام «ثالوند» فردا با نماد «ثالوند» در بازار فرابورس انجام می‌شود.</p>',
    categories: ['بورس'],
    daysAgo: 6,
    viewCount: 15400,
    readingTime: 5,
  },
  {
    title: 'سهام دلاری در برابر ریالی | کدام بهتر است؟',
    excerpt: 'مقایسه‌ی عملکرد سهام دلاری و ریالی در شرایط تورمی.',
    content: '<p>در شرایط تورمی، سهام دلاری معمولاً عملکرد بهتری دارند. اما همیشه اینطور نیست.</p>',
    categories: ['بورس', 'سرمایه‌گذاری'],
    daysAgo: 9,
    viewCount: 10200,
    readingTime: 6,
  },

  // ─── تحلیل تکنیکال (۶ پست) ───
  {
    title: 'الگوی سر و شانه چیست؟ آموزش کامل با مثال',
    excerpt: 'الگوی سر و شانه یکی از معتبرترین الگوهای بازگشتی در تحلیل تکنیکال است.',
    content: '<p>در این آموزش به بررسی کامل الگوی سر و شانه، انواع و نحوه‌ی معامله بر اساس آن می‌پردازیم.</p>',
    categories: ['تحلیل تکنیکال', 'سرمایه‌گذاری'],
    daysAgo: 3,
    viewCount: 32000,
    readingTime: 9,
  },
  {
    title: 'آموزش اندیکاتور RSI | از صفر تا صد',
    excerpt: 'RSI یکی از پرکاربردترین اندیکاتورهای تحلیل تکنیکال است.',
    content: '<p>در این راهنما با اندیکاتور RSI، نحوه‌ی محاسبه، سیگنال‌ها و محدودیت‌های آن آشنا می‌شوید.</p>',
    categories: ['تحلیل تکنیکال'],
    daysAgo: 4,
    viewCount: 28000,
    readingTime: 8,
  },
  {
    title: 'خط روند چگونه ترسیم می‌شود؟',
    excerpt: 'آموزش اصولی ترسیم خط روند در نمودارهای قیمتی.',
    content: '<p>خط روند ابتدایی‌ترین ابزار تحلیل تکنیکال است. در این مطلب به صورت عملی آموزش می‌بینید.</p>',
    categories: ['تحلیل تکنیکال'],
    daysAgo: 5,
    viewCount: 18900,
    readingTime: 6,
  },
  {
    title: 'حمایت و مقاومت | کلیدی‌ترین مفهوم تکنیکال',
    excerpt: 'سطوح حمایت و مقاومت اساس تمام تحلیل‌های تکنیکال هستند.',
    content: '<p>درک صحیح سطوح حمایت و مقاومت، پایه‌ی موفقیت در تحلیل تکنیکال است.</p>',
    categories: ['تحلیل تکنیکال'],
    daysAgo: 7,
    viewCount: 21500,
    readingTime: 7,
  },
  {
    title: 'فیبوناچی اصلاحی | راهنمای کامل معامله‌گری',
    excerpt: 'ابزار فیبوناچی اصلاحی یکی از قوی‌ترین ابزارها برای یافتن نقاط بازگشتی است.',
    content: '<p>در این راهنما با سطوح فیبوناچی و نحوه‌ی استفاده از آن در معاملات آشنا می‌شوید.</p>',
    categories: ['تحلیل تکنیکال'],
    daysAgo: 8,
    viewCount: 17600,
    readingTime: 8,
  },
  {
    title: 'الگوهای کندل استیک ژاپنی | آموزش تصویری',
    excerpt: 'الگوهای کندلی ژاپنی ابزار قدرتمندی برای تحلیل رفتار قیمت هستند.',
    content: '<p>در این مطلب مهم‌ترین الگوهای کندلی شامل دوجی، چکش، ستاره‌ی دنباله‌دار و غیره آموزش داده می‌شود.</p>',
    categories: ['تحلیل تکنیکال'],
    daysAgo: 10,
    viewCount: 24300,
    readingTime: 9,
  },

  // ─── سرمایه‌گذاری (۶ پست) ───
  {
    title: 'راهنمای سرمایه‌گذاری برای مبتدیان',
    excerpt: 'اگر تازه می‌خواهید سرمایه‌گذاری را شروع کنید، این راهنما برای شماست.',
    content: '<p>در این راهنمای جامع، اصول اولیه‌ی سرمایه‌گذاری، مدیریت ریسک و انتخاب سبد سرمایه‌گذاری را می‌آموزید.</p>',
    categories: ['سرمایه‌گذاری'],
    daysAgo: 4,
    viewCount: 41000,
    readingTime: 12,
  },
  {
    title: 'سبد سرمایه‌گذاری متنوع | چگونه ریسک را کاهش دهیم؟',
    excerpt: 'تنوع‌بخشی به سبد سرمایه‌گذاری کلید کاهش ریسک است.',
    content: '<p>اصول تنوع‌بخشی و تخصیص دارایی در این مطلب به طور کامل بررسی می‌شود.</p>',
    categories: ['سرمایه‌گذاری'],
    daysAgo: 5,
    viewCount: 16200,
    readingTime: 7,
  },
  {
    title: 'سرمایه‌گذاری در مسکن یا طلا؟ مقایسه بازده ۱۰ ساله',
    excerpt: 'بررسی بازده سرمایه‌گذاری در مسکن و طلا در یک دهه‌ی گذشته.',
    content: '<p>کدام بازار در بلندمدت بازدهی بهتری داشته است؟ پاسخ در این گزارش.</p>',
    categories: ['سرمایه‌گذاری', 'طلا'],
    daysAgo: 6,
    viewCount: 12800,
    readingTime: 6,
  },
  {
    title: 'مدیریت ریسک در بازارهای مالی',
    excerpt: 'بدون مدیریت ریسک، موفقیت در بازارهای مالی غیرممکن است.',
    content: '<p>در این مطلب اصول مدیریت ریسک شامل نسبت ریسک به ریوارد، حد ضرر و تنظیم اندازه‌ی موقعیت آموزش داده می‌شود.</p>',
    categories: ['سرمایه‌گذاری', 'تحلیل تکنیکال'],
    daysAgo: 7,
    viewCount: 14500,
    readingTime: 8,
  },
  {
    title: 'صندوق‌های سرمایه‌گذاری یا سرمایه‌گذاری مستقیم؟',
    excerpt: 'مزایا و معایب سرمایه‌گذاری از طریق صندوق یا به صورت مستقیم.',
    content: '<p>انتخاب بین صندوق و سرمایه‌گذاری مستقیم به دانش، زمان و ریسک‌پذیری شما بستگی دارد.</p>',
    categories: ['سرمایه‌گذاری', 'بورس'],
    daysAgo: 8,
    viewCount: 9800,
    readingTime: 5,
  },
  {
    title: 'اثر تورم بر سرمایه‌گذاری | چگونه از ارزش پول محافظت کنیم؟',
    excerpt: 'تورم بزرگ‌ترین دشمن سرمایه‌گذاری است. راهکارهای حفظ ارزش پول چیست؟',
    content: '<p>در این مطلب به بررسی راهکارهای عملی برای مقابله با تورم می‌پردازیم.</p>',
    categories: ['سرمایه‌گذاری'],
    daysAgo: 11,
    viewCount: 20300,
    readingTime: 7,
  },
];

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
        featuredImage: `/images/posts/placeholder-${(Math.abs(hash(p.title)) % 8) + 1}.jpg`,
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
    log.ok(`${post.title.slice(0, 50)}…`);
    created++;
  }
  console.log(`  ${created} ساخته شد، ${skipped} رد شد`);
  return { created, skipped };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

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
    title: 'طلای آب‌شده‌ی دیجیتال',
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
];

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

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log('\n\x1b[1m\x1b[36m🌱 شروع seed پست‌ها و تبلیغات\x1b[0m\n');

  try {
    const categoryMap = await ensureCategories();
    const authorId = await ensureAuthor();
    const postsResult = await seedPosts(authorId, categoryMap);
    const adsResult = await seedAds();

    console.log('\n\x1b[1m\x1b[32m━━ ✅ خلاصه ━━\x1b[0m');
    console.log(`  پست‌ها: ${postsResult.created} ساخته شد، ${postsResult.skipped} رد شد`);
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
