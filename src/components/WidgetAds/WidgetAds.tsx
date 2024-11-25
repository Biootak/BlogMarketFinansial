import type React from 'react';
import type { Advertisement } from '@/types/types';
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
    <div className={`nc-WidgetAds w-full overflow-hidden ${className}`}>
      <div className="flex flex-col w-full">
        {lastThreeAds.map((ad, index) => (
          <div key={index} className="w-full ">
            <BannerAds ad={ad} imageOnly={true} className="w-full h-full mb-4 " />
          </div>
        ))}
      </div>
    </div>
  );
};

export default WidgetAds;
