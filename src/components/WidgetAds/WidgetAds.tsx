import type React from 'react';
import type { Advertisement } from '@/types/types';
import BannerAds from '../BannerADS/BannerADS';
import WidgetHeading1 from '@/components/WidgetHeading1/WidgetHeading1';
import { Icon } from '../ui/icon';

interface WidgetAdsProps {
  className?: string;
  ads?: Advertisement[];
}

const WidgetAds: React.FC<WidgetAdsProps> = ({ className = '', ads = [] }) => {
  // فیلتر کردن تبلیغات برای سایز متوسط و موقعیت سایدبار
  const filteredAds = ads.filter((ad) => ad.size === 'MEDIUM' && ad.position === 'SIDEBAR');

  // گرفتن سه تبلیغ آخر
  const lastThreeAds = filteredAds.slice(-3);

  if (lastThreeAds.length === 0) {
    return null; // اگر تبلیغی وجود نداشت، هیچ چیزی رندر نکن
  }

  return (
    <div
      className={`nc-WidgetAds rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800 ${className}`}
    >
      <div className="flow-root">
        <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700 ">
          {lastThreeAds.map((ad, index) => (
            <div key={index} className="p-4 xl:p-5">
              <BannerAds ad={ad} imageOnly={true} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WidgetAds;
