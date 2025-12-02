import { Vazirmatn } from 'next/font/google';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';

import './globals.css';
import '@/styles/index.scss';

import { auth } from '@/auth';
import Providers from '@/components/providers';

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="fa-IR" dir="rtl" className={`${vazirmatn.variable} rtl`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  // Default to light theme
                  if (theme !== 'dark') {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={vazirmatn.className}>
        <Providers session={session}>
          <div className="bg-[#f8f8f8] text-base dark:bg-neutral-900/95 text-neutral-900 dark:text-neutral-200">
            {children}
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  );
}
