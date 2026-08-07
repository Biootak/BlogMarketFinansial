/**
 * image-slots — رجیستری مرکزی نسبت‌های تصویر (Image Slot Registry)
 * ============================================================================
 * این فایل **منبع واحد حقیقت** (Single Source of Truth) برای نسبت ابعاد
 * تصاویر در کل پروژه است. هم آپلود (api/upload) و هم نمایش (SafeImage /
 * کامپوننت‌ها) از همین رجیستری می‌خوانند تا همیشه هماهنگ باشند.
 *
 * معماری هوشمند:
 * 1. آپلود: وقتی کاربر تصویری با هر نسبتی آپلود می‌کند، در لحظه‌ی آپلود
 *    با استراتژی attention (smart cover crop) به نسبت اسلات مربوطه نرمال‌سازی
 *    می‌شود. این همان روش Facebook/Netflix/Shopify است.
 * 2. نمایش: SafeImage و کامپوننت‌ها به‌جای hardcoded aspect-ratio، از
 *    getSlot() استفاده می‌کنند. اگه اسلات جدیدی اضافه شود، فقط یک خط
 *    به این رجیستری اضافه می‌کنید و آپلود + نمایش خودکار هماهنگ می‌شوند.
 * 3. خودکارسازی: پراپ `slot` در SafeImage هر چیزی لازم دارد را از اینجا می‌گیرد.
 *
 * استاندارد رسمی: IAB Display Guidelines + sharp attention strategy.
 */

// ---------- تایپ‌ها ----------------------------------------------------------

/** شناسه‌ی یک اسلات تصویر. نام‌گذاری بر اساس نقش/محل استفاده. */
export type ImageSlotId =
  | 'ad-tile' // کارت تبلیغاتی PulseBoard
  | 'ad-banner' // بنر تمام‌عرض PulseBoard
  | 'ad-card-strip' // AdCardStrip
  | 'ad-card' // AdCard عمومی
  | 'post-hero' // مقاله‌ی اصلی Hero
  | 'post-stack' // کارت استک کنار hero
  | 'post-thumbnail' // تصویر کوچک لیست
  | 'post-featured' // FeaturedPostHero
  | 'post-card6' // Card6
  | 'post-card9' // Card9
  | 'post-card10' // Card10
  | 'post-card11' // Card11
  | 'post-card3small' // Card3Small
  | 'avatar' // آواتار کاربر
  | 'avatar-square' // آواتار مربع (cardauthorbox)
  | 'logo' // لوگو صرافی
  | 'category' // تصویر دسته
  | 'tag' // تصویر تگ
  | 'podcast' // کاور پادکست
  | 'kyc-doc' // مدرک KYC
  | 'post-featured-media' // PostFeaturedMedia
  | 'banner-wide' // بنر BannerADS
  | 'post-list' // لیست پست‌ها
  | 'custom'; // نسبت دلخواه کاربر

/** تایپ کامل اسلات. */
export interface ImageSlot {
  /** شناسه‌ی یکتا. */
  id: ImageSlotId;
  /** نسبت عرض به ارتفاع (مثلاً 4/3). */
  ratio: number;
  /** نسخه‌ی string نسبت برای CSS (مثلاً '4/3'). */
  ratioStr: string;
  /** حداکثر عرض کانونیکال (پیکسل). */
  maxWidth: number;
  /** کیفیت WebP (1-100). */
  quality: number;
  /** آیا نرمال‌سازی هنگام آپلود فعال است؟ (false = دست‌نخورده). */
  normalizeOnUpload: boolean;
  /** توضیح فارسی برای نمایش در UI آپلود. */
  hint: string;
}

// ---------- رجیستری ---------------------------------------------------------
// وقتی جای جدیدی اضافه شد، فقط یک آبجکت اینجا بگذارید. همه‌چیز خودکار
// هماهنگ می‌شود: آپلود smart-crop می‌کند، نمایش aspect-ratio درست استفاده
// می‌کند، و ImageUploader hint مناسب را نشان می‌دهد.

