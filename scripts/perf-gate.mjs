#!/usr/bin/env node
/**
 * perf-gate — گیت رگرسیون پرفورمنس (2026-08-15)
 * ----------------------------------------------------------------------------
 * چرا؟ اندازه‌گیری Lighthouse production (2026-08-15) نشان داد JS سنگین در
 * main thread (TBT تا 1,090ms) و bundle بزرگ‌شدن بی‌صدا خطر اصلی رگرسیون است.
 * این اسکریپت با دو معیار قطعی و بدون نیاز به اینترنت، رگرسیون را می‌گیرد:
 *
 *   ۱) حجم کل chunk های کلاینت  (کل .next/static/chunks — خام + gzip)
 *   ۲) first-load JS هر صفحه   (جمع JS های اولیه‌ی HTML — با next start واقعی)
 *      + گارد «تصاویر مستقیم از CDN» (بدون /_next/image در HTML)
 *
 * کاربرد:
 *   node scripts/perf-gate.mjs snapshot [distDir]          → ثبت baseline فعلی
 *   node scripts/perf-gate.mjs gate [distDir]               → مقایسه + خروج غیرصفر اگر رگرسیون
 *   node scripts/perf-gate.mjs gate [distDir] --pages=/,/archive,/exchanges
 *
 * distDir: آرگومان اول، یا متغیر NEXT_DIST_DIR، یا پیش‌فرض `.next`.
 * گیت فقط روی build پروداکشن معنا دارد (next dev نیست).
 *
 * قوانین گیت (پیش‌فرض — داخل perf/bundle-baseline.json قابل تنظیم):
 *   - کل chunk ها > baseline × 1.12           → FAIL
 *   - first-load هر صفحه > baseline × 1.15    → FAIL
 *   - سقف مطلق: صفحه‌ای با gzip > 750KB یا خام > 2500KB → FAIL
 *   - وجود /_next/image در HTML صفحه          → FAIL (loader به CDN برمی‌گردد)
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { dirname, join, relative as pathRelative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const BASELINE_PATH = join(root, 'perf', 'bundle-baseline.json');

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function kb(bytes) {
  return `${Math.round(bytes / 1024)}KB`;
}

/* ── پارس آرگومان ─────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const mode = args.find((a) => a === 'snapshot' || a === 'gate') ?? 'gate';
const positional = args.filter((a) => !a.startsWith('--') && a !== mode);
const pagesArg = args.find((a) => a.startsWith('--pages='));
const PAGES = pagesArg
  ? pagesArg.slice('--pages='.length).split(',').filter(Boolean)
  : ['/', '/archive'];
const distDir = resolve(root, positional[0] ?? process.env.NEXT_DIST_DIR ?? '.next');

/* ── تحلیل chunk ها ────────────────────────────────────────────────────── */
function collectChunkStats() {
  const chunksDir = join(distDir, 'static', 'chunks');
  if (!existsSync(chunksDir)) {
    console.error(
      `${C.red}✗ build پیدا نشد: ${distDir}${C.reset}\n  اول \`next build\` (یا NEXT_DIST_DIR=... ) را اجرا کن — گیت روی build پروداکشن کار می‌کند.`,
    );
    process.exit(2);
  }
  const files = readdirSync(chunksDir).filter((f) => f.endsWith('.js'));
  let raw = 0;
  let gzip = 0;
  const top = [];
  for (const f of files) {
    const bytes = statSync(join(chunksDir, f)).size;
    raw += bytes;
    gzip += gzipSync(readFileSync(join(chunksDir, f))).length;
    top.push(bytes);
  }
  top.sort((a, b) => b - a);
  return {
    chunkCount: files.length,
    totalRaw: raw,
    totalGzip: gzip,
    top5Raw: top.slice(0, 5),
  };
}

/* ── first-load JS هر صفحه (next start واقعی) ─────────────────────────── */
function freePort() {
  return new Promise((resolvePort, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const p = srv.address().port;
      srv.close(() => resolvePort(p));
    });
    srv.on('error', reject);
  });
}

function startServer(port) {
  // نکته ویندوز: next start با NEXT_DIST_DIR مطلق build را پیدا نمی‌کند
  // (ProductionStartNoBuildID) — همیشه مسیر نسبی از root پاس می‌دهیم.
  const distRel = pathRelative(root, distDir) || '.';
  const child = spawn('npx', ['next', 'start', '-p', String(port)], {
    cwd: root,
    env: { ...process.env, NEXT_DIST_DIR: distRel, NODE_ENV: 'production' },
    stdio: 'ignore',
    // روی ویندوز npx فقط از طریق shell قابل spawn است (EINVAL بدون آن)
    shell: process.platform === 'win32',
  });
  return child;
}

async function waitReady(port, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/`);
      if (r.status === 200) return;
    } catch {
      // server هنوز بالا نیامده
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  throw new Error('next start آماده نشد (timeout)');
}

async function measurePages() {
  const port = await freePort();
  const child = startServer(port);
  const results = {};
  try {
    await waitReady(port);
    for (const path of PAGES) {
      const html = await (await fetch(`http://127.0.0.1:${port}${path}`)).text();
      const scripts = [...html.matchAll(/(?:"|')(\/_next\/static\/[^"'?]+\.js)(?:"|')/g)].map(
        (m) => m[1],
      );
      let raw = 0;
      let gzip = 0;
      for (const s of scripts) {
        const file = join(distDir, ...s.replace(/^\/_next\//, '').split('/'));
        if (!existsSync(file)) continue;
        const bytes = statSync(file).size;
        raw += bytes;
        gzip += gzipSync(readFileSync(file)).length;
      }
      results[path] = {
        firstLoadRaw: raw,
        firstLoadGzip: gzip,
        scriptCount: scripts.length,
        hasImageProxy: html.includes('/_next/image'),
      };
    }
  } finally {
    child.kill('SIGTERM');
  }
  return results;
}

