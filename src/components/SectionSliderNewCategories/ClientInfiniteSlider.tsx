'use client';

import type React from 'react';
import { InfiniteSlider } from '../InfiniteSlider';
import CardCategory2 from '@/components/CardCategory2/CardCategory2';
import type { TaxonomyType } from '@/types/types';

interface ClientInfiniteSliderProps {
  categories: TaxonomyType[];
}

const ClientInfiniteSlider: React.FC<ClientInfiniteSliderProps> = ({ categories }) => {
  const renderItem = (item: TaxonomyType, index: number) => {
    const topIndex = index < 3 ? `#${index + 1}` : undefined;
    return <CardCategory2 taxonomy={item} index={topIndex} />;
  };

  return (
    <InfiniteSlider
      items={categories}
      renderItem={renderItem}
      itemWidth={240}
      gap={20}
      autoPlay={true}
      autoPlayInterval={5000}
    />
  );
};

export default ClientInfiniteSlider;
