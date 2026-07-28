/**
 * lib/customer-segments.ts
 *
 * Pure helpers for customer segmentation, sorting, and risk bucketing.
 * استفاده در server actions و client components به طور مشترک.
 */

export type SegmentKey = 'ACTIVE' | 'PROSPECT' | 'FROZEN' | 'CLOSED';
export type RiskBucket = 'low' | 'medium' | 'high';

export const STATUS_META: Record<
  SegmentKey,
  { label: string; tone: 'emerald' | 'amber' | 'rose' | 'muted'; description: string }
> = {
  ACTIVE: {
    label: 'فعال',
    tone: 'emerald',
    description: 'مشتریان فعال با دسترسی کامل به خدمات صرافی',
  },
  PROSPECT: {
    label: 'احتمالی',
    tone: 'amber',
    description: 'مشتریان بالقوه که هنوز احراز هویت یا فعال‌سازی کامل ندارند',
  },
  FROZEN: {
    label: 'مسدود',
    tone: 'rose',
    description: 'مشتریان مسدودشده به دلایل امنیتی یا درخواست صراف',
  },
  CLOSED: {
    label: 'بسته',
    tone: 'muted',
    description: 'مشتریانی که حساب خود را بسته‌اند',
  },
};

export const KYC_META: Record<
  string,
  { label: string; tone: 'emerald' | 'amber' | 'rose' | 'muted' | 'sky' | 'violet' }
> = {
  NONE: { label: 'بدون احراز', tone: 'muted' },
  LEVEL_1: { label: 'سطح ۱', tone: 'sky' },
  LEVEL_2: { label: 'سطح ۲', tone: 'violet' },
  LEVEL_3: { label: 'سطح ۳', tone: 'emerald' },
};

export const KYC_STATUS_META: Record<
  string,
  { label: string; tone: 'emerald' | 'amber' | 'rose' | 'muted' | 'sky' }
> = {
  NOT_STARTED: { label: 'شروع نشده', tone: 'muted' },
  PENDING: { label: 'در انتظار', tone: 'amber' },
  APPROVED: { label: 'تأییدشده', tone: 'emerald' },
  REJECTED: { label: 'ردشده', tone: 'rose' },
  EXPIRED: { label: 'منقضی', tone: 'muted' },
};

/**
 * risk score → bucket
 */
export function riskBucket(score: number): RiskBucket {
  if (score > 70) return 'high';
  if (score > 40) return 'medium';
  return 'low';
}

export const RISK_BUCKET_META: Record<
  RiskBucket,
  { label: string; tone: 'emerald' | 'amber' | 'rose' }
> = {
  low: { label: 'کم‌ریسک', tone: 'emerald' },
  medium: { label: 'متوسط', tone: 'amber' },
  high: { label: 'پرریسک', tone: 'rose' },
};

/**
 * سورت چندسطحی برای جدول.
 * سطوح قابل قبول: fullName | phone | city | status | kycLevel | riskScore | createdAt | updatedAt
 */
export type CustomerSortKey =
  | 'fullName'
  | 'phone'
  | 'city'
  | 'status'
  | 'kycLevel'
  | 'riskScore'
  | 'createdAt'
  | 'updatedAt';

export type SortDir = 'asc' | 'desc';

export interface CustomerSort {
  key: CustomerSortKey;
  dir: SortDir;
}

export function compareCustomers<
  T extends {
    fullName: string;
    phone: string;
    city: string | null;
    status: string;
    kycLevel: string;
    riskScore: number;
    createdAt: Date | string;
    updatedAt: Date | string;
  },
>(a: T, b: T, sort: CustomerSort): number {
  const { key, dir } = sort;
  const mul = dir === 'asc' ? 1 : -1;
  switch (key) {
    case 'fullName':
      return mul * a.fullName.localeCompare(b.fullName, 'fa-IR');
    case 'phone':
      return mul * a.phone.localeCompare(b.phone);
    case 'city':
      return mul * (a.city ?? '').localeCompare(b.city ?? '', 'fa-IR');
    case 'status':
      return mul * a.status.localeCompare(b.status);
    case 'kycLevel':
      return mul * a.kycLevel.localeCompare(b.kycLevel);
    case 'riskScore':
      return mul * (a.riskScore - b.riskScore);
    case 'createdAt':
      return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case 'updatedAt':
      return mul * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  }
}

/**
 * لیست سگمنت‌ها برای استفاده در filter pills.
 */
export const STATUS_FILTERS: Array<{ key: SegmentKey | 'all'; label: string }> = [
  { key: 'all', label: 'همه' },
  { key: 'ACTIVE', label: 'فعال' },
  { key: 'PROSPECT', label: 'احتمالی' },
  { key: 'FROZEN', label: 'مسدود' },
  { key: 'CLOSED', label: 'بسته' },
];

/** لیست KYC filter pills. */
export const KYC_FILTERS: Array<{
  key: 'all' | 'NONE' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
  label: string;
}> = [
  { key: 'all', label: 'همه سطوح' },
  { key: 'LEVEL_3', label: 'سطح ۳' },
  { key: 'LEVEL_2', label: 'سطح ۲' },
  { key: 'LEVEL_1', label: 'سطح ۱' },
  { key: 'NONE', label: 'فاقد احراز' },
];
