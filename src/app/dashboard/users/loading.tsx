import { UsersTableSkeleton } from '@/components/Skeletons';

export default function UsersLoading() {
  return <UsersTableSkeleton rows={10} />;
}
