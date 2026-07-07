// ui/icon.tsx — Inkwell 2026
//
// نکات:
//   1. هر آیکون با نام kebab-case (مثل 'align-left') رجیستر می‌شود.
//      lucide-react بعضی آیکون‌ها را با alias قدیمی دارد؛ aliasهای
//      معادل‌سازی در خود iconMap انجام می‌شود تا call site فقط یک
//      نام بشناسد.
//   2. Premium stroke (1.25) به صورت پیش‌فرض — حس editorial و ظریف.
//      اگر لازم شد، از prop `strokeWidth` می‌توان override کرد.
//   3. RTL safe: آیکون‌هایی که مفهوم جهت‌دار دارند (مثل arrow-left/right)
//      با prop `rtlAware` در RTL mirror می‌شوند؛ خود آیکون بدون تغییر
//      می‌ماند.

import {
  AlertCircle,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  BarChart3,
  Bell,
  BetweenHorizontalStart,
  Bold,
  Bookmark,
  Calendar,
  CaseSensitive,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Code,
  Combine,
  Columns,
  Copy,
  CornerDownLeft,
  CornerDownRight,
  Ellipsis as MoreHorizontalIcon,
  FileText,
  Footprints,
  Globe,
  Hash,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Heart,
  Highlighter,
  Image,
  Italic,
  Languages,
  Link,
  Link2,
  Link2Off,
  List,
  Play,
  Plus,
  ListChecks,
  ListOrdered,
  ListTodo,
  LoaderCircle,
  type LucideIcon,
  Mail,
  Maximize2,
  Menu,
  MessageCircle,
  MessageSquare,
  Minus,
  Minimize2,
  Monitor,
  Pipette,
  Quote,
  Split,
  Redo2,
  Rows2 as Rows,
  Search,
  Settings,
  Settings2,
  Share,
  Share2,
  Sparkles,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Tag,
  Text,
  Trash2,
  TrendingUp,
  Type,
  Underline,
  Undo2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { type CSSProperties, memo } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// iconMap — نقطهٔ واحد برای همهٔ آیکون‌های پروژه
// ---------------------------------------------------------------------------
//
// کلیدها kebab-case هستند؛ نام‌های alias با فرم اصلی یکی می‌شوند.
// اگر icon سفارشی لازم شد، فقط همین‌جا اضافه می‌شود.
//
// چرا mapping‌های v2 تغییر کردن:
//   - font-size/Type و font-family/CaseSensitive: قبلاً هردو Text بودن
//     و از هم تشخیص نبودن. الان Type حس سایز و CaseSensitive حس فونت می‌ده.
//   - arrow-* → Chevron-* در toolbar جدول: Chevron ظریف‌تره و hierarchy
//     در 16px بهتر می‌خونه.
//   - indent/outdent → CornerDownRight/Left: IndentIncrease در RTL معنای
//     معکوس می‌داد. CornerDown خنثی‌تر و direction-agnosticه.
//   - merge → Combine: حس flow diagram قبلی با table-merge سازگار نبود.
//   - palette → Pipette: Palette حس paint می‌داد؛ برای text color پیپت
//     حرفه‌ای‌تره.
//   - loader-2 → LoaderCircle: Loader2 چرخش ناپایدار داشت، LoaderCircle
//     نرم‌تره.

const iconMap = {
  // ─── System / app-wide
  'loader-2': LoaderCircle,
  settings: Settings,
  'settings-2': Settings2,
  mail: Mail,
  'share-2': Share2,
  share: Share,
  'file-text': FileText,
  'message-circle': MessageCircle,
  'bar-chart': BarChart3,
  'alert-circle': AlertCircle,
  bookmark: Bookmark,
  search: Search,
  bell: Bell,
  menu: Menu,
  tag: Tag,
  'trending-up': TrendingUp,
  hash: Hash,
  clock: Clock,
  calendar: Calendar,
  heart: Heart,
  'message-square': MessageSquare,
  copy: Copy,
  'more-horizontal': MoreHorizontalIcon,
  'check-check': CheckCheck,
  check: Check,
  x: X,
  languages: Languages,
  sparkles: Sparkles,
  monitor: Monitor,
  globe: Globe,
  columns: Columns,
  rows: Rows,
  'maximize-2': Maximize2,
  'minimize-2': Minimize2,

  // ─── Actions & UI
  plus: Plus,

  // ─── Uppercase aliases برای backward compatibility
  // فایل‌های قدیمی‌تر (SingleMetaAction2، NcBookmark، code-block،
  // color-picker، ...) هنوز از PascalCase استفاده می‌کنند. این
  // aliases موقت هستند؛ بهتر است در آینده refactor شوند.
  Link: Link,
  Share: Share,
  Check: Check,
  CheckCheck: CheckCheck,
  Copy: Copy,
  Undo: Undo2,
  Bookmark: Bookmark,
  MessageSquare: MessageSquare,
  Heart: Heart,
  Hash: Hash,
  Users: Users,
  ChevronDown: ChevronDown,
  Tag: Tag,
  TrendingUp: TrendingUp,
  MoreHorizontal: MoreHorizontalIcon,
  'chevron-down': ChevronDown,

  // ─── Inline marks (lucide رسمی؛ stroke=1.25 با path پیش‌فرض هماهنگه)
  bold: Bold,
  italic: Italic,
  underline: Underline,
  strikethrough: Strikethrough,
  code: Code,
  quote: Quote,

  // ─── Horizontal rule / separator
  'horizontal-rule': Minus,
  minus: Minus,

  // ─── Blocks & headings
  text: Text,
  paragraph: Text,
  'heading-1': Heading1,
  'heading-2': Heading2,
  'heading-3': Heading3,
  'heading-4': Heading4,
  'heading-5': Heading5,
  'heading-6': Heading6,
  'list-toc': List,

  // ─── Lists
  list: List,
  'bulleted-list': List,
  'list-ordered': ListOrdered,
  'ordered-list': ListOrdered,
  'list-checks': ListChecks,
  'list-todo': ListTodo,
  'task-list': ListTodo,
  indent: CornerDownRight,
  outdent: CornerDownLeft,

  // ─── Alignment
  'align-left': AlignLeft,
  'align-center': AlignCenter,
  'align-right': AlignRight,
  'align-justify': AlignJustify,

  // ─── History
  undo: Undo2,
  'undo-2': Undo2,
  redo: Redo2,
  'redo-2': Redo2,

  // ─── Links & media
  link: Link,
  'link-2': Link2,
  'link-2-off': Link2Off,
  image: Image,

  // ─── Color / highlight
  palette: Pipette,
  highlighter: Highlighter,

  // ─── Misc editor
  'page-break': BetweenHorizontalStart,
  footnote: Footprints,
  type: Text,
  'font-family': CaseSensitive,
  'font-size': Type,
  upload: Upload,

  // ─── Inline math
  superscript: Superscript,
  subscript: Subscript,

  // ─── Table / cell manipulation
  table: Table,
  trash: Trash2,
  'trash-2': Trash2,
  merge: Combine,
  split: Split,

  // ─── Media
  play: Play,

  // ─── Arrows (برای table-toolbar و floating menu)
  'arrow-up': ChevronUp,
  'arrow-down': ChevronDown,
  'arrow-left': ChevronLeft,
  'arrow-right': ChevronRight,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof iconMap;

export type IconProps = {
  name: IconName;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
  /**
   * اندازهٔ آیکون بر حسب px.
   * پیش‌فرض 16 — هماهنگ با دکمه‌های 32px تولبار.
   */
  size?: number;
  /**
   * اگر `true`، آیکون در RTL به صورت افقی mirror می‌شود.
   * برای آیکون‌های جهت‌دار مثل arrow-left/right، indent/outdent.
   */
  rtlAware?: boolean;
};

/**
 * Icon — تنها entry point برای همهٔ آیکون‌های پروژه.
 *
 * ```tsx
 * <Icon name="bold" size={16} />
 * ```
 *
 * نکتهٔ RTL: آیکون‌ها خودشان mirror نمی‌شوند؛ اگر call site نیاز به
 * mirror دارد، از `rtlAware` استفاده می‌کند.
 */
export const Icon = memo(
  ({ name, className, strokeWidth, style, size = 16, rtlAware }: IconProps) => {
    const IconComponent = iconMap[name];

    if (!IconComponent) {
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`[Icon] Unknown icon name "${name}"`);
      }
      return null;
    }

    const premiumStroke = strokeWidth ?? 1.25;
    const direction =
      typeof document !== 'undefined' && rtlAware ? document.documentElement.dir || 'ltr' : 'ltr';

    const wrapperStyle: CSSProperties = {
      ...style,
      ...(rtlAware && direction === 'rtl' ? { transform: 'scaleX(-1)' } : {}),
    };

    return (
      <IconComponent
        style={wrapperStyle}
        className={cn(`lucide lucide-${name}`, className)}
        strokeWidth={premiumStroke}
        size={size}
      />
    );
  },
);

Icon.displayName = 'Icon';

// ---------------------------------------------------------------------------
// Deprecated aliases: نگه‌داری برای سازگاری با call-siteهای قدیمی.
// در پایان migration می‌توان این بخش را حذف کرد.
// ---------------------------------------------------------------------------

/**
 * @deprecated از `<Icon name="...">` استفاده کنید.
 * برای جلوگیری از تغییر همهٔ call siteها در یک PR، این تابع نگه داشته
 * شده ولی در code review به‌زودی حذف می‌شود.
 */
export function getLegacyIconImport(name: string): LucideIcon | undefined {
  return (iconMap as Record<string, LucideIcon>)[name];
}
