#!/usr/bin/env node
/**
 * scripts/rules-gate.mjs — Rules Read Gate (مهر مکانیکی «قوانین خوانده شد»)
 *
 * چرا وجود دارد (learned 2026-08-14 — گزارش کاربر):
 *   قانونِ نوشته‌شده در AGENTS.md به‌تنهایی اجرا نمی‌شد — مخصوصاً وقتی سشن یا
 *   اکانت عوض می‌شود. این gate آن را مکانیکی می‌کند و روی همین working tree
 *   مشترک (همه اکانت‌ها/سشن‌ها) کار می‌کند:
 *
 *     - `npm run verify` بدون مهر تازه FAIL می‌شود → تسک «تمام» نمی‌شود
 *     - pre-commit hook بدون مهر تازه کامیت را بلاک می‌کند
 *     - مهر با sha256 فایل‌های قانون ثبت می‌شود → اگر AGENTS.md / PDK.md /
 *       pdk/constitution.md عوض شوند (push/pull/update)، مهر خودکار باطل می‌شود
 *       و خواندن دوباره اجباری است.
 *
 * حد صادقانه: هیچ سیستمی نمی‌تواند «لحظهٔ نوشتن اولین خط» را رهگیری کند؛
 * اما مسیر اتمام (verify) و کامیت (hook) بدون مهر تازه بسته است → کار بدون
 * خواندن قوانین هرگز تمام/کامیت نمی‌شود.
 *
 * فرمان‌ها:
 *   node scripts/rules-gate.mjs check    → گام صفر هر تسک (تازه نباشد = FAIL)
 *   node scripts/rules-gate.mjs stamp --files "AGENTS.md,PDK.md,pdk/constitution.md,..."
 *   node scripts/rules-gate.mjs log      → آخرین مهرها (audit trail)
 *   node scripts/rules-gate.mjs status   → مثل check با خروجی دوستانه
 *
 * متغیرهای محیطی:
 *   RULES_GATE_TTL_MINUTES  (پیش‌فرض 120) — عمر مجاز مهر
 *   RULES_GATE_SKIP=1 / CI=true           — bypass (فقط CI و موارد استثنا)
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const STAMP_FILE = join(root, '.rules-read-stamp.json');
const LOG_FILE = join(root, '.rules-read-log.jsonl');

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

/** فایل‌هایی که قبل از هر تسک حتماً باید خوانده شوند (مهر بدون آن‌ها ثبت نمی‌شود). */
const REQUIRED_FILES = ['AGENTS.md', 'PDK.md', 'pdk/constitution.md'];

/** فایل‌های topic — بر اساس نوع تسک باید انتخاب شوند (گیت فقط راهنمایی می‌کند). */
const TOPIC_FILES = [
  'AGENTS.commands.md',
  'AGENTS.repo.md',
  'AGENTS.style.md',
  'AGENTS.env.md',
  'AGENTS.gotchas.md',
  'AGENTS.architecture.md',
  'AGENTS.anti-failure.md',
  'AGENTS.19dqg.md',
  'AGENTS.uidqg.md',
  'AGENTS.ui-design.md',
  'AGENTS.ui-ux-skill.md',
  'AGENTS.market-rates.md',
  'AGENTS.mcp.md',
  'AGENTS.playwright.md',
  'DESIGN.md',
  'COMPONENTS.md',
  'ARCHITECT_RULES.md',
  'TESTING-CHECKLIST.md',
  'pdk/project-reality.md',
  'pdk/architecture.md',
  'pdk/security.md',
  'pdk/database.md',
  'pdk/api.md',
  'pdk/coding-standards.md',
  'pdk/design-system.md',
  'pdk/design-cycle.md',
  'pdk/anti-failure.md',
];

function fileHash(relPath) {
  const abs = join(root, relPath);
  if (!existsSync(abs)) return null;
  return createHash('sha256').update(readFileSync(abs)).digest('hex').slice(0, 12);
}

function ttlMinutes() {
  const v = Number(process.env.RULES_GATE_TTL_MINUTES);
  return Number.isFinite(v) && v > 0 ? v : 120;
}

function whoAmI() {
  const user = process.env.USERNAME || process.env.USER || os.userInfo().username || 'unknown';
  const session =
    process.env.SESSION_NAME || process.env.SESSION_ID || process.env.FREEBUFF_SESSION || 'n/a';
  return { user, session };
}

function printHowToFix() {
  console.error(`\n${C.bold}${C.yellow}قبل از هر کد — این مراحل را انجام بده:${C.reset}`);
  console.error(`  1) این فایل‌ها را بخوان (همیشه): ${REQUIRED_FILES.join('، ')}`);
  console.error(
    `  2) فایل‌های مرتبط با همین تسک را هم بخوان، مثلاً: ${TOPIC_FILES.slice(0, 6).join('، ')} و ...`,
  );
  console.error('  3) بعد از خواندن واقعی، مهر بزن:');
  console.error(
    `     ${C.cyan}npm run rules:stamp -- --files "AGENTS.md,PDK.md,pdk/constitution.md"${C.reset}`,
  );
  console.error(`  4) گام صفر تسک بعدی: ${C.cyan}npm run rules:check${C.reset}`);
}

