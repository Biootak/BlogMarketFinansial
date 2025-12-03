import React from 'react';
import Logo from '@/components/Logo/Logo';
import MenuBar from '@/components/MenuBar/MenuBar';
import Navigation from '@/components/Navigation/Navigation';
import AvatarDropdown from './AvatarDropdown';
import NotifyDropdown from './NotifyDropdown';
import SearchModal from './SearchModal';
import { auth } from '@/auth';
import Link from 'next/link';
import { User } from 'lucide-react';

export default async function MainNav() {
  const session = await auth();

  return (
    <nav className="nc-MainNav relative z-10 bg-white dark:bg-neutral-900 border-b border-slate-100 dark:border-slate-700">
      <div className="container">
        <div className="h-20 flex items-center justify-between">
          <div className="flex items-center lg:hidden">
            <MenuBar />
          </div>

          <div className="flex-1 flex items-center justify-center lg:justify-start">
            <Logo variant="modern" />
          </div>

          <div className="hidden lg:flex justify-center flex-grow mx-4">
            <Navigation />
          </div>

          <div className="flex items-center">
            {!session?.user && (
              <div className="hidden sm:flex items-center space-x-4 gap-2">
                <Link
                  href="/signin"
                  className="nc-Button relative h-auto inline-flex items-center justify-center rounded-full transition-colors text-sm sm:text-base font-medium px-4 py-2 sm:px-6 disabled:bg-opacity-70 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 hover:from-primary-600 hover:via-primary-700 hover:to-primary-800 text-white shadow-sm"
                >
                  ورود
                </Link>
                <Link
                  href="/signup"
                  className="nc-Button relative h-auto inline-flex items-center justify-center rounded-full transition-colors text-sm sm:text-base font-medium px-4 py-2 sm:px-6 border bg-white hover:bg-primary-50 border-primary-500 text-primary-600 dark:bg-neutral-900 dark:text-primary-400 dark:border-primary-500 dark:hover:bg-neutral-800"
                >
                  ثبت‌نام
                </Link>
              </div>
            )}
            {/* Mobile login/signup */}
            {!session?.user && (
              <div className="sm:hidden">
                <Link
                  href="/signin"
                  className="p-1.5 inline-flex items-center justify-center rounded-full hover:bg-primary-50 dark:hover:bg-primary-950/50"
                  aria-label="ورود به حساب کاربری"
                >
                  <User className="size-[26px] text-primary-600 dark:text-primary-400" strokeWidth={1.8} />
                </Link>
              </div>
            )}
            {session?.user && (
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
