'use client';

import { useEffect, useState, type FC } from 'react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  childClassName?: string;
  titleText?: string;
}

const Loading: FC<LoadingProps> = ({ className, size = 'lg', childClassName, titleText }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-14 w-14',
    lg: 'h-16 w-16',
  };

  // مسیرهای ثابت برای SVG
  const paths = [
    'M40,40 Q50,50 60,60',
    'M35,45 Q50,50 65,55',
    'M45,35 Q50,50 55,65',
    'M50,40 Q50,50 50,60'
  ];

  return (
    <div className="w-full h-full min-h-[200px] flex items-center justify-center">
      <div className={cn('relative', className)}>
        {titleText && <span className="block mb-2 text-center">{titleText}</span>}
        <svg
          role="img"
          aria-label={titleText || 'انیمیشن بارگذاری'}
          className={cn(sizeClasses[size], childClassName, 'animate-spin')}
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(var(--c-primary-500))" stopOpacity="0.9" />
              <stop offset="100%" stopColor="rgb(var(--c-primary-600))" stopOpacity="1" />
            </linearGradient>
          </defs>

          {mounted && paths.map((d, i) => (
            <path
              key={i}
              d={d}
              stroke="url(#arcGradient)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              className={cn(
                'opacity-80',
                'animate-pulse',
                i % 2 === 0 ? 'animate-[pulse_1s_ease-in-out_infinite]' : 'animate-[pulse_1.5s_ease-in-out_infinite]'
              )}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

export default Loading;
