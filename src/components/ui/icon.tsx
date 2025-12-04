import { 
  Loader2,
  Settings,
  Mail,
  Share2,
  Save,
  Users,
  FileText,
  MessageCircle,
  BarChart,
  AlertCircle,
  Bold,
  Italic,
  Underline,
  Code,
  Quote,
  List,
  ListOrdered,
  Link2,
  Link,
  Image,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  Pen,
  Link2Off,
  ChevronDown,
  Text,
  Palette,
  Highlighter,
  type LucideIcon,
  X,
  Share,
  Search,
  Bell,
  Menu,
  Tag,
  TrendingUp,
  Hash,
  Clock,
  Calendar,
  Heart,
  MessageSquare,
  Bookmark,
  Undo,
  Check,
  CheckCheck,
  Copy,
  MoreHorizontal,
} from 'lucide-react';
import { type CSSProperties, memo } from 'react';
import { cn } from '@/lib/utils';

const iconMap = {
  'loader-2': Loader2,
  'settings': Settings,
  'mail': Mail,
  'share-2': Share2,
  'save': Save,
  'users': Users,
  'file-text': FileText,
  'message-circle': MessageCircle,
  'bar-chart': BarChart,
  'alert-circle': AlertCircle,
  'bold': Bold,
  'italic': Italic,
  'underline': Underline,
  'code': Code,
  'quote': Quote,
  'list': List,
  'list-ordered': ListOrdered,
  'link-2': Link2,
  'link': Link,
  'image': Image,
  'heading-1': Heading1,
  'heading-2': Heading2,
  'heading-3': Heading3,
  'heading-4': Heading4,
  'heading-5': Heading5,
  'heading-6': Heading6,
  'align-left': AlignLeft,
  'align-center': AlignCenter,
  'align-right': AlignRight,
  'align-justify': AlignJustify,
  'undo-2': Undo2,
  'redo-2': Redo2,
  'pen': Pen,
  'link-2-off': Link2Off,
  'chevron-down': ChevronDown,
  'text': Text,
  'palette': Palette,
  'highlighter': Highlighter,
  'x': X,
  'Share': Share,
  'Search': Search,
  'Bell': Bell,
  'Menu':Menu,
  'Tag':Tag,
  'TrendingUp': TrendingUp,
  'Hash':Hash,
  'Users':Users,
  'ChevronDown': ChevronDown,
  'Clock': Clock,
  'Calendar': Calendar,
  'Link':Link,
  'Heart':Heart,
  'MessageSquare': MessageSquare,
  'Bookmark': Bookmark,
  'Undo': Undo,
  'Check':Check,
  'CheckCheck': CheckCheck,
  'Copy': Copy,
  'MoreHorizontal': MoreHorizontal,
} as const;

export type IconName = keyof typeof iconMap;

export type IconProps = {
  name: IconName;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
};

export const Icon = memo(({ name, className, strokeWidth, style }: IconProps) => {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent
      style={style}
      className={cn(`lucide lucide-${name}`, className)}
      strokeWidth={strokeWidth || 2}
    />
  );
});

Icon.displayName = 'Icon';
