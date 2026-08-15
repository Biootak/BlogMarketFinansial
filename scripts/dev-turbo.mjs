#!/usr/bin/env node
/**
 * Self-healing `next dev` (Turbopack) launcher — `npm run dev`.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Freebuff desktop app keeps its SQLite database inside the watched
 * project root at `<project>/.freebuff/` (`desktop-v2.db` + `-shm` + `-wal`,
 * WAL mode). The app writes these files continuously and byte-range LOCKS
 * the `-shm` file while running. Turbopack's native file watcher reacts to
 * every change — including `.freebuff` — and when it tries to read the
 * locked `desktop-v2.db-shm` on Windows it hits "os error 33" and
 * FATAL-panics, surfacing as "An unexpected Turbopack error occurred" in
 * the browser.
 *
 * Next.js 16.3.0 exposes NO option to exclude paths from the Turbopack
 * watcher (`watchOptions` only supports `pollIntervalMs`; `.gitignore` is
 * not honored; there is no newer version with a fix). The only reliable
 * mitigation that keeps Turbopack is to hard-restart the dev server when a
 * panic occurs. That is what this script does:
 *
 *   1. runs `next dev` (Turbopack) as a child process,
 *   2. watches its output for the panic marker,
 *   3. on panic (or an unexpected crash) kills the process tree and starts
 *      a fresh server after a short delay,
 *   4. gives up after repeated panics in a short window so real config
 *      errors are not hidden behind a restart loop.
 *
 * Escape hatches:
 *   `npm run dev:raw`      — plain `next dev` (Turbopack), no auto-restart
 *   `npm run dev:webpack`  — `next dev --webpack` fallback (slower; the
 *                            webpack watcher honors `watchOptions.ignored`
 *                            for `.freebuff`, so it never panics)
 *
 * The real long-term fixes live outside this repo:
 *   - relocate the Freebuff app DB out of the watched project root, or
 *   - a future Turbopack fix that skips unreadable/locked files.
 *
 * Stale CSS after token changes? Turbopack's persistent dev cache can serve
 * OLD compiled styles even after this script restarts the server. Run
 * `npm run cache:clean` (scripts/clear-dev-cache.mjs) after editing CSS
 * design tokens, then hard-refresh the browser.
 */

import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startRulesWatch } from './rules-watch.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

// Turbopack prints the same marker for every panic type (the "FATAL" word is
// wrapped in ANSI color codes, so match the clean text after it).
const PANIC_PATTERN = /An unexpected Turbopack error occurred|panic log has been written to/i;
// Build the ANSI-strip regex at runtime so no literal control char sits in the source
// (Biome's noControlCharactersInRegex rejects both \x1b and \u001b literals).
const ESC = String.fromCharCode(27);
const STRIP_ANSI = (s) => s.replace(new RegExp(`${ESC}\\[[0-9;]*m`, 'g'), '');

const RESTART_WINDOW_MS = 120_000; // rolling window for the loop guard
const MAX_RESTARTS = 3; // panics allowed inside the window before giving up
const RESTART_DELAY_MS = 3_000; // give the OS time to release port + SQLite locks

let child = null;
let restartScheduled = false;
let shuttingDown = false;
let restartCount = 0;
let windowStartedAt = 0;

const log = (...args) => console.log('[dev-turbo]', ...args);

