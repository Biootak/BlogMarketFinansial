'use client';

/**
 * AdItem — آیتم تبلیغاتی برای نمایش بین پست‌ها
 *
 * - استایل یکپارچه با PostItem (همون کلاس‌ها، hover، TiltCard)
 * - از BannerADS با variant='image' استفاده می‌کنه
 * - inner spacing با masonry هماهنگ
 */

import type { Advertisement } from '@/types/types';
import { TiltCard } from '@/components/ModernTrending/effects/TiltCard';
import BannerADS from '@/components/BannerADS/BannerADS';
import { cn } from '@/lib/utils';

interface AdItemProps {
  ad: Advertisement;
  className?: string;
}

const AdItem: React.FC<AdItemProps> = ({ ad, className }) => {
  return (
    <div
      className={cn('w-full anim-fade-in-up', className)}
      role="complementary"
      aria-label="تبلیغ"
    >
      <TiltCard intensity={2} perspective={1400} className="w-full">
        <div className="relative hover:-translate-y-0.5 transition-transform duration-300">
          <BannerADS
            ad={ad}
            variant="image"
            showAdLabel
            className="
              rounded-2xl overflow-hidden
              border border-neutral-200/70 dark:border-neutral-800/80
              bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md
            "
          />
        </div>
      </TiltCard>
    </div>
  );
};

export default AdItem;
