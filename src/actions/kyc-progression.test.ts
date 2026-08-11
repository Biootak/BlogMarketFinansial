import { describe, expect, it } from 'vitest';
import { computeKycProgression } from '@/lib/kyc-progression';

type Rec = { level: string; docType: string; status: string };
const r = (level: string, docType: string, status: string): Rec => ({ level, docType, status });

const PHONE_OK = r('LEVEL_1', 'PHONE', 'APPROVED');
const PHONE_PENDING = r('LEVEL_1', 'PHONE', 'PENDING');
const DOC_OK = r('LEVEL_2', 'NATIONAL_ID', 'APPROVED');
const DOC_REJ = r('LEVEL_2', 'NATIONAL_ID', 'REJECTED');
const DOC_PENDING = r('LEVEL_2', 'NATIONAL_ID', 'PENDING');
const SELFIE_OK = r('LEVEL_2', 'SELFIE', 'APPROVED');
const SELFIE_REJ = r('LEVEL_2', 'SELFIE', 'REJECTED');
const ADDR_OK = r('LEVEL_3', 'ADDRESS_PROOF', 'APPROVED');
const BANK_OK = r('LEVEL_3', 'BANK_STATEMENT', 'APPROVED');

describe('computeKycProgression', () => {
  it('nothing submitted → NONE', () => {
    const p = computeKycProgression([]);
    expect(p.finalLevel).toBe('NONE');
    expect(p.pendingAtNext).toBe(false);
  });

  it('LEVEL_1 phone pending → NONE with pending at next', () => {
    const p = computeKycProgression([PHONE_PENDING]);
    expect(p.finalLevel).toBe('NONE');
    expect(p.pendingAtNext).toBe(true);
  });

  it('LEVEL_1 phone approved → LEVEL_1', () => {
    const p = computeKycProgression([PHONE_OK]);
    expect(p.finalLevel).toBe('LEVEL_1');
  });

  it('doc approved + selfie pending → LEVEL_1 with pending (partial approval does NOT unlock LEVEL_2)', () => {
    const p = computeKycProgression([PHONE_OK, DOC_OK, r('LEVEL_2', 'SELFIE', 'PENDING')]);
    expect(p.finalLevel).toBe('LEVEL_1');
    expect(p.pendingAtNext).toBe(true);
  });

  it('selfie approved ONLY (no identity doc) → LEVEL_1 — selfie alone must NOT unlock LEVEL_2', () => {
    const p = computeKycProgression([PHONE_OK, SELFIE_OK]);
    expect(p.finalLevel).toBe('LEVEL_1');
  });

  it('doc approved + selfie rejected → LEVEL_1 with rejected at next (user can re-submit)', () => {
    const p = computeKycProgression([PHONE_OK, DOC_OK, SELFIE_REJ]);
    expect(p.finalLevel).toBe('LEVEL_1');
    expect(p.rejectedAtNext).toBe(true);
  });

  it('doc + selfie both approved → LEVEL_2', () => {
    const p = computeKycProgression([PHONE_OK, DOC_OK, SELFIE_OK]);
    expect(p.finalLevel).toBe('LEVEL_2');
  });

  it('re-submission after partial rejection: new doc+selfie pending → LEVEL_1 pending', () => {
    const p = computeKycProgression([PHONE_OK, DOC_OK, SELFIE_REJ, DOC_PENDING, r('LEVEL_2', 'SELFIE', 'PENDING')]);
    expect(p.finalLevel).toBe('LEVEL_1');
    expect(p.pendingAtNext).toBe(true);
  });

  it('PASSPORT counts as identity doc for LEVEL_2', () => {
    const p = computeKycProgression([
      PHONE_OK,
      r('LEVEL_2', 'PASSPORT', 'APPROVED'),
      SELFIE_OK,
    ]);
    expect(p.finalLevel).toBe('LEVEL_2');
  });

  it('LEVEL_3 requires BOTH address proof AND bank statement', () => {
    const base = [PHONE_OK, DOC_OK, SELFIE_OK];
    expect(computeKycProgression([...base, ADDR_OK]).finalLevel).toBe('LEVEL_2');
    expect(computeKycProgression([...base, BANK_OK]).finalLevel).toBe('LEVEL_2');
    expect(computeKycProgression([...base, ADDR_OK, BANK_OK]).finalLevel).toBe('LEVEL_3');
  });

  it('LEVEL_3 approved without LEVEL_2 complete → stays LEVEL_2', () => {
    const p = computeKycProgression([PHONE_OK, DOC_OK, SELFIE_REJ, ADDR_OK, BANK_OK]);
    expect(p.finalLevel).toBe('LEVEL_1');
    expect(p.rejectedAtNext).toBe(true);
  });
});
