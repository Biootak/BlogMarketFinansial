import type {
  ActionResult,
  CustomAdDimensions,
  NcDropDownItem,
  PostWithRelations,
  SocialType,
} from '@/types/types';
import type { Prisma } from '@prisma/client';
import { type ClassValue, clsx } from 'clsx';
import { customAlphabet } from 'nanoid';
import type { Session } from 'next-auth';
import { twMerge } from 'tailwind-merge';

const coinMarketCapUrlMap: { [key: string]: string } = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  LTC: 'litecoin',
  USDT: 'tether',
  XRP: 'xrp',
  BCH: 'bitcoin-cash',
  BNB: 'bnb',
  EOS: 'eos',
  XLM: 'stellar',
  ETC: 'ethereum-classic',
  TRX: 'tron',
  FTM: 'fantom',
  UNI: 'uniswap',
  DAI: 'multi-collateral-dai',
  LINK: 'chainlink',
  DOT: 'polkadot-new',
  AAVE: 'aave',
  ADA: 'cardano',
  MATIC: 'polygon',
  AXS: 'axie-infinity',
  MANA: 'decentraland',
  SAND: 'the-sandbox',
  AVAX: 'avalanche',
  MKR: 'maker',
  ATOM: 'cosmos',
  TON: 'toncoin',
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fa-IR').format(num);
}

export const toPersianNumber = (num: number | string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (x) => persianDigits[Number.parseInt(x)]);
};

export function isBookmarked(post: PostWithRelations, session: Session | null) {
  if (!session?.user?.id || !post.savedBy) return false;
  return post.savedBy.some((save) => save.userId === session.user.id);
}
export function generateColor(str: string): string {
  const colors = ['pink', 'green', 'blue', 'indigo', 'purple'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  return colors[hash % colors.length];
}

export function getInitials(name: string | null): string {
  return name ? name.charAt(0).toUpperCase() : '';
}

export const socialToDropdownItem = (
  social: SocialType,
  onClickHandler: (platform: string) => void,
): NcDropDownItem => ({
  id: social.id,
  name: social.name,
  icon: social.icon,
  onClick: () => onClickHandler(social.id.toLowerCase()),
});

export const generateUniqueId = customAlphabet('1234567890abcdef', 10);

/**
 * normalizeDigits — تبدیل ارقام فارسی/عربی Unicode به ASCII
 *
 * مثال: «۱۴۰۳/۰۶/۱۵» → «1403/06/15»
 * Unicode: فارسی ۰-۹ = U+06F0-U+06F9 ، عربی ۰-۹ = U+0660-U+0669
 *
 * در فرم‌های KYC، beneficiary و هر جا کاربر عدد فارسی وارد می‌کند استفاده شود.
 */
export function normalizeDigits(s: string): string {
  return s.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (c) => String(c.charCodeAt(0) & 0xf));
}

// Pure slug helpers live in `./slug` (client-safe — no DOM sanitizer deps).
export { generateSlug, validateSlug } from './slug';
// biome-ignore lint/suspicious/noExplicitAny: generic variadic function requires any for correct inference
export function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    return new Promise((resolve) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
  };
}

export function getCoinMarketCapUrl(symbol: string): string {
  const urlName = coinMarketCapUrlMap[symbol] || symbol.toLowerCase();
  return `https://coinmarketcap.com/currencies/${urlName}/`;
}

export function isSuccessResult<T>(
  result: ActionResult<T>,
): result is ActionResult<T> & { data: T } {
  return result.success && result.data !== undefined;
}

export function parseCustomDimensions(json: Prisma.JsonValue | null): CustomAdDimensions | null {
  if (!json || typeof json !== 'object') return null;
  return json as CustomAdDimensions;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * زمان نسبی به فارسی (مثل "۲ ساعت پیش"، "۳ روز پیش")
 * برای استفاده در Stats Cockpit و سایر نقاط UI
 */
export function formatRelativeTime(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return 'لحظاتی پیش';
  if (minutes < 60) return `${toPersianNumber(minutes)} دقیقه پیش`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${toPersianNumber(hours)} ساعت پیش`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${toPersianNumber(days)} روز پیش`;

  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${toPersianNumber(weeks)} هفته پیش`;
  }

  // برای تاریخ‌های قدیمی‌تر، تاریخ شمسی کوتاه برگردان
  return new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric' }).format(new Date(date));
}
