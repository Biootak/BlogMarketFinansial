import { FaSpinner } from 'react-icons/fa';

interface LoadingMoreProps {
  message?: string;
}

export default function LoadingMore({
  message = 'در حال بارگذاری موارد بیشتر...',
}: LoadingMoreProps) {
  return (
    <div className="col-span-full flex items-center justify-center py-8">
      <FaSpinner className="animate-spin text-primary-600 ml-3 h-5 w-5" />
      <span className="text-neutral-600 dark:text-neutral-300">{message}</span>
    </div>
  );
}
