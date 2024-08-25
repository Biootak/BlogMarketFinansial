'use client';

import type { TaxonomyType } from '@/types/types';
import MySlider from '../MySlider';
import CardCategory2 from '@/components/CardCategory2/CardCategory2';

interface ClientSideSliderProps {
  categories: TaxonomyType[];
  itemPerRow: 4 | 5;
}

const ClientSideSlider: React.FC<ClientSideSliderProps> = ({ categories, itemPerRow }) => {
  const renderCard = (item: TaxonomyType, index: number) => {
    const topIndex = index < 3 ? `#${index + 1}` : undefined;
    return <CardCategory2 key={item.id} taxonomy={item} index={topIndex} />;
  };

  return <MySlider data={categories} renderItem={renderCard} itemPerRow={itemPerRow} />;
};

export default ClientSideSlider;
