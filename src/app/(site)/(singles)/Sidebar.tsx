import WidgetAds from '@/components/WidgetAds/WidgetAds';
import WidgetAuthors from '@/components/WidgetAuthors/WidgetAuthors';
import WidgetCategories from '@/components/WidgetCategories/WidgetCategories';
import WidgetPosts from '@/components/WidgetPosts/WidgetPosts';
import WidgetTags from '@/components/WidgetTags/WidgetTags';
import type {
  Advertisement,
  PostWithRelations,
  TaxonomyType,
  UserWithProfile,
} from '@/types/types';
import type React from 'react';

export interface SidebarProps {
  className?: string;
  widgetPosts: PostWithRelations[];
  tags: TaxonomyType[];
  categories: TaxonomyType[];
  authors: UserWithProfile[];
  ads: Advertisement[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  className = 'space-y-6',
  widgetPosts,
  tags,
  categories,
  ads,
  // authors,
}) => {
  return (
    <div className={`nc-SingleSidebar bg-white ${className}`}>
      <WidgetAds ads={ads} />
      <WidgetCategories categories={categories} />
      {/* <WidgetAuthors authors={authors} /> */}
      <WidgetPosts posts={widgetPosts} />
      <WidgetTags tags={tags} />
    </div>
  );
};

export default Sidebar;
