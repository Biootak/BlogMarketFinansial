import type React from 'react';
import CardCategory2 from '@/components/CardCategory2/CardCategory2';
import Heading from '@/components/Heading/Heading';
import type { TaxonomyType } from '@/types/types';

export interface SectionGridCategoryBoxProps {
  categories: TaxonomyType[];
  headingCenter?: boolean;
  className?: string;
  totalCount: number;
}

const SectionGridCategoryBox: React.FC<SectionGridCategoryBoxProps> = ({
  categories,
  headingCenter = true,
  className = '',
  totalCount,
}) => {
  return (
    <div className={`nc-SectionGridCategoryBox relative ${className}`}>
      <Heading desc={`کشف ${totalCount} موضوع جذاب`} isCenter={headingCenter}>
        محبوب‌ترین موضوعات
      </Heading>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 md:gap-8">
        {categories.map((item, i) => (
          <CardCategory2 index={i < 3 ? `#${i + 1}` : undefined} key={item.id} taxonomy={item} />
        ))}
      </div>
    </div>
  );
};

export default SectionGridCategoryBox;
