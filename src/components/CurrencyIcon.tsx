'use client';

import GenericCryptoIcon from '@/components/GenericCryptoIcon';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { FC } from 'react';
import { memo, useState } from 'react';

interface CurrencyIconProps {
  symbol: string;
  className?: string;
}

const CurrencyIcon: FC<CurrencyIconProps> = memo(({ symbol, className = 'w-6 h-6' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => setIsLoading(false);
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <motion.div
      className={cn('relative', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {isLoading && <Skeleton className={cn('absolute inset-0', className)} />}
      {hasError ? (
        <GenericCryptoIcon className={className} />
      ) : (
        <Image
          src={`/images/crypto/${symbol.toLowerCase()}.svg`}
          alt={`${symbol} icon`}
          width={24}
          height={24}
          unoptimized // SVG محلی — optimizer نمی‌تواند SVG را پردازش کند (404 می‌داد)
          onLoad={handleLoad}
          onError={handleError}
          className={cn(isLoading ? 'invisible' : 'visible', className)}
        />
      )}
    </motion.div>
  );
});

CurrencyIcon.displayName = 'CurrencyIcon';

export default CurrencyIcon;
