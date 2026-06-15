import BannerADS from './BannerADS';
import type { Advertisement } from '@/types/types';

interface LargeAdProps {
  ad: Advertisement;
  className?: string;
  variant?: 'image' | 'spotlight' | 'rich' | 'minimal';
}

export default function LargeAd({ ad, className = '', variant = 'image' }: LargeAdProps) {
  return (
    <div className={`nc-LargeAd ${className}`}>
      <BannerADS ad={ad} className="w-full" variant={variant} />
    </div>
  );
}
