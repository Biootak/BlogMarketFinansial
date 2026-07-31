import { GridSkeleton } from '@/components/Skeletons';

export default function CustomerKycLoading() {
  return <GridSkeleton cols={1} count={4} />;
}
