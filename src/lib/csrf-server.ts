/**
 * csrf-server.ts — Server-side CSRF guard for Server Actions.
 *
 * محافظت defense-in-depth در برابر CSRF برای Server Actions و API routes.
 *
 * نحوه استفاده در Server Action:
 *   'use server';
 *   import { assertCsrf } from '@/lib/csrf-server';
 *
 *   export async function sensitiveAction(formData: FormData) {
 *     await assertCsrf();
 *     // ... business logic
 *   }
 *
 * مکانیزم:
 *   - Origin header را با host فعلی مقایسه می‌کند (nextUrl host).
 *   - اگر origin نباشد (non-browser client، مثلاً cron) → allow می‌کند.
 *   - اگر origin نامعتبر باشد → reject می‌کند.
 *   - next/server cookies sameSite=lax هستند، ولی origin check defense-in-depth است.
 *
 * چرا CSRF_HEADER_NAME الزامی نیست:
 *   - Server Actions در Next.js به شکل POST به همین URL فرستاده می‌شوند با
 *     header `next-action`. اضافه کردن header سفارشی نیاز به preflight CORS
 *     دارد که attacker cross-site نمی‌تواند.
 *   - ولی ساده‌ترین راه، همان origin check است.
 */

import { headers } from 'next/headers';

export class CsrfError extends Error {
  constructor(message = 'CSRF check failed') {
    super(message);
    this.name = 'CsrfError';
  }
}

function getAllowedHosts(): Set<string> {
  const set = new Set<string>();
  // default: production + preview + local
  set.add('financialmarket.page');
  set.add('www.financialmarket.page');
  set.add('localhost');
  set.add('127.0.0.1');
  set.add('0.0.0.0');
  // optional extra hosts via env (comma-separated) — e.g. CSRF_ALLOWED_HOSTS="staging.example.com"
  if (process.env.CSRF_ALLOWED_HOSTS) {
    for (const h of process.env.CSRF_ALLOWED_HOSTS.split(',')
      .map((s) => s.trim())
      .filter(Boolean)) {
      set.add(h);
    }
  }
  return set;
}

let cachedHosts: Set<string> | null = null;

export async function assertCsrf(): Promise<void> {
  const headersList = await headers();
  const origin = headersList.get('origin') ?? headersList.get('referer');
  // اگر origin اصلاً ارسال نشده (cron، internal call، CLI) → allow
  if (!origin) {
    return;
  }

  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    throw new CsrfError('invalid origin url');
  }

  cachedHosts ??= getAllowedHosts();
  if (!cachedHosts.has(host)) {
    throw new CsrfError(`host not allowed: ${host}`);
  }
}

/**
 * Re-export برای استفاده در فرم‌های client (فقط برای consistency).
 * Server Actions نمی‌توانند header سفارشی از client دریافت کنند، ولی
 * اگر لازم شد، می‌توان از fetch() با این header استفاده کرد.
 */
export const CSRF_HEADER_NAME = 'x-app-action';
export const CSRF_HEADER_VALUE = '1';
