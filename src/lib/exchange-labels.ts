/**
 * lib/exchange-labels.ts
 *
 * Shared label lookup maps for transaction kinds, statuses, KYC levels, etc.
 * یک‌بار تعریف می‌شود — Exchange portal + Customer portal + داشبورد اصلی
 * از اینجا import می‌کنند.
 */

// ─── Transaction kind ─────────────────────────────────────────────────────

export const TX_KIND_FA: Record<string, string> = {
  DEPOSIT: 'واریز',
  WITHDRAWAL: 'برداشت',
  EXCHANGE: 'صرافی',
  TRANSFER: 'انتقال',
  FEE: 'کارمزد',
  SETTLEMENT: 'تسویه',
  ADJUSTMENT: 'تعدیل',
};

/** لیست کلیدهای kind — برای حلقه زدن در aggregate/legend */
export const TX_KINDS = Object.keys(TX_KIND_FA) as Array<keyof typeof TX_KIND_FA>;

/**
 * رنگ‌های CSS token (همه به token ارجاع می‌دهند — هیچ hex اضافه نمی‌شود).
 * برای conic-gradient و dot و legend در داشبورد و جدول تراکنش‌ها استفاده می‌شود.
 */
export const TX_KIND_COLOR: Record<string, string> = {
  DEPOSIT: 'var(--at-accent)',
  WITHDRAWAL: 'var(--at-warning)',
  EXCHANGE: 'var(--at-info)',
  TRANSFER: 'var(--at-violet)',
  FEE: 'var(--at-telegram)',
  SETTLEMENT: 'var(--at-gold)',
  ADJUSTMENT: 'var(--at-fg-muted)',
};

// ─── Transaction status ───────────────────────────────────────────────────

export type TxStatusColor = { label: string; color: string };

export const TX_STATUS_FA: Record<string, TxStatusColor> = {
  COMPLETED: { label: 'تکمیل', color: 'oklch(45% 0.14 145)' },
  PENDING: { label: 'در انتظار', color: 'var(--at-fg-subtle)' },
  PROCESSING: { label: 'در پردازش', color: 'oklch(55% 0.14 250)' },
  FAILED: { label: 'ناموفق', color: 'oklch(50% 0.18 25)' },
  CANCELLED: { label: 'لغو', color: 'var(--at-fg-subtle)' },
  REVERSED: { label: 'برگشت', color: 'oklch(55% 0.14 60)' },
};

/** label ساده بدون رنگ — برای select/filter */
export const TX_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(TX_STATUS_FA).map(([k, v]) => [k, v.label]),
);

// ─── Customer status ──────────────────────────────────────────────────────

export const CUSTOMER_STATUS_FA: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'فعال', cls: 'badgeActive' },
  PROSPECT: { label: 'احتمالی', cls: 'badgePending' },
  FROZEN: { label: 'مسدود', cls: 'badgeSuspended' },
  CLOSED: { label: 'بسته', cls: 'badgeClosed' },
};

/** tone (semantic color) برای segmented bar / chart رنگ‌بندی */
export const CUSTOMER_STATUS_TONE: Record<string, 'emerald' | 'amber' | 'rose' | 'muted'> = {
  ACTIVE: 'emerald',
  PROSPECT: 'amber',
  FROZEN: 'rose',
  CLOSED: 'muted',
};

// ─── KYC level ────────────────────────────────────────────────────────────

export const KYC_LEVEL_FA: Record<string, string> = {
  NONE: 'بدون احراز',
  LEVEL_1: 'سطح ۱',
  LEVEL_2: 'سطح ۲',
  LEVEL_3: 'سطح ۳',
};

export const KYC_STATUS_FA: Record<string, string> = {
  NOT_STARTED: 'شروع نشده',
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تأییدشده',
  REJECTED: 'رد‌شده',
  EXPIRED: 'منقضی',
};

// ─── Staff role ───────────────────────────────────────────────────────────

export const STAFF_ROLE_FA: Record<string, string> = {
  OWNER: 'مالک صرافی',
  MANAGER: 'مدیر',
  STAFF: 'کارمند',
  VIEWER: 'مشاهده‌گر',
};

// ─── Currency list ────────────────────────────────────────────────────────

export const EXCHANGE_CURRENCIES = [
  'AFN',
  'USD',
  'EUR',
  'IRR',
  'AED',
  'GBP',
  'TRY',
  'SAR',
  'PKR',
] as const;

export type ExchangeCurrency = (typeof EXCHANGE_CURRENCIES)[number];
