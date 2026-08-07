import { isPhoneValid } from '@/lib/phone-validation';
import { z } from 'zod';

/**
 * Setup form schema — single source of truth shared by the wizard UI and
 * referenced by the `createSuperAdmin` server action.
 *
 * The rules mirror `src/actions/createSuperAdmin.ts` exactly (12-char minimum
 * + special character requirement) so client validation never disagrees with
 * the server. If you change one side, change the other in the same commit.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const setupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'نام باید حداقل ۲ حرف داشته باشد')
    .max(80, 'نام نباید بیشتر از ۸۰ حرف باشد'),

  email: z
    .string()
    .trim()
    .regex(EMAIL_REGEX, 'لطفاً یک آدرس ایمیل معتبر وارد کنید')
    .max(254, 'ایمیل بسیار طولانی است'),

  password: z
    .string()
    .min(12, 'رمز عبور باید حداقل ۱۲ کاراکتر باشد')
    .regex(/[A-Z]/, 'رمز عبور باید شامل حروف بزرگ باشد')
    .regex(/[a-z]/, 'رمز عبور باید شامل حروف کوچک باشد')
    .regex(/[0-9]/, 'رمز عبور باید شامل اعداد باشد')
    .regex(/[^A-Za-z0-9]/, 'رمز عبور باید شامل کاراکترهای خاص (!@#…) باشد')
    .max(128, 'رمز عبور نباید بیشتر از ۱۲۸ کاراکتر باشد'),

  // شمارهٔ موبایل — همهٔ کشورها پذیرفته می‌شود (با پیشوند +CC یا کشور پیش‌فرض AF).
  // همان مکانیزم واحد phone-validation را اعمال می‌کند: مجازی (VoIP) رد می‌شود.
  phoneNumber: z.string().trim().refine(isPhoneValid, {
    message: 'شماره تماس معتبر نیست؛ مثال: ۰۷۰۱۲۳۴۵۶۷ یا +93701234567 (شماره مجازی پذیرفته نمی‌شود)',
  }),

  jobName: z
    .string()
    .trim()
    .min(2, 'عنوان شغلی باید حداقل ۲ حرف داشته باشد')
    .max(80, 'عنوان شغلی نباید بیشتر از ۸۰ حرف باشد'),

  company: z
    .string()
    .trim()
    .min(2, 'نام شرکت باید حداقل ۲ حرف داشته باشد')
    .max(120, 'نام شرکت نباید بیشتر از ۱۲۰ حرف باشد'),

  bio: z
    .string()
    .trim()
    .min(10, 'بیوگرافی باید حداقل ۱۰ حرف داشته باشد')
    .max(600, 'بیوگرافی نباید بیشتر از ۶۰۰ حرف باشد'),
});

export type SetupFormValues = z.infer<typeof setupSchema>;

/** Fields grouped per wizard step — the UI iterates this for rendering. */
export const STEP_FIELDS = {
  identity: ['name', 'email'] as const,
  credentials: ['password', 'phoneNumber'] as const,
  profile: ['jobName', 'company', 'bio'] as const,
} satisfies Record<string, ReadonlyArray<keyof SetupFormValues>>;

export type StepId = 'intro' | 'identity' | 'credentials' | 'profile' | 'review';

/** Validate a single step's fields with the shared schema. */
export function validateStep(
  values: Partial<SetupFormValues>,
  step: StepId,
): { ok: true } | { ok: false; errors: Record<string, string> } {
  if (step === 'intro' || step === 'review') return { ok: true };
  const fields = STEP_FIELDS[step];
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field];
    const fieldSchema = setupSchema.shape[field];
    const result = fieldSchema.safeParse(value);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? 'مقدار نامعتبر';
      errors[field] = message;
    }
  }
  return Object.keys(errors).length === 0 ? { ok: true } : { ok: false, errors };
}
