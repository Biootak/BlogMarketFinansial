import { TableSkeleton } from '@/components/Skeletons';

export default function CustomerDevicesLoading() {
  return <TableSkeleton rows={5} cols={4} />;
}
