import { Vazirmatn } from 'next/font/google';
import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/toaster';

import './globals.css';
import '@/styles/index.scss';

import { auth } from '@/auth';

export const metadata: Metadata = {
  title: 'Biotak',
  description: 'بازارهای مالی',
};

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-vazirmatn',
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="fa-IR" dir="rtl" className={`${vazirmatn.variable} rtl`}>
      <body className={vazirmatn.className}>
        <SessionProvider session={session}>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
