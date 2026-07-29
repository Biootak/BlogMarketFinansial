import { isPhoneValid } from '@/lib/phone-validation';
import { generateSlug, validateSlug } from '@/lib/utils';
import { PostStatus, PostType } from '@prisma/client';
import { z } from 'zod';

// Utility functions
const createStringSchema = (min: number, max: number, minMessage: string, maxMessage: string) =>
  z.string().min(min, minMessage).max(max, maxMessage);

const createArraySchema = (min: number, max: number, minMessage: string, maxMessage: string) =>
  z.array(z.string()).min(min, minMessage).max(max, maxMessage);

// Schema برای URL تصویر (هم URL کامل و هم path نسبی)
const imageUrlSchema = (message: string) =>
  z.string().refine(
    (val) => {
      if (!val) return true;
      // قبول URL کامل یا path نسبی که با / شروع میشه
      return val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://');
    },
    { message },
  );

// Common schemas
// 2026-06-30: normalize every email at the boundary. Trim strips
// accidental whitespace from form pastes (mobile keyboards love to
// add a trailing space); lowercase makes downstream Prisma lookups
// case-insensitive when paired with `mode: 'insensitive'`.
// Storage stays lowercase from now on, so `Admin@gmail.com` (which
// was seeded with original case) is still findable via the
// insensitive fallback in src/actions/auth-actions.ts.
const emailSchema = z
  .string()
  .email('لطفاً یک آدرس ایمیل معتبر وارد کنید')
  .transform((v) => v.trim().toLowerCase());
const passwordSchema = z
  .string()
  .min(8, 'رمز عبور باید حداقل 8 کاراکتر داشته باشد')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'رمز عبور باید شامل حروف بزرگ، کوچک و اعداد باشد');

// User related schemas
export const RegisterSchema = z.object({
  name: createStringSchema(
    2,
    50,
    'نام باید حداقل 2 حرف داشته باشد',
    'نام نباید بیشتر از 50 حرف باشد',
  ),
  email: emailSchema,
  password: passwordSchema,
});

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'لطفاً رمز عبور خود را وارد کنید'),
});

export const ForgotPasswordSchema = z.object({ email: emailSchema });

export const MagicLinkSchema = z.object({ email: emailSchema });

// 2026-06-23: OTP pipeline schemas.
const otpCodeSchema = z.string().regex(/^\d{6}$/, 'کد باید دقیقاً ۶ رقم باشد');

export const EmailLookupSchema = z.object({ email: emailSchema });

export const VerifyOtpSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
  intent: z.enum(['register', 'login', 'reverify', 'recover']),
});

// 2026-06-24: schema for the resetToken + password submission. We don't
// validate the token shape here beyond length — the DB lookup is the
// ground truth. This schema's job is to refuse empty/missing values
// before we hit the DB.
export const ResendOtpSchema = z.object({
  email: emailSchema,
  intent: z.enum(['register', 'login', 'reverify', 'recover']),
});

export const SetPasswordSchema = z.object({
  email: emailSchema,
  // 2026-06-24: resetToken is the single-use secret minted by verifyOtp
  // (intent='recover'). Without it, anyone with the email could rewrite
  // the password. We accept any non-empty string here and let the server
  // action match it against the DB row — the schema just guarantees the
  // client passed *something*.
  resetToken: z.string().min(16, 'توکن بازنشانی نامعتبر است'),
  password: passwordSchema,
});

const CategorySchema = createArraySchema(
  1,
  5,
  'حداقل یک دسته‌بندی باید انتخاب شود',
  'حداکثر 5 دسته‌بندی می‌توانید انتخاب کنید',
);
const TagSchema = z.array(z.string()).max(10, 'حداکثر 10 برچسب می‌توانید اضافه کنید').optional();

