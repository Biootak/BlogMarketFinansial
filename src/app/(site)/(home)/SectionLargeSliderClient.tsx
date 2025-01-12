'use client';

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import CardLarge1 from '@/components/CardLarge1/CardLarge1';
import type { PostWithRelations } from '@/types/types';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';

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

  const cardLarge1 = useMemo(() => {
    if (!activePost) return <CardLarge1Skeleton />;
    return (
      <CardLarge1
        key={activePost.id}
        onClickNext={goToNextSlide}
        onClickPrev={goToPrevSlide}
        post={activePost}
        onKeyDown={handleKeyDown}
      />
    );
  }, [activePost, goToNextSlide, goToPrevSlide, handleKeyDown]);

  return (
    <section
      className={`nc-SectionLargeSlider relative pt-4 pb-3 md:py-5 lg:pt-5 min-h-[400px] md:min-h-[500px] lg:min-h-[600px] ${className}`}
      data-nc-id="SectionLargeSlider"
    >
      <div className="absolute top-1/2 -translate-y-1/2 w-full z-10">
        <div className="container flex justify-between">
          <div className="w-12 h-12 opacity-0">&#8203;</div> {/* Left placeholder */}
          <div className="w-12 h-12 opacity-0">&#8203;</div> {/* Right placeholder */}
        </div>
      </div>
      <div onMouseEnter={handleInteraction} onMouseLeave={() => setIsPaused(false)}>
        {cardLarge1}
      </div>
    </section>
  );
}
