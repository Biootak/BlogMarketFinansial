import { sanitizeSlug, validateSlug } from '@/lib/utils';
import { PostStatus, PostType } from '@prisma/client';
import { z } from 'zod';

// Utility functions
const createStringSchema = (min: number, max: number, minMessage: string, maxMessage: string) =>
  z.string().min(min, minMessage).max(max, maxMessage);

const createArraySchema = (min: number, max: number, minMessage: string, maxMessage: string) =>
  z.array(z.string()).min(min, minMessage).max(max, maxMessage);

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

// Post related schemas
const BasePostSchema = z.object({
  title: createStringSchema(
    3,
    100,
    'عنوان باید حداقل 3 کاراکتر داشته باشد',
    'عنوان نباید بیشتر از 100 کاراکتر باشد',
  ),
  content: z.string().min(10, 'محتوا باید حداقل 10 کاراکتر داشته باشد'),
  excerpt: z.string().max(200, 'خلاصه نباید بیشتر از 200 کاراکتر باشد').optional(),
  postType: z.nativeEnum(PostType).default(PostType.STANDARD),
  isFeatured: z.boolean().default(false),
  videoUrl: z.union([z.string().url('لطفاً آدرس ویدئو معتبر وارد کنید'), z.literal('')]).optional(),
  audioUrl: z.union([z.string().url('لطفاً آدرس صوتی معتبر وارد کنید'), z.literal('')]).optional(),
  featuredImage: z.string().url('لطفاً آدرس تصویر معتبر وارد کنید').optional(),
  galleryImages: z.array(z.string().url('لطفاً آدرس تصویر معتبر وارد کنید')).optional(),
  status: z.nativeEnum(PostStatus).default(PostStatus.DRAFT),
});

const CategorySchema = createArraySchema(
  1,
  5,
  'حداقل یک دسته‌بندی باید انتخاب شود',
  'حداکثر 5 دسته‌بندی می‌توانید انتخاب کنید',
);
const TagSchema = z.array(z.string()).max(10, 'حداکثر 10 برچسب می‌توانید اضافه کنید').optional();

export const CreatePostSchema = BasePostSchema.extend({
  categories: CategorySchema,
  tags: TagSchema,
  slug: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeSlug(val) : val))
    .refine((val) => !val || validateSlug(val), {
      message: 'فرمت اسلاگ نامعتبر است. فقط حروف کوچک انگلیسی، اعداد و خط فاصله مجاز هستند.',
    }),
});

export const UpdatePostSchema = BasePostSchema.partial().extend({
  id: z.string().cuid('شناسه پست نامعتبر است').optional(),
  categories: CategorySchema.optional(),
  tags: TagSchema,
  slug: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeSlug(val) : val))
    .refine((val) => !val || validateSlug(val), {
      message: 'فرمت اسلاگ نامعتبر است. فقط حروف کوچک انگلیسی، اعداد و خط فاصله مجاز هستند.',
    }),
});

const IdSchema = z.string().cuid();

export const PostSchema = BasePostSchema.extend({
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
    name: z.string().min(2, 'نام باید حداقل 2 حرف باشد').optional(),
    email: z.string().email('ایمیل نامعتبر است').optional(),
    bio: z.string().max(500, 'بیوگرافی نمی‌تواند بیشتر از 500 کاراکتر باشد').optional(),
    imageUrl: z.string().url('آدرس تصویر نامعتبر است').optional(),
    bgImage: z.string().url('آدرس تصویر پس‌زمینه نامعتبر است').optional(),
    jobName: z.string().max(100, 'نام شغل نمی‌تواند بیشتر از 100 کاراکتر باشد').optional(),
    currentPassword: z.string().min(6, 'رمز عبور باید حداقل 6 کاراکتر باشد').optional(),
    newPassword: z.string().min(6, 'رمز عبور جدید باید حداقل 6 کاراکتر باشد').optional(),
    confirmNewPassword: z.string().optional(),
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
