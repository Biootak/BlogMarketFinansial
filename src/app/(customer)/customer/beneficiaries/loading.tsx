import { TableSkeleton } from '@/components/Skeletons';

export default function CustomerBeneficiariesLoading() {
  return <TableSkeleton rows={5} cols={4} />;
}
