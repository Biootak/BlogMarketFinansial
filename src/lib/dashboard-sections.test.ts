import { describe, expect, it } from 'vitest';
import {
  canAccessRoute,
  canAccessWithPermissions,
  isActionAllowed,
  isAlwaysAllowedRoute,
  isKnownPermissionKey,
  isKnownSectionKey,
  isSectionAllowed,
  permissionMatches,
  sectionForRoute,
  sectionFullyDenied,
} from './dashboard-sections';

describe('sectionForRoute', () => {
  it('maps admin routes to their sections', () => {
    expect(sectionForRoute('/dashboard/exchanges')).toBe('exchanges');
    expect(sectionForRoute('/dashboard/exchanges/abc')).toBe('exchanges');
    expect(sectionForRoute('/dashboard/kyc-review')).toBe('kyc');
    expect(sectionForRoute('/dashboard/settlements')).toBe('settlements');
    expect(sectionForRoute('/dashboard/posts')).toBe('content');
    expect(sectionForRoute('/dashboard/users/xyz')).toBe('users');
    expect(sectionForRoute('/dashboard/reports')).toBe('reports');
    expect(sectionForRoute('/dashboard/settings')).toBe('settings');
    expect(sectionForRoute('/dashboard/audit-log')).toBe('audit');
  });

  it('does NOT match sibling prefixes', () => {
    // /dashboard/kyc (شخصی) نباید به بخش kyc-review نگاشت شود
    expect(sectionForRoute('/dashboard/kyc')).toBeNull();
    expect(sectionForRoute('/dashboard/exchange-rate')).toBeNull();
    expect(sectionForRoute('/dashboard/wallet')).toBeNull();
  });

  it('returns null for non-dashboard paths', () => {
    expect(sectionForRoute('/')).toBeNull();
    expect(sectionForRoute('/customer/dashboard')).toBeNull();
  });
});

describe('isAlwaysAllowedRoute', () => {
  it('allows the dashboard root and personal routes', () => {
    expect(isAlwaysAllowedRoute('/dashboard')).toBe(true);
    expect(isAlwaysAllowedRoute('/dashboard/wallet')).toBe(true);
    expect(isAlwaysAllowedRoute('/dashboard/my-requests')).toBe(true);
    expect(isAlwaysAllowedRoute('/dashboard/notifications')).toBe(true);
  });

  it('does NOT allow admin sections as personal', () => {
    expect(isAlwaysAllowedRoute('/dashboard/exchanges')).toBe(false);
    expect(isAlwaysAllowedRoute('/dashboard/settings')).toBe(false);
  });
});

describe('canAccessWithPermissions', () => {
  it('empty or missing permissions → role default (open)', () => {
    expect(canAccessWithPermissions('/dashboard/exchanges', undefined)).toBe(true);
    expect(canAccessWithPermissions('/dashboard/exchanges', [])).toBe(true);
  });

  it('explicit list → whitelist semantics', () => {
    const perms = ['exchanges', 'customers'];
    expect(canAccessWithPermissions('/dashboard/exchanges', perms)).toBe(true);
    expect(canAccessWithPermissions('/dashboard/customers', perms)).toBe(true);
    expect(canAccessWithPermissions('/dashboard/settlements', perms)).toBe(false);
    expect(canAccessWithPermissions('/dashboard/settings', perms)).toBe(false);
  });

  it('personal routes stay open under a whitelist', () => {
    expect(canAccessWithPermissions('/dashboard/wallet', ['exchanges'])).toBe(true);
    expect(canAccessWithPermissions('/dashboard', ['exchanges'])).toBe(true);
  });

  it('unmapped admin routes are denied by default under a whitelist', () => {
    expect(canAccessWithPermissions('/dashboard/some-new-page', ['exchanges'])).toBe(false);
  });
});

describe('isSectionAllowed (grants + denies)', () => {
  it('deny wins even under role default', () => {
    expect(isSectionAllowed('settlements', undefined, ['settlements'])).toBe(false);
    expect(isSectionAllowed('exchanges', undefined, ['settlements'])).toBe(true);
  });

  it('deny wins inside a whitelist', () => {
    const grants = ['exchanges', 'customers'];
    expect(isSectionAllowed('exchanges', grants, ['exchanges'])).toBe(false);
    expect(isSectionAllowed('customers', grants, ['exchanges'])).toBe(true);
  });

  it('empty grants + empty denies → role default', () => {
    expect(isSectionAllowed('exchanges', [], [])).toBe(true);
  });
});

