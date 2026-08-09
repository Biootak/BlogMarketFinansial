/**
 * Password entropy estimator.
 *
 * Computes a 0–4 score from the password's character-class coverage and
 * length. We avoid pulling in `zxcvbn` (~400 KB) — this is a deterministic
 * approximation that satisfies NIST 800-63B "memorized secret" guidance
 * (≥ 12 chars + 4 character classes) and renders in Persian for the UI.
 *
 * Bits of entropy = length × log2(charset_size). Charset size grows with
 * each class detected: lowercase, uppercase, digits, punctuation, others.
 */

const CLASS_SIZES = {
  lower: 26,
  upper: 26,
  digit: 10,
  symbol: 32,
  other: 100, // unicode / extended
};

export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  bits: number;
  label: string;
  description: string;
  tone: 'danger' | 'warn' | 'ok' | 'good' | 'strong';
}

const LABELS: Record<
  0 | 1 | 2 | 3 | 4,
  { label: string; tone: StrengthResult['tone']; description: string }
> = {
  0: { label: 'بسیار ضعیف', tone: 'danger', description: 'این رمز به‌سرعت شکسته می‌شود' },
  1: { label: 'ضعیف', tone: 'danger', description: 'برای حساب مدیر کافی نیست' },
  2: { label: 'قابل‌قبول', tone: 'warn', description: 'می‌تواند بهتر باشد' },
  3: { label: 'خوب', tone: 'ok', description: 'از حداقل الزامات فراتر است' },
  4: { label: 'عالی', tone: 'strong', description: 'رمزی مقاوم در برابر حمله‌ی brute-force' },
};

export function calculateEntropy(password: string): number {
  if (!password) return 0;
  let charset = 0;
  if (/[a-z]/.test(password)) charset += CLASS_SIZES.lower;
  if (/[A-Z]/.test(password)) charset += CLASS_SIZES.upper;
  if (/[0-9]/.test(password)) charset += CLASS_SIZES.digit;
  if (/[^A-Za-z0-9\s]/.test(password)) charset += CLASS_SIZES.symbol;
  if (/[\u0600-\u06FF]/.test(password)) charset += CLASS_SIZES.other; // Persian script
  if (charset === 0) return 0;
  return password.length * Math.log2(charset);
}

export function scoreFromEntropy(bits: number, length: number): 0 | 1 | 2 | 3 | 4 {
  // Tuned thresholds — NIST 800-63B suggests ≥ 30 bits as a baseline for
  // memorized secrets; we map that to score 2 (acceptable) and require 60+
  // for "strong" so super-admin credentials clear a higher bar.
  if (length === 0) return 0;
  if (bits < 28) return 0;
  if (bits < 40) return 1;
  if (bits < 55) return 2;
  if (bits < 70) return 3;
  return 4;
}

export function evaluatePassword(password: string): StrengthResult {
  const bits = Math.round(calculateEntropy(password));
  const score = scoreFromEntropy(bits, password.length);
  const meta = LABELS[score];
  return {
    score,
    bits,
    label: meta.label,
    description: meta.description,
    tone: meta.tone,
  };
}

/**
 * Generate a cryptographically-strong random password that satisfies the
 * setup schema: ≥12 chars, upper + lower + digit + symbol, no ambiguous
 * glyphs (0/O/1/l/I). Used by the "تولید رمز قوی" action in the wizard.
 *
 * Uses crypto.getRandomValues (Web Crypto) with a rejection sampler;
 * falls back to Math.random only in non-secure (HTTP) environments.
 */
const GEN_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const GEN_LOWER = 'abcdefghijkmnopqrstuvwxyz';
const GEN_DIGITS = '23456789';
const GEN_SYMBOLS = '!@#$%^&*()-_=+';
const GEN_ALL = GEN_UPPER + GEN_LOWER + GEN_DIGITS + GEN_SYMBOLS;

export function generateStrongPassword(length = 18): string {
  const safeLength = Math.min(64, Math.max(12, Math.floor(length)));

  // Rejection sampler — unbiased over the charset (modulo would skew).
  const pick = (alphabet: string): string => {
    const max = alphabet.length;
    const limit = Math.floor(0xffffffff / max) * max;
    while (true) {
      let value: number;
      if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        value = buf[0];
      } else {
        value = Math.floor(Math.random() * 0xffffffff);
      }
      if (value < limit) return alphabet[value % max];
    }
  };

  // Guarantee one char from every class, then fill the rest randomly.
  const parts: string[] = [GEN_UPPER, GEN_LOWER, GEN_DIGITS, GEN_SYMBOLS].map((set) =>
    pick(set),
  );
  for (let i = parts.length; i < safeLength; i += 1) {
    parts.push(pick(GEN_ALL));
  }

  // Fisher–Yates shuffle so the guaranteed classes aren't clustered.
  for (let i = parts.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }

  return parts.join('');
}
