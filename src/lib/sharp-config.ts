/**
 * sharp-config — Process-wide tuning for the `sharp` image library.
 * ------------------------------------------------------------------
 * Why this file exists:
 *   - Out of the box, `sharp` shares a global libvips instance across
 *     the entire Node process. Its default settings are tuned for
 *     throughput, NOT for memory safety under bursty image uploads.
 *   - On a single upload that produces multiple resize variants from
 *     the same source image, libjpeg requires an internal mutex per
 *     decoded input. Running variants in parallel against the same
 *     input does NOT parallelize — they serialize on the mutex while
 *     each one keeps a full decoded pixel copy in memory. On a 50MP
 *     image this routinely causes OOM kills (see Strapi PR #26046).
 *   - Configuring these once at module load gives us a predictable,
 *     bounded memory profile for the whole server.
 *
 * The settings:
 *   - `cache(false)`  → sharp keeps decoded pixels only for the current
 *                        operation. Otherwise it caches them between
 *                        operations on the same instance, which
 *                        multiplies memory under bursty uploads.
 *   - `concurrency(2)` → cap libvips' thread pool at 2. Two concurrent
 *                        sharp operations can overlap on I/O while
 *                        still leaving headroom for the Next.js event
 *                        loop and the S3 SDK. Anything higher just
 *                        contends on the same libjpeg mutex without
 *                        real parallelism.
 *
 * Re-tuning: if you ever migrate to a machine with 8+ cores and want
 * higher throughput on bulk batch uploads, bump `concurrency` to
 * `Math.max(1, os.cpus().length - 2)`. Keep it below the core count
 * so the request-handling event loop is never starved.
 * ------------------------------------------------------------------
 */

import sharp from 'sharp';

// One-time global tuning. Subsequent calls are no-ops, but we guard
// so re-importing this module from a hot-reloaded route doesn't log
// a warning on every request.
let configured = false;
export function configureSharp(): void {
  if (configured) return;
  configured = true;

  // Disable sharp's internal decoded-image cache. The cache speeds
  // up pipelines that re-use the same input across many transforms,
  // but our upload route only decodes each input once. Disabling it
  // drops peak RSS by ~30–50% on large uploads.
  sharp.cache(false);

  // Cap libvips' worker pool at 1 for Eco dyno (single vCPU).
  // Default is CPU count — on multi-core builders that means several threads
  // each holding decoded pixel buffers. On Heroku Eco (1 vCPU), >1 thread
  // just adds context-switch overhead. 1 keeps memory bounded.
  // NOTE: instrumentation.ts also sets this before any route loads;
  // this call is the fallback for dev/non-standalone environments.
  sharp.concurrency(1);

  // Keep SIMD enabled — it's a free win and doesn't affect memory.
  sharp.simd(true);
}

// Configure on module import. The function is idempotent so even if
// multiple entrypoints import it (route handler, server action) the
// actual tuning happens exactly once.
configureSharp();