export const CreatePostSchema = z.object({
  title: createStringSchema(
    3,
    100,
    'عنوان باید حداقل 3 کاراکتر داشته باشد',
    'عنوان نباید بیشتر از 100 کاراکتر باشد',
  ),
  content: z.string().min(10, 'محتوا باید حداقل 10 کاراکتر داشته باشد'),
  excerpt: z.string().max(200, 'خلاصه نباید بیشتر از 200 کاراکتر باشد').optional(),
  postType: z.nativeEnum(PostType),
  isFeatured: z.boolean(),
  videoUrl: z.union([z.string().url('لطفاً آدرس ویدئو معتبر وارد کنید'), z.literal('')]).optional(),
  audioUrl: z.union([z.string().url('لطفاً آدرس صوتی معتبر وارد کنید'), z.literal('')]).optional(),
  featuredImage: imageUrlSchema('لطفاً آدرس تصویر معتبر وارد کنید').optional(),
  // 2026-06-21: ابعاد تصویر شاخص برای CLS-safe رندر + responsive variants
  featuredImageWidth: z.number().int().positive().optional(),
  featuredImageHeight: z.number().int().positive().optional(),
  galleryImages: z.array(imageUrlSchema('لطفاً آدرس تصویر معتبر وارد کنید')).optional(),
  status: z.nativeEnum(PostStatus),
  // 2026-07-04: تاریخ/زمان انتشار برنامه‌ریزی‌شده. null/empty یعنی
  // «بدون برنامه، فوری منتشر/ذخیره شود». فرم رشتهٔ ISO (`datetime-local`
  // = `YYYY-MM-DDTHH:mm`) می‌فرستد؛ اینجا به Date تبدیل می‌کنیم.
  scheduledAt: z
    .union([z.string().datetime({ offset: true }), z.string().datetime(), z.date(), z.null()])
    .optional()
    .transform((v) => {
      if (v === null || v === undefined || v === '') return null;
      if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    }),
  categories: CategorySchema,
  tags: TagSchema,
  slug: z
    .string()
    .optional()
    .transform((val) => (val ? generateSlug(val) : val))
    .refine((val) => !val || validateSlug(val), {
      message: 'فرمت اسلاگ نامعتبر است. فقط حروف کوچک انگلیسی، اعداد و خط فاصله مجاز هستند.',
    }),
});

export const UpdatePostSchema = CreatePostSchema.partial();

const IdSchema = z.string().cuid();

export const PostSchema = CreatePostSchema.extend({
  id: IdSchema,
  authorId: IdSchema,
  viewCount: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
  categories: z.array(z.object({ id: IdSchema, name: z.string() })),
  tags: z.array(z.object({ id: IdSchema, name: z.string() })),
  comments: z.array(z.object({ id: IdSchema, content: z.string() })).optional(),
  likes: z.number().int().nonnegative(),
  savedCount: z.number().int().nonnegative(),
});

export const UpdateProfileSchema = z
  .object({
    name: z.string().min(2, 'نام باید حداقل 2 حرف باشد').optional().or(z.literal('')),
    email: z.string().email('ایمیل نامعتبر است').optional().or(z.literal('')),
    // 2026-07-19: شماره موبایل برای سرویس‌های مالی (حواله، خرید ارز)
    phoneNumber: z
      .string()
      .max(20, 'شماره موبایل نمی‌تواند بیشتر از 20 رقم باشد')
      .refine((v) => !v || isPhoneValid(v), {
        message: 'شماره موبایل معتبر نیست — مثال: 0701234567 یا +93701234567',
      })
      .optional()
      .or(z.literal('')),
    bio: z
      .string()
      .max(500, 'بیوگرافی نمی‌تواند بیشتر از 500 کاراکتر باشد')
      .optional()
      .or(z.literal('')),
    imageUrl: z.string().url('آدرس تصویر نامعتبر است').optional().or(z.literal('')),
    bgImage: z.string().url('آدرس تصویر پس‌زمینه نامعتبر است').optional().or(z.literal('')),
    jobName: z
      .string()
      .max(100, 'نام شغل نمی‌تواند بیشتر از 100 کاراکتر باشد')
      .optional()
      .or(z.literal('')),
    currentPassword: z
      .string()
      .min(6, 'رمز عبور باید حداقل 6 کاراکتر باشد')
      .optional()
      .or(z.literal('')),
    newPassword: z
      .string()
      .min(6, 'رمز عبور جدید باید حداقل 6 کاراکتر باشد')
      .optional()
      .or(z.literal('')),
    confirmNewPassword: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.currentPassword && !data.newPassword) {
        return false;
      }
      if (!data.currentPassword && data.newPassword) {
        return false;
      }
      if (data.newPassword !== data.confirmNewPassword) {
        return false;
      }
      return true;
    },
    {
      message: 'رمز عبور جدید و تکرار آن باید یکسان باشند',
      path: ['confirmNewPassword'],
    },
  );

