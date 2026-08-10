/**
 * s3-pool.ts — پول باکت‌های S3-compatible (مقیاس‌پذیر، «انگار که یک باکت است»).
 * ─────────────────────────────────────────────────────────────────────────
 *  تیر رایگان Filebase فقط ۱ باکت و ~۱٬۰۰۰ فایل به ازای هر اکانت می‌دهد. برای
 *  مقیاس‌پذیری بدون محدودیت، پروژه می‌تواند چند باکت (در چند اکانت) را به‌صورت
 *  یک پول واحد مدیریت کند:
 *
 *    آپلود  → توزیع round-robin بین باکت‌ها (در صورت خطا، باکت بعدی امتحان می‌شود)
 *    خواندن → همهٔ باکت‌ها به موازات پرسیده می‌شوند؛ اولین موفق برمی‌گردد
 *    حذف    → از همهٔ باکت‌ها (best-effort)
 *
 *  کانفیگ از `S3_POOL` (JSON array) می‌آید؛ هر entry کلیدهای مستقل خودش را
 *  دارد (هر باکت می‌تواند در اکانت/سرویس جدا باشد). اگر `S3_POOL` ست نشده
 *  باشد، به legacy تک‌باکتی `S3_*` برمی‌گردد — یعنی بدون هیچ تغییری در env
 *  رفتار قبلی حفظ می‌شود.
 *
 *  فرمت S3_POOL (JSON):
 *  [
 *    { "endpoint": "https://s3.filebase.io", "accessKey": "...", "secretKey": "...",
 *      "bucket": "fm-blog", "region": "auto" },
 *    { "endpoint": "https://s3.filebase.io", "accessKey": "...", "secretKey": "...",
 *      "bucket": "fm-blog-uploads", "region": "auto" }
 *  ]
 *
 *  این ماژول deliberately خالص است (بدون aws-sdk / شبکه) تا به‌راحتی تست شود.
 */

export interface S3PoolEntry {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
}

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/**
 * پارس و اعتبارسنجی پول باکت‌ها از env.
 * - اگر `S3_POOL` JSON معتبر با حداقل یک entry سالم باشد → همان را برمی‌گرداند.
 * - entryهای ناقص/نامعتبر رد می‌شوند (بدون کرش).
 * - اگر `S3_POOL` نباشد یا خالی/خراب باشد → legacy تک‌باکتی از `S3_*`.
 * - اگر هیچ‌کدام نباشد → [] (ذخیره‌سازی ابری غیرفعال).
 */
export function parseS3Pool(env: Record<string, string | undefined> = process.env): S3PoolEntry[] {
  const raw = env.S3_POOL;
  if (raw?.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const entries: S3PoolEntry[] = [];
        for (const item of parsed) {
          if (!item || typeof item !== 'object') continue;
          const o = item as Record<string, unknown>;
          const endpoint = typeof o.endpoint === 'string' ? o.endpoint.trim() : '';
          const accessKey = typeof o.accessKey === 'string' ? o.accessKey.trim() : '';
          const secretKey = typeof o.secretKey === 'string' ? o.secretKey.trim() : '';
          const bucket = typeof o.bucket === 'string' ? o.bucket.trim() : '';
          const region = (typeof o.region === 'string' ? o.region.trim() : '') || 'default';
          if (endpoint && accessKey && secretKey && bucket && isHttpUrl(endpoint)) {
            entries.push({ endpoint, accessKey, secretKey, bucket, region });
          }
        }
        if (entries.length > 0) return entries;
        // پول خالی/همه ناقص → fall through به legacy
      }
    } catch {
      // JSON خراب → fall through به legacy
    }
  }

  const endpoint = (env.S3_ENDPOINT ?? '').trim();
  const accessKey = (env.S3_ACCESS_KEY ?? '').trim();
  const secretKey = (env.S3_SECRET_KEY ?? '').trim();
  const bucket = (env.S3_BUCKET_NAME ?? '').trim();
  if (endpoint && accessKey && secretKey && bucket) {
    return [
      {
        endpoint,
        accessKey,
        secretKey,
        bucket,
        region: (env.S3_REGION ?? '').trim() || 'default',
      },
    ];
  }
  return [];
}

/**
 * ایندکس بعدی برای توزیع round-robin (خالص و قابل تست).
 * همیشه در بازهٔ [0, size) برمی‌گردد؛ برای پول خالی -1.
 */
export function nextUploadBucketIndex(size: number, counter: number): number {
  if (size <= 0) return -1;
  return ((counter % size) + size) % size;
}

/** آیا entry متعلق به Cloudflare R2 است؟ (برای هشدار S3_PUBLIC_URL) */
export function isR2Endpoint(endpoint: string): boolean {
  return endpoint.includes('r2.cloudflarestorage.com');
}
