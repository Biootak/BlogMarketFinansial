'use client';

import { Combobox, Dialog, Transition } from '@headlessui/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FC, Fragment, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Hash, LifeBuoy, Search } from 'lucide-react';;;

import { searchAll } from '@/actions/search';
import { getPostLink } from '@/lib/getPostLink';
import type { CategoryWithPostCount, PostWithRelations, UserWithProfile } from '@/types/types';

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

interface Props {
  renderTrigger?: () => ReactNode;
}

const SearchModal: FC<Props> = ({ renderTrigger }) => {
  const [open, setOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState('');
  const [posts, setPosts] = useState<PostWithRelations[]>([]);
  const [categories, setCategories] = useState<CategoryWithPostCount[]>([]);
  const [authors, setAuthors] = useState<UserWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Prevent body scroll and layout shift when modal opens
  useEffect(() => {
    if (open) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [open]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setPosts([]);
      setCategories([]);
      setAuthors([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await searchAll(searchQuery);
      if (result.success && result.data) {
        setPosts(result.data.posts as PostWithRelations[]);
        setCategories(result.data.categories as CategoryWithPostCount[]);
        setAuthors(result.data.authors as UserWithProfile[]);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Optimized debounce - 150ms instead of 300ms
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (rawQuery && rawQuery !== '#' && rawQuery !== '>' && rawQuery !== '?') {
      debounceRef.current = setTimeout(() => {
        handleSearch(rawQuery);
      }, 150);
    } else {
      setPosts([]);
      setCategories([]);
      setAuthors([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [rawQuery, handleSearch]);

  const handleItemSelect = useCallback(
    (item: any) => {
      if (item?.href) {
        if (item.href.startsWith('/category')) {
          router.push(`/archive/${item.href.split('/').pop()}`);
        } else {
          router.push(item.href);
        }
        setOpen(false);
      }
    },
    [router],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setRawQuery('');
    setPosts([]);
    setCategories([]);
    setAuthors([]);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          relative w-11 h-11 rounded-2xl
          flex items-center justify-center
          text-slate-600 dark:text-slate-300
          bg-gradient-to-br from-slate-50 to-slate-100/80
          dark:from-slate-800/90 dark:to-slate-900/80
          border border-slate-200/60 dark:border-slate-700/50
          shadow-sm hover:shadow-md
          hover:border-slate-300/80 dark:hover:border-slate-600/60
          hover:from-white hover:to-slate-50
          dark:hover:from-slate-700/90 dark:hover:to-slate-800/80
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
          transition-all duration-200 ease-out
        "
        aria-label="جستجو"
      >
        {renderTrigger ? renderTrigger() : <Search className="w-5 h-5" />}
      </button>

      <Transition.Root show={open} as={Fragment} appear>
        <Dialog as="div" className="relative z-[99]" onClose={handleClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className="
                  mx-auto max-w-2xl
                  overflow-hidden rounded-3xl
                  bg-white/98 dark:bg-neutral-900/98
                  backdrop-blur-xl backdrop-saturate-150
                  border border-white/20 dark:border-neutral-700/50
                  shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]
                  dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]
                "
              >
                <Combobox onChange={handleItemSelect}>
                  {/* Search Input */}
                  <div className="relative border-b border-neutral-100 dark:border-neutral-800">
                    <div
                      className="
                        absolute right-5 top-1/2 -translate-y-1/2
                        w-10 h-10 rounded-xl
                        flex items-center justify-center
                        bg-gradient-to-br from-primary-50 to-primary-100/80
                        dark:from-primary-900/40 dark:to-primary-800/30
                      "
                    >
                      <Search 
                        className="h-5 w-5 text-primary-600 dark:text-primary-400"
                        aria-hidden="true"
                      />
                    </div>
                    <Combobox.Input
                      className="
                        h-16 w-full border-0 bg-transparent
                        pr-20 pl-6
                        text-neutral-900 dark:text-white
                        placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                        focus:ring-0 text-base text-right
                      "
                      placeholder="جستجوی پست، دسته‌بندی یا نویسنده..."
                      onChange={(event) => setRawQuery(event.target.value)}
                      autoComplete="off"
                    />
                    {isLoading && (
                      <div className="absolute left-5 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Results */}
                  {!isLoading &&
                    (posts.length > 0 || categories.length > 0 || authors.length > 0) && (
                      <Combobox.Options
                        static
                        className="max-h-[400px] overflow-y-auto p-3 space-y-4"
                      >
                        {/* Posts */}
                        {posts.length > 0 && (
                          <li>
                            <h2 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-3 mb-2">
                              پست‌ها
                            </h2>
                            <ul className="space-y-1">
                              {posts.map((post) => (
                                <Combobox.Option
                                  key={post.id}
                                  value={{ href: getPostLink(post.postType, post.slug), ...post }}
                                  className={({ active }) =>
                                    classNames(
                                      'flex select-none items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200',
                                      active
                                        ? 'bg-gradient-to-l from-primary-50 to-primary-100/50 dark:from-primary-900/40 dark:to-primary-800/20'
                                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
                                    )
                                  }
                                >
                                  {({ active }) => (
                                    <>
                                      <span
                                        className={classNames(
                                          'flex items-center justify-center w-9 h-9 rounded-xl transition-colors',
                                          active
                                            ? 'bg-primary-100 dark:bg-primary-900/60'
                                            : 'bg-neutral-100 dark:bg-neutral-800',
                                        )}
                                      >
                                        <Clock 
                                          className={classNames(
                                            'h-5 w-5 transition-colors',
                                            active
                                              ? 'text-primary-600 dark:text-primary-400'
                                              : 'text-neutral-400 dark:text-neutral-500',
                                          )}
                                        />
                                      </span>
                                      <span
                                        className={classNames(
                                          'flex-auto truncate text-sm font-medium transition-colors',
                                          active
                                            ? 'text-primary-700 dark:text-primary-300'
                                            : 'text-neutral-700 dark:text-neutral-200',
                                        )}
                                      >
                                        {post.title}
                                      </span>
                                    </>
                                  )}
                                </Combobox.Option>
                              ))}
                            </ul>
                          </li>
                        )}

                        {/* Categories */}
                        {categories.length > 0 && (
                          <li>
                            <h2 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-3 mb-2">
                              دسته‌بندی‌ها
                            </h2>
                            <ul className="space-y-1">
                              {categories.map((category) => (
                                <Combobox.Option
                                  key={category.id}
                                  value={{ href: `/category/${category.slug}`, ...category }}
                                  className={({ active }) =>
                                    classNames(
                                      'flex select-none items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200',
                                      active
                                        ? 'bg-gradient-to-l from-primary-50 to-primary-100/50 dark:from-primary-900/40 dark:to-primary-800/20'
                                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
                                    )
                                  }
                                >
                                  {({ active }) => (
                                    <>
                                      <span
                                        className={classNames(
                                          'flex items-center justify-center w-9 h-9 rounded-xl transition-colors',
                                          active
                                            ? 'bg-primary-100 dark:bg-primary-900/60'
                                            : 'bg-neutral-100 dark:bg-neutral-800',
                                        )}
                                      >
                                        <Hash 
                                          className={classNames(
                                            'h-5 w-5 transition-colors',
                                            active
                                              ? 'text-primary-600 dark:text-primary-400'
                                              : 'text-neutral-400 dark:text-neutral-500',
                                          )}
                                        />
                                      </span>
                                      <span
                                        className={classNames(
                                          'flex-auto truncate text-sm font-medium transition-colors',
                                          active
                                            ? 'text-primary-700 dark:text-primary-300'
                                            : 'text-neutral-700 dark:text-neutral-200',
                                        )}
                                      >
                                        {category.name}
                                      </span>
                                    </>
                                  )}
                                </Combobox.Option>
                              ))}
                            </ul>
                          </li>
                        )}

                        {/* Authors */}
                        {authors.length > 0 && (
                          <li>
                            <h2 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-3 mb-2">
                              نویسندگان
                            </h2>
                            <ul className="space-y-1">
                              {authors.map((author) => (
                                <Combobox.Option
                                  key={author.id}
                                  value={{ href: `/author/${author.id}`, ...author }}
                                  className={({ active }) =>
                                    classNames(
                                      'flex select-none items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200',
                                      active
                                        ? 'bg-gradient-to-l from-primary-50 to-primary-100/50 dark:from-primary-900/40 dark:to-primary-800/20'
                                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
                                    )
                                  }
                                >
                                  {({ active }) => (
                                    <>
                                      <Image
                                        src={author.image || '/default-avatar.png'}
                                        alt={author.name || 'نویسنده'}
                                        className={classNames(
                                          'h-9 w-9 flex-none rounded-xl object-cover transition-all',
                                          active ? 'ring-2 ring-primary-500/50' : '',
                                        )}
                                        width={36}
                                        height={36}
                                      />
                                      <span
                                        className={classNames(
                                          'flex-auto truncate text-sm font-medium transition-colors',
                                          active
                                            ? 'text-primary-700 dark:text-primary-300'
                                            : 'text-neutral-700 dark:text-neutral-200',
                                        )}
                                      >
                                        {author.name || author.email}
                                      </span>
                                    </>
                                  )}
                                </Combobox.Option>
                              ))}
                            </ul>
                          </li>
                        )}
                      </Combobox.Options>
                    )}

                  {/* Help Section */}
                  {rawQuery === '?' && (
                    <div className="py-12 px-6 text-center">
                      <div
                        className="
                          w-14 h-14 mx-auto mb-4 rounded-2xl
                          bg-gradient-to-br from-amber-100 to-amber-200/80
                          dark:from-amber-900/40 dark:to-amber-800/30
                          flex items-center justify-center
                        "
                      >
                        <LifeBuoy className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="text-base font-semibold text-neutral-900 dark:text-white mb-2">
                        راهنمای جستجو
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                        حداقل ۲ کاراکتر وارد کنید تا جستجو شروع شود.
                      </p>
                    </div>
                  )}

                  {/* Empty State */}
                  {!isLoading &&
                    rawQuery.length >= 2 &&
                    rawQuery !== '?' &&
                    posts.length === 0 &&
                    categories.length === 0 &&
                    authors.length === 0 && (
                      <div className="py-12 px-6 text-center">
                        <div
                          className="
                            w-14 h-14 mx-auto mb-4 rounded-2xl
                            bg-gradient-to-br from-neutral-100 to-neutral-200/80
                            dark:from-neutral-800 dark:to-neutral-700/80
                            flex items-center justify-center
                          "
                        >
                          <Search className="h-7 w-7 text-neutral-400 dark:text-neutral-500" />
                        </div>
                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                          نتیجه‌ای یافت نشد
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                          عبارت دیگری را جستجو کنید
                        </p>
                      </div>
                    )}

                  {/* Footer */}
                  <div
                    className="
                      flex items-center justify-between
                      bg-neutral-50/80 dark:bg-neutral-800/50
                      border-t border-neutral-100 dark:border-neutral-800
                      py-3 px-4 text-xs text-neutral-500 dark:text-neutral-400
                    "
                  >
                    <span>حداقل ۲ کاراکتر</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (rawQuery.length >= 2) {
                          router.push(`/archive?q=${encodeURIComponent(rawQuery)}`);
                          handleClose();
                        } else {
                          router.push('/archive');
                          handleClose();
                        }
                      }}
                      className="
                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                        bg-primary-50 dark:bg-primary-900/30
                        text-primary-600 dark:text-primary-400
                        hover:bg-primary-100 dark:hover:bg-primary-900/50
                        font-medium transition-colors
                      "
                    >
                      {rawQuery.length >= 2 ? `جستجوی "${rawQuery}" در آرشیو` : 'صفحه آرشیو'}
                    </button>
                  </div>
                </Combobox>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
};

export default SearchModal;
