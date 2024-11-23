import type { TwMainColor } from '@/types/types';
import Link from 'next/link';
import React, { type FC, type ReactNode } from 'react';

export interface BadgeProps {
  className?: string;
  name: ReactNode;
  color?: TwMainColor;
  href?: string;
}

const Badge: FC<BadgeProps> = ({ className = 'relative', name, color = 'blue', href }) => {
  const colorClasses: Record<TwMainColor, string> = {
    pink: 'text-pink-800 bg-pink-100 hover:bg-pink-800 hover:text-white',
    blue: 'text-blue-800 bg-blue-100 hover:bg-blue-800 hover:text-white',
    green: 'text-green-800 bg-green-100 hover:bg-green-800 hover:text-white',
    yellow: 'text-yellow-800 bg-yellow-100 hover:bg-yellow-800 hover:text-white',
    red: 'text-red-800 bg-red-100 hover:bg-red-800 hover:text-white',
    purple: 'text-purple-800 bg-purple-100 hover:bg-purple-800 hover:text-white',
    indigo: 'text-indigo-800 bg-indigo-100 hover:bg-indigo-800 hover:text-white',
    gray: 'text-gray-800 bg-gray-100 hover:bg-gray-800 hover:text-white',
  };

  const colorClass = colorClasses[color] || colorClasses.blue;

  const CLASSES = `nc-Badge inline-flex  px-2.5 py-1 rounded-full font-medium text-[10px]/[14px] ${className} ${colorClass} transition-colors duration-300`;
  
  return href ? (
    <Link href={href} className={CLASSES}>
      {name}
    </Link>
  ) : (
    <span className={CLASSES}>{name}</span>
  );
};

export default Badge;