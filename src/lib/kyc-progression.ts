/**
 * kyc-progression.ts — منطق پیشرفت سطوح KYC مشتری (خالص، بدون وابستگی به سرور)
 *
 * یک سطح فقط وقتی «تکمیل» است که مجموعهٔ کامل مدارکِ آن سطح APPROVED باشد:
 *   LEVEL_1 → PHONE
 *   LEVEL_2 → یک مدرک هویتی (NATIONAL_ID/PASSPORT/RESIDENCE_PERMIT) + SELFIE
 *   LEVEL_3 → ADDRESS_PROOF + BANK_STATEMENT (به‌علاوهٔ کامل بودن سطح ۲)
 *
 * FIX (2026-08-11): قبلاً پیشرفت از «بالاترین سطحِ هر رکورد APPROVED» محاسبه می‌شد
 * — تأییدِ فقط سلفی، سطح ۲ را بدون مدرک هویتی باز می‌کرد و تأییدِ فقط مدرک، سطح را
 * به‌صورت ناقص جلو می‌برد (سپس رد شدنِ رکورد خواهر، کاربر را در ارسال مجدد قفل می‌کرد).
 */

export const KYC_IDENTITY_DOC_TYPES = ['NATIONAL_ID', 'PASSPORT', 'RESIDENCE_PERMIT'] as const;
export const KYC_LEVEL1_DOC = 'PHONE';
export const KYC_SELFIE_DOC = 'SELFIE';
export const KYC_LEVEL3_DOC_TYPES = ['ADDRESS_PROOF', 'BANK_STATEMENT'] as const;

export type KycLevelKey = 'NONE' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

export interface KycProgression {
  /** بالاترین سطحی که مجموعهٔ کامل مدارکش APPROVED است */
  finalLevel: KycLevelKey;
  /** آیا در سطح بعدی (هدف فعلی) رکورد PENDING هست؟ */
  pendingAtNext: boolean;
  /** آیا در سطح بعدی (هدف فعلی) رکورد REJECTED هست؟ */
  rejectedAtNext: boolean;
}

export function computeKycProgression(
  records: Array<{ level: string; docType: string; status: string }>,
): KycProgression {
  const approved = records.filter((r) => r.status === 'APPROVED');
  const hasPhone = approved.some((r) => r.level === 'LEVEL_1' && r.docType === KYC_LEVEL1_DOC);
  const hasIdentity = approved.some(
    (r) =>
      r.level === 'LEVEL_2' && (KYC_IDENTITY_DOC_TYPES as readonly string[]).includes(r.docType),
  );
  const hasSelfie = approved.some((r) => r.level === 'LEVEL_2' && r.docType === KYC_SELFIE_DOC);
  const hasAddress = approved.some((r) => r.level === 'LEVEL_3' && r.docType === 'ADDRESS_PROOF');
  const hasBank = approved.some((r) => r.level === 'LEVEL_3' && r.docType === 'BANK_STATEMENT');

  let finalLevel: KycLevelKey = 'NONE';
  if (hasPhone && hasIdentity && hasSelfie && hasAddress && hasBank) finalLevel = 'LEVEL_3';
  else if (hasPhone && hasIdentity && hasSelfie) finalLevel = 'LEVEL_2';
  else if (hasPhone) finalLevel = 'LEVEL_1';

  const nextLevel: KycLevelKey | null =
    finalLevel === 'NONE'
      ? 'LEVEL_1'
      : finalLevel === 'LEVEL_1'
        ? 'LEVEL_2'
        : finalLevel === 'LEVEL_2'
          ? 'LEVEL_3'
          : null;
  if (!nextLevel) return { finalLevel, pendingAtNext: false, rejectedAtNext: false };

  const next = records.filter((r) => r.level === nextLevel);
  return {
    finalLevel,
    pendingAtNext: next.some((r) => r.status === 'PENDING'),
    rejectedAtNext: next.some((r) => r.status === 'REJECTED'),
  };
}
