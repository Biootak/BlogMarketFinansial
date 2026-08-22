// src/lib/order-quote.ts
// ─────────────────────────────────────────────────────────────────────────────
// موتور قیمت‌گذاری لحظه‌ای «ثبت سفارش» — Quote-at-checkout (الگوی Stripe/Wise)
//
// معماری:
//   snapshot بازار (سرای شهزاده، واحد افغانی) → نرخ واقعی ارز
//   + سیاست کارمزد پلتفرم (بر اساس نوع سرویس)
//   = پیش‌فاکتور امضاشده (HMAC-SHA256) با TTL
//
// توکن فقط اعداد و کلیدهای سرویس را حمل می‌کند — هیچ PII. سمت سرور در
// createServiceRequest امضا و انقضا دوباره چک می‌شود؛ کلاینت نمی‌تواند
// نرخ یا کارمزد را دستکاری کند.
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from 'node:crypto';

import { getAuthSecret } from '@/lib/auth-secret';
import { type SnapshotItem, readMarketRatesSnapshot } from '@/lib/market-rates/snapshot-reader';

// ─── سیاست کارمزد (اعداد تجاری پلتفرم — قابل تنظیم در یک نقطه) ────────────── //

/** درصد کارمزد پایه بر اساس نوع سرویس (از مبلغ پایه، به افغانی) */
export const SERVICE_FEE_PERCENT: Record<string, number> = {
  INTERNATIONAL_TRANSFER: 1.0,
  CURRENCY_BUY: 0.8,
  CURRENCY_SELL: 0.8,
  CRYPTO_BUY: 1.5,
  CRYPTO_SELL: 1.5,
  PAYPAL_TRANSFER: 2.0,
  ONLINE_PAYMENT: 2.0,
  TUITION_PAYMENT: 1.5,
  FREELANCE_INCOME: 1.5,
  SOFTWARE_PURCHASE: 2.0,
  GIFT_CARD: 2.5,
  MOBILE_TOPUP: 2.0,
  BILL_PAYMENT: 1.5,
  TRAVEL_TICKET: 1.5,
  OTHER: 2.0,
};

/** کارمزد اضافهٔ درخواست فوری (درصد، روی همان مبلغ پایه) */
export const URGENT_EXTRA_PERCENT = 0.5;

/** مدت اعتبار قفل نرخ (دقیقه) — بعد از آن نرخ تضمینی نیست */
export const ORDER_QUOTE_TTL_MINUTES = 10;

/** ضرب‌الاجل پاسخ اولیه (دقیقه) — برای slaDueAt */
export const SLA_MINUTES = { URGENT: 30, NORMAL: 120 } as const;

// ─── نگاشت ارز → سیمبل snapshot (گروه afghan، واحد افغانی) ────────────────── //

const RATE_SYMBOL_BY_CURRENCY: Record<string, string> = {
  USD: 'SARA_USD',
  EUR: 'SARA_EUR',
  AED: 'SARA_AED',
  GBP: 'SARA_GBP',
  SAR: 'SARA_SAR',
  TRY: 'SARA_TRY',
  CNY: 'SARA_CNY',
  CAD: 'SARA_CAD',
  AUD: 'SARA_AUD',
  CHF: 'SARA_CHF',
  KWD: 'SARA_KWD',
  QAR: 'SARA_QAR',
  BHD: 'SARA_BHD',
  JPY: 'SARA_JPY',
  PKR: 'SARA_PKR',
};

/** سرویس‌هایی که مبلغشان مستقیماً به افغانی است (نرخ ارز نمی‌خواهند) */
const AFN_AMOUNT_SERVICES = new Set(['MOBILE_TOPUP', 'BILL_PAYMENT', 'TRAVEL_TICKET']);

// ─── تایپ‌ها ────────────────────────────────────────────────────────────────── //

export interface OrderQuoteInput {
  serviceType: string;
  amount: string;
  currency: string;
  urgency: 'NORMAL' | 'URGENT';
}

/** جهت محاسبه: مشتری افغانی می‌دهد یا می‌گیرد */
export type QuoteDirection = 'PAY_AFN' | 'RECEIVE_AFN' | 'AFN_ONLY' | 'RATE_UNAVAILABLE';

