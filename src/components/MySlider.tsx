'use client';

import NextBtn from '@/components/NextPrev/NextBtn';
import PrevBtn from '@/components/NextPrev/PrevBtn';
import { MotionConfig } from '@/lib/motion-shim';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useSwipeable } from 'react-swipeable';

export interface MySliderProps<T> {
  className?: string;
  itemPerRow?: number;
  data: T[];
  renderItem?: (item: T, indx: number) => ReactNode;
  arrowBtnClass?: string;
  autoSlideInterval?: number;
  hideArrowOutside?: boolean;
}

function itemsPerRowAt(width: number, itemPerRow: number): number {
  if (width <= 320) return 1;
  if (width < 500) return itemPerRow - 3 || 2;
  if (width < 1024) return itemPerRow - 2 || 3;
  if (width < 1280) return itemPerRow - 1;
  return itemPerRow;
}

const IS_RTL =
  typeof document !== 'undefined' ? document.documentElement.getAttribute('dir') === 'rtl' : true;

export default function MySlider<T>({
  className = '',
  itemPerRow = 5,
  data,
  renderItem = () => <div />,
  arrowBtnClass = 'top-1/2 -translate-y-1/2',
  autoSlideInterval,
  hideArrowOutside: _hideArrowOutside = false,
}: MySliderProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [numberOfItems, setNumberOfItems] = useState(() =>
    typeof window !== 'undefined' ? itemsPerRowAt(window.innerWidth, itemPerRow) : itemPerRow,
  );
  // containerWidth برای محاسبه دقیق offset بر حسب px (نه %)
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncSize = () => {
      setNumberOfItems(itemsPerRowAt(window.innerWidth, itemPerRow));
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    // اجرای اولیه بعد از mount (containerRef در این مرحله پر است)
    syncSize();

    window.addEventListener('resize', syncSize, { passive: true });
    return () => window.removeEventListener('resize', syncSize);
  }, [itemPerRow]);

  const changeItemId = useCallback((newVal: number) => {
    setCurrentIndex(newVal);
  }, []);

  const nextSlide = useCallback(() => {
    if (data.length > currentIndex + numberOfItems) {
      changeItemId(currentIndex + 1);
    } else {
      changeItemId(0);
    }
  }, [currentIndex, data.length, numberOfItems, changeItemId]);

  const nextSlideRef = useRef(nextSlide);
  nextSlideRef.current = nextSlide;

  useEffect(() => {
    if (!autoSlideInterval) return;
    const intervalId = setInterval(() => nextSlideRef.current(), autoSlideInterval);
    return () => clearInterval(intervalId);
  }, [autoSlideInterval]);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (IS_RTL) {
        if (currentIndex > 0) changeItemId(currentIndex - 1);
      } else {
        if (currentIndex < data.length - numberOfItems) changeItemId(currentIndex + 1);
      }
    },
    onSwipedRight: () => {
      if (IS_RTL) {
        if (currentIndex < data.length - numberOfItems) changeItemId(currentIndex + 1);
      } else {
        if (currentIndex > 0) changeItemId(currentIndex - 1);
      }
    },
    trackMouse: true,
  });

  // handlers.ref متعلق به useSwipeable است و با containerRef تداخل دارد —
  // هر دو ref را در یک callback ترکیب می‌کنیم تا اندازه‌گیری عرض و swipe هر دو کار کنند.
  const { ref: swipeRef, ...swipeProps } = handlers;
  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      containerRef.current = el;
      swipeRef(el);
    },
    [swipeRef],
  );

  // عرض یک slot = containerWidth / numberOfItems (بر حسب px)
  // translateX با px دقیق است — با % روی ul چون ul از container بزرگتر است اشتباه می‌شود
  const slotWidthPx = containerWidth > 0 && numberOfItems > 0 ? containerWidth / numberOfItems : 0;
  const offsetPx = currentIndex * slotWidthPx;
  const translateValue = IS_RTL ? `${offsetPx}px` : `-${offsetPx}px`;

  return (
    <div className={`nc-MySlider relative ${className}`}>
      <MotionConfig
        transition={{
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
      >
        <div ref={mergedRef} className="relative flow-root overflow-hidden" {...swipeProps}>
          <div className="flow-root overflow-hidden rounded-xl">
            <ul
              className="relative whitespace-nowrap -mx-2 xl:-mx-4"
              style={{
                transform: `translateX(${translateValue})`,
                transition: 'transform 400ms cubic-bezier(0.25, 1, 0.5, 1)',
                willChange: 'transform',
              }}
            >
              {Array.isArray(data) &&
                data.map((item, indx) => (
                  <li
                    key={indx}
                    className="relative inline-block px-2 xl:px-4 whitespace-normal"
                    style={{ width: `calc(1/${numberOfItems} * 100%)` }}
                  >
                    {renderItem(item, indx)}
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {currentIndex > 0 && (
          <PrevBtn
            onClick={() => changeItemId(currentIndex - 1)}
            className={`w-9 h-9 sm:w-10 sm:h-10 text-sm sm:text-base bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-600/50 rounded-full inline-flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-neutral-700 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200 absolute -start-3 sm:-start-4 z-[5] ${arrowBtnClass}`}
          />
        )}

        {data.length > currentIndex + numberOfItems && (
          <NextBtn
            onClick={() => changeItemId(currentIndex + 1)}
            className={`w-9 h-9 sm:w-10 sm:h-10 text-sm sm:text-base bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-600/50 rounded-full inline-flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-neutral-700 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200 absolute -end-3 sm:-end-4 z-[5] ${arrowBtnClass}`}
          />
        )}
      </MotionConfig>
    </div>
  );
}
