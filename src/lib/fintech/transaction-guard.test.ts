/**
 * isHighValueTransaction — تست‌های واحد
 *
 * تابع pure است — بدون DB، بدون mock.
 * آستانه: WITHDRAWAL و TRANSFER با amount >= 10_000_000n (100,000 AFN)
 *
 * نکته: transaction-guard.ts مستقیماً prisma و require-auth import می‌کند
 * که chain به next-auth می‌شود. این mock‌ها فقط برای قطع chain لازمند —
 * isHighValueTransaction خودش pure است و به هیچ‌کدام نیاز ندارد.
 */

import { describe, expect, it, vi } from 'vitest';

// Mock‌های زنجیره dependency — قبل از import اصلی
vi.mock('@/lib/db', () => ({ default: {} }));
vi.mock('@/lib/require-auth', () => ({ requireUser: vi.fn() }));
vi.mock('@/lib/sms', () => ({ sendSms: vi.fn() }));

import { isHighValueTransaction } from '@/lib/fintech/transaction-guard';

const THRESHOLD = BigInt(10_000_000); // 100,000 AFN in cents

describe('isHighValueTransaction', () => {
  describe('WITHDRAWAL', () => {
    it('بالای آستانه → true', () => {
      expect(isHighValueTransaction({ kind: 'WITHDRAWAL', amountCents: THRESHOLD })).toBe(true);
    });

    it('یک واحد بالای آستانه → true', () => {
      expect(
        isHighValueTransaction({ kind: 'WITHDRAWAL', amountCents: THRESHOLD + BigInt(1) }),
      ).toBe(true);
    });

    it('دقیقاً آستانه (برابر) → true', () => {
      expect(isHighValueTransaction({ kind: 'WITHDRAWAL', amountCents: THRESHOLD })).toBe(true);
    });

    it('یک واحد زیر آستانه → false', () => {
      expect(
        isHighValueTransaction({ kind: 'WITHDRAWAL', amountCents: THRESHOLD - BigInt(1) }),
      ).toBe(false);
    });

    it('صفر → false', () => {
      expect(isHighValueTransaction({ kind: 'WITHDRAWAL', amountCents: BigInt(0) })).toBe(false);
    });

    it('number type هم کار می‌کند', () => {
      expect(isHighValueTransaction({ kind: 'WITHDRAWAL', amountCents: 10_000_000 })).toBe(true);
      expect(isHighValueTransaction({ kind: 'WITHDRAWAL', amountCents: 9_999_999 })).toBe(false);
    });
  });

  describe('TRANSFER', () => {
    it('بالای آستانه → true', () => {
      expect(isHighValueTransaction({ kind: 'TRANSFER', amountCents: THRESHOLD })).toBe(true);
    });

    it('زیر آستانه → false', () => {
      expect(isHighValueTransaction({ kind: 'TRANSFER', amountCents: THRESHOLD - BigInt(1) })).toBe(
        false,
      );
    });
  });

  describe('DEPOSIT — هرگز high-value نیست', () => {
    it('مبلغ بالا ولی DEPOSIT → false', () => {
      expect(
        isHighValueTransaction({ kind: 'DEPOSIT', amountCents: THRESHOLD + BigInt(100) }),
      ).toBe(false);
    });

    it('بسیار بالا ولی DEPOSIT → false', () => {
      expect(isHighValueTransaction({ kind: 'DEPOSIT', amountCents: BigInt(9_999_999_999) })).toBe(
        false,
      );
    });
  });

  describe('FEE / EXCHANGE — هرگز high-value نیستند', () => {
    it('FEE → false', () => {
      expect(isHighValueTransaction({ kind: 'FEE', amountCents: BigInt(999_999_999) })).toBe(false);
    });

    it('EXCHANGE → false', () => {
      expect(isHighValueTransaction({ kind: 'EXCHANGE', amountCents: BigInt(999_999_999) })).toBe(
        false,
      );
    });
  });

  describe('edge cases', () => {
    it('kind ناشناخته → false', () => {
      expect(isHighValueTransaction({ kind: 'UNKNOWN_OP', amountCents: BigInt(999_999_999) })).toBe(
        false,
      );
    });

    it('string خالی → false', () => {
      expect(isHighValueTransaction({ kind: '', amountCents: BigInt(999_999_999) })).toBe(false);
    });
  });
});
