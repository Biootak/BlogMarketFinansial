import type {
  ActionResult,
  NcDropDownItem,
  PostWithRelations,
  Role,
  SocialType,
} from '@/types/types';
import { type ClassValue, clsx } from 'clsx';
import type { Session } from 'next-auth';
import { twMerge } from 'tailwind-merge';
import { auth } from '../auth';
import { redirect } from 'next/navigation';
import slugify from 'slugify';
import DOMPurify from 'dompurify';
import { customAlphabet } from 'nanoid';
import type { JSONContent } from 'novel';

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

export const generateUniqueId = customAlphabet('1234567890abcdef', 10);

export const generateSlug = (title: string): string => {
  const options: Parameters<typeof slugify>[1] = {
    replacement: '-',
    remove: /[*+~.()'"!:@]/g,
    lower: true,
    strict: true,
    locale: 'en',
    trim: false,
  };

  // حذف کاراکترهای غیر مجاز اضافی
  const safeTitle = title.replace(/[^\w\s-]/g, '');

  // ایجاد اسلاگ با استفاده از slugify
  let slug = slugify(safeTitle, options);

  // اطمینان از اینکه اسلاگ با عدد شروع نمی‌شود
  slug = slug.replace(/^[0-9]+/, '');

  // محدود کردن طول اسلاگ به 100 کاراکتر، با حفظ کلمات کامل و خط فاصله‌های بین آنها
  if (slug.length > 100) {
    slug = `${slug.slice(0, 100).split('-').slice(0, -1).join('-')}-`;
  }

  // حذف خط فاصله‌های اضافی از انتها
  slug = slug.replace(/-+$/, '');

  return slug;
};

export function validateSlug(slug: string): boolean {
  // این الگو اجازه می‌دهد اسلاگ با حروف کوچک، اعداد، و خط فاصله شروع شود
  // و می‌تواند شامل خط فاصله در میان کلمات باشد، اما نباید با خط فاصله تمام شود
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
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

export function isSuccessResult<T>(
  result: ActionResult<T>,
): result is ActionResult<T> & { data: T } {
  return result.success && result.data !== undefined;
}

export function sanitizeHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ol',
      'ul',
      'li',
      'a',
      'img',
    ],
    ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'class', 'width', 'height'],
  });

  const parser = new DOMParser();
  const doc = parser.parseFromString(clean, 'text/html');
  return doc.body.innerHTML;
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

      element.childNodes.forEach((child) => {
        const parsed = parseNode(child);
        if (Array.isArray(parsed)) {
          content.push(...parsed);
        } else {
          content.push(parsed);
        }
      });

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
        // Fallthrough to default case if no special handling
        default:
          // For unknown elements, we'll wrap the content in a paragraph
          return content;
      }
    }

    return { type: 'paragraph', content: [] };
  }

  function parseTableContent(tableElement: Element): JSONContent[] {
    const rows: JSONContent[] = [];
    tableElement.querySelectorAll('tr').forEach((row) => {
      const cells: JSONContent[] = [];
      row.querySelectorAll('td, th').forEach((cell) => {
        cells.push({
          type: cell.tagName.toLowerCase() === 'th' ? 'tableHeader' : 'tableCell',
          content: parseNode(cell) as JSONContent[],
        });
      });
      rows.push({ type: 'tableRow', content: cells });
    });
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


