/**
 * upstash-requester — Requester سفارشی برای @upstash/redis که ISR/SSG را نمی‌شکند.
 * ----------------------------------------------------------------------------
 * مشکل (2026-08-15، اندازه‌گیری روی production build):
 *
 *   SDK پیش‌فرض @upstash/redis در Node از `fetch` داخلی با `cache: 'no-store'`
 *   استفاده می‌کند (nodejs.js → HttpClient.request → fetch(url, { cache: 'no-store' })).
 *   Next.js در طول رندر RSC، تمام فراخوانی‌های fetch را intercept می‌کند و یک
 *   fetch با cache:'no-store' یعنی «این صفحه باید dynamic باشد». نتیجه:
 *
 *     - صفحاتی که tieredCache (L2 = Redis) را در مسیر رندر صدا می‌زنند
 *       (single, home, blog, archive…) در build-time به‌جای SSG/ISR، dynamic
 *       می‌شوند (خطای «Page changed from static to dynamic at runtime …
 *       reason: no-store fetch …/pipeline»).
 *     - اولین درخواست بعد از هر deploy/restart به‌جای HTML کش‌شده، SSR سرد
 *       می‌شود: اندازه‌گیری شده ۱۷-۲۳ ثانیه برای home، ۵-۸ ثانیه برای archive.
 *
 * راه‌حل: یک `Requester` سفارشی به SDK می‌دهیم که به‌جای global fetch
 * (پچ‌شده توسط Next.js) از `undici.request` استفاده می‌کند. undici یک HTTP
 * client مستقل است — Next.js آن را intercept نمی‌کند، پس رندر صفحات static
 * هیچ fetch «dynamic» نمی‌بیند و SSG/ISR سالم می‌ماند. در Edge runtime
 * (middleware — همیشه dynamic است) به fetch معمولی fallback می‌شود.
 * ----------------------------------------------------------------------------
 */

import type { Requester, UpstashRequest, UpstashResponse } from '@upstash/redis';
import { request as undiciRequest } from 'undici';

export interface UpstashRequesterOptions {
  /** REST URL — مثلاً https://xx.upstash.io */
  url: string;
  /** REST token */
  token: string;
  /** سقف هر فراخوانی (ms). پیش‌فرض ۲۰۰۰. */
  timeoutMs?: number;
  /** حداکثر تلاش روی خطای شبکه (بدون احتساب اولین). پیش‌فرض ۲. */
  retries?: number;
}

const isEdgeRuntime = typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ساخت Requester سازگار با @upstash/redis.
 * رفتار HTTP دقیقاً مثل HttpClient داخلی SDK است (POST + Bearer + JSON body)
 * با این تفاوت که transport آن undici است، نه global fetch.
 */
export function createUpstashRequester(options: UpstashRequesterOptions): Requester {
  const { url, token } = options;
  const timeoutMs = options.timeoutMs ?? 2000;
  const retries = options.retries ?? 2;
  const baseUrl = url.replace(/\/$/, '');
  const authHeaders: Record<string, string> = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'upstash-telemetry-runtime': 'nodejs',
  };

  return {
    request: async <TResult = unknown>(req: UpstashRequest): Promise<UpstashResponse<TResult>> => {
      const requestUrl = [baseUrl, ...(req.path ?? [])].join('/');
      const body = JSON.stringify(req.body);
      const signal = req.signal ?? AbortSignal.timeout(timeoutMs);

      let lastError: unknown;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          if (isEdgeRuntime) {
            // Edge (middleware) همیشه dynamic است — fetch معمولی کافی است.
            const res = await fetch(requestUrl, {
              method: 'POST',
              headers: authHeaders,
              body,
              signal,
              cache: 'no-store',
            });
            if (!res.ok) {
              throw new Error(`Upstash HTTP ${res.status}`);
            }
            const json = (await res.json()) as unknown;
            return toUpstashResponse<TResult>(json);
          }

          // Node runtime: undici — خارج از پچ fetch Next.js → SSG/ISR سالم می‌ماند.
          const res = await undiciRequest(requestUrl, {
            method: 'POST',
            headers: authHeaders,
            body,
            signal,
          });
          if (res.statusCode !== 200) {
            throw new Error(`Upstash HTTP ${res.statusCode}`);
          }
          const json = (await res.body.json()) as unknown;
          return toUpstashResponse<TResult>(json);
        } catch (err) {
          lastError = err;
          if (attempt < retries) {
            await sleep(Math.exp(attempt) * 50);
          }
        }
      }
      throw lastError;
    },
  };
}

/** شکل پاسخ Upstash: `{ result, error }` یا آرایه‌ای از همین شکل (pipeline). */
function toUpstashResponse<TResult>(json: unknown): UpstashResponse<TResult> {
  if (Array.isArray(json)) {
    return json as UpstashResponse<TResult>;
  }
  if (json && typeof json === 'object') {
    const { result, error } = json as { result?: unknown; error?: unknown };
    return { result: result as TResult, error: typeof error === 'string' ? error : undefined };
  }
  return json as UpstashResponse<TResult>;
}

export default createUpstashRequester;
