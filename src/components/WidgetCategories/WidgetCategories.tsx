import type React from 'react';
import CardCategory1 from '@/components/CardCategory1/CardCategory1';
import WidgetHeading1 from '@/components/WidgetHeading1/WidgetHeading1';
import type { TaxonomyType } from '@/types/types';
import { Icon } from '../ui/icon';

export interface WidgetCategoriesProps {
  className?: string;
  categories: TaxonomyType[];
}

const WidgetCategories: React.FC<WidgetCategoriesProps> = ({ className = '', categories }) => {
  return (
    <div
      className={`nc-WidgetCategories rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800 ${className}`}
    >
      <WidgetHeading1
        title={
          <span className="flex items-center">
            <Icon name="Hash" className="ml-2" />
            موضوعات پرطرفدار
          </span>
        }
        viewAll={{ label: 'مشاهده همه', href: '/archive' }}
      />
      <div className="flow-root">
        <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700">
          {categories.map((category) => (
            <CardCategory1
              className="p-4 xl:p-5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              key={category.id}
              taxonomy={category}
              size="normal"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WidgetCategories;
