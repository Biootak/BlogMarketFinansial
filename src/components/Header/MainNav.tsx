import Logo from '@/components/Logo/Logo';
import MenuBar from '@/components/MenuBar/MenuBar';
import Navigation from '@/components/Navigation/Navigation';
import AvatarDropdown from './AvatarDropdown';
import NotifyDropdown from './NotifyDropdown';
import SearchModal from './SearchModal';
import { auth } from '@/auth';
import Link from 'next/link';
import { User, Sparkles } from 'lucide-react';

export default async function MainNav() {
  const session = await auth();

  return (
    <nav className="relative z-10">
      <div className="container">
        <div className="h-16 sm:h-[72px] flex items-center justify-between gap-2 sm:gap-4">
          {/* Right Side - Menu (Mobile) */}
          <div className="flex items-center gap-1">
            {/* Mobile Menu */}
            <div className="lg:hidden">
              <div className="p-2 -mr-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all duration-300">
                <MenuBar />
              </div>
            </div>
          </div>

          {/* Center - Logo */}
          <div className="flex items-center justify-center flex-1 lg:flex-none lg:justify-start">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary-500/20 to-indigo-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <Logo variant="modern" />
            </div>
          </div>

          {/* Navigation - Desktop */}
          <div className="hidden lg:flex justify-center flex-1 mx-8">
            <div className="relative">
              <Navigation />
            </div>
          </div>

          {/* Left Side - User/Auth (Mobile) | Auth + Actions (Desktop) */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile Auth/User */}
            <div className="lg:hidden">
              {!session?.user ? (
                <Link
                  href="/signin"
                  className="group relative p-2 -ml-2 inline-flex items-center justify-center rounded-xl transition-all duration-300 hover:bg-primary-50 dark:hover:bg-primary-950/50"
                  aria-label="ورود به حساب کاربری"
                >
                  <User className="size-5 text-neutral-600 dark:text-neutral-300" strokeWidth={1.8} />
                </Link>
              ) : (
                <div className="p-1 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all duration-300">
                  <AvatarDropdown />
                </div>
              )}
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2">
              {!session?.user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/signin"
                    className="group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600" />
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="absolute inset-0 rounded-xl shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/50 transition-shadow duration-300" />
                    <Sparkles className="relative size-4" />
                    <span className="relative">ورود</span>
                  </Link>
                  <Link
                    href="/signup"
                    className="group relative inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500 to-indigo-500 p-[1.5px]">
                      <span className="absolute inset-[1.5px] rounded-[10px] bg-white dark:bg-neutral-900" />
                    </span>
                    <span className="absolute inset-[1.5px] rounded-[10px] bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-950/50 dark:to-indigo-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative text-primary-600 dark:text-primary-400">ثبت‌نام</span>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="p-1 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all duration-300">
                    <SearchModal />
                  </div>
                  <div className="p-1 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all duration-300">
                    <NotifyDropdown />
                  </div>
                  <div className="p-1 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all duration-300">
                    <AvatarDropdown />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
