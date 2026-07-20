import Avatar, { type AvatarProps } from '@/components/Avatar/Avatar';
import { cn } from '@/lib/utils';
/**
 * @file AuthorAvatar
 * @description Premium avatar with optional halo, ring, and online dot.
 * Server-renderable. No client JS. Uses the existing <Avatar> primitive
 * for image fetching + initials fallback.
 */
import * as React from 'react';

export type AuthorAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface AuthorAvatarProps extends Omit<AvatarProps, 'sizeClass' | 'containerClassName'> {
  size?: AuthorAvatarSize;
  containerClassName?: string;
  /** use a soft halo behind the avatar (used on hero / feature cards) */
  halo?: boolean;
  /** show the green "online" dot */
  showStatus?: boolean;
  /** override the ring/border around the avatar */
  ringClassName?: string;
}

const SIZE_MAP: Record<AuthorAvatarSize, { avatar: string; dot: string; font: string }> = {
  xs: { avatar: 'h-7 w-7 text-[10px]', dot: 'h-1.5 w-1.5', font: 'text-[10px]' },
  sm: { avatar: 'h-9 w-9 text-xs', dot: 'h-2 w-2', font: 'text-xs' },
  md: { avatar: 'h-12 w-12 text-sm', dot: 'h-2.5 w-2.5', font: 'text-sm' },
  lg: { avatar: 'h-16 w-16 text-base', dot: 'h-2.5 w-2.5', font: 'text-base' },
  xl: { avatar: 'h-20 w-20 sm:h-24 sm:w-24 text-lg', dot: 'h-3 w-3', font: 'text-lg' },
  '2xl': {
    avatar: 'h-28 w-28 sm:h-32 sm:w-32 text-2xl',
    dot: 'h-3.5 w-3.5',
    font: 'text-2xl',
  },
};

const AuthorAvatar = React.forwardRef<HTMLDivElement, AuthorAvatarProps>(function AuthorAvatar(
  {
    size = 'md',
    containerClassName = '',
    halo = false,
    showStatus = false,
    ringClassName = 'ring-2 ring-white/80 dark:ring-neutral-900/80',
    imgUrl,
    userName,
    ...rest
  },
  ref,
) {
  const sizeConfig = SIZE_MAP[size];
  return (
    <div ref={ref} className={cn('relative inline-flex shrink-0', containerClassName)}>
      <div
        className={cn(
          halo && 'author-halo rounded-full p-1',
          !halo && ringClassName,
          'rounded-full',
        )}
      >
        <Avatar
          imgUrl={imgUrl}
          userName={userName}
          sizeClass={cn(sizeConfig.avatar, 'rounded-full')}
          containerClassName={cn('rounded-full overflow-hidden', !halo && ringClassName)}
          fontSize={sizeConfig.font}
          {...rest}
        />
      </div>
      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 end-0 rounded-full ring-2 ring-white dark:ring-neutral-900',
            sizeConfig.dot,
          )}
          style={{ background: 'oklch(70% 0.18 150)' }}
          aria-label="online"
        />
      )}
    </div>
  );
});

export default AuthorAvatar;
