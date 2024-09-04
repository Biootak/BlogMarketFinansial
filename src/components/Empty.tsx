import { MdFolder } from 'react-icons/md';

export default function Empty({
  className = 'text-center py-8',
}: {
  className?: string;
}) {
  return (
    <div className={className}>
      <MdFolder className="inline-block h-12 w-12 text-neutral-400" />
      <h3 className="mt-4 text-sm font-semibold text-neutral-900 dark:text-neutral-300">
        موردی یافت نشد
      </h3>
      <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
        در حال حاضر هیچ موردی برای نمایش وجود ندارد
      </p>
    </div>
  );
}
