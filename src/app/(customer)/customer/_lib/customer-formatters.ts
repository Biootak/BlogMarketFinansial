/**
 * Customer UI Shared — formatters، labels، و type guards مشترک پورتال مشتری
 * ----------------------------------------------------------------------------
 * این فایل کاملاً isomorphic است (هم در Server هم در Client قابل استفاده).
 * هیچ DOM dependency ندارد و فقط pure functions + constant maps export می‌کند.
 *
 * الگو: همهٔ page های customer با همین DNA ساخته می‌شوند:
 *   1. SectionHeader  (از CustomerDashboardContent)
 *   2. StatusPill     (status codes)
 *   3. ExecutionRail  (vertical rail)
 *   4. EmptyState     (از primitives)
 */

// ─── Intl singleton instances ────────────────────────────────────────────── //
// ساخت Intl.NumberFormat / Intl.DateTimeFormat در هر فراخوانی هزینه‌بر است.
// این instance ها module-level هستند و یک بار ساخته می‌شوند.

const _numFa = new Intl.NumberFormat('fa-IR');
const _numFaCompact = new Intl.NumberFormat('fa-IR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const _dateFaFull = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const _dateFaShort = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});
const _dateFaTime = new Intl.DateTimeFormat('fa-IR', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const _dateFaTimeFull = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

// ─── Formatters ──────────────────────────────────────────────────────────── //

export function faNum(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isFinite(n)) {
    return _numFa.format(n);
  }
  return String(value);
}

export function faNumCompact(value: number): string {
  return _numFaCompact.format(value);
}

export function faAmount(amount: number, currency: string): string {
  return `${faNum(amount)} ${currency}`;
}

export function faDate(date: string | Date): string {
  return _dateFaFull.format(new Date(date));
}

export function faDateShort(date: string | Date): string {
  return _dateFaShort.format(new Date(date));
}

export function faDateTime(date: string | Date): string {
  return _dateFaTime.format(new Date(date));
}

export function faDateTimeFull(date: string | Date): string {
  return _dateFaTimeFull.format(new Date(date));
}

export function relativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return 'لحظاتی پیش';
  if (min < 60) return `${_numFa.format(min)} دقیقه پیش`;
  if (hr < 24) return `${_numFa.format(hr)} ساعت پیش`;
  if (day < 30) return `${_numFa.format(day)} روز پیش`;
  return faDateShort(date);
}

// ─── Label Maps ─────────────────────────────────────────────────────────── //

export const KIND_LABEL: Record<string, string> = {
  DEPOSIT: 'واریز',
  WITHDRAWAL: 'برداشت',
  TRANSFER: 'انتقال',
  EXCHANGE: 'تبدیل ارز',
  FEE: 'کارمزد',
  SETTLEMENT: 'تسویه',
  ADJUSTMENT: 'اصلاح',
  // Legacy
  CHECKING: 'جاری',
};

export const STATUS_LABEL: Record<string, string> = {
  PENDING: 'در انتظار',
  PROCESSING: 'در حال پردازش',
  COMPLETED: 'انجام شده',
  FAILED: 'ناموفق',
  REVERSED: 'برگشت خورده',
  CANCELLED: 'لغو شده',
  // Account status
  ACTIVE: 'فعال',
  FROZEN: 'منجمد',
  CLOSED: 'بسته',
  // Customer status
  PROSPECT: 'در انتظار فعال‌سازی',
  // KYC
  NOT_STARTED: 'شروع نشده',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
  EXPIRED: 'منقضی',
};

export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  WALLET: 'کیف پول',
  SAVINGS: 'پس‌انداز',
  CHECKING: 'جاری',
  CURRENT: 'جاری',
  INVESTMENT: 'سرمایه‌گذاری',
  ESCROW: 'امانی',
  MERCHANT: 'تجاری',
};

export const KYC_LEVEL_LABEL: Record<string, string> = {
  NONE: 'بدون تأیید',
  LEVEL_1: 'سطح ۱ — مدرک هویتی',
  LEVEL_2: 'سطح ۲ — تأیید چهره',
  LEVEL_3: 'سطح ۳ — کامل',
};

