// navigation.ts
import type { Route } from '@/routers/types';

export const NAVBAR_LINKS = [
  {
    id: '0',
    href: '/',
    name: 'صفحه اصلی',
  },

  {
    id: '1',
    href: '/blog' as Route,
    name: 'وبلاگ',
  },

  {
    id: '2',
    href: '/exchanges',
    name: 'بازار',
  },
  {
    id: '3',
    href: '/about',
    name: 'درباره ما',
  },
  {
    id: '4',
    href: '/contact',
    name: 'تماس با ما',
  },
] as const;