const SLOTS: Record<ImageSlotId, ImageSlot> = {
  'ad-tile': {
    id: 'ad-tile',
    ratio: 4 / 3,
    ratioStr: '4/3',
    maxWidth: 1200,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۴:۳ (مثلاً ۸۰۰×۶۰۰ یا ۱۲۰۰×۹۰۰)',
  },
  'ad-banner': {
    id: 'ad-banner',
    ratio: 16 / 5,
    ratioStr: '16/5',
    maxWidth: 1920,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۱۶:۵ (مثلاً ۱۲۸۰×۴۰۰ یا ۱۹۲۰×۶۰۰)',
  },
  'ad-card-strip': {
    id: 'ad-card-strip',
    ratio: 16 / 10,
    ratioStr: '16/10',
    maxWidth: 1200,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۱۶:۱۰ (مثلاً ۸۰۰×۵۰۰ یا ۱۲۰۰×۷۵۰)',
  },
  'ad-card': {
    id: 'ad-card',
    ratio: 16 / 9,
    ratioStr: '16/9',
    maxWidth: 1200,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۱۶:۹ (مثلاً ۸۰۰×۴۵۰ یا ۱۲۰۰×۶۷۵)',
  },
  'post-hero': {
    id: 'post-hero',
    ratio: 16 / 9,
    ratioStr: '16/9',
    maxWidth: 1920,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۱۶:۹ (مثلاً ۱۲۸۰×۷۲۰ یا ۱۹۲۰×۱۰۸۰)',
  },
  'post-stack': {
    id: 'post-stack',
    ratio: 4 / 3,
    ratioStr: '4/3',
    maxWidth: 800,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۴:۳ (مثلاً ۶۴۰×۴۸۰ یا ۸۰۰×۶۰۰)',
  },
  'post-thumbnail': {
    id: 'post-thumbnail',
    ratio: 4 / 3,
    ratioStr: '4/3',
    maxWidth: 600,
    quality: 80,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۴:۳ (مثلاً ۴۰۰×۳۰۰ یا ۶۰۰×۴۵۰)',
  },
  'post-featured': {
    id: 'post-featured',
    ratio: 16 / 9,
    ratioStr: '16/9',
    maxWidth: 1920,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۱۶:۹ (مثلاً ۱۲۸۰×۷۲۰ یا ۱۹۲۰×۱۰۸۰)',
  },
  'post-card6': {
    id: 'post-card6',
    ratio: 16 / 9,
    ratioStr: '16/9',
    maxWidth: 800,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۱۶:۹ (مثلاً ۶۴۰×۳۶۰ یا ۸۰۰×۴۵۰)',
  },
  'post-card9': {
    id: 'post-card9',
    ratio: 16 / 9,
    ratioStr: '16/9',
    maxWidth: 800,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۱۶:۹ (مثلاً ۶۴۰×۳۶۰ یا ۸۰۰×۴۵۰)',
  },
  'post-card10': {
    id: 'post-card10',
    ratio: 16 / 9,
    ratioStr: '16/9',
    maxWidth: 800,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۱۶:۹ (مثلاً ۶۴۰×۳۶۰ یا ۸۰۰×۴۵۰)',
  },
  'post-card11': {
    id: 'post-card11',
    ratio: 16 / 9,
    ratioStr: '16/9',
    maxWidth: 800,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۱۶:۹ (مثلاً ۶۴۰×۳۶۰ یا ۸۰۰×۴۵۰)',
  },
  'post-card3small': {
    id: 'post-card3small',
    ratio: 4 / 3,
    ratioStr: '4/3',
    maxWidth: 400,
    quality: 80,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۴:۳ (مثلاً ۳۲۰×۲۴۰ یا ۴۰۰×۳۰۰)',
  },
  avatar: {
    id: 'avatar',
    ratio: 1,
    ratioStr: '1/1',
    maxWidth: 400,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر مربع ۱:۱ (مثلاً ۴۰۰×۴۰۰)',
  },
  'avatar-square': {
    id: 'avatar-square',
    ratio: 1,
    ratioStr: '1/1',
    maxWidth: 400,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر مربع ۱:۱ (مثلاً ۴۰۰×۴۰۰)',
  },
  logo: {
    id: 'logo',
    ratio: 0,
    ratioStr: 'auto',
    maxWidth: 800,
    quality: 90,
    normalizeOnUpload: false,
    hint: 'لوگو دست‌نخورده آپلود می‌شود (ممکن است شفافیت داشته باشد)',
  },
  category: {
    id: 'category',
    ratio: 4 / 3,
    ratioStr: '4/3',
    maxWidth: 800,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۴:۳ (مثلاً ۶۴۰×۴۸۰ یا ۸۰۰×۶۰۰)',
  },
  tag: {
    id: 'tag',
    ratio: 4 / 3,
    ratioStr: '4/3',
    maxWidth: 400,
    quality: 80,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۴:۳ (مثلاً ۳۲۰×۲۴۰ یا ۴۰۰×۳۰۰)',
  },
  podcast: {
    id: 'podcast',
    ratio: 1,
    ratioStr: '1/1',
    maxWidth: 800,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر مربع ۱:۱ (مثلاً ۸۰۰×۸۰۰)',
  },
  'kyc-doc': {
    id: 'kyc-doc',
    ratio: 0,
    ratioStr: 'auto',
    maxWidth: 1920,
    quality: 90,
    normalizeOnUpload: false,
    hint: 'مدرک هویتی دست‌نخورده آپلود می‌شود (باید کامل و خوانا باشد)',
  },
  'post-featured-media': {
    id: 'post-featured-media',
    ratio: 16 / 9,
    ratioStr: '16/9',
    maxWidth: 1920,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۱۶:۹ (مثلاً ۱۲۸۰×۷۲۰ یا ۱۹۲۰×۱۰۸۰)',
  },
  'banner-wide': {
    id: 'banner-wide',
    ratio: 16 / 5,
    ratioStr: '16/5',
    maxWidth: 1920,
    quality: 85,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۱۶:۵ (مثلاً ۱۲۸۰×۴۰۰ یا ۱۹۲۰×۶۰۰)',
  },
  'post-list': {
    id: 'post-list',
    ratio: 4 / 3,
    ratioStr: '4/3',
    maxWidth: 600,
    quality: 80,
    normalizeOnUpload: true,
    hint: 'بهترین نمایش با تصویر ۴:۳ (مثلاً ۴۰۰×۳۰۰ یا ۶۰۰×۴۵۰)',
  },
  custom: {
    id: 'custom',
    ratio: 0,
    ratioStr: 'auto',
    maxWidth: 1920,
    quality: 85,
    normalizeOnUpload: false,
    hint: 'نسبت دلخواه — نرمال‌سازی انجام نمی‌شود',
  },
};

