'use client';

import type React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

interface InfiniteSliderProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemWidth: number;
  gap: number;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function InfiniteSlider<T>({
  items,
  renderItem,
  itemWidth,
  gap,
  autoPlay = true,
  autoPlayInterval = 3000,
}: InfiniteSliderProps<T>) {
  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: Math.floor(window.innerWidth / (itemWidth + gap)),
    slidesToScroll: 1,
    autoplay: autoPlay,
    autoplaySpeed: autoPlayInterval,
    rtl: true,
    cssEase: 'linear',
  };

  return (
    <div style={{ direction: 'rtl' }}>
      <Slider {...settings}>
        {items.map((item, index) => (
          <div key={index} style={{ width: itemWidth, marginRight: gap }}>
            {renderItem(item, index)}
          </div>
        ))}
      </Slider>
    </div>
  );
}
