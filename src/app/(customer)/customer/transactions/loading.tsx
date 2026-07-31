import { TableSkeleton } from '@/components/Skeletons';

export default function CustomerTransactionsLoading() {
  return <TableSkeleton rows={8} cols={5} />;
}
