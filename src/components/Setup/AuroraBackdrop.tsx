import * as React from 'react';

/**
 * AuroraBackdrop — animated, GPU-only background for the setup screen.
 *
 * Three layered effects:
 *   1. Conic mesh gradient that slowly rotates via the @property --angle trick
 *   2. Two soft aurora blobs that drift on a long ease-in-out cycle
 *   3. A barely-perceptible editorial grid, masked toward the corner
 *
 * All animation is CSS-only (transform/opacity) and is gated by the global
 * `prefers-reduced-motion` rule near the top of globals.css. No JS timers.
 */
export function AuroraBackdrop() {
  return (
    <div className="setup-stage" aria-hidden="true">
      <div className="setup-stage__mesh" />
      <div className="setup-stage__blob setup-stage__blob--a" />
      <div className="setup-stage__blob setup-stage__blob--b" />
      <div className="setup-stage__blob setup-stage__blob--c" />
      <div className="setup-stage__grid" />
      <div className="setup-stage__noise" />
    </div>
  );
}
