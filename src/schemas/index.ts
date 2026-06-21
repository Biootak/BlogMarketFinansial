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
const emailSchema = z.string().email('لطفاً یک آدرس ایمیل معتبر وارد کنید');
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


export const UpdatePostSchema = CreatePostSchema.partial()

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
    bio: z.string().max(500, 'بیوگرافی نمی‌تواند بیشتر از 500 کاراکتر باشد').optional().or(z.literal('')),
    imageUrl: z.string().url('آدرس تصویر نامعتبر است').optional().or(z.literal('')),
    bgImage: z.string().url('آدرس تصویر پس‌زمینه نامعتبر است').optional().or(z.literal('')),
    jobName: z.string().max(100, 'نام شغل نمی‌تواند بیشتر از 100 کاراکتر باشد').optional().or(z.literal('')),
    currentPassword: z.string().min(6, 'رمز عبور باید حداقل 6 کاراکتر باشد').optional().or(z.literal('')),
    newPassword: z.string().min(6, 'رمز عبور جدید باید حداقل 6 کاراکتر باشد').optional().or(z.literal('')),
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
  phone: z
    .string()
    .min(10, 'شماره تماس باید حداقل ۱۰ رقم باشد')
    .max(15, 'شماره تماس نامعتبر است')
    .regex(/^[0-9+]+$/, 'شماره تماس فقط می‌تواند شامل اعداد باشد'),
  email: z.string().email('لطفاً یک ایمیل معتبر وارد کنید').optional().or(z.literal('')),
  serviceType: z.enum([
    'INTERNATIONAL_TRANSFER',
    'ONLINE_PAYMENT',
    'TUITION_PAYMENT',
    'FREELANCE_INCOME',
    'SOFTWARE_PURCHASE',
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
});

export type ServiceRequestFormData = z.infer<typeof ServiceRequestSchema>;
