import { Skeleton } from '@/components/ui/skeleton';

export default function CardLarge1Skeleton() {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 p-1.5 sm:p-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 lg:gap-4">
        {/* Main Card Skeleton */}
        <div className="lg:col-span-8">
          <div className="relative h-[320px] sm:h-[400px] lg:h-[480px] rounded-2xl overflow-hidden">
            <Skeleton className="absolute inset-0" />

            {/* Badge Skeleton */}
            <div className="absolute top-4 sm:top-6 start-4 sm:start-6 z-10">
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>

            {/* Content Skeleton */}
            <div className="absolute bottom-0 start-0 end-0 p-4 sm:p-6 lg:p-8 z-10">
              <Skeleton className="h-6 w-20 rounded-lg mb-3" />
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-8 w-3/4 mb-4" />

              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>

            {/* Dots Skeleton */}
            <div className="absolute bottom-4 sm:bottom-6 end-4 sm:end-6 flex items-center gap-2 z-10">
              <Skeleton className="h-2 w-8 rounded-full" />
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-2 w-2 rounded-full" />
            </div>
          </div>
        </div>

        {/* Side Cards Skeleton */}
        <div className="lg:col-span-4 flex flex-row lg:flex-col gap-2 sm:gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="relative flex-1 h-[160px] sm:h-[180px] lg:h-auto rounded-2xl overflow-hidden"
            >
              <Skeleton className="absolute inset-0" />

              <div className="absolute bottom-0 start-0 end-0 p-3 sm:p-4 z-10">
                <Skeleton className="h-4 w-16 rounded-md mb-2" />
                <Skeleton className="h-5 w-full mb-1" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
