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
    return (
      <div className="h-full" key={item.id}>
        <CardCategory2 taxonomy={item} index={topIndex} className="h-full" />
      </div>
    );
  };

  return (
    <MySlider
      data={categories}
      renderItem={renderCard}
      itemPerRow={itemPerRow}
      className="h-full"
    />
  );
};

export default ClientSideSlider;