export interface OrderQuote {
  serviceType: string;
  amount: number;
  currency: string;
  urgency: 'NORMAL' | 'URGENT';
  /** آیا نرخ بازار برای این جفت موجود بود */
  rateAvailable: boolean;
  /** 1 واحد ارز = X افغانی (نرخ فروش بازار برای خرید مشتری) */
  rate: number | null;
  rateSymbol: string | null;
  /** زمان آخرین به‌روزرسانی نرخ در snapshot */
  rateUpdatedAt: string | null;
  direction: QuoteDirection;
  feePercent: number;
  /** کارمزد افغانی (گرد به بالا عدد صحیح افغانی) */
  feeAf: number | null;
  /** مجموع قابل پرداخت مشتری (افغانی) — جهت PAY_AFN / AFN_ONLY */
  totalAf: number | null;
  /** مبلغی که مشتری دریافت می‌کند (افغانی) — جهت RECEIVE_AFN */
  receiveAf: number | null;
  /** معادل افغانی مبلغ پایه (بدون کارمزد) */
  baseAf: number | null;
  ttlSeconds: number;
  expiresAt: string;
  /** توکن امضاشده — در submit بازگردانده می‌شود و سرور تأیید می‌کند */
  token: string;
}

interface QuoteTokenPayload {
  v: 1;
  serviceType: string;
  amount: number;
  currency: string;
  urgency: 'NORMAL' | 'URGENT';
  rate: number | null;
  feePercent: number;
  feeAf: number | null;
  totalAf: number | null;
  receiveAf: number | null;
  baseAf: number | null;
  exp: number; // epoch seconds
}

// ─── امضا / تأیید (HMAC-SHA256) ────────────────────────────────────────────── //

