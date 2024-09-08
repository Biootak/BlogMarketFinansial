import type React from 'react';
import Heading from '@/components/Heading/Heading';
import type { TaxonomyType } from '@/types/types';
import { getCategories } from '@/actions/categoryActions';
import ClientSideSlider from './ClientSideSlider';

export interface SectionSliderNewCategoriesProps {
  className?: string;
  heading: string;
  subHeading: string;
  categoryCardType?: 'card2';
  itemPerRow?: 4 | 5;
}

const SectionSliderNewCategories: React.FC<SectionSliderNewCategoriesProps> = async ({
  heading,
  subHeading,
  className = '',
}) => {
  const result = await getCategories();
  const categories = result.success && result.data?.categories ? result.data.categories : [];

  return (
    <div className={`nc-SectionSliderNewCategories ${className}`}>
      <Heading desc={subHeading} isCenter>
        {heading}
      </Heading>
      <ClientSideSlider categories={categories} itemPerRow={5} />
    </div>
  );
};

export default SectionSliderNewCategories;
