export default function OnlinePaymentLoading() {
  return (
    <main className="min-h-screen bg-white dark:bg-neutral-900 animate-pulse">
      {/* Hero Skeleton */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
            <div className="lg:w-1/2 text-center lg:text-right">
              <div className="h-8 w-32 bg-neutral-200 dark:bg-neutral-700 rounded-full mx-auto lg:mx-0 mb-6" />
              <div className="h-14 w-full max-w-md bg-neutral-200 dark:bg-neutral-700 rounded-lg mx-auto lg:mx-0 mb-4" />
              <div className="h-14 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded-lg mx-auto lg:mx-0 mb-6" />
              <div className="h-6 w-full max-w-lg bg-neutral-200 dark:bg-neutral-700 rounded mx-auto lg:mx-0 mb-2" />
              <div className="h-6 w-5/6 bg-neutral-200 dark:bg-neutral-700 rounded mx-auto lg:mx-0 mb-8" />
              <div className="flex gap-4 justify-center lg:justify-start">
                <div className="h-14 w-36 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
                <div className="h-14 w-36 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
              </div>
            </div>
            <div className="lg:w-1/2">
              <div className="h-80 w-full max-w-lg bg-neutral-200 dark:bg-neutral-700 rounded-2xl mx-auto" />
            </div>
          </div>
          <div className="mt-16 flex justify-center gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
            ))}
          </div>
        </div>
      </section>

      {/* Services Skeleton */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-700 rounded-full mx-auto mb-4" />
            <div className="h-10 w-64 bg-neutral-200 dark:bg-neutral-700 rounded-lg mx-auto mb-4" />
            <div className="h-5 w-96 bg-neutral-200 dark:bg-neutral-700 rounded mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="p-8 bg-neutral-100 dark:bg-neutral-800 rounded-2xl"
              >
                <div className="h-14 w-14 bg-neutral-200 dark:bg-neutral-700 rounded-xl mb-6" />
                <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-700 rounded mb-3" />
                <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
                <div className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Skeleton */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="p-12 bg-neutral-200 dark:bg-neutral-700 rounded-3xl">
            <div className="h-8 w-48 bg-neutral-300 dark:bg-neutral-600 rounded-lg mx-auto mb-4" />
            <div className="h-5 w-72 bg-neutral-300 dark:bg-neutral-600 rounded mx-auto mb-10" />
            <div className="flex justify-center gap-4">
              <div className="h-14 w-44 bg-neutral-300 dark:bg-neutral-600 rounded-xl" />
              <div className="h-14 w-44 bg-neutral-300 dark:bg-neutral-600 rounded-xl" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
