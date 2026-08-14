#!/usr/bin/env node
/**
 * scripts/rules-watch.mjs — Rules Read Gate · live watcher (هشدار لحظه‌ای)
 *
 * یاد گرفته شد 2026-08-14 (گزارش کاربر): بلاک سخت (verify/commit) فقط «بعد از
 * نوشتن» است و اگر ایجنت گام صفر را نادیده بگیرد توکن هدر می‌رود. هیچ runtime
 * ایجنت نمی‌تواند اولین ضربه را فیزیکی بلاک کند؛ این watcher نزدیک‌ترین چیز است:
 *
 *   در همان لحظه‌ای که یک فایل کد تغییر می‌کند و مهر «قوانین خوانده شد» تازه
 *   نیست → هشدار بزرگ + ثبت در `.rules-violations.log`. ایجنت همان‌جا می‌ایستد،
 *   قوانین را می‌خواند، مهر می‌زند و ادامه می‌دهد → هدررفت توکن ≈ فقط یک ویرایش.
 *
 * اجرا:
 *   npm run rules:watch            ← standalone
 *   (داخل scripts/dev-turbo.mjs هم خودکار استارت می‌شود — در حین dev فعال است)
 *
 * فایل‌های تماشاشده: src/ (recursive) + prisma/ + scripts/ — فقط پسوند کد.
 * خاموشی: CI=true یا RULES_GATE_SKIP=1.
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync, watch } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const VIOLATION_LOG = join(root, '.rules-violations.log');
const CODE_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.scss',
  '.prisma',
]);
const WATCH_DIRS = ['src', 'prisma', 'scripts'];

// gate را حداکثر هر ۵ ثانیه یک بار دوباره صدا بزن تا spawn اضافه نشود
let lastGateCheck = 0;
let gateStale = false;

function gateFresh() {
  const now = Date.now();
  if (now - lastGateCheck < 5000) return !gateStale;
  lastGateCheck = now;
  const r = spawnSync(process.execPath, [join(root, 'scripts', 'rules-gate.mjs'), 'check'], {
    cwd: root,
    stdio: 'ignore',
    encoding: 'utf8',
  });
  gateStale = r.status !== 0;
  return !gateStale;
}

/** per-file dedupe تا وقتی مهر تازه شود فقط یک بار هشدار بدهد */
const warnedFiles = new Set();

export function onChange(file) {
  if (!file) return;
  if (!CODE_EXT.has(extname(file).toLowerCase())) return;
  if (process.env.CI === 'true' || process.env.CI === '1' || process.env.RULES_GATE_SKIP === '1')
    return;
  if (gateFresh()) {
    warnedFiles.clear();
    return;
  }
  if (warnedFiles.has(file)) return;
  warnedFiles.add(file);

  const ts = new Date().toISOString();
  console.error(
    `\n\x1b[1m\x1b[31m⛔ RULES READ GATE — داری بدون مهر «قوانین خوانده شد» کد می‌نویسی!\x1b[0m\n   فایل: ${file} (${ts})\n   → همین‌جا بایست: npm run rules:check  (لیست فایل‌ها را می‌دهد)\n   → بعد از خواندن: npm run rules:stamp -- --files "AGENTS.md,PDK.md,pdk/constitution.md"\n   → بعد ادامه بده. بدون مهر تازه verify/commit بلاک می‌شوند.\n`,
  );
  try {
    appendFileSync(VIOLATION_LOG, `${ts} ${file}\n`);
  } catch {
    // log local است؛ خرابی آن نباید چیزی را بشکند
  }
}

export function startRulesWatch() {
  if (process.env.CI === 'true' || process.env.CI === '1') return;
  for (const dir of WATCH_DIRS) {
    const abs = join(root, dir);
    try {
      watch(abs, { recursive: true }, (_event, filename) => onChange(filename));
      console.log(`[rules-watch] watching ${dir}/ — هشدار لحظه‌ای فعال است`);
    } catch {
      console.log(`[rules-watch] (skip: ${dir} قابل تماشا نیست)`);
    }
  }
}

// اجرای standalone: node scripts/rules-watch.mjs
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log('[rules-watch] Rules Read Gate — live watcher');
  startRulesWatch();
  // ساکت منتظر بمان (فرایند زنده می‌ماند)
  setInterval(() => {}, 1 << 30);
}
