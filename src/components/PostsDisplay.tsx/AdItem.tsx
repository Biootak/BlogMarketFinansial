'use client';

import type { Advertisement } from '@/types/types';
import MediumAd from '../BannerADS/MediumAd';

interface AdItemProps {
  ad: Advertisement;
}

export default function AdItem({ ad }: AdItemProps) {
  return (
    <div className="w-full my-6 flex-shrink-0">
      <MediumAd ad={ad} className="w-full" />
    </div>
  );
}
