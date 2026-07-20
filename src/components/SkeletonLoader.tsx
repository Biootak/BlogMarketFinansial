'use client';

import { motion } from '@/lib/motion-shim';
import type React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
  circle?: boolean;
  height?: string;
  width?: string;
}

const SkeletonItem: React.FC<SkeletonProps> = ({ className, circle, height, width }) => {
  const baseClass = 'bg-gray-200 dark:bg-gray-700 animate-pulse';
  const shapeClass = circle ? 'rounded-full' : 'rounded';
  const sizeStyle = {
    height: height || (circle ? width : 'auto'),
    width: width || '100%',
  };

  return (
    <motion.div
      className={`${baseClass} ${shapeClass} ${className || ''}`}
      style={sizeStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    />
  );
};

const SkeletonLoader: React.FC<SkeletonProps & { variant?: 'text' | 'card' | 'list' }> = ({
  count = 1,
  circle,
  height,
  width,
  className,
  variant = 'text',
}) => {
  const items = Array.from({ length: count }, (_, index) => index);

  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className="space-y-4 rtl:space-y-reverse">
            <SkeletonItem height="200px" className="mb-4" />
            <SkeletonItem height="20px" width="80%" />
            <SkeletonItem height="16px" width="90%" />
            <SkeletonItem height="16px" width="60%" />
          </div>
        );
      case 'list':
        return (
          <div className="flex items-center gap-4">
            <SkeletonItem circle height="50px" width="50px" />
            <div className="space-y-2 flex-1">
              <SkeletonItem height="16px" width="60%" />
              <SkeletonItem height="14px" width="80%" />
            </div>
          </div>
        );
      default:
        return <SkeletonItem className={className} circle={circle} height={height} width={width} />;
    }
  };

  return (
    <div className="skeleton-loader">
      {items.map((item) => (
        <div key={item} className="mb-4 last:mb-0">
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