function getSecret(): string {
  // SECURITY-fix (2026-08-22): fallback هاردکد «dev-order-quote-secret» حذف
  // شد. این HMAC تنها سدِ مقابل دستکاری نرخ/کارمزد توسط کلاینت است؛ با کلید
  // عمومیِ داخل سورس، هر کسی می‌توانست توکن quote جعل کند و نرخ/مبلغ دلخواه
  // قفل کند. getAuthSecret در production بدون env fail-closed است و در dev
  // secret پایدار می‌سازد — همان کلیدی که Auth.js خودش استفاده می‌کند.
  return getAuthSecret();
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function signQuote(payload: QuoteTokenPayload): string {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac('sha256', getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyQuoteToken(token: string): QuoteTokenPayload | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = b64url(createHmac('sha256', getSecret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as QuoteTokenPayload;
    if (payload.v !== 1) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── محاسبه ────────────────────────────────────────────────────────────────── //

/** گرد کردن صحیح به بالا عدد صحیح — کارمزد/مجموع هرگز کم‌حساب نشود */
function ceilToAfghan(value: number): number {
  return Math.ceil(value);
}

function parseAmount(raw: string): number | null {
  // ممیز فارسی/عربی + جداکننده هزارگان
  const normalized = raw
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٫،]/g, '.')
    .replace(/,/g, '')
    .trim();
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * نرخ snapshot برای یک ارز (واحد افغانی).
 * buy = بازار از مشتری می‌خرد (مشتری ارز می‌فروشد)
 * sell = بازار به مشتری می‌فروشد (مشتری ارز می‌خرد)
 *
 * FIX (2026-08-22): گیت تازگی snapshot — برخلاف getMarketRates و
 * executeFxTrade که max-age چک می‌کنند، این‌جا snapshot با هر سنی پذیرفته
 * می‌شد؛ outage طولانی cron یعنی سفارش‌ها با نرخ چند-روزه قفل می‌شدند.
 * TTL توکن هم از لحظهٔ محاسبه شروع می‌شود نه لحظهٔ نرخ — پس stale-check در
 * همین نقطه الزامی است. null = UI به جریان «کارشناس نرخ را قفل می‌کند»
 * برمی‌گردد.
 */
const QUOTE_SNAPSHOT_MAX_AGE_MS = 10 * 60 * 1000; // ۱۰ دقیقه — هم‌راستا با SNAPSHOT_MAX_AGE_MS

export async function findMarketRate(currency: string): Promise<{
  buy: number;
  sell: number;
  symbol: string;
  updatedAt: string;
  changePercent: number;
} | null> {
  const symbol = RATE_SYMBOL_BY_CURRENCY[currency.toUpperCase()];
  if (!symbol) return null;
  const snapshot = await readMarketRatesSnapshot();
  if (!snapshot) return null;
  const ageMs = snapshot.generatedAt
    ? Date.now() - snapshot.generatedAt.getTime()
    : Number.POSITIVE_INFINITY;
  if (ageMs > QUOTE_SNAPSHOT_MAX_AGE_MS) return null;
  const item: SnapshotItem | undefined = snapshot.items.find((i) => i.symbol === symbol);
  if (!item || item.unit !== 'afn') return null;
  const sell = item.sellValue ?? item.value;
  const buy = item.buyValue ?? item.value;
  if (!Number.isFinite(sell) || sell <= 0) return null;
  return {
    buy,
    sell,
    symbol,
    updatedAt: item.updatedAt,
    changePercent: Number.isFinite(item.changePercent) ? item.changePercent : 0,
  };
}

/** خدمات «فروش» از دید مشتری — مشتری ارز می‌دهد و افغانی می‌گیرد */
const CUSTOMER_SELL_SERVICES = new Set(['CURRENCY_SELL', 'CRYPTO_SELL', 'FREELANCE_INCOME']);

/**
 * ساخت پیش‌فاکتور لحظه‌ای. هرگز throw نمی‌کند — نرخ نبود → rateAvailable:false
 * و UI مسیر «قفل نرخ توسط کارشناس» را نشان می‌دهد (صادقانه، بدون عدد ساختگی).
 */
export async function computeOrderQuote(input: OrderQuoteInput): Promise<OrderQuote | null> {
  const amount = parseAmount(input.amount);
  if (amount === null || amount > 1_000_000_000) return null;

  const feePercent =
    (SERVICE_FEE_PERCENT[input.serviceType] ?? SERVICE_FEE_PERCENT.OTHER) +
    (input.urgency === 'URGENT' ? URGENT_EXTRA_PERCENT : 0);

  const ttlSeconds = ORDER_QUOTE_TTL_MINUTES * 60;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;

  let direction: QuoteDirection;
  let rate: number | null = null;
  let rateSymbol: string | null = null;
  let rateUpdatedAt: string | null = null;
  let baseAf: number | null = null;
  let feeAf: number | null = null;
  let totalAf: number | null = null;
  let receiveAf: number | null = null;

  if (input.currency.toUpperCase() === 'AFN' || AFN_AMOUNT_SERVICES.has(input.serviceType)) {
    // مبلغ پایه خودش افغانی است — فقط کارمزد
    direction = 'AFN_ONLY';
    baseAf = amount;
    feeAf = ceilToAfghan((amount * feePercent) / 100);
    totalAf = amount + feeAf;
  } else {
    const market = await findMarketRate(input.currency);
    if (market) {
      rateSymbol = market.symbol;
      rateUpdatedAt = market.updatedAt;
      rate = CUSTOMER_SELL_SERVICES.has(input.serviceType) ? market.buy : market.sell;
      baseAf = Math.round(amount * rate);
      feeAf = ceilToAfghan((baseAf * feePercent) / 100);
      if (CUSTOMER_SELL_SERVICES.has(input.serviceType)) {
        direction = 'RECEIVE_AFN';
        receiveAf = Math.max(baseAf - feeAf, 0);
      } else {
        direction = 'PAY_AFN';
        totalAf = baseAf + feeAf;
      }
    } else {
      // کریپتو / ارزهای بدون نرخ افغانی — نرخ توسط کارشناس قفل می‌شود
      direction = 'RATE_UNAVAILABLE';
    }
  }

  const payload: QuoteTokenPayload = {
    v: 1,
    serviceType: input.serviceType,
    amount,
    currency: input.currency.toUpperCase() === 'AFN' ? 'AFN' : input.currency.toUpperCase(),
    urgency: input.urgency,
    rate,
    feePercent,
    feeAf,
    totalAf,
    receiveAf,
    baseAf,
    exp,
  };

  return {
    serviceType: input.serviceType,
    amount,
    currency: payload.currency,
    urgency: input.urgency,
    rateAvailable: direction !== 'RATE_UNAVAILABLE',
    rate,
    rateSymbol,
    rateUpdatedAt,
    direction,
    feePercent,
    feeAf,
    totalAf,
    receiveAf,
    baseAf,
    ttlSeconds,
    expiresAt: new Date(exp * 1000).toISOString(),
    token: signQuote(payload),
  };
}
