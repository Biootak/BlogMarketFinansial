import type {
  ActionResult,
  CustomAdDimensions,
  NcDropDownItem,
  PostWithRelations,
  SocialType,
} from '@/types/types';
import type { Prisma } from '@prisma/client';
import type { JSONContent } from '@tiptap/core';
import { type ClassValue, clsx } from 'clsx';
// 2026-08: dompurify → isomorphic-dompurify. DOMPurify's plain `dompurify`
// build is browser-only (its Node export is a factory without `.sanitize`),
// so `sanitizeHtml()`/`sanitizeRenderedBody()` — called from the Server
// Component EditorContentHTML — crashed with "DOMPurify.sanitize is not a
// function" on every legacy raw-HTML post. `isomorphic-dompurify` wraps
// DOMPurify + jsdom and exposes the same `.sanitize` API in both runtimes.
import DOMPurify from 'isomorphic-dompurify';
import { customAlphabet } from 'nanoid';
import type { Session } from 'next-auth';
import { twMerge } from 'tailwind-merge';
import { persianToEnglishDictionary } from './persian-dictionary';

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

// نویسه‌گردانی فارسی به انگلیسی (Transliteration) - برای کلماتی که در دیکشنری نیستند
const persianToEnglishMap: Record<string, string> = {
  ا: 'a',
  آ: 'a',
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
  و: 'o',
  ه: 'h',
  ی: 'i',
  ي: 'i',
  ئ: 'i',
  ء: '',
  ة: 'h',
  ؤ: 'o',
  إ: 'e',
  أ: 'a',
  ـ: '',
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

// تبدیل یک کلمه فارسی به انگلیسی
const translateWord = (word: string): string => {
  const normalized = word.trim();
  // اول چک کن در دیکشنری هست یا نه
  if (persianToEnglishDictionary[normalized]) {
    return persianToEnglishDictionary[normalized];
  }
  // اگر نبود، نویسه‌گردانی کن
  let result = '';
  for (const char of normalized) {
    if (persianToEnglishMap[char] !== undefined) {
      result += persianToEnglishMap[char];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result += char.toLowerCase();
    }
  }
  return result;
};

export const generateSlug = (title: string): string => {
  // جدا کردن کلمات با فاصله و نیم‌فاصله
  const words = title.split(/[\s\u200C]+/).filter((w) => w.length > 0);

  // ترجمه هر کلمه
  const translatedWords = words.map(translateWord).filter((w) => w.length > 0);

  // اتصال کلمات با خط فاصله
  let slug = translatedWords.join('-');

  // حذف کاراکترهای غیرمجاز
  slug = slug.replace(/[^a-z0-9-]/g, '');

  // حذف خط فاصله‌های تکراری
  slug = slug.replace(/-+/g, '-');

  // حذف خط فاصله از ابتدا و انتها
  slug = slug.replace(/^-+|-+$/g, '');

  // اطمینان از اینکه اسلاگ با عدد شروع نمی‌شود
  if (/^[0-9]/.test(slug)) {
    slug = `post-${slug}`;
  }

  // محدود کردن طول اسلاگ به 100 کاراکتر
  if (slug.length > 100) {
    slug = slug.slice(0, 100).replace(/-[^-]*$/, '');
  }

  return slug || 'untitled';
};

export function validateSlug(slug: string): boolean {
  // این الگو اجازه می‌دهد اسلاگ با حروف کوچک، اعداد، و خط فاصله شروع شود
  // و می‌تواند شامل خط فاصله در میان کلمات باشد، اما نباید با خط فاصله تمام شود
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

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

const FORBIDDEN_EVENT_ATTRS = [
  'onabort',
  'onactivate',
  'onafterprint',
  'onafterscriptexecute',
  'onanimationcancel',
  'onanimationend',
  'onanimationiteration',
  'onanimationstart',
  'onauxclick',
  'onbeforeactivate',
  'onbeforecopy',
  'onbeforecut',
  'onbeforedeactivate',
  'onbeforepaste',
  'onbeforeprint',
  'onbeforescriptexecute',
  'onbeforeunload',
  'onbegin',
  'onblur',
  'onbounce',
  'oncanplay',
  'oncanplaythrough',
  'onchange',
  'onclick',
  'onclose',
  'oncontextmenu',
  'oncopy',
  'oncuechange',
  'oncut',
  'ondblclick',
  'ondeactivate',
  'ondrag',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondragstart',
  'ondrop',
  'ondurationchange',
  'onemptied',
  'onend',
  'onended',
  'onerror',
  'onfocus',
  'onfocusin',
  'onfocusout',
  'onformchange',
  'onformdata',
  'onfullscreenchange',
  'onfullscreenerror',
  'ongesturechange',
  'ongestureend',
  'ongesturestart',
  'ongotpointercapture',
  'onhashchange',
  'oninput',
  'oninvalid',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onload',
  'onloadeddata',
  'onloadedmetadata',
  'onloadend',
  'onloadstart',
  'onlostpointercapture',
  'onmessage',
  'onmousedown',
  'onmouseenter',
  'onmouseleave',
  'onmousemove',
  'onmouseout',
  'onmouseover',
  'onmouseup',
  'onmousewheel',
  'onoffline',
  'ononline',
  'onpagehide',
  'onpageshow',
  'onpaste',
  'onpause',
  'onplay',
  'onplaying',
  'onpointercancel',
  'onpointerdown',
  'onpointerenter',
  'onpointerleave',
  'onpointermove',
  'onpointerout',
  'onpointerover',
  'onpointerup',
  'onpopstate',
  'onprogress',
  'onratechange',
  'onreadystatechange',
  'onrepeat',
  'onreset',
  'onresize',
  'onscroll',
  'onsearch',
  'onseeked',
  'onseeking',
  'onselect',
  'onselectionchange',
  'onselectstart',
  'onshow',
  'onstalled',
  'onstorage',
  'onsubmit',
  'onsuspend',
  'ontimeupdate',
  'ontoggle',
  'ontouchcancel',
  'ontouchend',
  'ontouchmove',
  'ontouchstart',
  'ontransitioncancel',
  'ontransitionend',
  'ontransitionrun',
  'ontransitionstart',
  'onunload',
  'onvolumechange',
  'onwaiting',
  'onwheel',
];

// 2026-08: DOMPurify's default DATA_URI_TAGS bypass allows `data:` URIs on
// img/video/audio/source src — the ALLOWED_URI_REGEXP never sees them. For a
// strict production policy we strip every URI-bearing attribute whose value
// starts with `data:` (OWASP: treat data:/javascript:/vbscript: as unsafe
// unless explicitly required — this renderer never needs data:). Hooks must be
// registered on the instance (config-level hook keys are ignored).
const DATA_URI_ATTRS = ['src', 'href', 'poster', 'xlink:href', 'formaction', 'background'] as const;
DOMPurify.addHook('beforeSanitizeAttributes', (node) => {
  for (const attr of DATA_URI_ATTRS) {
    const v = node.getAttribute?.(attr);
    // 2026-08: scheme match must be case-insensitive — HTML URL schemes are
    // case-insensitive, so `DATA:text/html` would bypass a lowercase check.
    if (v && /^data:/i.test(v.trim())) {
      node.removeAttribute(attr);
    }
  }
});

function buildSanitizeOptions(allowDataAttrs: boolean) {
  return {
    ALLOWED_TAGS: [
      // Text formatting
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'mark',
      'sub',
      'sup',
      'span',
      // Headings
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      // Lists
      'ol',
      'ul',
      'li',
      // Links & Media
      'a',
      'img',
      'figure',
      'figcaption',
      'video',
      'audio',
      'source',
      // Tables
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'caption',
      'colgroup',
      'col',
      // Code
      'pre',
      'code',
      'kbd',
      'samp',
      // Quotes & Blocks
      'blockquote',
      'q',
      'cite',
      'hr',
      'div',
      // Details
      'details',
      'summary',
    ],
    ALLOWED_ATTR: [
      'href',
      'target',
      'rel',
      'src',
      'alt',
      'title',
      'class',
      'id',
      'width',
      'height',
      'colspan',
      'rowspan',
      'scope',
      'headers',
      'controls',
      'autoplay',
      'loop',
      'muted',
      'poster',
      'dir',
      'lang',
      'start',
      'type',
      'value',
    ],
    ALLOW_DATA_ATTR: allowDataAttrs,
    FORBID_ATTR: ['style', ...FORBIDDEN_EVENT_ATTRS],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  };
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, buildSanitizeOptions(false));
}

/**
 * Sanitize a server-serialized rich body (Tiptap `generateHTML` output).
 *
 * Unlike `sanitizeHtml`, data-* attributes are preserved — the renderer
 * legitimately emits `data-mention`, `data-label`, `data-type`, `data-callout`,
 * `data-embed`, `data-latex`, `data-checked`, … for interactive extensions.
 * Everything else stays locked down: only the allowlisted tags/attrs survive,
 * `style` and all event handlers are stripped, and `href`/`src` must match the
 * safe-URI allowlist (http/https/mailto/tel/relative) — `javascript:`,
 * `data:text/html`, `vbscript:` etc. are dropped at the output boundary.
 *
 * 2026-08 (OWASP XSS Prevention / DOMPurify allowlist practice): stored post
 * content is JSON served by the API — it must be scrubbed where it is
 * rendered, not trusted because the editor UI validates schemes.
 */
export function sanitizeRenderedBody(html: string): string {
  return DOMPurify.sanitize(html, buildSanitizeOptions(true));
}

export function htmlToEditorContent(html: string): JSONContent {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function parseNode(node: Node): JSONContent | JSONContent[] {
    if (node.nodeType === Node.TEXT_NODE) {
      return { type: 'text', text: node.textContent || '' };
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const content: JSONContent[] = [];

      for (const child of Array.from(element.childNodes)) {
        const parsed = parseNode(child);
        if (Array.isArray(parsed)) {
          content.push(...parsed);
        } else {
          content.push(parsed);
        }
      }

      switch (element.tagName.toLowerCase()) {
        case 'p':
          return { type: 'paragraph', content };
        case 'h1':
          return { type: 'heading', attrs: { level: 1 }, content };
        case 'h2':
          return { type: 'heading', attrs: { level: 2 }, content };
        case 'h3':
          return { type: 'heading', attrs: { level: 3 }, content };
        case 'h4':
          return { type: 'heading', attrs: { level: 4 }, content };
        case 'h5':
          return { type: 'heading', attrs: { level: 5 }, content };
        case 'h6':
          return { type: 'heading', attrs: { level: 6 }, content };
        case 'strong':
        case 'b':
          return { type: 'bold', content };
        case 'em':
        case 'i':
          return { type: 'italic', content };
        case 'u':
          return { type: 'underline', content };
        case 's':
        case 'strike':
          return { type: 'strike', content };
        case 'code':
          return { type: 'code', content };
        case 'a':
          return {
            type: 'link',
            attrs: {
              href: element.getAttribute('href') || '',
              target: element.getAttribute('target') || '_blank',
              rel: element.getAttribute('rel') || 'noopener noreferrer',
            },
            content,
          };
        case 'img':
          return {
            type: 'image',
            attrs: {
              src: element.getAttribute('src') || '',
              alt: element.getAttribute('alt') || '',
              title: element.getAttribute('title') || '',
              width: element.getAttribute('width') || null,
              height: element.getAttribute('height') || null,
            },
          };
        case 'blockquote':
          return { type: 'blockquote', content };
        case 'pre':
          return { type: 'codeBlock', content };
        case 'ul':
          return { type: 'bulletList', content };
        case 'ol':
          return { type: 'orderedList', content };
        case 'li':
          return { type: 'listItem', content };
        case 'hr':
          return { type: 'horizontalRule' };
        case 'br':
          return { type: 'hardBreak' };
        case 'table':
          return { type: 'table', content: parseTableContent(element) };
        case 'figure':
          return parseFigure(element);
        case 'div':
          // Check for special classes or data attributes
          if (element.classList.contains('math')) {
            return {
              type: 'math',
              attrs: { tex: element.textContent || '' },
            };
          }
          // For other divs, fall through to wrap content in a paragraph
          return content;
        default:
          // For unknown elements, we'll wrap the content in a paragraph
          return content;
      }
    }

    return { type: 'paragraph', content: [] };
  }

  function parseTableContent(tableElement: Element): JSONContent[] {
    const rows: JSONContent[] = [];
    for (const row of Array.from(tableElement.querySelectorAll('tr'))) {
      const cells: JSONContent[] = [];
      for (const cell of Array.from(row.querySelectorAll('td, th'))) {
        cells.push({
          type: cell.tagName.toLowerCase() === 'th' ? 'tableHeader' : 'tableCell',
          content: parseNode(cell) as JSONContent[],
        });
      }
      rows.push({ type: 'tableRow', content: cells });
    }
    return rows;
  }

  function parseFigure(figureElement: Element): JSONContent {
    const img = figureElement.querySelector('img');
    const caption = figureElement.querySelector('figcaption');
    return {
      type: 'figure',
      content: [
        {
          type: 'image',
          attrs: {
            src: img?.getAttribute('src') || '',
            alt: img?.getAttribute('alt') || '',
            title: img?.getAttribute('title') || '',
            width: img?.getAttribute('width') || null,
            height: img?.getAttribute('height') || null,
          },
        },
        ...(caption
          ? [{ type: 'paragraph', content: [{ type: 'text', text: caption.textContent || '' }] }]
          : []),
      ],
    };
  }

  const content = Array.from(doc.body.childNodes).flatMap((node) => parseNode(node));
  return { type: 'doc', content };
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
