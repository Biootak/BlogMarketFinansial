import type React from 'react';
import type { Advertisement } from '@/types/types';
import LargeAd from '../BannerADS/LargeAd';

interface SectionAdsProps {
  className?: string;
  ad: Advertisement;
  /**
   * 'showcase' (default) → editorial hero with aurora mesh + 3D tilt + sparkline
   * 'rich'                → split image + text card with CTA shimmer
   * 'image'               → image-only with conic-gradient border
   * 'minimal'             → tight sidebar card
   * 'spotlight'           → legacy alias for 'showcase'
   */
  variant?: 'showcase' | 'rich' | 'image' | 'minimal' | 'spotlight';
}

const SectionAds: React.FC<SectionAdsProps> = ({ className = '', ad, variant = 'showcase' }) => {
  return (
    <section className={`nc-SectionAds ${className}`}>
      <LargeAd ad={ad} variant={variant} />
    </section>
  );
};

export default SectionAds;
