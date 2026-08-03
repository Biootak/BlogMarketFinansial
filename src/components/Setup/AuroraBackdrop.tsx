/**
 * AuroraBackdrop — animated, GPU-only background for the setup screen.
 *
 * Layered effects:
 *   1. Conic mesh gradient that slowly rotates via the @property --angle trick
 *   2. Five soft aurora blobs that drift on long ease-in-out cycles
 *   3. A barely-perceptible editorial grid, masked toward the corner
 *   4. A horizontal scan-line glow that hints at a "live system" feel
 *   5. SVG noise overlay for premium film grain
 *
 * All animation is CSS-only (transform/opacity) and is gated by the global
 * `prefers-reduced-motion` rule in setup.css. No JS timers.
 */
export function AuroraBackdrop() {
  return (
    <div className="setup-stage" aria-hidden="true">
      <div className="setup-stage__mesh" />
      <div className="setup-stage__blob setup-stage__blob--a" />
      <div className="setup-stage__blob setup-stage__blob--b" />
      <div className="setup-stage__blob setup-stage__blob--c" />
      <div className="setup-stage__blob setup-stage__blob--d" />
      <div className="setup-stage__scan" />
      <div className="setup-stage__grid" />
      <div className="setup-stage__noise" />
    </div>
  );
}
