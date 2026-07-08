import type { NextRequest } from 'next/server';

/**
 * Resolve the client IP for rate-limiting / logging.
 *
 * M1 fix: the raw leftmost `X-Forwarded-For` value is fully spoofable by the
 * client (they can send `X-Forwarded-For: 1.2.3.4` themselves). Prefer
 * `X-Real-IP` which a properly configured reverse proxy overwrites and the
 * client cannot forge, then fall back to the *rightmost* `X-Forwarded-For`
 * entry (the one our own edge appended), never the leftmost.
 *
 * NOTE: this is a best-effort heuristic. For a definitive fix, only accept
 * `X-Forwarded-For` after verifying `socket.remoteAddress` is inside the
 * proxy CIDR (deployment-specific). Behind a single trusted proxy this
 * resolves to the correct client.
 */
export function getTrustedClientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      // Rightmost entry is appended by our own proxy (most trustworthy).
      return parts[parts.length - 1]!;
    }
  }

  return 'unknown';
}
