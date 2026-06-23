// 2026-06-23: editor header band for the auth pages.
// Static copy only. No fake numbers, no decorative SVGs.
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="auth-shell-band" aria-label="سرصفحهٔ احراز هویت">
      <p className="auth-shell-eyebrow">{eyebrow}</p>
      <h1 className="auth-shell-title">{title}</h1>
      <p className="auth-shell-subtitle">{subtitle}</p>
    </header>
  );
}
