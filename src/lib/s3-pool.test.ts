/**
 * s3-pool.ts — تست‌های واحد
 *
 * ماژول deliberately خالص است (بدون aws-sdk / شبکه) تا این تست‌ها بدون
 * mock و بدون DB اجرا شوند: پارس S3_POOL، fallback به legacy تک‌باکتی،
 * و توزیع round-robin.
 */

import { isR2Endpoint, nextUploadBucketIndex, parseS3Pool } from '@/lib/s3-pool';
import { describe, expect, it } from 'vitest';

const LEGACY_ENV = {
  S3_ENDPOINT: 'https://s3.filebase.io',
  S3_ACCESS_KEY: 'ak-legacy',
  S3_SECRET_KEY: 'sk-legacy',
  S3_BUCKET_NAME: 'fm-blog',
  S3_REGION: 'auto',
};

// ─── parseS3Pool ──────────────────────────────────────────────────────────────

describe('parseS3Pool', () => {
  it('S3_POOL معتبر JSON → entries پول برمی‌گردد', () => {
    const env = {
      ...LEGACY_ENV,
      S3_POOL: JSON.stringify([
        {
          endpoint: 'https://s3.filebase.io',
          accessKey: 'ak-1',
          secretKey: 'sk-1',
          bucket: 'fm-blog',
          region: 'auto',
        },
        {
          endpoint: 'https://s3.filebase.io',
          accessKey: 'ak-2',
          secretKey: 'sk-2',
          bucket: 'fm-blog-uploads',
          region: 'auto',
        },
      ]),
    };
    const pool = parseS3Pool(env);
    expect(pool).toHaveLength(2);
    expect(pool[0]).toMatchObject({ bucket: 'fm-blog', accessKey: 'ak-1' });
    expect(pool[1]).toMatchObject({ bucket: 'fm-blog-uploads', accessKey: 'ak-2' });
  });

  it('entry ناقص/نامعتبر رد می‌شود بدون کرش', () => {
    const env = {
      ...LEGACY_ENV,
      S3_POOL: JSON.stringify([
        { endpoint: 'https://s3.filebase.io', accessKey: 'ak', secretKey: 'sk' }, // بدون bucket
        { endpoint: 'not-a-url', accessKey: 'ak', secretKey: 'sk', bucket: 'b' }, // endpoint خراب
        null,
        'text',
        { endpoint: 'https://ok.io', accessKey: 'ak', secretKey: 'sk', bucket: 'ok-bucket' },
      ]),
    };
    const pool = parseS3Pool(env);
    expect(pool).toHaveLength(1);
    expect(pool[0].bucket).toBe('ok-bucket');
  });

  it('بدون S3_POOL → fallback به legacy تک‌باکتی از S3_*', () => {
    const pool = parseS3Pool(LEGACY_ENV);
    expect(pool).toHaveLength(1);
    expect(pool[0]).toMatchObject({
      endpoint: 'https://s3.filebase.io',
      bucket: 'fm-blog',
      region: 'auto',
    });
  });

  it('S3_POOL خالی/JSON خراب → fallback به legacy', () => {
    for (const bad of ['', '   ', '{invalid json', '[]', '{}', '"text"']) {
      const pool = parseS3Pool({ ...LEGACY_ENV, S3_POOL: bad });
      expect(pool).toHaveLength(1);
      expect(pool[0].bucket).toBe('fm-blog');
    }
  });

  it('هیچ کانفیگی نباشد → [] (ابر غیرفعال)', () => {
    expect(parseS3Pool({})).toEqual([]);
    expect(parseS3Pool({ S3_ENDPOINT: 'https://s3.filebase.io' })).toEqual([]);
  });

  it('entry معتبر بدون region → پیش‌فرض "default"', () => {
    const env = {
      S3_POOL: JSON.stringify([
        { endpoint: 'https://s3.filebase.io', accessKey: 'a', secretKey: 'b', bucket: 'c' },
      ]),
    };
    expect(parseS3Pool(env)[0].region).toBe('default');
  });
});

// ─── nextUploadBucketIndex (round-robin) ──────────────────────────────────────

describe('nextUploadBucketIndex', () => {
  it('به ترتیب بین باکت‌ها می‌چرخد', () => {
    expect(nextUploadBucketIndex(3, 0)).toBe(0);
    expect(nextUploadBucketIndex(3, 1)).toBe(1);
    expect(nextUploadBucketIndex(3, 2)).toBe(2);
  });

  it('بعد از آخرین باکت به اول برمی‌گردد (wrap-around)', () => {
    expect(nextUploadBucketIndex(3, 3)).toBe(0);
    expect(nextUploadBucketIndex(3, 4)).toBe(1);
    expect(nextUploadBucketIndex(2, 5)).toBe(1);
  });

  it('شمارنده منفی هم در بازهٔ معتبر می‌ماند', () => {
    expect(nextUploadBucketIndex(3, -1)).toBe(2);
    expect(nextUploadBucketIndex(3, -4)).toBe(2);
  });

  it('پول خالی → -1', () => {
    expect(nextUploadBucketIndex(0, 0)).toBe(-1);
    expect(nextUploadBucketIndex(-2, 0)).toBe(-1);
  });
});

// ─── isR2Endpoint ─────────────────────────────────────────────────────────────

describe('isR2Endpoint', () => {
  it('endpoint رایان‌کلاد R2 تشخیص داده می‌شود', () => {
    expect(isR2Endpoint('https://abc.r2.cloudflarestorage.com')).toBe(true);
  });

  it('سایر سرویس‌ها R2 نیستند', () => {
    expect(isR2Endpoint('https://s3.filebase.io')).toBe(false);
    expect(isR2Endpoint('')).toBe(false);
  });
});