// Service Request Schema - for online payment and money transfer forms
export const ServiceRequestSchema = z.object({
  fullName: z
    .string()
    .min(3, 'نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد')
    .max(100, 'نام و نام خانوادگی نباید بیشتر از ۱۰۰ کاراکتر باشد'),
  // 2026-07-10: libphonenumber-js validation — accepts any national/international format
  // Default country: AF (Afghanistan). Users may prefix with +CountryCode for any country.
  phone: z
    .string()
    .min(1, 'شماره تماس الزامی است')
    .refine((val) => isPhoneValid(val), {
      message: 'شماره تماس معتبر نیست (مثال: ۰۷۰۱۲۳۴۵۶۷ یا +93701234567)',
    }),
  email: z.string().email('لطفاً یک ایمیل معتبر وارد کنید').optional().or(z.literal('')),
  serviceType: z.enum([
    'INTERNATIONAL_TRANSFER',
    'ONLINE_PAYMENT',
    'TUITION_PAYMENT',
    'FREELANCE_INCOME',
    'SOFTWARE_PURCHASE',
    'GIFT_CARD',
    'CURRENCY_BUY',
    'CURRENCY_SELL',
    'CRYPTO_BUY',
    'CRYPTO_SELL',
    'PAYPAL_TRANSFER',
    'OTHER',
  ]),
  amount: z.string().min(1, 'لطفاً مبلغ را وارد کنید').max(50, 'مبلغ نامعتبر است'),
  currency: z.string().min(1, 'لطفاً واحد ارز را انتخاب کنید'),
  destinationCountry: z.string().optional(),
  bankName: z.string().optional(),
  description: z.string().max(500, 'توضیحات نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد').optional(),
  urgency: z.enum(['NORMAL', 'URGENT']).default('NORMAL'),
  contactMethod: z.enum(['telegram', 'whatsapp']),
  // Online Payment fields
  websiteUrl: z.string().optional(),
  productName: z.string().optional(),
  // Tuition Payment fields
  universityName: z.string().optional(),
  studentId: z.string().optional(),
  // Freelance Income fields
  platformName: z.string().optional(),
  platformUsername: z.string().optional(),
  // Software Purchase fields
  softwareName: z.string().optional(),
  subscriptionType: z.string().optional(),
  // Gift Card fields
  giftCardBrand: z.string().optional(),
  giftCardRegion: z.string().optional(),
});

export type ServiceRequestFormData = z.infer<typeof ServiceRequestSchema>;

// ─── Category Schemas ───────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'نام دسته‌بندی الزامی است')
    .max(100, 'نام دسته‌بندی نباید بیشتر از ۱۰۰ کاراکتر باشد'),
  slug: z.string().optional(),
  thumbnail: z.string().optional().nullable(),
  thumbnailWidth: z.number().int().positive().optional().nullable(),
  thumbnailHeight: z.number().int().positive().optional().nullable(),
  parentIds: z.array(z.string().cuid()).max(5, 'حداکثر ۵ والد مجاز است').optional(),
});

export const UpdateCategorySchema = CreateCategorySchema;

// ─── Advertisement Schemas ───────────────────────────────────────────────────

