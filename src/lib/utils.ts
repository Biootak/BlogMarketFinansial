import type { NcDropDownItem, PostWithRelations, Role, SocialType } from '@/types/types';
import { type ClassValue, clsx } from 'clsx';
import type { Session } from 'next-auth';
import { twMerge } from 'tailwind-merge';
import { auth } from '../auth';
import { redirect } from 'next/navigation';
import slugify from 'slugify';
import { digitsEnToFa, digitsFaToEn, numberToWords } from '@persian-tools/persian-tools';
import { customAlphabet } from 'nanoid';

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

export async function checkRole(requiredRoles: Role[]) {
  const session = await auth();
  if (!session || !requiredRoles.includes(session.user.role as Role)) {
    redirect('/unauthorized');
  }
  return session;
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

export const transliteratePersian = (text: string): string => {
  const transliterationMap: { [key: string]: string } = {
    آ: 'a',
    ا: 'a',
    ب: 'b',
    پ: 'p',
    ت: 't',
    ث: 's',
    ج: 'j',
    چ: 'ch',
    ح: 'h',
    خ: 'kh',
    د: 'd',
    ذ: 'z',
    ر: 'r',
    ز: 'z',
    ژ: 'zh',
    س: 's',
    ش: 'sh',
    ص: 's',
    ض: 'z',
    ط: 't',
    ظ: 'z',
    ع: 'a',
    غ: 'gh',
    ف: 'f',
    ق: 'gh',
    ک: 'k',
    گ: 'g',
    ل: 'l',
    م: 'm',
    ن: 'n',
    و: 'v',
    ه: 'h',
    ی: 'y',
    ئ: 'y',
  };

  return text
    .split('')
    .map((char) => transliterationMap[char] || char)
    .join('')
    .replace(/\s+/g, '-') // تبدیل فاصله به خط تیره
    .replace(/[^a-z0-9-]/gi, '') // حذف کاراکترهای غیرمجاز
    .toLowerCase();
};

export const generateUniqueId = customAlphabet('1234567890abcdef', 10);

export const generateSlug = (title: string, id?: string): string => {
  const transliteratedTitle = transliteratePersian(title);
  let slug = slugify(transliteratedTitle, {
    replacement: '-',
    remove: /[*+~.()'"!:@]/g,
    lower: true,
    strict: true,
    locale: 'en',
    trim: true,
  });

  // If an ID is provided, append it to the slug
  if (id) {
    slug = `${slug}-${id}`;
  }

  // Limit the total slug length to 100 characters
  return slug.slice(0, 100);
};

export function validateSlug(slug: string): boolean {
  // این الگو اجازه می‌دهد اسلاگ با حروف کوچک، اعداد، و خط فاصله شروع شود
  // و می‌تواند شامل خط فاصله در میان کلمات باشد، اما نباید با خط فاصله تمام شود
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

export function sanitizeSlug(slug: string): string {
  // حذف کاراکترهای غیرمجاز و تبدیل به حروف کوچک
  let sanitized = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  // حذف خط فاصله‌های اضافی
  sanitized = sanitized.replace(/-+/g, '-');
  // حذف خط فاصله از ابتدا و انتهای رشته
  sanitized = sanitized.replace(/^-+|-+$/g, '');
  return sanitized;
}

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
