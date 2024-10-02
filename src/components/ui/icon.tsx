import { icons } from 'lucide-react';
import { type CSSProperties, memo } from 'react';
import { cn } from '../Editor1/lib/utils';

export type IconProps = {
  name: keyof typeof icons;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
};

export const Icon = memo(({ name, className, strokeWidth, style }: IconProps) => {
  const IconComponent = icons[name];

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
