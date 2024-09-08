import type React from 'react';

interface CurrencyIconProps {
  symbol: string;
  className?: string;
}

const CurrencyIcon: React.FC<CurrencyIconProps> = ({ symbol, className = 'w-6 h-6' }) => {
  const iconPath = `/images/crypto-icons/${symbol.toLowerCase()}.svg`;

  return (
    <div className={className}>
      <object
        data={iconPath}
        type="image/svg+xml"
        className="w-full h-full"
        onError={(e) => {
          e.currentTarget.data = '/images/crypto-icons/generic.svg';
        }}
      >
        {symbol}
      </object>
    </div>
  );
};

export default CurrencyIcon;
