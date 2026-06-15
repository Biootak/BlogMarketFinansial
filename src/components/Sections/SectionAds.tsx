import type React from 'react';
import type { Advertisement } from '@/types/types';
import LargeAd from '../BannerADS/LargeAd';

interface SectionAdsProps {
  className?: string;
  ad: Advertisement;
  /**
   * 'spotlight' (default) → editorial hero with mask reveal
   * 'rich'                 → split image + text card with CTA
   * 'image'                → image-only with conic-gradient border
   * 'minimal'              → tight sidebar card
   */
  variant?: 'spotlight' | 'rich' | 'image' | 'minimal';
}

const SectionAds: React.FC<SectionAdsProps> = ({ className = '', ad, variant = 'spotlight' }) => {
  return (
    <section className={`nc-SectionAds ${className}`}>
      <LargeAd ad={ad} variant={variant} />
    </section>
  );
};

export default SectionAds;
