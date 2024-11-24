import type React from 'react';
import WidgetAuthors from '@/components/WidgetAuthors/WidgetAuthors';
import WidgetCategories from '@/components/WidgetCategories/WidgetCategories';
import WidgetPosts from '@/components/WidgetPosts/WidgetPosts';
import WidgetTags from '@/components/WidgetTags/WidgetTags';
import type { PostWithRelations, TaxonomyType, UserWithProfile } from '@/types/types';

export interface SidebarProps {
  className?: string;
  widgetPosts: PostWithRelations[];
  tags: TaxonomyType[];
  categories: TaxonomyType[];
  authors: UserWithProfile[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  className = 'space-y-6',
  widgetPosts,
  tags,
  categories,
  authors,
}) => {
  return (
    <div className={`nc-SingleSidebar ${className}`}>
      <WidgetTags tags={tags} />
      <WidgetCategories categories={categories} />
      <WidgetAuthors authors={authors} />
      <WidgetPosts posts={widgetPosts} />
    </div>
  );
};

export default Sidebar;
