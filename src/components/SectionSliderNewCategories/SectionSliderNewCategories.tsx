import type { FC } from 'react';
import Heading from '@/components/Heading/Heading';
import { getCategories } from '@/actions/categoryActions';
import ClientSideSlider from './ClientSideSlider';
import { Suspense } from 'react';
import Empty from '../Empty';

export interface SectionSliderNewCategoriesProps {
  className?: string;
  heading: string;
  subHeading: string;
  categoryCardType?: 'card2';
  itemPerRow?: 4 | 5;
}

const SectionSliderNewCategories: FC<SectionSliderNewCategoriesProps> = async ({
  heading,
  subHeading,
  className = '',
  itemPerRow = 5,
}) => {
  const result = await getCategories({ limit: 10 });
  const categories = result.success && result.data?.categories ? result.data.categories : [];

  return (
    <section
      className={`nc-SectionSliderNewCategories ${className} p-5 bg-gray-50 dark:bg-gray-800 rounded-xl`}
    >
      <Heading desc={subHeading} isCenter>
        {heading}
      </Heading>
      <Suspense fallback={<LoadingSlider />}>
        {categories.length > 0 ? (
          <ClientSideSlider categories={categories} itemPerRow={itemPerRow} />
        ) : (
          <Empty />
        )}
      </Suspense>
    </section>
  );
};

const LoadingSlider: FC = () => (
  <div className="animate-pulse flex gap-4 overflow-hidden">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="w-1/5 h-32 bg-neutral-300 dark:bg-neutral-700 rounded-lg" />
    ))}
  </div>
);

export default SectionSliderNewCategories;