describe('canAccessRoute (grants + denies)', () => {
  it('denies apply without grants (reduces role default)', () => {
    expect(canAccessRoute('/dashboard/settlements', undefined, ['settlements'])).toBe(false);
    expect(canAccessRoute('/dashboard/exchanges', undefined, ['settlements'])).toBe(true);
  });

  it('deny wins over grant on the same section', () => {
    expect(canAccessRoute('/dashboard/exchanges', ['exchanges', 'customers'], ['exchanges'])).toBe(
      false,
    );
    expect(canAccessRoute('/dashboard/customers', ['exchanges', 'customers'], ['exchanges'])).toBe(
      true,
    );
  });

  it('personal routes stay open under denies too', () => {
    expect(canAccessRoute('/dashboard/wallet', undefined, ['exchanges'])).toBe(true);
  });
});

describe('isKnownSectionKey', () => {
  it('accepts catalog keys and rejects garbage', () => {
    expect(isKnownSectionKey('exchanges')).toBe(true);
    expect(isKnownSectionKey('settings')).toBe(true);
    expect(isKnownSectionKey('wallet:read')).toBe(false);
    expect(isKnownSectionKey('')).toBe(false);
  });
});

describe('action-level keys', () => {
  it('isKnownPermissionKey accepts section and section:action', () => {
    expect(isKnownPermissionKey('kyc')).toBe(true);
    expect(isKnownPermissionKey('kyc:approve')).toBe(true);
    expect(isKnownPermissionKey('kyc:foo')).toBe(false);
    expect(isKnownPermissionKey('wallet:read')).toBe(false); // خارج از کاتالوگ داشبورد
  });

  it('permissionMatches: section key matches all actions of the section', () => {
    expect(permissionMatches('kyc:approve', 'kyc')).toBe(true);
    expect(permissionMatches('kyc:review', 'kyc')).toBe(true);
    expect(permissionMatches('kyc:approve', 'kyc:approve')).toBe(true);
    expect(permissionMatches('kyc:review', 'kyc:approve')).toBe(false);
    expect(permissionMatches('customers:view', 'kyc')).toBe(false);
  });

  it('isActionAllowed: action-level deny and grant', () => {
    // deny اکشن → فقط همان اکشن بسته است
    expect(isActionAllowed('kyc', 'review', undefined, ['kyc:approve'])).toBe(true);
    expect(isActionAllowed('kyc', 'approve', undefined, ['kyc:approve'])).toBe(false);
    // deny بخش → همهٔ اکشن‌ها بسته
    expect(isActionAllowed('kyc', 'review', undefined, ['kyc'])).toBe(false);
    // whitelist با کلید اکشن
    expect(isActionAllowed('kyc', 'approve', ['kyc:approve'], undefined)).toBe(true);
    expect(isActionAllowed('kyc', 'review', ['kyc:approve'], undefined)).toBe(false);
    // whitelist با کلید بخش
    expect(isActionAllowed('kyc', 'review', ['kyc'], undefined)).toBe(true);
    // deny بر grant اولویت دارد
    expect(isActionAllowed('kyc', 'approve', ['kyc:approve'], ['kyc:approve'])).toBe(false);
  });

  it('sectionFullyDenied', () => {
    expect(sectionFullyDenied('kyc', ['kyc'])).toBe(true);
    expect(sectionFullyDenied('kyc', ['kyc:view', 'kyc:review', 'kyc:approve'])).toBe(true);
    expect(sectionFullyDenied('kyc', ['kyc:approve'])).toBe(false);
  });

  it('isSectionAllowed: any action grant opens the section', () => {
    expect(isSectionAllowed('kyc', ['kyc:approve'], undefined)).toBe(true);
    expect(isSectionAllowed('customers', ['kyc:approve'], undefined)).toBe(false);
    expect(isSectionAllowed('kyc', undefined, ['kyc:approve'])).toBe(true); // هنوز view دارد
    expect(isSectionAllowed('kyc', undefined, ['kyc'])).toBe(false);
  });

  it('canAccessRoute: «فقط تأیید KYC بدون مشتریان»', () => {
    const grants = ['kyc:approve'];
    expect(canAccessRoute('/dashboard/kyc-review', grants, undefined)).toBe(true);
    expect(canAccessRoute('/dashboard/customers', grants, undefined)).toBe(false);
    expect(canAccessRoute('/dashboard/settlements', grants, undefined)).toBe(false);
  });
});
