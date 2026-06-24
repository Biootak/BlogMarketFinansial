import * as React from 'react';

/**
 * Inline SVG glyph set used by the stepper and the review screen.
 *
 * Defined as a single React component (rather than separate files) so the
 * server payload stays small and the paths stay in sync with the design.
 * Every glyph uses `currentColor` so tone shifts are CSS-only.
 */

interface GlyphProps {
  className?: string;
  title?: string;
}

const baseProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

export function UserGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

export function ShieldGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function SparklesGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
      <path d="M5 16l.6 1.4L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.6L5 16z" />
    </svg>
  );
}

export function CheckGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}

export function ArrowLeftGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

export function ArrowRightGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

export function EyeGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A9.7 9.7 0 0112 6c6.5 0 10 6 10 6a17 17 0 01-3.2 4M6.6 6.6C3.7 8.5 2 12 2 12s3.5 7 10 7a9.6 9.6 0 005.4-1.6" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
    </svg>
  );
}

export function LockGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
      <circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MailGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 7 9-7" />
    </svg>
  );
}

export function PhoneGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A14 14 0 013 6a2 2 0 012-2z" />
    </svg>
  );
}

export function BuildingGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16" />
      <path d="M16 9h4v12" />
      <path d="M8 7h2M8 11h2M8 15h2" />
    </svg>
  );
}

export function BadgeGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="10" r="4" />
      <path d="M9 13l-2 7 5-3 5 3-2-7" />
    </svg>
  );
}

export function QuoteGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <path d="M7 7h4v4H7a3 3 0 00-3 3v3" />
      <path d="M15 7h4v4h-4a3 3 0 00-3 3v3" />
    </svg>
  );
}

export function ShieldCheckGlyph({ className, title }: GlyphProps) {
  return (
    <svg {...baseProps} className={className} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

export const STEP_GLYPHS = {
  user: UserGlyph,
  shield: ShieldGlyph,
  sparkles: SparklesGlyph,
  check: CheckGlyph,
} as const;
