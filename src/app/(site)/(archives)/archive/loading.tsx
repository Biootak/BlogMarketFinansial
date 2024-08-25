import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import CardSkeleton from '@/components/Skeletons/CardSkeleton';

const Loading = () => {
  return (
    <div className="nc-PageArchive">
      <div className="w-full px-2 xl:max-w-screen-2xl mx-auto">
        <div className="relative aspect-w-16 aspect-h-13 sm:aspect-h-9 lg:aspect-h-8 xl:aspect-h-5 rounded-3xl md:rounded-[40px] overflow-hidden z-0">
          <Skeleton className="absolute inset-0 bg-neutral-300 dark:bg-neutral-700" />
        </div>
      </div>

      <div className="container pt-10 pb-16 lg:pb-28 lg:pt-20 space-y-16 lg:space-y-28">
        <div>
          <div className="flex flex-col sm:justify-between sm:flex-row">
            <div className="flex space-x-2.5 rtl:space-x-reverse">
              <Skeleton className="w-28 h-10 rounded-full bg-primary-100 dark:bg-primary-800" />
              <Skeleton className="w-28 h-10 rounded-full bg-secondary-100 dark:bg-secondary-800" />
            </div>
            <Skeleton className="w-40 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 mt-4 sm:mt-0" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 mt-8 lg:mt-10">
            {Array(12)
              .fill(null)
              .map((_, index) => (
                <CardSkeleton key={index} />
              ))}
          </div>

          <div className="flex flex-col mt-12 lg:mt-16 space-y-5 sm:space-y-0 sm:space-x-3 sm:flex-row sm:justify-between sm:items-center">
            <Skeleton className="h-10 w-48 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
            <Skeleton className="h-12 w-36 bg-primary-100 dark:bg-primary-800 rounded-full" />
          </div>
        </div>

        {/* Skeleton for MORE SECTIONS */}
        <div className="relative py-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6 md:gap-8">
            {Array(8)
              .fill(null)
              .map((_, index) => (
                <Skeleton
                  key={index}
                  className="w-full h-40 rounded-2xl bg-neutral-200 dark:bg-neutral-700"
                />
              ))}
          </div>
          <div className="text-center mx-auto mt-10 md:mt-16">
            <Skeleton className="h-12 w-36 mx-auto bg-secondary-100 dark:bg-secondary-800 rounded-full" />
          </div>
        </div>

        {/* Skeleton for SECTION 5 */}
        <div className="relative py-16">
          <Skeleton className="h-8 w-64 mb-4 mx-auto bg-neutral-200 dark:bg-neutral-700" />
          <Skeleton className="h-4 w-96 mb-10 mx-auto bg-neutral-100 dark:bg-neutral-800" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array(4)
              .fill(null)
              .map((_, index) => (
                <div key={index} className="flex flex-col items-center">
                  <Skeleton className="w-20 h-20 rounded-full mb-3 bg-neutral-300 dark:bg-neutral-600" />
                  <Skeleton className="h-4 w-24 mb-2 bg-neutral-200 dark:bg-neutral-700" />
                  <Skeleton className="h-3 w-16 bg-neutral-100 dark:bg-neutral-800" />
                </div>
              ))}
          </div>
        </div>

        {/* Skeleton for SUBCRIBES */}
        <div className="relative py-16">
          <Skeleton className="h-8 w-64 mb-4 mx-auto bg-neutral-200 dark:bg-neutral-700" />
          <Skeleton className="h-4 w-96 mb-10 mx-auto bg-neutral-100 dark:bg-neutral-800" />
          <Skeleton className="h-12 w-48 mx-auto bg-primary-100 dark:bg-primary-800 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default Loading;
