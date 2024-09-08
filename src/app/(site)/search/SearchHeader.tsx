'use client';

import type React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiArrowRight } from 'react-icons/hi2';
import NcImage from '@/components/NcImage/NcImage';
import Input from '@/components/Input/Input';
import ButtonCircle from '@/components/Button/ButtonCircle';

interface SearchHeaderProps {
  initialSearchQuery: string;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({ initialSearchQuery }) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="w-screen px-2 xl:max-w-screen-2xl mx-auto">
      <div className="rounded-3xl md:rounded-[40px] relative aspect-w-16 aspect-h-9 lg:aspect-h-5 overflow-hidden z-0">
        <NcImage
          alt="search"
          fill
          containerClassName="absolute inset-0"
          src="https://images.pexels.com/photos/2138922/pexels-photo-2138922.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260"
          className="object-cover w-full h-full"
          sizes="(max-width: 1280px) 100vw, 1536px"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40" />
      </div>
      <div className="relative container -mt-20 lg:-mt-48">
        <div className="bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 p-5 lg:p-16 rounded-[40px] shadow-2xl flex items-center">
          <header className="w-full max-w-3xl mx-auto text-center flex flex-col items-center">
            <h2 className="text-2xl sm:text-4xl font-semibold text-neutral-900 dark:text-neutral-100">
              {searchQuery}
            </h2>
            <span className="block text-xs sm:text-sm mt-4 text-neutral-500 dark:text-neutral-300">
              ما{' '}
              <strong className="font-medium text-neutral-800 dark:text-neutral-100">1135</strong>{' '}
              نتیجه برای{' '}
              <strong className="font-medium text-neutral-800 dark:text-neutral-100">
                {searchQuery}
              </strong>{' '}
              پیدا کردیم
            </span>
            <form className="relative w-full mt-8 sm:mt-11 text-left" onSubmit={handleSubmit}>
              <label htmlFor="search-input" className="text-neutral-500 dark:text-neutral-300">
                <span className="sr-only">جستجو در تمام آیکون‌ها</span>
                <Input
                  id="search-input"
                  type="search"
                  placeholder="تایپ کنید و اینتر را بزنید"
                  className="shadow-lg rounded-full border-neutral-200 dark:border-neutral-700"
                  sizeClass="pl-14 py-5 pe-5 md:ps-16"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <ButtonCircle
                  className="absolute end-2.5 top-1/2 transform -translate-y-1/2"
                  size="w-11 h-11"
                  type="submit"
                >
                  <HiArrowRight className="w-5 h-5 rtl:rotate-180" />
                </ButtonCircle>
                <span className="absolute start-5 top-1/2 transform -translate-y-1/2 text-2xl md:start-6">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M19.25 19.25L15.5 15.5M4.75 11C4.75 7.54822 7.54822 4.75 11 4.75C14.4518 4.75 17.25 7.54822 17.25 11C17.25 14.4518 14.4518 17.25 11 17.25C7.54822 17.25 4.75 14.4518 4.75 11Z"
                    ></path>
                  </svg>
                </span>
              </label>
            </form>
          </header>
        </div>
      </div>
    </div>
  );
};

export default SearchHeader;
