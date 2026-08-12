#!/usr/bin/env node
/**
 * scripts/setup-cron-jobs.mjs — ساخت همهٔ cron jobs در cron-job.org از طریق REST API رسمی.
 *
 * داک رسمی: https://docs.cron-job.org/rest-api.html
 *   - Endpoint: https://api.cron-job.org
 *   - Auth: `Authorization: Bearer <API_KEY>` (از Console → Settings → API)
 *   - ساخت: PUT /jobs  (فقط url اجباری است)
 *   - Rate limit ساخت: 1/sec و 5/min
 *
 * استفاده:
 *   CROJOB_API_KEY="..." CRON_SECRET="..." node scripts/setup-cron-jobs.mjs
 *
 * - CRON_SECRET از env خوانده می‌شود (اگر نبود، از .env.local خوانده می‌شود).
 * - ایدم‌پوتنت: job های موجود (بر اساس URL) را نمی‌سازد — فقط گزارش می‌دهد.
 * - همهٔ endpoint ها GET هستند؛ به‌جز /api/ping بقیه به هدر
 *   `Authorization: Bearer <CRON_SECRET>` نیاز دارند (ر.ک HEROKU.md مرحله ۵).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENDPOINT = 'https://api.cron-job.org';
const BASE_URL = 'https://financialmarket.page';

function envOrDotenv(name) {
  if (process.env[name]) return process.env[name];
  try {
    const m = readFileSync(resolve('.env.local'), 'utf8').match(
      new RegExp(`^${name}="([^"]+)"`, 'm'),
    );
    return m ? m[1] : undefined;
  } catch {
    return undefined;
  }
}

const API_KEY = envOrDotenv('CROJOB_API_KEY');
const CRON_SECRET = envOrDotenv('CRON_SECRET');

if (!API_KEY) {
  console.error('CROJOB_API_KEY ست نشده — از Console → Settings در cron-job.org یک API key بساز.');
  process.exit(1);
}
if (!CRON_SECRET) {
  console.error('CRON_SECRET پیدا نشد — مقدارش را به‌صورت env بده.');
  process.exit(1);
}

/** Header مشترک برای endpoint های محافظت‌شده */
const authHeader = { Authorization: `Bearer ${CRON_SECRET}` };

/** دقایق "هر N دقیقه" برای cron-job.org (بدون جیتر — دقیق) */
function everyNMinutes(n) {
  const minutes = [];
  for (let m = 0; m < 60; m += n) minutes.push(m);
  return minutes;
}

/** ساختار schedule استاندارد */
function schedule({ minutes, hours = [-1], timezone = 'UTC' }) {
  return { timezone, expiresAt: 0, hours, mdays: [-1], minutes, months: [-1], wdays: [-1] };
}

/**
 * تعریف همهٔ job ها — لیست از HEROKU.md مرحله ۵ + endpoint های جدید کد:
 *   /api/ping (keep-alive، بدون auth)، publish-scheduled-posts (1m)،
 *   refresh-market-rates (1m)، telegram-notifications (1m)، expire-quotes (5m)،
 *   sync-rate-lists (5m)، sync-bazaar (10m)، expire-kyc (روزانه 01:00)،
 *   backup (شبانه 03:00 UTC).
 */
const JOBS = [
  {
    title: 'FM keep-alive (eco dyno)',
    url: `${BASE_URL}/api/ping`,
    schedule: schedule({ minutes: everyNMinutes(5) }),
  },
  {
    title: 'FM publish-scheduled-posts',
    url: `${BASE_URL}/api/cron/publish-scheduled-posts`,
    schedule: schedule({ minutes: [-1] }),
    headers: authHeader,
  },
  {
    title: 'FM refresh-market-rates',
    url: `${BASE_URL}/api/cron/refresh-market-rates`,
    schedule: schedule({ minutes: [-1] }),
    headers: authHeader,
  },
  {
    title: 'FM telegram-notifications',
    url: `${BASE_URL}/api/cron/telegram-notifications`,
    schedule: schedule({ minutes: [-1] }),
    headers: authHeader,
  },
  {
    title: 'FM expire-quotes',
    url: `${BASE_URL}/api/cron/expire-quotes`,
    schedule: schedule({ minutes: everyNMinutes(5) }),
    headers: authHeader,
  },
  {
    title: 'FM sync-rate-lists',
    url: `${BASE_URL}/api/cron/sync-rate-lists`,
    schedule: schedule({ minutes: everyNMinutes(5) }),
    headers: authHeader,
  },
  {
    title: 'FM sync-bazaar',
    url: `${BASE_URL}/api/cron/sync-bazaar`,
    schedule: schedule({ minutes: everyNMinutes(10) }),
    headers: authHeader,
  },
  {
    title: 'FM expire-kyc',
    url: `${BASE_URL}/api/cron/expire-kyc`,
    schedule: schedule({ minutes: [0], hours: [1] }),
    headers: authHeader,
  },
  {
    title: 'FM backup DB',
    url: `${BASE_URL}/api/cron/backup`,
    schedule: schedule({ minutes: [0], hours: [3] }),
    headers: authHeader,
  },
];

async function api(path, method, body) {
  const res = await fetch(`${ENDPOINT}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return text ? JSON.parse(text) : {};
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // 1) folder یکتا برای پروژه
  let folderId = 0;
  try {
    const folders = await api('/folders', 'GET');
    const existing = folders.folders?.find((f) => f.title === 'Financial Market');
    if (existing) {
      folderId = existing.folderId;
      console.log(`folder موجود: Financial Market (${folderId})`);
    } else {
      const created = await api('/folders', 'PUT', { folder: { title: 'Financial Market' } });
      folderId = created.folderId;
      console.log(`folder ساخته شد: Financial Market (${folderId})`);
    }
  } catch (e) {
    console.warn(`folder: ${e.message} — job ها بدون folder ساخته می‌شوند`);
  }

  // 2) job های موجود (بر اساس URL) — idempotent
  const existing = await api('/jobs', 'GET');
  const byUrl = new Map((existing.jobs ?? []).map((j) => [j.url, j]));

  let created = 0;
  let skipped = 0;
  for (const def of JOBS) {
    if (byUrl.has(def.url)) {
      const j = byUrl.get(def.url);
      console.log(`skip (موجود): ${def.title} (jobId ${j.jobId})`);
      skipped++;
      continue;
    }
    const payload = {
      job: {
        title: def.title,
        url: def.url,
        enabled: true,
        saveResponses: false,
        requestMethod: 0, // GET
        requestTimeout: 300,
        redirectSuccess: false,
        folderId,
        schedule: def.schedule,
        ...(def.headers ? { extendedData: { headers: def.headers } } : {}),
      },
    };
    const { jobId } = await api('/jobs', 'PUT', payload);
    console.log(`created: ${def.title} → jobId ${jobId}  (${def.url})`);
    created++;
    // rate limit ساخت: max 1/sec — بین دو ساخت کمی صبر کن
    await sleep(1100);
  }

  console.log(`\nخلاصه: ${created} ساخته شد، ${skipped} از قبل موجود بود.`);
}

main().catch((e) => {
  console.error(`خطا: ${e.message}`);
  process.exit(1);
});