// ---------- API ------------------------------------------------------------

/**
 * یک اسلات را با شناسه بگیرید. همیشه یک اسلات معتبر برمی‌گرداند.
 * اگه شناسه نامعتبر باشد، به `custom` برمی‌گردد.
 */
export function getSlot(id: ImageSlotId | string | undefined): ImageSlot {
  if (!id) return SLOTS.custom;
  const slot = SLOTS[id as ImageSlotId];
  return slot ?? SLOTS.custom;
}

/**
 * نسبت عددی یک اسلات را بگیرید (مثلاً 4/3 = 1.333).
 * برای استفاده در API آپلود.
 */
export function getSlotRatio(id: ImageSlotId | string | undefined): number {
  return getSlot(id).ratio;
}

/**
 * تمام اسلات‌هایی که نرمال‌سازی در آپلود فعال دارند را بگیرید.
 * برای استفاده در api/upload.
 */
export function getNormalizableSlots(): ImageSlot[] {
  return Object.values(SLOTS).filter((s) => s.normalizeOnUpload && s.ratio > 0);
}

/**
 * نگاشت از فولدر آپلود به اسلات پیش‌فرض.
 * وقتی فرم آپلود فقط `folder` می‌داند نه `slot`، از این نگاشت استفاده می‌کنیم.
 */
export const FOLDER_TO_DEFAULT_SLOT: Record<string, ImageSlotId> = {
  ads: 'ad-tile',
  avatars: 'avatar',
  categories: 'category',
  tags: 'tag',
  posts: 'post-featured-media',
  general: 'custom',
  kyc: 'kyc-doc',
  logos: 'logo',
  exchange: 'logo',
};

/**
 * اسلات پیش‌فرض برای یک فولدر آپلود.
 */
export function getSlotByFolder(folder: string): ImageSlot {
  const slotId = FOLDER_TO_DEFAULT_SLOT[folder] ?? 'custom';
  return getSlot(slotId);
}

// ---------- لیست برای UI پنل ادمین ----------------------------------------

/**
 * تمام اسلات‌ها به‌عنوان آرایه (برای نمایش در پنل ادمین / select).
 */
export function listSlots(): ImageSlot[] {
  return Object.values(SLOTS);
}
