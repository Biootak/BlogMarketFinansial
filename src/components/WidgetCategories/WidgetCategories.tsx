import type React from 'react';
import CardCategory1 from '@/components/CardCategory1/CardCategory1';
import WidgetHeading1 from '@/components/WidgetHeading1/WidgetHeading1';
import type { TaxonomyType } from '@/types/types';

export interface WidgetCategoriesProps {
  className?: string;
  categories: TaxonomyType[];
}

const WidgetCategories: React.FC<WidgetCategoriesProps> = ({
  className = 'bg-neutral-100 dark:bg-neutral-800',
  categories,
}) => {
  return (
    <div className={`nc-WidgetCategories rounded-3xl overflow-hidden ${className}`}>
      <WidgetHeading1
        title="✨ Trending topics"
        viewAll={{ label: 'View all', href: '/categories' }}
      />
      <div className="flow-root">
        <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700">
          {categories.map((category) => (
            <CardCategory1
              className="p-4 xl:p-5 hover:bg-neutral-200 dark:hover:bg-neutral-700"
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
