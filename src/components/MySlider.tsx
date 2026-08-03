'use client';

import NextBtn from '@/components/NextPrev/NextBtn';
import PrevBtn from '@/components/NextPrev/PrevBtn';
import { AnimatePresence, MotionConfig, motion } from '@/lib/motion-shim';
import { variants } from '@/utils/animationVariants';
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

/**
 * Pure function: how many items fit per row at a given viewport width.
 * Extracted so the resize listener can compute it without a re-render.
 */
function itemsPerRowAt(width: number, itemPerRow: number): number {
  if (width <= 320) return 1;
  if (width < 500) return itemPerRow - 3 || 2;
  if (width < 1024) return itemPerRow - 2 || 3;
  if (width < 1280) return itemPerRow - 1;
  return itemPerRow;
}

// RTL is a document-level constant — resolve once, not on every render.
// Guard for SSR: `document` is undefined on the server; `data-dir` lives on <html>.
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
  const [direction, setDirection] = useState(0);
  const [numberOfItems, setNumberOfItems] = useState(0);

  // Responsive item count — one resize listener, state write only when the
  // count actually changes (not every pixel / not every render).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const compute = () => {
      const n = itemsPerRowAt(window.innerWidth, itemPerRow);
      setNumberOfItems((prev) => (prev === n ? prev : n));
    };
    compute();
    window.addEventListener('resize', compute, { passive: true });
    return () => window.removeEventListener('resize', compute);
  }, [itemPerRow]);

  // Direction derived from the functional update so `changeItemId` has no
  // stale-closure dependency on `currentIndex` (stable identity).
  const changeItemId = useCallback((newVal: number) => {
    setCurrentIndex((prev) => {
      setDirection(newVal > prev ? 1 : -1);
      return newVal;
    });
  }, []);

  const nextSlide = useCallback(() => {
    if (data.length > currentIndex + numberOfItems) {
      changeItemId(currentIndex + 1);
    } else {
      changeItemId(0);
    }
  }, [currentIndex, data.length, numberOfItems, changeItemId]);

  // Keep the latest nextSlide in a ref so the auto-slide interval is created
  // once per autoSlideInterval change. Previously `nextSlide` was a direct
  // effect dep — its identity changed on every index change (and every parent
  // re-render), so the timer was torn down and recreated on each slide tick
  // and the whole resize/remount dance re-ran constantly.
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
      if (IS_RTL) {
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

  return (
    <div className={`nc-MySlider relative ${className}`}>
      <MotionConfig
        transition={{
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
      >
        <div className={'relative flow-root overflow-hidden'} {...handlers}>
          <div className={'flow-root overflow-hidden rounded-xl'}>
            <motion.ul initial={false} className="relative whitespace-nowrap -mx-2 xl:-mx-4 ">
              <AnimatePresence initial={false} custom={direction}>
                {Array.isArray(data) &&
                  data.map((item, indx) => (
                    <motion.li
                      className={'relative inline-block px-2 xl:px-4 whitespace-normal'}
                      custom={direction}
                      initial={{
                        x: !IS_RTL
                          ? `${(currentIndex - 1) * -100}%`
                          : `${(currentIndex - 1) * 100}%`,
                      }}
                      animate={{
                        x: !IS_RTL ? `${currentIndex * -100}%` : `${currentIndex * 100}%`,
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