export const CreateAdvertisementSchema = z.object({
  title: z
    .string()
    .min(1, 'عنوان تبلیغ الزامی است')
    .max(200, 'عنوان نباید بیشتر از ۲۰۰ کاراکتر باشد'),
  description: z.string().max(500, 'توضیحات نباید بیشتر از ۵۰۰ کاراکتر باشد').optional(),
  imageUrl: z
    .string()
    .refine((v) => !v || v.startsWith('/') || v.startsWith('http'), 'آدرس تصویر نامعتبر است')
    .optional()
    .nullable(),
  linkUrl: z
    .string()
    .url('آدرس لینک نامعتبر است')
    .max(500, 'آدرس لینک نباید بیشتر از ۵۰۰ کاراکتر باشد')
    .optional()
    .nullable(),
  position: z.string().min(1, 'موقعیت تبلیغ الزامی است'),
  size: z.string().min(1, 'اندازه تبلیغ الزامی است'),
  isActive: z.boolean().optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  order: z.number().int().nonnegative().optional(),
  customDimensions: z.unknown().optional().nullable(),
});

export const UpdateAdvertisementSchema = CreateAdvertisementSchema.partial();

// ─── Settings Schemas ─────────────────────────────────────────────────────────

export const UpdateGeneralSettingsSchema = z.object({
  siteName: z
    .string()
    .min(1, 'نام سایت الزامی است')
    .max(100, 'نام سایت نباید بیشتر از ۱۰۰ کاراکتر باشد'),
  siteDescription: z
    .string()
    .max(500, 'توضیحات سایت نباید بیشتر از ۵۰۰ کاراکتر باشد')
    .optional()
    .or(z.literal('')),
  logoUrl: z
    .string()
    .refine((v) => !v || v.startsWith('/') || v.startsWith('http'), 'آدرس لوگو نامعتبر است')
    .optional()
    .or(z.literal(''))
    .nullable(),
  // 2026-07-29: فیلدهای تماس — اختیاری، در صورت خالی بودن null می‌شود
  contactEmail: z
    .string()
    .email('ایمیل تماس نامعتبر است')
    .max(255)
    .optional()
    .or(z.literal(''))
    .nullable(),
  contactPhone: z
    .string()
    .max(50, 'شماره تماس نباید بیشتر از ۵۰ کاراکتر باشد')
    .optional()
    .or(z.literal(''))
    .nullable(),
  contactAddress: z
    .string()
    .max(500, 'آدرس نباید بیشتر از ۵۰۰ کاراکتر باشد')
    .optional()
    .or(z.literal(''))
    .nullable(),
});

export const UpdateEmailSettingsSchema = z.object({
  smtpServer: z.string().min(1, 'آدرس سرور SMTP الزامی است').max(255),
  smtpPort: z
    .string()
    .regex(/^\d+$/, 'پورت باید عدد باشد')
    .refine((v) => {
      const n = Number(v);
      return n >= 1 && n <= 65535;
    }, 'پورت باید بین ۱ تا ۶۵۵۳۵ باشد'),
  smtpUsername: z.string().email('نام کاربری SMTP باید یک ایمیل معتبر باشد').max(255),
  smtpPassword: z.string().max(255).optional().or(z.literal('')),
});

export const UpdateSocialSettingsSchema = z.object({
  instagram: z
    .string()
    .max(200)
    .refine((v) => !v || v.startsWith('http') || v.startsWith('@'), 'آدرس اینستاگرام نامعتبر است')
    .optional()
    .or(z.literal('')),
  telegram: z
    .string()
    .max(200)
    .refine((v) => !v || v.startsWith('http') || v.startsWith('@'), 'آدرس تلگرام نامعتبر است')
    .optional()
    .or(z.literal('')),
  twitter: z
    .string()
    .max(200)
    .refine((v) => !v || v.startsWith('http') || v.startsWith('@'), 'آدرس توییتر نامعتبر است')
    .optional()
    .or(z.literal('')),
  whatsapp: z
    .string()
    .max(200)
    .refine((v) => !v || v.startsWith('http') || v.startsWith('+'), 'آدرس واتساپ نامعتبر است')
    .optional()
    .or(z.literal('')),
});

export const UpdateCacheSettingsSchema = z.object({
  cacheEnabled: z.boolean(),
});

export const UpdateMaintenanceModeSchema = z.object({
  maintenanceMode: z.boolean(),
});
