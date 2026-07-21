export default function AuthLoading() {
  return (
    <div className="auth-page-root" dir="rtl" aria-busy="true">
      <div className="auth-aurora" aria-hidden="true" />
      <div className="auth-card-shell">
        <div className="auth-card" style={{ minHeight: '28rem' }}>
          <div className="auth-card-inner" />
        </div>
      </div>
    </div>
  );
}
