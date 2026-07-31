import { GridSkeleton } from '@/components/Skeletons';

export default function CustomerDashboardLoading() {
  return <GridSkeleton cols={2} count={6} />;
}
