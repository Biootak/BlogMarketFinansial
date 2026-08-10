/**
 * s3-clients.ts — تست‌های واحد
 *
 * ساخت client بدون شبکه انجام می‌شود (فقط کانفیگ) — این تست‌ها بررسی
 * می‌کنند که کانفیگ پایه (forcePathStyle, maxAttempts, endpoint) درست
 * به S3Client رسیده و پول از env/entries درست ساخته می‌شود.
 */

import { buildPoolFromEntries, buildS3Client, buildS3Pool } from '@/lib/s3-clients';
import { S3Client } from '@aws-sdk/client-s3';
import { describe, expect, it } from 'vitest';

const ENTRY = {
  endpoint: 'https://s3.filebase.io',
  accessKey: 'ak',
  secretKey: 'sk',
  bucket: 'fm-blog',
  region: 'auto',
};

// ─── buildS3Client ───────────────────────────────────────────────────────────

describe('buildS3Client', () => {
  it('config پایه درست ست می‌شود', async () => {
    const client = buildS3Client(ENTRY);
    expect(client).toBeInstanceOf(S3Client);
    expect(client.config.forcePathStyle).toBe(true);
    // maxAttempts:1 = بدون retry از سمت SDK
    expect(await client.config.maxAttempts()).toBe(1);
    const endpoint = await client.config.endpoint?.();
    expect(endpoint?.hostname).toBe('s3.filebase.io');
  });

  it('timeout سفارشی پذیرفته می‌شود (بدون خطا)', () => {
    expect(() =>
      buildS3Client(ENTRY, { requestTimeout: 5000, connectionTimeout: 4000 }),
    ).not.toThrow();
  });
});

// ─── buildPoolFromEntries ────────────────────────────────────────────────────

describe('buildPoolFromEntries', () => {
  it('هر entry → عضو پول با client/bucket/endpoint', () => {
    const pool = buildPoolFromEntries([ENTRY, { ...ENTRY, bucket: 'fm-blog-uploads' }]);
    expect(pool).toHaveLength(2);
    expect(pool[0]).toMatchObject({ bucket: 'fm-blog', endpoint: 'https://s3.filebase.io' });
    expect(pool[1].bucket).toBe('fm-blog-uploads');
    expect(pool.every((m) => m.client instanceof S3Client)).toBe(true);
  });

  it('پول خالی → []', () => {
    expect(buildPoolFromEntries([])).toEqual([]);
  });
});

// ─── buildS3Pool (از env) ────────────────────────────────────────────────────

describe('buildS3Pool', () => {
  const LEGACY_ENV = {
    S3_ENDPOINT: 'https://s3.filebase.io',
    S3_ACCESS_KEY: 'ak',
    S3_SECRET_KEY: 'sk',
    S3_BUCKET_NAME: 'fm-blog',
    S3_REGION: 'auto',
  };

  it('از env legacy تک‌باکتی پول می‌سازد', async () => {
    const pool = buildS3Pool(undefined, LEGACY_ENV);
    expect(pool).toHaveLength(1);
    expect(pool[0]).toMatchObject({ bucket: 'fm-blog', endpoint: 'https://s3.filebase.io' });
    expect(await pool[0].client.config.maxAttempts()).toBe(1);
  });

  it('از S3_POOL پول چند باکتی می‌سازد', () => {
    const env = {
      ...LEGACY_ENV,
      S3_POOL: JSON.stringify([ENTRY, { ...ENTRY, bucket: 'fm-blog-uploads' }]),
    };
    const pool = buildS3Pool(undefined, env);
    expect(pool).toHaveLength(2);
    expect(pool.map((m) => m.bucket)).toEqual(['fm-blog', 'fm-blog-uploads']);
  });

  it('بدون کانفیگ → [] (ابر غیرفعال)', () => {
    expect(buildS3Pool(undefined, {})).toEqual([]);
  });
});