function check() {
  if (process.env.CI === 'true' || process.env.CI === '1' || process.env.RULES_GATE_SKIP === '1') {
    console.log(`${C.dim}[rules-gate] skipped (CI or RULES_GATE_SKIP)${C.reset}`);
    process.exit(0);
  }

  const problems = [];
  let stamp = null;

  if (!existsSync(STAMP_FILE)) {
    problems.push('هیچ مهری ثبت نشده — قوانین هنوز خوانده نشده است.');
  } else {
    try {
      stamp = JSON.parse(readFileSync(STAMP_FILE, 'utf8'));
    } catch {
      problems.push('فایل مهر خراب است — دوباره مهر بزن.');
    }
  }

  if (stamp) {
    const ageMin = (Date.now() - new Date(stamp.readAt).getTime()) / 60000;
    if (Number.isNaN(ageMin) || ageMin > ttlMinutes()) {
      problems.push(
        `مهر کهنه است (${Number.isNaN(ageMin) ? '؟' : `${Math.round(ageMin)} دقیقه پیش`} — حداکثر ${ttlMinutes()} دقیقه). قوانین را دوباره بخوان و مهر تازه بگیر.`,
      );
    }
    for (const f of REQUIRED_FILES) {
      const h = fileHash(f);
      if (h === null) {
        problems.push(`فایل قانون «${f}» وجود ندارد — ریپو خراب است؟`);
      } else if (stamp.hashes?.[f] !== h) {
        problems.push(`«${f}» بعد از آخرین مهر تغییر کرده — دوباره بخوان و مهر بزن.`);
      }
    }
  }

  if (problems.length > 0) {
    console.error(`\n${C.bold}${C.red}✗ RULES READ GATE FAILED${C.reset}`);
    for (const p of problems) {
      console.error(`  ${C.red}•${C.reset} ${p}`);
    }
    printHowToFix();
    process.exit(1);
  }

  const ageMin = Math.round((Date.now() - new Date(stamp.readAt).getTime()) / 60000);
  console.log(
    `${C.green}✓ rules read${C.reset} — ${stamp.readAt} (${stamp.user}, ${ageMin} دقیقه پیش، ${stamp.files?.length ?? 0} فایل)${C.reset}`,
  );
  process.exit(0);
}

function stamp() {
  const args = process.argv.slice(2);
  const filesArg =
    args
      .find((a) => a.startsWith('--files='))
      ?.split('=')
      .slice(1)
      .join('=') ?? args[args.indexOf('--files') + 1];
  const files = (filesArg || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (files.length === 0) {
    console.error(`${C.red}✗ --files خالی است. فایل‌هایی را که واقعاً خوانده‌ای بده.${C.reset}`);
    printHowToFix();
    process.exit(1);
  }

  const missingRequired = REQUIRED_FILES.filter((f) => !files.includes(f));
  if (missingRequired.length > 0) {
    console.error(
      `${C.red}✗ فایل‌های اجباری در --files نیست: ${missingRequired.join('، ')}${C.reset}`,
    );
    printHowToFix();
    process.exit(1);
  }

  const hashes = {};
  for (const f of files) {
    const h = fileHash(f);
    if (h === null) {
      console.error(
        `${C.red}✗ فایل «${f}» وجود ندارد — فقط فایل‌هایی را که واقعاً خوانده‌ای مهر کن.${C.reset}`,
      );
      process.exit(1);
    }
    hashes[f] = h;
  }

  const { user, session } = whoAmI();
  const entry = { readAt: new Date().toISOString(), user, session, files, hashes };
  writeFileSync(STAMP_FILE, JSON.stringify(entry, null, 2));
  appendFileSync(LOG_FILE, `${JSON.stringify({ readAt: entry.readAt, user, session, files })}\n`);

  console.log(`${C.green}✓ مهر «قوانین خوانده شد» ثبت شد${C.reset} — ${entry.readAt} (${user})`);
  console.log(`  فایل‌ها (${files.length}): ${files.join('، ')}`);
  console.log(
    `  تا ${ttlMinutes()} دقیقه معتبر است؛ اگر AGENTS/PDK/constitution تغییر کند خودکار باطل می‌شود.`,
  );
  console.log(`  گام صفر تسک بعدی: ${C.cyan}npm run rules:check${C.reset}`);
}

function log() {
  if (!existsSync(LOG_FILE)) {
    console.log('هنوز مهری ثبت نشده است.');
    return;
  }
  const lines = readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean).slice(-10);
  console.log(`آخرین مهرهای «قوانین خوانده شد» (${LOG_FILE}):`);
  for (const line of lines) {
    try {
      const e = JSON.parse(line);
      console.log(`  ${e.readAt} — ${e.user} (${e.session}) — ${e.files.length} فایل`);
    } catch {
      console.log(`  ${C.dim}${line}${C.reset}`);
    }
  }
}

function help() {
  console.log(`usage: node scripts/rules-gate.mjs <check|stamp|log|status>
  check     گام صفر هر تسک — اگر مهر تازه نباشد exit 1
  stamp     --files "AGENTS.md,PDK.md,pdk/constitution.md,..." — بعد از خواندن واقعی
  log       audit trail مهرها
  status    مثل check با پیام دوستانه`);
}

const cmd = process.argv[2];
switch (cmd) {
  case 'check':
  case 'status':
    check();
    break;
  case 'stamp':
    stamp();
    break;
  case 'log':
    log();
    break;
  default:
    help();
    process.exit(cmd ? 2 : 0);
}
