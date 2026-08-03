import { SettingsCardSkeleton } from '@/components/Skeletons';

export default function CustomerSecurityLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-4)',
        padding: 'var(--ds-space-5)',
      }}
    >
      <SettingsCardSkeleton />
      <SettingsCardSkeleton />
    </div>
  );
}
