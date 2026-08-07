/* Seed script: اضافه کردن چند پست آزمایشی
 * برای اجرا: node scripts/seed-posts.js
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

function tipDoc(blocks) {
  return JSON.stringify({
    type: 'doc',
    content: blocks.map((b) => {
      if (b.type === 'h2') {
        return {
          type: 'heading',
          attrs: { textAlign: null, level: 2, id: b.id },
          content: [{ type: 'text', text: b.text }],
        };
      }
      if (b.type === 'h3') {
        return {
          type: 'heading',
          attrs: { textAlign: null, level: 3, id: b.id },
          content: [{ type: 'text', text: b.text }],
        };
      }
      if (b.type === 'p') {
        return {
          type: 'paragraph',
          attrs: { textAlign: null, dataEmpty: null },
          content: [{ type: 'text', text: b.text }],
        };
      }
      if (b.type === 'li') {
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
      }
      return {
        type: 'paragraph',
        attrs: { textAlign: null, dataEmpty: null },
        content: [{ type: 'text', text: '' }],
      };
    }),
  });
}

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

const AUTHOR_ID = 'cm5qdrd3e0001m4zli12b2rd5';

const posts = [
  {
    title: 'پیش‌بینی قیمت طلا در نیمه دوم ۲۰۲۶؛ سه سناریوی کلیدی',
    excerpt:
      'با نوسانات دلار و سیاست‌های فدرال رزرو، طلا در آستانه یک فصل تعیین‌کننده قرار گرفته است. سه سناریوی محتمل برای قیمت اونس را بررسی می‌کنیم.',
    categories: ['gold', 'market-global', 'analysis'],
    tags: ['طلا', 'پیش‌بینی', 'فدرال رزرو', 'دلار', 'اونس'],
    image:
      'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1600&q=80&auto=format&fit=crop',
    blocks: [
      { type: 'h2', id: 'overview', text: 'چشم‌انداز کلی بازار طلا' },
      {
        type: 'p',
        text: 'بازار جهانی طلا در هفته‌های گذشته تحت تاثیر دو عامل اصلی قرار گرفته است: انتظار سرمایه‌گذاران برای تغییر نرخ بهره در آمریکا و تقویت تقاضای پناهگاه امن در پی تنش‌های ژئوپلیتیک. ترکیب این دو نیرو، جهت کوتاه‌مدت فلز زرد را به شدت به داده‌های اقتصاد کلان گره زده است.',
      },
      { type: 'h2', id: 'scenarios', text: 'سه سناریوی محتمل' },
      {
        type: 'li',
        items: [
          'سناریوی صعودی: در صورت کاهش نرخ بهره واقعی، هدف اول ۲٬۶۰۰ دلار و هدف دوم ۲٬۸۰۰ دلار تا پایان سال محتمل است.',
          'سناریوی خنثی: نوسان در بازه ۲٬۲۰۰ تا ۲٬۴۰۰ دلار، همراه با حجم معاملات پایین.',
          'سناریوی نزولی: بازگشت شاخص دلار به بالای ۱۰۶ می‌تواند فشار فروش را تا ۲٬۱۰۰ دلار افزایش دهد.',
        ],
      },
      { type: 'h2', id: 'tips', text: 'نکته برای سرمایه‌گذاران ایرانی' },
      {
        type: 'p',
        text: 'با توجه به نوسانات نرخ ارز در بازار آزاد، خرید فیزیکی طلا تنها زمانی منطقی است که حباب سکه کمتر از ۸ درصد باشد. در غیر این صورت، صندوق‌های طلا (ETF) گزینه‌ای کم‌ریسک‌تر با نقدشوندگی بالاتر محسوب می‌شوند.',
      },
    ],
  },
  {
    title: 'بیت‌کوین در ۲۰۲۶؛ چرا این چرخه متفاوت است',
    excerpt:
      'برای اولین بار در تاریخ بازار کریپتو، سه نیروی هم‌زمان — ETFهای اسپات، کاهش هاوینگ و پذیرش نهادی — مسیر بیت‌کوین را شکل می‌دهند.',
    categories: ['bit-koin', 'crypto', 'analysis-technical'],
    tags: ['بیت‌کوین', 'ETF', 'هاوینگ', 'تحلیل تکنیکال'],
    image:
      'https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?w=1600&q=80&auto=format&fit=crop',
    blocks: [
      { type: 'h2', id: 'macro', text: 'تفاوت این چرخه با چرخه‌های قبلی' },
      {
        type: 'p',
        text: 'در دو چرخه گذشته، رشد قیمت بیت‌کوین عمدتاً توسط سرمایه‌گذاران خرد هدایت می‌شد. اما ورود صندوق‌های ETF اسپات در ۲۰۲۴، ساختار بازار را برای همیشه تغییر داده است. امروز بیش از ۶۰ درصد حجم معاملات روزانه در ساعات کاری بازار وال استریت انجام می‌شود.',
      },
      { type: 'h3', id: 'supply', text: 'اثر هاوینگ بر عرضه' },
      {
        type: 'p',
        text: 'پس از هاوینگ آوریل ۲۰۲۴، پاداش هر بلاک به ۳٫۱۲۵ بیت‌کوین کاهش یافت. این یعنی نرخ رشد عرضه سالانه از ۱٫۷ درصد به کمتر از ۰٫۹ درصد رسیده است؛ کمتر از نرخ رشد طلا در تاریخ مدرن.',
      },
      { type: 'h3', id: 'levels', text: 'سطوح کلیدی تکنیکال' },
      {
        type: 'li',
        items: [
          'حمایت قوی: محدوده ۵۸٬۰۰۰ تا ۶۲٬۰۰۰ دلار، منطبق با میانگین متحرک ۲۰۰ هفته‌ای.',
          'مقاومت اول: ۷۲٬۰۰۰ دلار، سقف تاریخی قبلی.',
          'مقاومت دوم: ۱۰۰٬۰۰۰ دلار، یک نقطه روانی مهم.',
        ],
      },
      { type: 'h2', id: 'risk', text: 'ریسک‌های کلیدی' },
      {
        type: 'p',
        text: 'فشارهای قانونی در آمریکا و اروپا، تمرکز استخراج در دو کشور و آسیب‌پذیری زیرساخت‌های متمرکز (مانند راه‌حل‌های لایه دوم)، سه ریسک اصلی هستند که باید زیر نظر داشت.',
      },
    ],
  },
  {
    title: 'اتریوم و آینده دیفای؛ پس از به‌روزرسانی Pectra',
    excerpt:
      'به‌روزرسانی Pectra قابلیت‌های جدیدی برای کیف پول‌ها و قراردادهای هوشمند به ارمغان می‌آورد. این تغییرات چه اثری بر اکوسیستم دیفای خواهد داشت؟',
    categories: ['ethereum', 'crypto', 'web-3'],
    tags: ['اتریوم', 'دیفای', 'Pectra', 'قرارداد هوشمند'],
    image:
      'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=1600&q=80&auto=format&fit=crop',
    blocks: [
      { type: 'h2', id: 'pectra', text: 'Pectra چه چیزی تغییر می‌کند' },
      {
        type: 'p',
        text: 'Pectra (Prague + Electra) ترکیبی از چندین EIP است که مهم‌ترین آن‌ها EIP-7702 و EIP-7251 هستند. این به‌روزرسانی برای نخستین بار به کیف پول‌های خارجی (EOA) اجازه می‌دهد تا به‌طور موقت رفتاری شبیه قرارداد هوشمند داشته باشند.',
      },
      { type: 'h3', id: 'eip7702', text: 'EIP-7702 و انقلاب کیف پول‌ها' },
      {
        type: 'p',
        text: 'با EIP-7702، کاربران می‌توانند بدون نیاز به کیف پول‌های جدید یا مهاجرت کامل، از قابلیت‌هایی مثل پرداخت گس توسط شخص ثالث، بچ کنسلیشن و ورود بدون عبارت بازیابی استفاده کنند. این یعنی ورود سیل مخاطبان جدید به دیفای.',
      },
      { type: 'h2', id: 'yield', text: 'تاثیر بر بازده دیفای' },
      {
        type: 'p',
        text: 'افزایش حداکثر سپرده ولیدیتور به ۲٬۰۴۸ ETH (EIP-7251) باعث کاهش تعداد ولیدیتورها و در نتیجه تمرکز بیشتر شبکه می‌شود. در مقابل، سود استیکینگ برای ولیدیتورهای بزرگ‌تر بهینه‌تر خواهد شد.',
      },
    ],
  },
  {
    title: 'بازار جهانی نفت و طلا؛ همبستگی منفی در راه است؟',
    excerpt:
      'تحلیل‌گران معتقدند با تغییر سیاست‌های اوپک پلاس و کاهش تنش‌های خاورمیانه، همبستگی تاریخی طلا و نفت می‌تواند دوباره منفی شود.',
    categories: ['market-global', 'gold', 'news'],
    tags: ['نفت', 'اوپک', 'بازار جهانی', 'طلا', 'همبستگی'],
    image:
      'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=1600&q=80&auto=format&fit=crop',
    blocks: [
      { type: 'h2', id: 'correlation', text: 'همبستگی طلا و نفت' },
      {
        type: 'p',
        text: 'در دهه گذشته، طلا و نفت معمولاً همبستگی مثبت داشتند؛ هر دو به عنوان پناهگاه‌های تورمی عمل می‌کردند. اما این الگو در ۱۸ ماه گذشته شکسته شده است.',
      },
      { type: 'h2', id: 'opec', text: 'نقش اوپک پلاس' },
      {
        type: 'p',
        text: 'تصمیم اخیر اوپک پلاس برای افزایش تدریجی تولید، فشار نزولی بر قیمت نفت را در کوتاه‌مدت حفظ می‌کند. در مقابل، تقاضای فصلی طلا در آستانه سال نو میلادی و تقاضای هند در فصل جشنواره‌ها، تکیه‌گاه صعودی قیمت طلاست.',
      },
      { type: 'h2', id: 'strategy', text: 'استراتژی پیشنهادی' },
      {
        type: 'p',
        text: 'برای سرمایه‌گذاران بلندمدت، تخصیص ۱۰ تا ۱۵ درصد پرتفوی به طلا و ۵ درصد به صندوق‌های نفتی می‌تواند ریسک تورمی را به‌خوبی پوشش دهد.',
      },
    ],
  },
  {
    title: 'راهنمای کامل کیف پول‌های سرد در ۲۰۲۶؛ کدام برند قابل‌اعتماد است؟',
    excerpt:
      'با گسترش تهدیدات سایبری، کیف پول سرد دیگر یک انتخاب نیست، یک ضرورت است. پنج برند معتبر امسال را مقایسه کرده‌ایم.',
    categories: ['kif-pol', 'crypto', 'news-urgent'],
    tags: ['کیف پول سرد', 'امنیت', 'لجر', 'ترزور'],
    image:
      'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1600&q=80&auto=format&fit=crop',
    blocks: [
      { type: 'h2', id: 'why', text: 'چرا کیف پول سرد' },
      {
        type: 'p',
        text: 'با وجود رشد صرافی‌ها و کیف پول‌های گرم، نگهداری بلندمدت دارایی‌های رمزارزی روی یک دستگاه متصل به اینترنت، ریسک غیرقابل‌قبولی دارد. کیف پول سرد، کلیدهای خصوصی را به‌طور کامل آفلاین نگه می‌دارد.',
      },
      { type: 'h3', id: 'criteria', text: 'معیارهای انتخاب' },
      {
        type: 'li',
        items: [
          'تراشه امن (Secure Element) با گواهی CC EAL6+',
          'پشتیبانی از چندین بلاکچین اصلی',
          'امکان بازیابی از طریق عبارت ۱۲ یا ۲۴ کلمه‌ای',
          'مقاومت فیزیکی در برابر آب، ضربه و مغناطیس',
        ],
      },
      { type: 'h2', id: 'brands', text: 'پنج برند پیشنهادی' },
      {
        type: 'p',
        text: 'لجر نانو X با تراشه امن نسل دوم، ترزور مدل T با صفحه لمسی، کیپ‌کی X با دوربین داخلی برای اسکن QR، الیپال تایتان با طراحی مقاوم و فاندلی اس‌وی با تمرکز بر سادگی، پنج گزینه اصلی بازار هستند. برای کاربران ایرانی، توجه به تحریم‌نبودن برند اهمیت ویژه‌ای دارد.',
      },
    ],
  },
  {
    title: 'تحلیل تکنیکال هفتگی بیت‌کوین؛ آماده شکست مقاومت ۷۰ هزار دلار',
    excerpt:
      'نمودار هفتگی بیت‌کوین یک الگوی کنج صعودی تشکیل داده است. در این گزارش، سطوح کلیدی و سناریوهای پیش‌رو را بررسی می‌کنیم.',
    categories: ['bit-koin', 'analysis-technical', 'crypto'],
    tags: ['بیت‌کوین', 'تحلیل تکنیکال', 'RSI', 'MACD'],
    image:
      'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=1600&q=80&auto=format&fit=crop',
    blocks: [
      { type: 'h2', id: 'pattern', text: 'الگوی کنج صعودی' },
      {
        type: 'p',
        text: 'بیت‌کوین در تایم‌فریم هفتگی یک کنج صعودی (Rising Wedge) تشکیل داده که معمولاً در پایان یک روند خنثی ظاهر می‌شود. شکست مقاومت بالایی این الگو می‌تواند آغازگر حرکت صعودی قدرتمند باشد.',
      },
      { type: 'h3', id: 'indicators', text: 'شاخص‌های تکنیکال' },
      {
        type: 'li',
        items: [
          'RSI هفتگی در محدوده ۵۸ و رو به بالا — هنوز اشباع خرید نیست.',
          'MACD در حال تشکیل کراس صعودی در بالای خط سیگنال.',
          'میانگین متحرک ۵۰ هفته‌ای به سمت بالا چرخیده است.',
        ],
      },
      { type: 'h2', id: 'targets', text: 'اهداف قیمتی' },
      {
        type: 'p',
        text: 'در صورت شکست مقاومت ۷۰٬۰۰۰ دلار با حجم معاملات بالا، هدف اول ۷۸٬۰۰۰ دلار و هدف دوم ۸۵٬۰۰۰ دلار خواهد بود. حد ضرر معامله‌گران روزانه بسته شدن کندل هفتگی زیر ۶۳٬۰۰۰ دلار است.',
      },
      { type: 'h2', id: 'disclaimer', text: 'سلب مسئولیت' },
      {
        type: 'p',
        text: 'این تحلیل صرفاً جنبه آموزشی دارد و نباید به‌عنوان سیگنال خرید یا فروش تلقی شود. بازار کریپتو ذاتاً پرنوسان است و هر سرمایه‌گذار باید با مدیریت ریسک شخصی تصمیم بگیرد.',
      },
    ],
  },
];

async function main() {
  console.log('🌱 شروع اضافه کردن پست‌ها...');
  let added = 0;
  let skipped = 0;

  const tagCache = new Map();
  async function getOrCreateTag(name) {
    if (tagCache.has(name)) return tagCache.get(name);
    const tagSlug = slugify(name);
    let tag = await p.tag.findUnique({ where: { slug: tagSlug } });
    if (!tag) {
      tag = await p.tag.create({ data: { name, slug: tagSlug } });
    }
    tagCache.set(name, tag);
    return tag;
  }

  for (const post of posts) {
    const exists = await p.post.findFirst({ where: { title: post.title } });
    if (exists) {
      console.log(`⏭️  "${post.title}" قبلاً وجود دارد`);
      skipped++;
      continue;
    }

    const baseSlug = slugify(post.title);
    let uniqueSlug = baseSlug || `post-${Date.now()}`;
    let counter = 1;
    while (await p.post.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const cats = await p.category.findMany({ where: { slug: { in: post.categories } } });
    const tags = await Promise.all(post.tags.map((t) => getOrCreateTag(t)));

    const wordCount = post.blocks.reduce((acc, b) => {
      if (b.type === 'p' || b.type === 'h2' || b.type === 'h3')
        return acc + (b.text ? b.text.split(/\s+/).length : 0);
      if (b.type === 'li') return acc + b.items.reduce((a, t) => a + t.split(/\s+/).length, 0);
      return acc;
    }, 0);
    const readingTime = Math.max(1, Math.ceil(wordCount / 180));

    await p.post.create({
      data: {
        title: post.title,
        slug: uniqueSlug,
        excerpt: post.excerpt,
        content: tipDoc(post.blocks),
        featuredImage: post.image,
        status: 'PUBLISHED',
        postType: 'STANDARD',
        isFeatured: false,
        viewCount: 0,
        readingTime,
        authorId: AUTHOR_ID,
        categories: { connect: cats.map((c) => ({ id: c.id })) },
        tags: { connect: tags.map((t) => ({ id: t.id })) },
      },
    });

    console.log(`✅ "${post.title}" اضافه شد (${readingTime} دقیقه، ${cats.length} دسته)`);
    added++;
  }

  console.log(`\n📊 نتیجه: ${added} اضافه شد، ${skipped} رد شد`);
}

main()
  .catch((e) => {
    console.error('❌ خطا:', e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
