import type React from 'react';
import BannerADS from '../BannerADS/BannerADS';
import type { Advertisement } from '@/types/types';

interface MediumAdProps {
  ad: Advertisement;
  className?: string;
}

const MediumAd: React.FC<MediumAdProps> = ({ ad, className = '' }) => (
  <BannerADS ad={ad} className={className} />
);

export default MediumAd;
