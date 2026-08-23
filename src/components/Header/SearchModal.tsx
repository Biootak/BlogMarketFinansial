'use client';

import { Combobox, Dialog, Transition } from '@headlessui/react';
import { Search as SearchIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type FC, Fragment, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  HiOutlineClock,
  HiOutlineHashtag,
  HiOutlineLifebuoy,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';

import { searchAll } from '@/actions/search';
import Empty from '@/components/Empty';
import { getPostLink } from '@/lib/getPostLink';
import type { CategoryWithPostCount, PostWithRelations, UserWithProfile } from '@/types/types';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface Props {
  renderTrigger?: () => ReactNode;
  /** Controlled open state — used by the lazy wrapper to defer headlessui. */
  open?: boolean;
  onClose?: () => void;
}

const SearchModal: FC<Props> = ({ renderTrigger, open: controlledOpen, onClose: onCloseProp }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const [rawQuery, setRawQuery] = useState('');
  const [posts, setPosts] = useState<PostWithRelations[]>([]);
  const [categories, setCategories] = useState<CategoryWithPostCount[]>([]);
  const [authors, setAuthors] = useState<UserWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const handleClose = useCallback(() => {
    setRawQuery('');
    setPosts([]);
    setCategories([]);
    setAuthors([]);
    if (isControlled) {
      onCloseProp?.();
    } else {
      setInternalOpen(false);
    }
  }, [isControlled, onCloseProp]);

  // Prevent body scroll when the modal opens. Layout shift is already handled
  // globally by `html { scrollbar-gutter: stable }` (__theme_custom.scss): the
  // gutter stays reserved while the scrollbar hides, so no manual padding
  // compensation is needed — measuring innerWidth/clientWidth here forced a
  // synchronous reflow on every open, and with the reserved gutter it would
  // now double-compensate and leave an extra gap on the inline-end side.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
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
    } catch {
      // silent failure — search UI handles empty state gracefully
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

  // Selected combobox value — every option carries an `href` plus its own
  // record fields (post/category/author), so the handler only reads href.
  type ComboboxValue = { href?: string } & Record<string, unknown>;

  const handleItemSelect = useCallback(
    (item: ComboboxValue | null) => {
      if (item?.href) {
        if (item.href.startsWith('/category')) {
          router.push(`/archive/${item.href.split('/').pop()}`);
        } else {
          router.push(item.href);
        }
        handleClose();
      }
    },
    [router, handleClose],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isControlled) {
            onCloseProp?.();
          } else {
            setInternalOpen(true);
          }
        }}
        className="
          relative
          flex items-center justify-center
          size-10 rounded-xl
          text-neutral-600 dark:text-neutral-300
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
          transition-colors duration-200
        "
        aria-label="جستجو"
      >
        {renderTrigger ? renderTrigger() : <HiOutlineMagnifyingGlass className="size-5" />}
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
                        absolute end-5 top-1/2 -translate-y-1/2
                        w-10 h-10 rounded-xl
                        flex items-center justify-center
                        bg-gradient-to-br from-primary-50 to-primary-100/80
                        dark:from-primary-900/40 dark:to-primary-800/30
                      "
                    >
                      <HiOutlineMagnifyingGlass
                        className="h-5 w-5 text-primary-600 dark:text-primary-400"
                        aria-hidden="true"
                      />
                    </div>
                    <Combobox.Input
                      className="
                        h-16 w-full border-0 bg-transparent
                        pe-20 ps-6
                        text-neutral-900 dark:text-white
                        placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                        focus:ring-0 text-base text-end
                      "
                      placeholder="جستجوی پست، دسته‌بندی یا نویسنده..."
                      onChange={(event) => setRawQuery(event.target.value)}
                      autoComplete="off"
                    />
                    {isLoading && (
                      <div className="absolute start-5 top-1/2 -translate-y-1/2">
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
                                        <HiOutlineClock
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
                                        <HiOutlineHashtag
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
                                        src={author.image || '/images/default-avatar.png'}
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
                        <HiOutlineLifebuoy className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="text-base font-semibold text-neutral-900 dark:text-white mb-2">
                        راهنمای جستجو
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                        حداقل ۲ کاراکتر وارد کنید تا جستجو شروع شود.
                      </p>
                    </div>
                  )}

                  {/* Empty State — canonical Empty (site-level) */}
                  {!isLoading &&
                    rawQuery.length >= 2 &&
                    rawQuery !== '?' &&
                    posts.length === 0 &&
                    categories.length === 0 &&
                    authors.length === 0 && (
                      <Empty
                        icon={SearchIcon}
                        title="نتیجه‌ای یافت نشد"
                        description="عبارت دیگری را جستجو کنید"
                        className="py-10"
                      />
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
                          router.push(`/search?q=${encodeURIComponent(rawQuery)}`);
                          handleClose();
                        } else {
                          router.push('/search');
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
                      {rawQuery.length >= 2 ? `مشاهده همه نتایج «${rawQuery}»` : 'صفحه جستجو'}
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
