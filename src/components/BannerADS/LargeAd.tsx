import type { Advertisement } from '@/types/types';
import BannerADS from './BannerADS';

interface LargeAdProps {
  ad: Advertisement;
  className?: string;
  variant?: 'image' | 'showcase' | 'spotlight' | 'rich' | 'minimal';
}

export default function LargeAd({ ad, className = '', variant = 'image' }: LargeAdProps) {
  return (
    <div className={`nc-LargeAd ${className}`}>
      <BannerADS ad={ad} className="w-full" variant={variant} />
    </div>
  );
}
