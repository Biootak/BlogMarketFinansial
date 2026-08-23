#!/usr/bin/env node
/**
 * lh-audit — سنجهٔ سرعت (Lighthouse Performance) صفحات سایت دیپلوی‌شده
 * ----------------------------------------------------------------------------
 * چون Lighthouse به مرورگر واقعی نیاز دارد، این اسکریپت را «شما» روی سیستم خود
 * اجرا می‌کنید (روی URL پروداکشن یا لوکال). خروجی: جدول نمره + متریک‌های کلیدی
 * هر صفحه، و exit code غیرصفر اگر صفحه‌ای زیر آستانه باشد (پیش‌فرض ۹۵).
 *
 * کاربرد:
 *   node scripts/lh-audit.mjs https://example.com
 *   node scripts/lh-audit.mjs http://localhost:3000 --pages=/,/exchanges
 *   node scripts/lh-audit.mjs https://example.com --threshold=90 --form-factor=desktop
 *
 * پیش‌نیاز: Chrome/Chromium نصب روی سیستم (Lighthouse خودش هندلس می‌کند،
 * بار اول npx پکیج lighthouse را دانلود می‌کند — چند دقیقه صبر اولیه طبیعی است.)
 */
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const getOpt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};

const BASE_URL = (positional[0] ?? process.env.APP_URL ?? '').replace(/\/+$/, '');
if (!BASE_URL || !/^https?:\/\//.test(BASE_URL)) {
  console.error('✗ آدرس سایت را بده: node scripts/lh-audit.mjs https://example.com');
  process.exit(2);
}

const THRESHOLD = Number(getOpt('threshold', '95'));
const FORM_FACTOR = getOpt('form-factor', 'mobile'); // mobile | desktop
// --host=<ip>: resolve the hostname straight to origin IP, bypassing the CDN
// edge cache. After every deploy the edge can serve stale HTML (SWR up to 24h)
// which poisons scores with old-HTML/new-assets mismatches — always measure
// truth with --host=<vm-ip>, e.g. --host=20.109.177.20
const HOST_IP = getOpt('host', '');
// Full public static inventory (src/app/(site) + fintech + auth).
// Dynamic templates (/single/[slug], /archive/category/[slug], /exchanges/[slug], ...)
// need a real slug from DB — pass them via --pages=/single/<slug>,... per run.
const PAGES = getOpt(
  'pages',
  [
    '/',
    '/about',
    '/apply-exchange',
    '/authors',
    '/beneficiaries',
    '/blog',
    '/categories',
    '/contact',
    '/credit-rates',
    '/exchanges',
    '/faq',
    '/feedback',
    '/financial-news',
    '/help-center',
    '/kyc',
    '/market-analysis',
    '/money-transfer',
    '/online-payment',
    '/posts',
    '/privacy-policy',
    '/search',
    '/services',
    '/services/compare',
    '/services/order',
    '/signin',
    '/signup',
    '/subscription',
    '/support',
    '/tags',
    '/terms',
    '/track',
    '/transfer',
    '/wallet',
  ].join(','),
)
  .split(',')
  .filter(Boolean);

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function runLighthouse(url) {
  return new Promise((resolveRun) => {
    const child = spawn(
      'npx',
      [
        '--yes',
        'lighthouse@latest',
        url,
        '--output=json',
        '--quiet',
        `--chromeFlags=--headless=new --no-sandbox${HOST_IP ? ` --host-resolver-rules=MAP ${new URL(BASE_URL).hostname} ${HOST_IP}` : ''}`,
        `--formFactor=${FORM_FACTOR}`,
        '--screenEmulation.mobile',
        '--onlyCategories=performance',
      ],
      { shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'inherit'] },
    );
    let out = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.on('close', () => {
      try {
        resolveRun(JSON.parse(out));
      } catch {
        resolveRun(null);
      }
    });
  });
}

const fmtMs = (ms) => `${(ms / 1000).toFixed(1)}s`;

console.log(
  `${C.cyan}${C.bold}▶ Lighthouse audit (${FORM_FACTOR}, threshold ${THRESHOLD})${C.reset}`,
);
console.log(`  ${BASE_URL}\n`);

const failures = [];
const rows = [];

for (const path of PAGES) {
  const url = `${BASE_URL}${path}`;
  process.stdout.write(`  ⏳ ${path} …`);
  const report = await runLighthouse(url);
  if (!report?.categories?.performance) {
    console.log(` ${C.red}✗ خطا — گزارش Lighthouse نگرفت${C.reset}`);
    failures.push(path);
    continue;
  }
  const c = report.categories.performance;
  const a = report.audits;
  const score = Math.round(c.score * 100);
  rows.push({
    path,
    score,
    fcp: a['first-contentful-paint']?.displayValue ?? '-',
    lcp: a['largest-contentful-paint']?.displayValue ?? '-',
    tbt: a['total-blocking-time']?.displayValue ?? '-',
    cls: a['cumulative-layout-shift']?.displayValue ?? '-',
    si: a['speed-index']?.displayValue ?? '-',
  });
  const mark = score >= THRESHOLD ? C.green : C.red;
  console.log(` ${mark}${score}${C.reset}/100`);
}

console.log('');
const pad = Math.max(...rows.map((r) => r.path.length), 6);
console.log(`  ${'صفحه'.padEnd(pad)}  نمره   FCP     LCP     TBT     CLS     SI`);
for (const r of rows) {
  const mark = r.score >= THRESHOLD ? C.green : C.red;
  console.log(
    `  ${r.path.padEnd(pad)}  ${mark}${String(r.score).padStart(3)}${C.reset}   ${fmtShort(r.fcp).padEnd(7)} ${fmtShort(r.lcp).padEnd(7)} ${fmtShort(r.tbt).padEnd(7)} ${r.cls.padEnd(7)} ${fmtShort(r.si)}`,
  );
}
console.log('');

if (failures.length || rows.some((r) => r.score < THRESHOLD)) {
  const bad = [
    ...new Set([...failures, ...rows.filter((r) => r.score < THRESHOLD).map((r) => r.path)]),
  ];
  console.log(`${C.red}${C.bold}✗ زیر آستانه: ${bad.join(', ')}${C.reset}`);
  console.log('  این لیست را برای ایجنت بفرستید تا همان صفحات بهینه شوند.');
  process.exit(1);
}
console.log(`${C.green}${C.bold}✓ همه صفحات بالای ${THRESHOLD} هستند${C.reset}`);

function fmtShort(displayValue) {
  // «۱٫۲ s» / «2,340 ms» → خلاصه و هم‌عرض
  if (!displayValue || displayValue === '-') return '-';
  const m = displayValue.match(/([\d.,]+)\s*(s|ms|KiB|MiB)/);
  if (!m) return displayValue;
  const n = Number.parseFloat(m[1].replace(/,/g, ''));
  if (m[2] === 'ms') return `${(n / 1000).toFixed(1)}s`;
  return `${n.toFixed(n >= 10 ? 0 : 1)}${m[2]}`;
}
