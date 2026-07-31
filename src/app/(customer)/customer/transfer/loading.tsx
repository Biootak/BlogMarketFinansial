import { FormFieldSkeleton, SkeletonBase } from '@/components/Skeletons';

export default function CustomerTransferLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-4)', padding: 'var(--ds-space-5)' }}>
      <SkeletonBase style={{ height: '2.5rem', width: '40%', borderRadius: 'var(--ds-radius-md)' }} />
      <SkeletonBase style={{ height: '1rem', width: '60%', borderRadius: 'var(--ds-radius-sm)' }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <FormFieldSkeleton key={i} />
      ))}
    </div>
  );
}
