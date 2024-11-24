import type React from 'react';
import WidgetHeading1 from '@/components/WidgetHeading1/WidgetHeading1';
import Card3Small from '../Card3Small/Card3Small';
import type { PostWithRelations } from '@/types/types';
import { Icon } from '../ui/icon';

export interface WidgetPostsProps {
  className?: string;
  posts: PostWithRelations[];
}

const WidgetPosts: React.FC<WidgetPostsProps> = ({ className = '', posts }) => {
  return (
    <div
      className={`nc-WidgetPosts rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800 ${className}`}
    >
      <WidgetHeading1
        title={
          <span className="flex items-center">
            <Icon name="TrendingUp" className="ml-2" />
            پست‌های محبوب
          </span>
        }
        viewAll={{ label: 'مشاهده همه', href: '/archive' }}
      />
      <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700">
        {posts.map((post) => (
          <Card3Small
            className="p-4 xl:px-5 xl:py-6 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            key={post.id}
            post={post}
          />
        ))}
      </div>
    </div>
  );
};

export default WidgetPosts;
