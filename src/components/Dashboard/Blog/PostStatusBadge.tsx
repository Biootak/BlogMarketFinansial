import Badge from '@/components/Badge/Badge';
import type { TwMainColor } from '@/types/types';
import type { PostStatus } from '@prisma/client';

export interface PostStatusBadgeProps {
  status: PostStatus;
  className?: string;
}

const statusConfig: Record<PostStatus, { color: TwMainColor; name: string }> = {
  PUBLISHED: { color: 'green', name: 'منتشر شده' },
  DRAFT: { color: 'yellow', name: 'پیش‌نویس' },
  PENDING_REVIEW: { color: 'blue', name: 'در انتظار بررسی' },
  SCHEDULED: { color: 'purple', name: 'زمان‌بندی شده' },
};

const PostStatusBadge: React.FC<PostStatusBadgeProps> = ({ status, className }) => {
  const { color, name } = statusConfig[status];

  return <Badge className={className} name={name} color={color} />;
};

export default PostStatusBadge;
