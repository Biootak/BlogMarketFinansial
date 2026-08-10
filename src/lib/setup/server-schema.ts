import { isPhoneValid } from '@/lib/phone-validation';
import { z } from 'zod';

/**
 * Server-side validation for creating/completing the OWNER account.
 *
 * Shared by `createSuperAdmin` (first-run bootstrap) and `activateOwner`
 * (invite-based handover) so the two actions can never drift apart — the
 * repo convention is that client validation (src/lib/setup/schema.ts) and
 * server validation must stay in lockstep.
 *
 * `activateOwner` extends this with the invite `token` field.
 */
export const ownerSetupSchema = z.object({
  email: z.string().email('ایمیل نامعتبر است'),
  password: z
    .string()
    .min(12, 'رمز عبور باید حداقل 12 کاراکتر باشد')
    .regex(/[A-Z]/, 'رمز عبور باید شامل حروف بزرگ باشد')
    .regex(/[a-z]/, 'رمز عبور باید شامل حروف کوچک باشد')
    .regex(/[0-9]/, 'رمز عبور باید شامل اعداد باشد')
    .regex(/[^A-Za-z0-9]/, 'رمز عبور باید شامل کاراکترهای خاص باشد'),
  name: z.string().min(2, 'نام باید حداقل 2 حرف داشته باشد'),
  // همان مکانیزم واحد phone-validation: همهٔ کشورها + بلوک شمارهٔ مجازی (VoIP).
  phoneNumber: z.string().refine(isPhoneValid, 'شماره تماس معتبر نیست'),
  jobName: z.string().min(2, 'عنوان شغلی باید حداقل 2 حرف داشته باشد'),
  company: z.string().min(2, 'نام شرکت باید حداقل 2 حرف داشته باشد'),
  bio: z.string().min(10, 'بیوگرافی باید حداقل 10 حرف داشته باشد'),
});

export type OwnerSetupPayload = z.infer<typeof ownerSetupSchema>;

/** Invite token — 64-char hex from `provisionOwnerSetupInvite`. */
export const ownerInviteTokenSchema = z
  .string()
  .trim()
  .min(32, 'لینک دعوت نامعتبر است')
  .max(128, 'لینک دعوت نامعتبر است');

export const ownerActivationSchema = ownerSetupSchema.extend({
  token: ownerInviteTokenSchema,
});

export type OwnerActivationPayload = z.infer<typeof ownerActivationSchema>;
