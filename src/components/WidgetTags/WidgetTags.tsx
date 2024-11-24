import type React from 'react';
import Tag from '@/components/Tag/Tag';
import WidgetHeading1 from '@/components/WidgetHeading1/WidgetHeading1';
import type { TaxonomyType } from '@/types/types';
import { Icon } from '../ui/icon';

export interface WidgetTagsProps {
  className?: string;
  tags: TaxonomyType[];
}

const WidgetTags: React.FC<WidgetTagsProps> = ({ className = '', tags }) => {
  return (
    <div
      className={`nc-WidgetTags rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800 ${className}`}
    >
      <WidgetHeading1
        title={
          <span className="flex items-center text-base">
            <Icon name="Tag" className="ml-2" />
            برچسب‌های بیشتر
          </span>
        }
        viewAll={{ label: 'مشاهده همه', href: '/archive' }}
      />
      <div className="flex flex-wrap p-4 xl:p-5">
        {tags.map((tag) => (
          <Tag className="ml-2 mb-2" key={tag.id} tag={tag} />
        ))}
      </div>
    </div>
  );
};

export default WidgetTags;
