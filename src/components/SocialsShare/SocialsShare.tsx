import type React from 'react';
import type { FC } from 'react';
import {
  FaFacebookF,
  FaTwitter,
  FaLinkedinIn,
  FaInstagram,
} from 'react-icons/fa';

export interface SocialsShareProps {
  className?: string;
  itemClass?: string;
}

export interface SocialType {
  id: string;
  name: string;
  icon: React.ReactNode;
  href: string;
}

const socials: SocialType[] = [
  {
    id: 'Facebook',
    name: 'فیسبوک',
    icon: <FaFacebookF />,
    href: '#',
  },
  {
    id: 'Twitter',
    name: 'توییتر',
    icon: <FaTwitter />,
    href: '#',
  },
  {
    id: 'Linkedin',
    name: 'لینکدین',
    icon: <FaLinkedinIn />,
    href: '#',
  },
  {
    id: 'Instagram',
    name: 'اینستاگرام',
    icon: <FaInstagram />,
    href: '#',
  },
];

export const SOCIALS_DATA = socials;

const SocialsShare: FC<SocialsShareProps> = ({
  className = 'grid gap-[6px]',
  itemClass = 'w-7 h-7 text-base hover:bg-neutral-100',
}) => {
  const renderItem = (item: SocialType, index: number) => {
    return (
      <a
        key={index}
        href={item.href}
        className={`rounded-full leading-none flex items-center justify-center text-neutral-6000 ${itemClass}`}
        title={`Share on ${item.name}`}
      >
        {item.icon}
      </a>
    );
  };

  return (
    <div className={`nc-SocialsShare ${className}`} data-nc-id="SocialsShare">
      {socials.map(renderItem)}
    </div>
  );
};

export default SocialsShare;