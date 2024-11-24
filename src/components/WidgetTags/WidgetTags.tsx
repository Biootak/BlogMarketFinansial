import type React from 'react';
import Tag from '@/components/Tag/Tag';
import WidgetHeading1 from '@/components/WidgetHeading1/WidgetHeading1';
import type { TaxonomyType } from '@/types/types';

export interface WidgetTagsProps {
  className?: string;
  tags: TaxonomyType[];
}

const WidgetTags: React.FC<WidgetTagsProps> = ({
  className = 'bg-neutral-100 dark:bg-neutral-800',
  tags,
}) => {
  return (
    <div className={`nc-WidgetTags rounded-3xl overflow-hidden ${className}`}>
      <WidgetHeading1 title="💡 More tags" viewAll={{ label: 'View all', href: '/tags' }} />
      <div className="flex flex-wrap p-4 xl:p-5">
        {tags.map((tag) => (
          <Tag className="mr-2 mb-2" key={tag.id} tag={tag} />
        ))}
      </div>
    </div>
  );
};

export default WidgetTags;
