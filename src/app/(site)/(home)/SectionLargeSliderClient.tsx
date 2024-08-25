'use client';

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import CardLarge1 from '@/components/CardLarge1/CardLarge1';
import type { PostWithRelations } from '@/types/types';

type SectionLargeSliderProps = {
  initialPosts: PostWithRelations[];
  className?: string;
  autoSlide?: boolean;
  autoSlideInterval?: number;
};

export default function SectionLargeSliderClient({
  initialPosts,
  className = '',
  autoSlide = false,
  autoSlideInterval = 6000,
}: SectionLargeSliderProps) {
  const [indexActive, setIndexActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sliderRef = useRef<HTMLElement>(null);

  const activePost = useMemo(() => {
    if (initialPosts.length === 0 || indexActive >= initialPosts.length) {
      return null;
    }
    return initialPosts[indexActive];
  }, [initialPosts, indexActive]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (autoSlide && !isPaused) {
      timerRef.current = setTimeout(() => {
        setIndexActive((prevIndex) => (prevIndex + 1) % initialPosts.length);
      }, autoSlideInterval);
    }
  }, [autoSlide, autoSlideInterval, isPaused, initialPosts.length]);

  const goToNextSlide = useCallback(() => {
    setIndexActive((prevIndex) => (prevIndex + 1) % initialPosts.length);
    resetTimer();
  }, [initialPosts.length, resetTimer]);

  const goToPrevSlide = useCallback(() => {
    setIndexActive((prevIndex) => (prevIndex - 1 + initialPosts.length) % initialPosts.length);
    resetTimer();
  }, [initialPosts.length, resetTimer]);

  const handleInteraction = useCallback(() => {
    setIsPaused(true);
    const timer = setTimeout(() => setIsPaused(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer, indexActive]);

  useEffect(() => {
    const cleanup = handleInteraction();
    return cleanup;
  }, [handleInteraction]);

  useEffect(() => {
    if (!isPaused) {
      resetTimer();
    }
  }, [isPaused, resetTimer]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        goToNextSlide();
        handleInteraction();
      } else if (event.key === 'ArrowLeft') {
        goToPrevSlide();
        handleInteraction();
      }
    },
    [goToNextSlide, goToPrevSlide, handleInteraction],
  );

  if (initialPosts.length === 0) {
    return <div>هیچ پست ویژه‌ای یافت نشد.</div>;
  }

  if (!activePost) {
    return <div>پست فعال یافت نشد.</div>;
  }

  return (
    <section
      ref={sliderRef}
      className={`nc-SectionLargeSlider relative ${className}`}
      aria-label="اسلایدر پست‌های ویژه"
      aria-roledescription="carousel"
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        اسلاید {indexActive + 1} از {initialPosts.length}
      </div>
      <div onMouseEnter={handleInteraction} onMouseLeave={() => setIsPaused(false)}>
        <CardLarge1
          key={activePost.id}
          onClickNext={goToNextSlide}
          onClickPrev={goToPrevSlide}
          post={activePost}
          onKeyDown={handleKeyDown}
        />
      </div>
    </section>
  );
}
