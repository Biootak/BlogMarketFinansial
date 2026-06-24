'use client';

export type AmbientTone = 'indigo' | 'violet' | 'cyan';

export interface AmbientBackgroundProps {
  colors?: AmbientTone[];
  intensity?: 'low' | 'med' | 'high';
  className?: string;
}

const DEFAULT_TONES: AmbientTone[] = ['indigo', 'violet', 'cyan'];

/**
 * AmbientBackground
 *
 * Three radial-gradient blobs that drift slowly behind the dashboard.
 * The CSS in globals.css handles positioning + animation; this component
 * only injects the blob elements. prefers-reduced-motion is honored by
 * the CSS itself (animation is disabled).
 */
export function AmbientBackground({
  colors = DEFAULT_TONES,
  intensity = 'med',
  className,
}: AmbientBackgroundProps) {
  const tones: AmbientTone[] = [colors[0] ?? 'indigo', colors[1] ?? 'violet', colors[2] ?? 'cyan'];
  return (
    <div
      className={`dash2-ambient ${className ?? ''}`}
      data-intensity={intensity}
      aria-hidden="true"
    >
      <span className="dash2-ambient__blob" data-tone={tones[0]} />
      <span className="dash2-ambient__blob" data-tone={tones[1]} />
      <span className="dash2-ambient__blob" data-tone={tones[2]} />
    </div>
  );
}
