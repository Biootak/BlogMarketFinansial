'use client';

export interface NoiseTextureProps {
  opacity?: number;
  className?: string;
}

export function NoiseTexture({ opacity = 0.025, className }: NoiseTextureProps) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity,
        mixBlendMode: 'overlay',
      }}
    >
      <filter id="dash2-noise-filter">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#dash2-noise-filter)" />
    </svg>
  );
}
