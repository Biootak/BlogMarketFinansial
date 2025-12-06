'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface TouchSliderProps {
  children: React.ReactNode[];
  className?: string;
  gap?: number;
  showArrows?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

/**
 * Touch Slider Component
 * - Swipe gestures on mobile
 * - Arrow navigation on desktop
 * - Smooth transitions
 * - Auto-play support
 */
export function TouchSlider({
  children,
  className,
  gap = 16,
  showArrows = true,
  autoPlay = false,
  autoPlayInterval = 5000,
}: TouchSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Auto-play
  useEffect(() => {
    if (!autoPlay) return;

    const interval = setInterval(() => {
      handleNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(children.length - 1, prev + 1));
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setScrollLeft(sliderRef.current?.scrollLeft || 0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const x = e.touches[0].clientX;
    const walk = (startX - x) * 2;
    sliderRef.current.scrollLeft = scrollLeft + walk;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false);

    if (!sliderRef.current) return;

    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;

    // Swipe threshold
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  // Mouse handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setScrollLeft(sliderRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const x = e.clientX;
    const walk = (startX - x) * 2;
    sliderRef.current.scrollLeft = scrollLeft + walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Scroll to current index
  useEffect(() => {
    if (!sliderRef.current) return;

    const slider = sliderRef.current;
    const itemWidth = slider.offsetWidth;
    slider.scrollTo({
      left: currentIndex * (itemWidth + gap),
      behavior: 'smooth',
    });
  }, [currentIndex, gap]);

  return (
    <div className={cn('relative group', className)}>
      {/* Slider */}
      <div
        ref={sliderRef}
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ gap: `${gap}px` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {children.map((child, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-full snap-start"
            style={{ scrollSnapAlign: 'start' }}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Navigation Arrows - Desktop only */}
      {showArrows && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={cn(
              'hidden md:flex absolute top-1/2 -translate-y-1/2 start-4 z-10',
              'w-10 h-10 items-center justify-center rounded-full',
              'bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm',
              'border border-neutral-200 dark:border-neutral-700',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'hover:bg-white dark:hover:bg-neutral-800',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === children.length - 1}
            className={cn(
              'hidden md:flex absolute top-1/2 -translate-y-1/2 end-4 z-10',
              'w-10 h-10 items-center justify-center rounded-full',
              'bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm',
              'border border-neutral-200 dark:border-neutral-700',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'hover:bg-white dark:hover:bg-neutral-800',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-4">
        {children.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setCurrentIndex(index)}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              index === currentIndex ? 'bg-primary-500 w-6' : 'bg-neutral-300 dark:bg-neutral-600',
            )}
            aria-label={`اسلاید ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
