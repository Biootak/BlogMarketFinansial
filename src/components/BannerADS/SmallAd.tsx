import type React from 'react';
import BannerADS from '../BannerADS/BannerADS';
import type { Advertisement } from '@/types/types';

interface SmallAdProps {
  ad: Advertisement;
  className?: string;
}

const SmallAd: React.FC<SmallAdProps> = ({ ad, className = '' }) => (
  <BannerADS ad={ad} className={className} showDescription={false} showButton={false} />
);

export default SmallAd;