/* ── خروجی ────────────────────────────────────────────────────────────── */
function printStats(stats, pageResults) {
  console.log(`${C.cyan}▶ build: ${distDir}${C.reset}`);
  console.log(
    `  chunks: ${stats.chunkCount} | total ${kb(stats.totalRaw)} raw / ${kb(stats.totalGzip)} gzip | top5: ${stats.top5Raw.map(kb).join(', ')}`,
  );
  for (const [path, p] of Object.entries(pageResults)) {
    console.log(
      `  page ${path.padEnd(12)} first-load ${kb(p.firstLoadRaw)} raw / ${kb(p.firstLoadGzip)} gzip (${p.scriptCount} scripts)${p.hasImageProxy ? ` ${C.red}⚠ /_next/image!${C.reset}` : ''}`,
    );
  }
}

/* ── snapshot ──────────────────────────────────────────────────────────── */
async function snapshot() {
  const stats = collectChunkStats();
  const pageResults = await measurePages();
  printStats(stats, pageResults);
  const baseline = {
    capturedAt: new Date().toISOString(),
    commit: 'local',
    distDir,
    budgets: {
      totalRawFactor: 1.12,
      pageRawFactor: 1.15,
      pageGzipFactor: 1.15,
      hardCaps: { pageRaw: 2500 * 1024, pageGzip: 750 * 1024 },
      noImageProxy: true,
    },
    chunks: {
      chunkCount: stats.chunkCount,
      totalRaw: stats.totalRaw,
      totalGzip: stats.totalGzip,
      top5Raw: stats.top5Raw,
    },
    pages: Object.fromEntries(
      Object.entries(pageResults).map(([path, p]) => [
        path,
        { firstLoadRaw: p.firstLoadRaw, firstLoadGzip: p.firstLoadGzip },
      ]),
    ),
  };
  mkdirSync(dirname(BASELINE_PATH), { recursive: true });
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`${C.green}✓ baseline ثبت شد: ${BASELINE_PATH}${C.reset}`);
}

/* ── gate ──────────────────────────────────────────────────────────────── */
async function gate() {
  if (!existsSync(BASELINE_PATH)) {
    console.error(
      `${C.red}✗ perf/bundle-baseline.json نیست — اول: npm run perf:snapshot${C.reset}`,
    );
    process.exit(2);
  }
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  const stats = collectChunkStats();
  const pageResults = await measurePages();
  printStats(stats, pageResults);

  const b = baseline.budgets;
  const failures = [];
  const report = (ok, label, detail) => {
    const mark = ok ? `${C.green}✓` : `${C.red}✗`;
    console.log(`  ${mark} ${label}${C.reset} — ${detail}`);
    if (!ok) failures.push(label);
  };

  const totalBudget = Math.round(baseline.chunks.totalRaw * b.totalRawFactor);
  report(
    stats.totalRaw <= totalBudget,
    'chunk total',
    `${kb(stats.totalRaw)} ≤ ${kb(totalBudget)} (baseline ${kb(baseline.chunks.totalRaw)} × ${b.totalRawFactor})`,
  );

  for (const [path, p] of Object.entries(pageResults)) {
    const prev = baseline.pages[path];
    if (!prev) {
      report(false, `page ${path}`, 'در baseline ثبت نشده — با perf:snapshot به‌روزرسانی کن');
      continue;
    }
    const rawBudget = Math.round(prev.firstLoadRaw * b.pageRawFactor);
    report(
      p.firstLoadRaw <= rawBudget,
      `page ${path} raw`,
      `${kb(p.firstLoadRaw)} ≤ ${kb(rawBudget)} (baseline ${kb(prev.firstLoadRaw)} × ${b.pageRawFactor})`,
    );
    const gzipBudget = Math.round(prev.firstLoadGzip * b.pageGzipFactor);
    report(
      p.firstLoadGzip <= gzipBudget,
      `page ${path} gzip`,
      `${kb(p.firstLoadGzip)} ≤ ${kb(gzipBudget)} (baseline ${kb(prev.firstLoadGzip)} × ${b.pageGzipFactor})`,
    );
    report(
      p.firstLoadRaw <= b.hardCaps.pageRaw,
      `page ${path} hard-cap raw`,
      `${kb(p.firstLoadRaw)} ≤ ${kb(b.hardCaps.pageRaw)}`,
    );
    report(
      p.firstLoadGzip <= b.hardCaps.pageGzip,
      `page ${path} hard-cap gzip`,
      `${kb(p.firstLoadGzip)} ≤ ${kb(b.hardCaps.pageGzip)}`,
    );
    if (b.noImageProxy) {
      report(
        !p.hasImageProxy,
        `page ${path} CDN-direct images`,
        p.hasImageProxy
          ? 'تصاویر از /_next/image پراکسی می‌شوند (loader خراب شده؟)'
          : 'تصاویر مستقیم از CDN',
      );
    }
  }

  console.log('');
  if (failures.length) {
    console.log(`${C.red}${C.bold}✗ PERF GATE FAILED (${failures.length})${C.reset}`);
    process.exit(1);
  }
  console.log(`${C.green}${C.bold}✓ PERF GATE PASSED${C.reset}`);
}

(async () => {
  if (mode === 'snapshot') {
    await snapshot();
  } else {
    await gate();
  }
})().catch((err) => {
  console.error(`${C.red}✗ ${err.message}${C.reset}`);
  process.exit(1);
});
