import { UsersTableSkeleton } from '@/components/Skeletons';

/**
 * Loading state for /dashboard/roles.
 * Mirrors the dense data-table layout of the actual roles page.
 */
export default function RolesLoading() {
  return <UsersTableSkeleton rows={10} />;
}
