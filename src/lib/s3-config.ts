/**
 * s3-config.ts — Shared S3-compatible client configuration.
 * ─────────────────────────────────────────────────────────
 *  هر سه مصرف‌کننده (storage.ts، backup.ts، S3Actions.ts) قبلاً `region: 'default'`
 *  را جداگانه hardcode می‌کردند. R2 با `region: 'auto'` کار می‌کند، MinIO/B2
 *  با هر مقداری. این ماژول تنها نقطهٔ تعریف region است تا تغییر provider فقط
 *  تغییر env باشد (نه تغییر کد):
 *
 *    S3_REGION=default   → MinIO / Backblaze B2 / سایر S3-compatible
 *    S3_REGION=auto      → Cloudflare R2
 *
 *  متغیرها با پیشوند S3_ نام‌گذاری شده‌اند چون storage provider-agnostic
 *  است و به هیچ فروشندهٔ خاصی وابسته نیست.
 */

/** Region سازگار با provider — از env می‌آید. */
export const S3_REGION: string = process.env.S3_REGION || 'default';

/** آیا ذخیره‌سازی ابری اصلاً پیکربندی شده؟ (همهٔ فیلدهای اجباری) */
export function isS3CredentialsSet(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY &&
      process.env.S3_BUCKET_NAME,
  );
}

/** Bucket مورد استفادهٔ عمومی (تصاویر). */
export function getS3Bucket(): string {
  return process.env.S3_BUCKET_NAME || '';
}
