import type { FC } from 'react';
import { getCategories } from '@/actions/categoryActions';
import ClientSideSlider from './ClientSideSlider';
import { Suspense } from 'react';
import Empty from '../Empty';
import { Sparkles } from 'lucide-react';

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
      className={`nc-SectionSliderNewCategories ${className} relative overflow-visible`}
    >
      {/* Background with subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/80 via-white to-primary-50/50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 rounded-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_50%)]" />
      
      {/* Content */}
      <div className="relative p-4 sm:p-5 lg:p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-100/80 dark:bg-primary-900/30 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">{subHeading}</span>
          </div>
          <h2 className="text-2xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
            {heading}
          </h2>
          <div className="mt-3 mx-auto w-20 h-1 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full" />
        </div>

        {/* Slider */}
        <Suspense fallback={<LoadingSlider />}>
          {categories.length > 0 ? (
            <ClientSideSlider categories={categories} itemPerRow={itemPerRow} />
          ) : (
            <Empty />
          )}
        </Suspense>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-4 start-4 w-20 h-20 bg-primary-400/10 rounded-full blur-2xl" />
      <div className="absolute bottom-4 end-4 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl" />
    </section>
  );
};

const LoadingSlider: FC = () => (
  <div className="animate-pulse flex gap-4 overflow-hidden">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex-1 min-w-[180px]">
        <div className="bg-neutral-200 dark:bg-neutral-700 rounded-2xl p-6">
          <div className="w-16 h-16 mx-auto bg-neutral-300 dark:bg-neutral-600 rounded-full mb-4" />
          <div className="h-4 bg-neutral-300 dark:bg-neutral-600 rounded w-3/4 mx-auto mb-2" />
          <div className="h-3 bg-neutral-300 dark:bg-neutral-600 rounded w-1/2 mx-auto" />
        </div>
      </div>
    ))}
  </div>
);

export default SectionSliderNewCategories;
