import type React from 'react';
import type { Advertisement } from '@/types/types';
import LargeAd from '../BannerADS/LargeAd';

interface SectionAdsProps {
  className?: string;
  ad: Advertisement;
}

const SectionAds: React.FC<SectionAdsProps> = ({ className = '', ad }) => {
  return (
    <section className={`nc-SectionAds ${className}`}>
      <LargeAd ad={ad} />
    </section>
  );
};

export default SectionAds;
