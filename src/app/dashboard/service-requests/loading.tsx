export default function ServiceRequestsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-64 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
        <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-700 rounded mt-2" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
        ))}
      </div>

      <div className="bg-neutral-200 dark:bg-neutral-700 rounded-xl h-96" />
    </div>
  );
}
