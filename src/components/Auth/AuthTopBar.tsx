// 2026-06-23: full-bleed sticky top bar (2026 redesign).
// Brand on the start edge, account action(s) on the end edge.
// Pure server component. The brand mark is a real SVG glyph (no emoji).
import Link from 'next/link';

export default function AuthTopBar({
  brandHref = '/',
  brandLabel = 'بازار مالی',
  actions,
}: {
  brandHref?: string;
  brandLabel?: string;
  actions: ReadonlyArray<{ label: string; href: string; prompt?: string }>;
}) {
  return (
    <header className="auth-topbar" aria-label="نوار بالای صفحه احراز هویت">
      <div className="auth-topbar-inner">
        <Link
          href={brandHref}
          className="auth-topbar-brand"
          aria-label={`${brandLabel} — صفحه اصلی`}
        >
          <span className="auth-topbar-brand-mark" aria-hidden="true">
            {/* Two ascending bars — a quiet nod to markets. */}
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4" y="11" width="4" height="9" rx="1.2" fill="currentColor" opacity="0.55" />
              <rect x="10" y="7" width="4" height="13" rx="1.2" fill="currentColor" opacity="0.8" />
              <rect x="16" y="4" width="4" height="16" rx="1.2" fill="currentColor" />
            </svg>
          </span>
          <span className="auth-topbar-brand-name">{brandLabel}</span>
        </Link>
        <nav className="auth-topbar-meta" aria-label="عملیات صفحه">
          {actions.map((a) => (
            <span key={a.href} className="inline-flex items-center gap-2">
              {a.prompt ? (
                <span className="auth-topbar-meta-text">{a.prompt}</span>
              ) : null}
              <Link href={a.href} className="auth-topbar-meta-link">
                {a.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}