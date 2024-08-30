import type React from 'react';
import Logo from '@/components/Logo/Logo';
import SocialsList from '@/components/SocialsList/SocialsList';
import type { CustomLink } from '@/data/types';
import { SOCIALS_DATA } from '../SocialsShare/SocialsShare';
// import MusicPlayer from "../MusicPlayer/MusicPlayer";

export interface WidgetFooterMenu {
  id: string;
  title: string;
  menus: CustomLink[];
}

const widgetMenus: WidgetFooterMenu[] = [
  {
    id: '5',
    title: 'شروع کار',
    menus: [
      { href: '/', label: 'نصب و راه‌اندازی' },
      { href: '/', label: 'یادداشت‌های انتشار' },
      { href: '/', label: 'راهنمای ارتقا' },
      { href: '/', label: 'پشتیبانی مرورگر' },
      { href: '/', label: 'پشتیبانی ویرایشگر' },
    ],
  },
  {
    id: '1',
    title: 'کاوش',
    menus: [
      { href: '/', label: 'ویژگی‌های طراحی' },
      { href: '/', label: 'نمونه‌سازی' },
      { href: '/', label: 'سیستم‌های طراحی' },
      { href: '/', label: 'قیمت‌گذاری' },
      { href: '/', label: 'مشتریان' },
    ],
  },
  {
    id: '2',
    title: 'منابع',
    menus: [
      { href: '/', label: 'بهترین شیوه‌ها' },
      { href: '/', label: 'پشتیبانی' },
      { href: '/', label: 'توسعه‌دهندگان' },
      { href: '/', label: 'آموزش طراحی' },
      { href: '/', label: 'تازه‌ها' },
    ],
  },
  {
    id: '4',
    title: 'جامعه',
    menus: [
      { href: '/', label: 'انجمن‌های گفتگو' },
      { href: '/', label: 'قوانین رفتاری' },
      { href: '/', label: 'منابع جامعه' },
      { href: '/', label: 'مشارکت' },
      { href: '/', label: 'حالت همزمان' },
    ],
  },
];

const Footer: React.FC = () => {
  const renderWidgetMenuItem = (menu: WidgetFooterMenu, index: number) => {
    return (
      <div key={index} className="text-sm">
        <h2 className="font-semibold text-neutral-700 dark:text-neutral-200">{menu.title}</h2>
        <ul className="mt-5 space-y-4">
          {menu.menus.map((item, index) => (
            <li key={index}>
              <a
                className="text-neutral-6000 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                href={item.href}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <>
      {/* music player */}
      {/* <MusicPlayer /> */}

      {/* footer */}
      <div
        dir="rtl"
        className="nc-Footer relative py-16 lg:py-28 border-t border-neutral-200 dark:border-neutral-700"
      >
        <div className="container grid grid-cols-2 gap-y-10 gap-x-5 sm:gap-x-8 md:grid-cols-4 lg:grid-cols-5 lg:gap-x-10">
          <div className="grid grid-cols-4 gap-5 col-span-2 md:col-span-4 lg:md:col-span-1 lg:flex lg:flex-col">
            <div className="col-span-2 md:col-span-1">
              <Logo />
            </div>
            <div className="col-span-2 flex items-center md:col-span-3">
              <SocialsList
                socials={SOCIALS_DATA}
                className="flex items-center  lg:space-x-0 space-x-reverse lg:flex-col lg:space-y-2 lg:items-start"
              />
            </div>
          </div>
          {widgetMenus.map(renderWidgetMenuItem)}
        </div>
      </div>
    </>
  );
};

export default Footer;
