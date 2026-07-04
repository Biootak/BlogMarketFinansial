import { cn } from '@/lib/utils';
import type { PostStatus } from '@prisma/client';

export interface PostStatusBadgeProps {
  status: PostStatus;
  className?: string;
}

// Atelier variant — هم‌خوان با at-badge (hairline + accent soft).
// نگاشت وضعیت‌ها به variant‌های at-badge:
//   - PUBLISHED     → at-badge--published (emerald)
//   - DRAFT         → at-badge--draft (slate)
//   - PENDING_REVIEW → at-badge--pending (amber)
//   - SCHEDULED     → at-badge--scheduled (blue)
const statusConfig: Record<PostStatus, { name: string; variant: 'published' | 'draft' | 'pending' | 'scheduled' }> = {
  PUBLISHED: { name: 'منتشر شده', variant: 'published' },
  DRAFT: { name: 'پیش‌نویس', variant: 'draft' },
  PENDING_REVIEW: { name: 'در انتظار بررسی', variant: 'pending' },
  SCHEDULED: { name: 'زمان‌بندی شده', variant: 'scheduled' },
};

const PostStatusBadge: React.FC<PostStatusBadgeProps> = ({ status, className }) => {
  const { name, variant } = statusConfig[status];

  return (
    <span className={cn('at-badge', `at-badge--${variant}`, className)}>
      {name}
    </span>
  );
};

export default PostStatusBadge;