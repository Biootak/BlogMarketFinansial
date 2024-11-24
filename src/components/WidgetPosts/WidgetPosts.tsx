import type React from 'react';
import WidgetHeading1 from '@/components/WidgetHeading1/WidgetHeading1';
import Card3Small from '../Card3Small/Card3Small';
import type { PostWithRelations } from '@/types/types';

export interface WidgetPostsProps {
  className?: string;
  posts: PostWithRelations[];
}

const WidgetPosts: React.FC<WidgetPostsProps> = ({
  className = 'bg-neutral-100 dark:bg-neutral-800',
  posts,
}) => {
  return (
    <div className={`nc-WidgetPosts rounded-3xl overflow-hidden ${className}`}>
      <WidgetHeading1 title="🎯 Popular Posts" viewAll={{ label: 'View all', href: '/blog' }} />
      <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700">
        {posts.map((post) => (
          <Card3Small
            className="p-4 xl:px-5 xl:py-6 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            key={post.id}
            post={post}
          />
        ))}
      </div>
    </div>
  );
};

export default WidgetPosts;
