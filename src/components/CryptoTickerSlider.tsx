'use client';

import type { CryptoTickerRate } from '@/types/types';
import type React from 'react';
import { memo } from 'react';
import { CryptoTickerCard } from './CryptoTickerCard';
import Ticker from './Ticker';

interface CryptoTickerSliderProps {
  rates: CryptoTickerRate[];
}

/**
 * CryptoTickerSlider — نوار افقی نرخ‌های زنده‌ی ارزهای دیجیتال
 * (فقط از Exir). در بالای صفحه‌ی اصلی استفاده می‌شه.
 *
 * قبلاً `ExchangeRateSlider` نام داشت که با تایپ `ExchangeRate`
 * (که خودش هم با مدل Prisma `ExchangeRate` تداخل داشت) گیج‌کننده بود.
 */
const CryptoTickerSlider: React.FC<CryptoTickerSliderProps> = ({ rates }) => {
  return (
    <div
      className="nc-CryptoTickerSlider relative overflow-hidden rounded-xl sm:rounded-2xl"
      style={{
        background: 'var(--ds-surface-elevated)',
        border: '1px solid var(--ds-border-subtle)',
      }}
    >
      <Ticker duration={45} direction="rtl">
        <div className="flex items-center gap-2 sm:gap-3 px-3 py-2">
          {rates.map((rate, idx) => (
            <div key={`${rate.symbol}-${idx}`} className="shrink-0">
              <CryptoTickerCard rate={rate} />
            </div>
          ))}
        </div>
      </Ticker>
    </div>
  );
};

export default memo(CryptoTickerSlider);
