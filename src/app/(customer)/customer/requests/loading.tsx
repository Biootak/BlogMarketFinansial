import { TableSkeleton } from '@/components/Skeletons';

export default function CustomerRequestsLoading() {
  return <TableSkeleton rows={6} cols={5} />;
}
