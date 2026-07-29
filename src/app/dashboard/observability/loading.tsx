import { Skeleton } from '@/components/Dashboard/primitives';

export default function ObservabilityLoading() {
  const blockStyle = (h: number): React.CSSProperties => ({
    height: h,
    width: '100%',
    borderRadius: 14,
  });
  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        padding: '0.5rem 0',
      }}
    >
      <div style={blockStyle(88)}>
        <Skeleton variant="card" className="!h-full" />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: '0.75rem',
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={blockStyle(78)}>
            <Skeleton variant="card" className="!h-full" />
          </div>
        ))}
      </div>
      <div style={blockStyle(48)}>
        <Skeleton variant="row" className="!h-full" />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.05fr 1.4fr',
          gap: '1rem',
        }}
      >
        <div style={blockStyle(420)}>
          <Skeleton variant="card" className="!h-full" />
        </div>
        <div style={blockStyle(420)}>
          <Skeleton variant="card" className="!h-full" />
        </div>
      </div>
    </div>
  );
}
