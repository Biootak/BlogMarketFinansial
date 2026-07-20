export default function TransferProvidersLoading() {
  return (
    <main
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'var(--ds-space-6) var(--ds-space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6)',
      }}
    >
      <div
        style={{
          height: '80px',
          borderRadius: '14px',
          background: 'var(--at-surface, #fff)',
          border: '1px solid var(--at-line, #e5e7eb)',
        }}
      />
      <div style={{ display: 'flex', gap: '12px' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: '120px',
              height: '80px',
              borderRadius: '10px',
              background: 'var(--at-surface, #fff)',
              border: '1px solid var(--at-line, #e5e7eb)',
            }}
          />
        ))}
      </div>
      <div
        style={{
          height: '380px',
          borderRadius: '12px',
          background: 'var(--at-surface, #fff)',
          border: '1px solid var(--at-line, #e5e7eb)',
        }}
      />
    </main>
  );
}
