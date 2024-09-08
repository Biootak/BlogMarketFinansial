import type React from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import GenericCryptoIcon from './GenericCryptoIcon';

interface CurrencyIconProps {
  symbol: string;
  className?: string;
}

// کش برای ذخیره وضعیت آیکون‌ها
const iconCache: { [key: string]: boolean } = {};

const CurrencyIcon: React.FC<CurrencyIconProps> = ({ symbol, className = 'w-6 h-6' }) => {
  const [iconExists, setIconExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (iconCache[symbol] !== undefined) {
      setIconExists(iconCache[symbol]);
    } else {
      // بررسی وجود آیکون
      fetch(
        `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/32/color/${symbol.toLowerCase()}.png`,
      )
        .then((response) => {
          const exists = response.ok;
          iconCache[symbol] = exists;
          setIconExists(exists);
        })
        .catch(() => {
          iconCache[symbol] = false;
          setIconExists(false);
        });
    }
  }, [symbol]);

  if (iconExists === null) {
    // نمایش یک placeholder تا زمانی که وضعیت آیکون مشخص شود
    return <div className={className} />;
  }

  if (!iconExists) {
    return <GenericCryptoIcon className={className} />;
  }

  return (
    <div className={className}>
      <Image
        src={`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/32/color/${symbol.toLowerCase()}.png`}
        alt={`${symbol} icon`}
        width={24}
        height={24}
      />
    </div>
  );
};

export default CurrencyIcon;
