import React from 'react';
import Link from 'next/link';

export interface SocialsList1Props {
  className?: string;
}

const socials: SocialType[] = SOCIALS_2;

// این کامپوننت را به عنوان کامپوننت سرور تعریف می‌کنیم
const SocialsList1 = ({ className = 'space-y-2.5' }: SocialsList1Props) => {
  return (
    <div className={`nc-SocialsList1 ${className}`} data-nc-id="SocialsList1">
      {socials.map((item, index) => (
        <SocialItem key={index} item={item} />
      ))}
    </div>
  );
};

// کامپوننت جداگانه برای هر آیتم اجتماعی
const SocialItem = ({ item }: { item: SocialType }) => {
  return (
    <Link
      href={item.href}
      className="flex items-center text-2xl text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white leading-none space-x-3 rtl:space-x-reverse"
    >
      {item.icon}
      <span className="hidden lg:block text-sm">{item.name}</span>
    </Link>
  );
};

export default SocialsList1;
