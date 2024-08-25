import React from 'react';
import Logo from '@/components/Logo/Logo';
import MenuBar from '@/components/MenuBar/MenuBar';
import Navigation from '@/components/Navigation/Navigation';
import AvatarDropdown from './AvatarDropdown';
import NotifyDropdown from './NotifyDropdown';
import SearchModal from './SearchModal';
import { auth } from '@/auth';
import Link from 'next/link';

export default async function MainNav() {
  const session = await auth();

  return (
    <nav className="nc-MainNav relative z-10 bg-white dark:bg-neutral-900 border-b border-slate-100 dark:border-slate-700">
      <div className="container mx-auto px-4">
        <div className="h-20 flex items-center justify-between">
          <div className="flex items-center lg:hidden">
            <MenuBar />
          </div>

          <div className="flex items-center">
            <Logo />
          </div>

          <div className="hidden lg:flex justify-center flex-grow mx-4">
            <Navigation />
          </div>

          <div className="flex items-center">
            {!session?.user ? (
              <div className="flex items-center space-x-4 gap-2">
                <Link
                  href="/signin"
                  className="nc-Button relative h-auto inline-flex items-center justify-center rounded-full transition-colors text-sm sm:text-base font-medium px-4 py-2 sm:px-6 ttnc-ButtonPrimary disabled:bg-opacity-70 bg-primary-6000 hover:bg-primary-700 text-neutral-50"
                >
                  ورود
                </Link>
                <Link
                  href="/signup"
                  className="nc-Button relative h-auto inline-flex items-center justify-center rounded-full transition-colors text-sm sm:text-base font-medium px-4 py-2 sm:px-6 ttnc-ButtonSecondary border bg-white border-neutral-200 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  ثبت‌نام
                </Link>
              </div>
            ) : (
              <>
                <SearchModal />
                <NotifyDropdown />
                <AvatarDropdown />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
