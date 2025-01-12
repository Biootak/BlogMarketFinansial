'use client';

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import CardLarge1 from '@/components/CardLarge1/CardLarge1';
import type { PostWithRelations } from '@/types/types';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';

// Optimize performance by moving constants outside component
const PAUSE_DURATION = 5000;
const SLIDE_DIRECTION = {
  NEXT: 1,
  PREV: -1
} as const;

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
  
  // Memoize posts length to avoid recalculations
  const postsLength = useMemo(() => initialPosts.length, [initialPosts]);

  const activePost = useMemo(() => {
    if (postsLength === 0 || indexActive >= postsLength) return null;
    return initialPosts[indexActive];
  }, [initialPosts, indexActive, postsLength]);

  // Optimize slide calculation
  const calculateNextIndex = useCallback((direction: typeof SLIDE_DIRECTION[keyof typeof SLIDE_DIRECTION]) => {
    return (indexActive + direction + postsLength) % postsLength;
  }, [indexActive, postsLength]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (autoSlide && !isPaused) {
      timerRef.current = setTimeout(() => {
        setIndexActive(prev => (prev + 1) % postsLength);
      }, autoSlideInterval);
    }
  }, [autoSlide, autoSlideInterval, isPaused, postsLength]);

  const handleSlideChange = useCallback((direction: typeof SLIDE_DIRECTION[keyof typeof SLIDE_DIRECTION]) => {
    setIndexActive(prev => calculateNextIndex(direction));
    resetTimer();
  }, [calculateNextIndex, resetTimer]);

  const handleInteraction = useCallback(() => {
    setIsPaused(true);
    const timer = setTimeout(() => setIsPaused(false), PAUSE_DURATION);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  useEffect(() => {
    const cleanup = handleInteraction();
    return cleanup;
  }, [handleInteraction]);

  useEffect(() => {
    if (!isPaused) {
      resetTimer();
    }
  }, [isPaused, resetTimer]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const direction = event.key === 'ArrowRight' ? SLIDE_DIRECTION.NEXT : 
                     event.key === 'ArrowLeft' ? SLIDE_DIRECTION.PREV : null;
    if (direction !== null) {
      handleSlideChange(direction);
      handleInteraction();
    }
  }, [handleSlideChange, handleInteraction]);

  const cardLarge1 = useMemo(() => {
    if (!activePost) return <CardLarge1Skeleton />;
    return (
      <CardLarge1
        key={activePost.id}
        onClickNext={() => handleSlideChange(SLIDE_DIRECTION.NEXT)}
        onClickPrev={() => handleSlideChange(SLIDE_DIRECTION.PREV)}
        post={activePost}
        onKeyDown={handleKeyDown}
      />
    );
  }, [activePost, handleSlideChange, handleKeyDown]);

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
