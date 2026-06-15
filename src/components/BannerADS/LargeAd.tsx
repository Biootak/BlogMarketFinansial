'use client';

import type React from 'react';
import BannerADS from './BannerADS';
import type { Advertisement } from '@/types/types';

interface LargeAdProps {
  ad: Advertisement;
  className?: string;
}

const LargeAd: React.FC<LargeAdProps> = ({ ad, className = '' }) => {
  return (
    <div className={`nc-LargeAd ${className}`}>
      <BannerADS
        ad={ad}
        className="w-full"
        showAdLabel={false}
        imageOnly={true}
      />
    </div>
  );
};

export default LargeAd;
