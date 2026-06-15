'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

interface InfiniteSliderProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  /**
   * عرض پایه‌ی هر آیتم (px). اسلایدر به‌طور خودکار تعداد slide در هر نمایش
   * را بر اساس عرض واقعی viewport محاسبه می‌کند، پس این مقدار فقط برای
   * محاسبه‌ی نسبی استفاده می‌شود. عرض واقعی توسط CSS کنترل می‌شود.
   */
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
  // محاسبه‌ی slidesToShow بر اساس عرض واقعی viewport (سازگار با SSR)
  // مقدار اولیه 1 تا از hydration mismatch جلوگیری کنه
  const [slidesToShow, setSlidesToShow] = useState(1);

  useEffect(() => {
    const compute = () => {
      // یه تخمین محافظه‌کارانه: چند آیتم با itemWidth + gap در viewport جا می‌شن
      const approx = Math.max(1, Math.floor(window.innerWidth / (itemWidth + gap)));
      setSlidesToShow(approx);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [itemWidth, gap]);

  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow,
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
          // عرض به CSS واگذار می‌شود (auto از react-slick)؛
          // تنها فاصله‌ی بین آیتم‌ها با marginRight تنظیم می‌شود
          <div key={index} style={{ marginInlineEnd: gap }}>
            {renderItem(item, index)}
          </div>
        ))}
      </Slider>
    </div>
  );
}
