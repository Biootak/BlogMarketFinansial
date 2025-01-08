'use client';

import type { FC } from 'react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Loading: FC<LoadingProps> = ({
  className,
  size = 'lg',
}) => {
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-14 w-14',
    lg: 'h-16 w-16',
  };

  return (
    <div className="w-full h-full min-h-[200px] flex items-center justify-center">
      <div className={cn('relative', className)}>
        <svg
          className={cn(sizeClasses[size])}
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(var(--c-primary-500))" stopOpacity="0.9" />
              <stop offset="100%" stopColor="rgb(var(--c-primary-600))" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* مسیرهای اصلی - فقط 4 مسیر */}
          {[...Array(4)].map((_, i) => (
            <path
              key={i}
              d={`M${30 + Math.random() * 40},${30 + Math.random() * 40} Q${50 + Math.random() * 20},${50 + Math.random() * 20} ${70 - Math.random() * 40},${70 - Math.random() * 40}`}
              stroke="url(#arcGradient)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              className="opacity-80"
            >
              <animate
                attributeName="d"
                dur="1s"
                repeatCount="indefinite"
                values={`
                  M${30 + Math.random() * 40},${30 + Math.random() * 40} Q${50 + Math.random() * 20},${50 + Math.random() * 20} ${70 - Math.random() * 40},${70 - Math.random() * 40};
                  M${40},${40 + i * 5} Q50,50 ${60},${60 - i * 5};
                  M${50 - i * 10},${50} Q50,50 ${50 + i * 10},${50};
                  M50,${40 + i * 5} Q50,50 50,${60 - i * 5}
                `}
                calcMode="spline"
                keyTimes="0;0.3;0.6;1"
                keySplines="0.5 0 0.5 1; 0.5 0 0.5 1; 0.5 0 0.5 1"
              />
            </path>
          ))}

          {/* حلقه بیرونی */}
          <circle
            cx="50"
            cy="50"
            r="30"
            stroke="url(#arcGradient)"
            strokeWidth="2"
            fill="none"
            className="opacity-30"
          >
            <animate
              attributeName="r"
              values="35;30;25;30"
              dur="1s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;0.3;0.6;1"
            />
            <animate
              attributeName="opacity"
              values="0.2;0.4;0.6;0.4"
              dur="1s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;0.3;0.6;1"
            />
          </circle>

          {/* نقطه مرکزی */}
          <circle
            cx="50"
            cy="50"
            r="3"
            fill="rgb(var(--c-primary-600))"
          >
            <animate
              attributeName="r"
              values="2;4;3;3"
              dur="1s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;0.3;0.6;1"
              keySplines="0.5 0 0.5 1; 0.5 0 0.5 1; 0.5 0 0.5 1"
            />
            <animate
              attributeName="opacity"
              values="0.6;0.8;1;1"
              dur="1s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;0.3;0.6;1"
            />
          </circle>
        </svg>
      </div>
    </div>
  );
};

export default Loading;