export const DOC_TYPE_LABEL: Record<string, string> = {
  NATIONAL_ID: 'تذکره / کارت ملی',
  PASSPORT: 'پاسپورت',
  RESIDENCE_PERMIT: 'اجازه اقامت',
  SELFIE: 'سلفی (تأیید چهره)',
  ADDRESS_PROOF: 'سند اثبات آدرس',
};

// ─── CSS Key Mappers (برای data-* attribute) ────────────────────────────── //
//
// در CSS module ما از data-{key} استفاده می‌کنیم تا color را به‌صورت
// token-based متصل کنیم. این mapper ها کلید data-* را از business state
// استخراج می‌کنند.
// ─────────────────────────────────────────────────────────────────────────── //

export const ACCOUNT_STATUS_CSSKEY: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success',
  FROZEN: 'warning',
  PENDING: 'neutral',
  CLOSED: 'danger',
};

export const TXN_STATUS_CSSKEY: Record<
  string,
  'pending' | 'progress' | 'success' | 'danger' | 'cancelled'
> = {
  PENDING: 'pending',
  PROCESSING: 'progress',
  COMPLETED: 'success',
  FAILED: 'danger',
  REVERSED: 'danger',
  CANCELLED: 'cancelled',
};

export const KYC_STATUS_CSSKEY: Record<string, 'approved' | 'pending' | 'warning' | 'danger'> = {
  APPROVED: 'approved',
  PENDING: 'pending',
  NOT_STARTED: 'warning',
  REJECTED: 'danger',
  EXPIRED: 'warning',
};

export const CUSTOMER_STATUS_CSSKEY: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> =
  {
    ACTIVE: 'success',
    PROSPECT: 'neutral',
    FROZEN: 'warning',
    CLOSED: 'danger',
  };

export const KIND_CSSKEY: Record<string, 'credit' | 'debit' | 'neutral'> = {
  DEPOSIT: 'credit',
  TRANSFER: 'neutral',
  EXCHANGE: 'neutral',
  WITHDRAWAL: 'debit',
  FEE: 'debit',
  SETTLEMENT: 'neutral',
  ADJUSTMENT: 'neutral',
};

export const KIND_TONE: Record<string, 'credit' | 'debit' | 'neutral'> = {
  DEPOSIT: 'credit',
  TRANSFER: 'credit',
  EXCHANGE: 'neutral',
  WITHDRAWAL: 'debit',
  FEE: 'debit',
  SETTLEMENT: 'neutral',
  ADJUSTMENT: 'neutral',
};

// ─── Type Guards ────────────────────────────────────────────────────────── //

export function isCreditKind(kind: string): boolean {
  return kind === 'DEPOSIT' || kind === 'TRANSFER';
}

export function isDebitKind(kind: string): boolean {
  return kind === 'WITHDRAWAL' || kind === 'FEE';
}

// ─── Filter Options ─────────────────────────────────────────────────────── //

export const TXN_KIND_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'همه نوع‌ها' },
  { value: 'DEPOSIT', label: 'واریز' },
  { value: 'WITHDRAWAL', label: 'برداشت' },
  { value: 'TRANSFER', label: 'انتقال' },
  { value: 'EXCHANGE', label: 'تبدیل ارز' },
  { value: 'FEE', label: 'کارمزد' },
];

export const TXN_STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'PENDING', label: 'در انتظار' },
  { value: 'PROCESSING', label: 'در حال پردازش' },
  { value: 'COMPLETED', label: 'موفق' },
  { value: 'FAILED', label: 'ناموفق' },
  { value: 'CANCELLED', label: 'لغو شده' },
];

export const DOC_TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'NATIONAL_ID', label: 'تذکره / کارت ملی' },
  { value: 'PASSPORT', label: 'پاسپورت' },
  { value: 'RESIDENCE_PERMIT', label: 'اجازه اقامت' },
];
