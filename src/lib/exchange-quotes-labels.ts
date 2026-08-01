/**
 * exchange-quotes-labels.ts — shared labels & helpers for the exchange quotes UI.
 *
 * تک‌منبع واحد برای: کاتالوگ ارزهای پشتیبانی‌شده (هماهنگ با z.enum بک‌اند)،
 * وضعیت‌های quote، واحدها و قالب‌بندی عدد. هیچ hex ثابتی اینجا نیست — همه token.
 */

// ─── Currency catalog (mirror of SUPPORTED_CURRENCIES in actions/exchange-quotes) ──

export interface QuoteCurrencyMeta {
  code: string;
  name: string;
  pair: string;
  /** واحد پایهٔ نرخ — afn | toman */
  unit: string;
}

export const QUOTE_CURRENCIES: QuoteCurrencyMeta[] = [
  { code: 'USD', name: 'دلار آمریکا', pair: 'USD/AFN', unit: 'afn' },
  { code: 'EUR', name: 'یورو', pair: 'EUR/AFN', unit: 'afn' },
  { code: 'AED', name: 'درهم امارات', pair: 'AED/AFN', unit: 'afn' },
  { code: 'GBP', name: 'پوند انگلیس', pair: 'GBP/AFN', unit: 'afn' },
  { code: 'AFN', name: 'افغانی', pair: 'AFN/IRR', unit: 'toman' },
  { code: 'TRY', name: 'لیر ترکیه', pair: 'TRY/AFN', unit: 'afn' },
  { code: 'SAR', name: 'ریال عربستان', pair: 'SAR/AFN', unit: 'afn' },
  { code: 'CAD', name: 'دلار کانادا', pair: 'CAD/AFN', unit: 'afn' },
  { code: 'AUD', name: 'دلار استرالیا', pair: 'AUD/AFN', unit: 'afn' },
  { code: 'CHF', name: 'فرانک سوئیس', pair: 'CHF/AFN', unit: 'afn' },
  { code: 'JPY', name: 'ین ژاپن', pair: 'JPY/AFN', unit: 'afn' },
  { code: 'CNY', name: 'یوان چین', pair: 'CNY/AFN', unit: 'afn' },
  { code: 'KWD', name: 'دینار کویت', pair: 'KWD/AFN', unit: 'afn' },
  { code: 'IQD', name: 'دینار عراق', pair: 'IQD/AFN', unit: 'afn' },
  { code: 'RUB', name: 'روبل روسیه', pair: 'RUB/AFN', unit: 'afn' },
] as const;

/** ترتیب اولویت AFN-first — قانون P0 افغانستان */
export function sortCurrenciesMeta(list: QuoteCurrencyMeta[]): QuoteCurrencyMeta[] {
  const rank: Record<string, number> = { AFN: 0, USD: 1, EUR: 2, AED: 3 };
  return [...list].sort((a, b) => (rank[a.code] ?? 99) - (rank[b.code] ?? 99));
}

export const UNIT_FA: Record<string, string> = {
  afn: 'افغانی (AFN)',
  toman: 'تومان (IRR)',
  rial: 'ریال',
  usd: 'دلار (USD)',
};

// ─── Status ──────────────────────────────────────────────────────────────

export type QuoteStatusTone = 'emerald' | 'amber' | 'rose' | 'sky' | 'muted';

export const QUOTE_STATUS_FA: Record<string, { label: string; tone: QuoteStatusTone }> = {
  PENDING: { label: 'در انتظار تایید', tone: 'amber' },
  ACTIVE: { label: 'فعال در سایت', tone: 'emerald' },
  REJECTED: { label: 'رد شده', tone: 'rose' },
  EXPIRED: { label: 'منقضی', tone: 'muted' },
  ARCHIVED: { label: 'آرشیو', tone: 'muted' },
  LOCKED: { label: 'در حال معامله', tone: 'sky' },
};

export const QUOTE_STATUS_KEYS = Object.keys(QUOTE_STATUS_FA) as string[];

// ─── Formatting ──────────────────────────────────────────────────────────

export function quoteNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('fa-IR', { maximumFractionDigits: 4 });
}

export function spreadPct(buy: string | number, sell: string | number): string {
  const b = Number(buy);
  const s = Number(sell);
  if (!Number.isFinite(b) || !Number.isFinite(s) || b <= 0) return '—';
  const pct = ((s - b) / b) * 100;
  return `${pct.toLocaleString('fa-IR', { maximumFractionDigits: 2 })}٪`;
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(date),
  );
}

/** countdown خوانا برای quote فعال — «۲ ساعت ۰۳ دقیقه» */
export function countdownLabel(expiresAt: Date | string, nowMs: number): string {
  const diff = new Date(expiresAt).getTime() - nowMs;
  if (diff <= 0) return 'منقضی';
  const totalMin = Math.ceil(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) return `${Math.floor(h / 24)} روز ${h % 24} ساعت`;
  if (h > 0) return `${h} ساعت ${m} دقیقه`;
  return `${m} دقیقه`;
}
