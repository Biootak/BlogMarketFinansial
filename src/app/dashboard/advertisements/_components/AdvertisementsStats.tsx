'use client';

import { toPersianNumber } from '@/lib/utils';
import type { Advertisement } from '@/types/types';
import {
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineMegaphone,
  HiOutlineRectangleStack,
} from 'react-icons/hi2';

interface AdvertisementsStatsProps {
  ads: Advertisement[];
}

/**
 * AdvertisementsStats — KPI strip (bento 2026).
 *
 * 4 stat cards + 1 wide "content health" bar (desktop only).
 */
export function AdvertisementsStats({ ads }: AdvertisementsStatsProps) {
  const active = ads.filter((a) => a.isActive).length;
  const header = ads.filter((a) => a.position === 'HEADER').length;
  const other = ads.filter((a) => a.position !== 'HEADER').length;

  return (
    <div className="dash-bento mb-8">
      <div className="dash-panel p-5 dash-glow">
        <div className="flex items-center gap-4">
          <div className="dash-ico dash-ico--indigo size-10">
            <HiOutlineMegaphone className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold dash-num">{toPersianNumber(ads.length)}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              کل تبلیغات
            </div>
          </div>
        </div>
      </div>

      <div className="dash-panel p-5 dash-glow">
        <div className="flex items-center gap-4">
          <div className="dash-ico dash-ico--emerald size-10">
            <HiOutlineCheckCircle className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold dash-num text-emerald-600 dark:text-emerald-500">
              {toPersianNumber(active)}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              تبلیغات فعال
            </div>
          </div>
        </div>
      </div>

      <div className="dash-panel p-5 dash-glow">
        <div className="flex items-center gap-4">
          <div className="dash-ico dash-ico--cyan size-10">
            <HiOutlineRectangleStack className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold dash-num text-cyan-600 dark:text-cyan-500">
              {toPersianNumber(header)}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              جایگاه سربرگ
            </div>
          </div>
        </div>
      </div>

      <div className="dash-panel p-5 dash-glow">
        <div className="flex items-center gap-4">
          <div className="dash-ico dash-ico--amber size-10">
            <HiOutlineRectangleStack className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold dash-num text-amber-600 dark:text-amber-500">
              {toPersianNumber(other)}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              سایر جایگاه‌ها
            </div>
          </div>
        </div>
      </div>

      <div className="dash-panel p-5 dash-glow col-span-2 hidden xl:block">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="dash-ico dash-ico--violet size-10">
              <HiOutlineChartBar className="size-5" />
            </div>
            <div>
              <div className="text-sm font-bold">وضعیت کلی محتوا</div>
              <div className="text-[10px] text-neutral-500">به‌روزرسانی لحظه‌ای</div>
            </div>
          </div>
          <div className="flex gap-1">
            {[40, 70, 45, 90, 65, 80].map((h, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-primary-500/20"
                style={{ height: '24px', position: 'relative' }}
              >
                <div
                  className="absolute bottom-0 w-full rounded-full bg-primary-500"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
