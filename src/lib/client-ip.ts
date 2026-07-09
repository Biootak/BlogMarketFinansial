import type { NextRequest } from 'next/server';

/**
 * Resolve the client IP for rate-limiting / logging.
 *
 * M1 fix: the raw leftmost `X-Forwarded-For` value is fully spoofable by the
 * client (they can send `X-Forwarded-For: 1.2.3.4` themselves). Prefer the
 * *rightmost* `X-Forwarded-For` entry (the one our own trusted proxy appended
 * at the edge), then fall back to `X-Real-IP` (reliable behind a single trusted
 * reverse proxy such as nginx, but forgeable on platforms that forward it
 * verbatim). Never trust the leftmost XFF entry.
 *
 * NOTE: this is a best-effort heuristic. For a definitive fix, only accept
 * `X-Forwarded-For` after verifying `socket.remoteAddress` is inside the
 * proxy CIDR (deployment-specific). Behind a single trusted proxy this
 * resolves to the correct client.
 */
export function getTrustedClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      // Rightmost entry is appended by our own trusted proxy (most trustworthy).
      return parts[parts.length - 1]!;
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  return 'unknown';
}
