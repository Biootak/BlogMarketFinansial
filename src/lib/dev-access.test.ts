import { afterEach, describe, expect, it, vi } from 'vitest';

// سه گارد مستقل: NODE_ENV=development + DEV_OWNER_BYPASS=1 + ایمیل منطبق.
// این تست‌ها تأیید می‌کنند که در production هرگز فعال نمی‌شود و در dev فقط
// برای همان ایمیل تعیین‌شده. (توابع env را هنگام صدا زدن می‌خوانند، پس
// vi.stubEnv کافی است — نیازی به resetModules نیست.)

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('dev-access (dev-only OWNER elevation)', () => {
  it('returns null in production even when bypass flags are set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEV_OWNER_BYPASS', '1');
    vi.stubEnv('DEV_OWNER_EMAIL', 'bioootak@gmail.com');
    const { devOwnerRoleForEmail } = await import('./dev-access');
    expect(devOwnerRoleForEmail('bioootak@gmail.com')).toBeNull();
  });

  it('returns OWNER in development only for the matching email', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEV_OWNER_BYPASS', '1');
    vi.stubEnv('DEV_OWNER_EMAIL', 'bioootak@gmail.com');
    const { devOwnerRoleForEmail } = await import('./dev-access');
    expect(devOwnerRoleForEmail('bioootak@gmail.com')).toBe('OWNER');
    expect(devOwnerRoleForEmail('bioootak@GMAIL.com')).toBe('OWNER'); // case-insensitive
    expect(devOwnerRoleForEmail('hacker@evil.com')).toBeNull();
    expect(devOwnerRoleForEmail(null)).toBeNull();
    expect(devOwnerRoleForEmail(undefined)).toBeNull();
  });

  it('returns null in development when bypass is not explicitly enabled', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEV_OWNER_EMAIL', 'bioootak@gmail.com');
    const { devOwnerRoleForEmail } = await import('./dev-access');
    expect(devOwnerRoleForEmail('bioootak@gmail.com')).toBeNull();
  });

  it('returns null when DEV_OWNER_EMAIL is missing', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEV_OWNER_BYPASS', '1');
    const { devOwnerRoleForEmail } = await import('./dev-access');
    expect(devOwnerRoleForEmail('bioootak@gmail.com')).toBeNull();
  });
});
