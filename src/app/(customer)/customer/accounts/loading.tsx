import { GridSkeleton } from '@/components/Skeletons';

export default function CustomerAccountsLoading() {
  return <GridSkeleton cols={2} count={4} />;
}