function killTree(target, signal = 'SIGTERM') {
  if (!target || target.exitCode !== null || !target.pid) return;
  if (process.platform === 'win32') {
    // Terminate the whole process tree (postcss workers etc.) on Windows.
    spawnSync('taskkill', ['/pid', String(target.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      target.kill(signal);
    } catch {
      // already gone
    }
  }
}

function scheduleRestart(reason) {
  if (restartScheduled || shuttingDown) return;
  restartScheduled = true;

  const now = Date.now();
  if (now - windowStartedAt > RESTART_WINDOW_MS) {
    windowStartedAt = now;
    restartCount = 0;
  }
  restartCount += 1;

  if (restartCount > MAX_RESTARTS) {
    log('Too many Turbopack panics/crashes in a short window — giving up.');
    log(
      'Run "npm run dev:raw" to see the raw error, or "npm run dev:webpack" for the webpack fallback.',
    );
    killTree(child, 'SIGKILL');
    process.exit(1);
  }

  log(
    `Restarting dev server (attempt ${restartCount}/${MAX_RESTARTS}) in ${RESTART_DELAY_MS / 1000}s…`,
  );
  log(`Reason: ${reason}`);
  killTree(child, 'SIGTERM');

  setTimeout(() => {
    restartScheduled = false;
    startDevServer();
  }, RESTART_DELAY_MS);
}

function startDevServer() {
  const nodeOptions = process.env.NODE_OPTIONS || '';
  const env = {
    ...process.env,
    NODE_OPTIONS: nodeOptions.includes('dns-result-order')
      ? nodeOptions
      : `${nodeOptions} --dns-result-order=ipv4first`.trim(),
  };

  const passthrough = process.argv.slice(2);
  const hasPortFlag = passthrough.some(
    (a) => a === '-p' || a === '--port' || a.startsWith('-p=') || a.startsWith('--port='),
  );
  // Official docs: `next dev` default port is 3000, env: PORT. The desktop host
  // exports PORT in the ambient environment, which would otherwise silently move
  // the server off 3000. Pin the documented default explicitly — the CLI `-p`
  // flag always wins over the env var (docs: `-p, --port <port>`).
  const args = [nextBin, 'dev', ...(hasPortFlag ? passthrough : [...passthrough, '-p', '3000'])];
  log(`starting: node ${args.join(' ')}`);

  child = spawn(process.execPath, args, {
    cwd: projectRoot,
    env,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  const forward = (streamName) => (chunk) => {
    const text = chunk.toString();
    process[streamName].write(chunk); // keep normal dev-server output flowing
    if (!shuttingDown && PANIC_PATTERN.test(STRIP_ANSI(text))) {
      log('Turbopack panic detected (locked .freebuff SQLite file).');
      scheduleRestart('Turbopack panic — locked .freebuff/desktop-v2.db-shm (os error 33)');
    }
  };

  child.stdout.on('data', forward('stdout'));
  child.stderr.on('data', forward('stderr'));

  child.on('exit', (code, signal) => {
    child = null;
    if (shuttingDown) return;
    if (restartScheduled) return; // scheduleRestart's timer will relaunch
    if (code === 0) {
      log('dev server exited cleanly. Bye.');
      process.exit(0);
    }
    log(`dev server exited unexpectedly (code=${code}, signal=${signal}).`);
    scheduleRestart(`unexpected exit (code=${code}, signal=${signal})`);
  });
}

const handleSignal = (signal) => {
  shuttingDown = true;
  log(`received ${signal} — stopping dev server.`);
  killTree(child, signal === 'SIGINT' ? 'SIGTERM' : 'SIGKILL');
  process.exit(signal === 'SIGINT' ? 130 : 143);
};

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

// Rules Read Gate — non-blocking startup reminder (learned 2026-08-14).
// اگر مهر «قوانین خوانده شد» کهنه/نباشد، قبل از استارت dev server هشدار می‌دهد
// تا ایجنت قبل از نوشتن هر کد، AGENTS.md/PDK.md را دوباره بخواند.
function warnIfRulesStale() {
  if (process.env.CI === 'true' || process.env.CI === '1') return;
  const r = spawnSync(
    process.execPath,
    [path.join(projectRoot, 'scripts', 'rules-gate.mjs'), 'check'],
    { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (r.status === 0) return;
  log('⚠️  Rules Read Gate: مهر «قوانین خوانده شد» تازه نیست — قبل از نوشتن کد:');
  log('    npm run rules:check  ← لیست فایل‌های خواندنی را می‌دهد');
  log('    npm run rules:stamp -- --files "AGENTS.md,PDK.md,pdk/constitution.md"');
}

warnIfRulesStale();
startRulesWatch();
startDevServer();
