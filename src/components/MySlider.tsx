'use client';

import React, { FC, type ReactNode, useEffect, useState, useCallback } from 'react';
import { useWindowSize } from 'react-use';
import { useSwipeable } from 'react-swipeable';
import { variants } from '@/utils/animationVariants';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import PrevBtn from '@/components/NextPrev/PrevBtn';
import NextBtn from '@/components/NextPrev/NextBtn';

export interface MySliderProps<T> {
  className?: string;
  itemPerRow?: number;
  data: T[];
  renderItem?: (item: T, indx: number) => ReactNode;
  arrowBtnClass?: string;
  autoSlideInterval?: number;
}

export default function MySlider<T>({
  className = '',
  itemPerRow = 5,
  data,
  renderItem = () => <div />,
  arrowBtnClass = 'top-1/2 -translate-y-1/2',
  autoSlideInterval,
}: MySliderProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [numberOfItems, setNumberOfItems] = useState(0);

  const windowSize = useWindowSize();

  useEffect(() => {
    const { width } = windowSize;
    if (width <= 320) {
      setNumberOfItems(1);
    } else if (width < 500) {
      setNumberOfItems(itemPerRow - 3 || 2);
    } else if (width < 1024) {
      setNumberOfItems(itemPerRow - 2 || 3);
    } else if (width < 1280) {
      setNumberOfItems(itemPerRow - 1);
    } else {
      setNumberOfItems(itemPerRow);
    }
  }, [itemPerRow, windowSize]);

  const changeItemId = useCallback(
    (newVal: number) => {
      setDirection(newVal > currentIndex ? 1 : -1);
      setCurrentIndex(newVal);
    },
    [currentIndex],
  );

  const nextSlide = useCallback(() => {
    if (data.length > currentIndex + numberOfItems) {
      changeItemId(currentIndex + 1);
    } else {
      changeItemId(0);
    }
  }, [currentIndex, data.length, numberOfItems, changeItemId]);

  useEffect(() => {
    if (!autoSlideInterval) return;

    const intervalId = setInterval(nextSlide, autoSlideInterval);

    return () => clearInterval(intervalId);
  }, [autoSlideInterval, nextSlide]);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (isRTL) {
        if (currentIndex > 0) {
          changeItemId(currentIndex - 1);
        }
      } else {
        if (currentIndex < data.length - numberOfItems) {
          changeItemId(currentIndex + 1);
        }
      }
    },
    onSwipedRight: () => {
      if (isRTL) {
        if (currentIndex < data.length - numberOfItems) {
          changeItemId(currentIndex + 1);
        }
      } else {
        if (currentIndex > 0) {
          changeItemId(currentIndex - 1);
        }
      }
    },
    trackMouse: true,
  });

  if (!numberOfItems) {
    return <div />;
  }

  const isRTL = document.querySelector('html')?.getAttribute('dir') === 'rtl';

  return (
    <div className={`nc-MySlider ${className}`}>
      <MotionConfig
        transition={{
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
      >
        <div className={'relative flow-root'} {...handlers}>
          <div className={'flow-root overflow-hidden rounded-xl'}>
            <motion.ul initial={false} className="relative whitespace-nowrap -mx-2 xl:-mx-4 ">
              <AnimatePresence initial={false} custom={direction}>
                {Array.isArray(data) &&
                  data.map((item, indx) => (
                    <motion.li
                      className={'relative inline-block px-2 xl:px-4 whitespace-normal'}
                      custom={direction}
                      initial={{
                        x: !isRTL
                          ? `${(currentIndex - 1) * -100}%`
                          : `${(currentIndex - 1) * 100}%`,
                      }}
                      animate={{
                        x: !isRTL ? `${currentIndex * -100}%` : `${currentIndex * 100}%`,
                      }}
                      variants={variants(200, 1)}
                      key={indx}
                      style={{
                        width: `calc(1/${numberOfItems} * 100%)`,
                      }}
                    >
                      {renderItem(item, indx)}
                    </motion.li>
                  ))}
              </AnimatePresence>
            </motion.ul>
          </div>

          {currentIndex > 0 && (
            <PrevBtn
              onClick={() => changeItemId(currentIndex - 1)}
              className={`w-9 h-9 xl:w-12 xl:h-12 text-lg absolute -start-3 xl:-start-6 z-[1] ${arrowBtnClass}`}
            />
          )}

          {data.length > currentIndex + numberOfItems && (
            <NextBtn
              onClick={() => changeItemId(currentIndex + 1)}
              className={`w-9 h-9 xl:w-12 xl:h-12 text-lg absolute -end-3 xl:-end-6 z-[1] ${arrowBtnClass}`}
            />
          )}
        </div>
      </MotionConfig>
    </div>
  );
}
