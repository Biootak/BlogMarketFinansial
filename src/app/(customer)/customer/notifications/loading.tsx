import { TableSkeleton } from '@/components/Skeletons';

export default function CustomerNotificationsLoading() {
  return <TableSkeleton rows={8} cols={3} />;
}
