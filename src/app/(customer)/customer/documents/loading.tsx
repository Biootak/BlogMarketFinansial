import { GridSkeleton } from '@/components/Skeletons';

export default function CustomerDocumentsLoading() {
  return <GridSkeleton cols={2} count={6} />;
}
