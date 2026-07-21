import type { Advertisement } from '@/types/types';
import type React from 'react';
import BannerAds from '../BannerADS/BannerADS';

interface WidgetAdsProps {
  className?: string;
  ads?: Advertisement[];
}

const WidgetAds: React.FC<WidgetAdsProps> = ({ className = '', ads = [] }) => {
  const filteredAds = ads.filter((ad) => ad.size === 'MEDIUM' && ad.position === 'SIDEBAR');
  const lastThreeAds = filteredAds.slice(-3);

  if (lastThreeAds.length === 0) {
    return null;
  }

  return (
    <div className={`nc-WidgetAds w-full ${className}`}>
      <div className="flex flex-col w-full gap-4">
        {lastThreeAds.map((ad) => (
          <div key={ad.id} className="w-full">
            <BannerAds ad={ad} variant="minimal" className="w-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default WidgetAds;
