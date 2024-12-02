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
  type LucideIcon
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
      className={cn('size-5', className)}
      strokeWidth={strokeWidth || 2}
    />
  );
});

Icon.displayName = 'Icon';
