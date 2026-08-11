#!/usr/bin/env node
/**
 * clear-dev-cache.mjs — Turbopack dev cache cleaner
 *
 * WHY THIS EXISTS
 * ---------------
 * Turbopack's dev cache (`.next/cache`, `.next/dev/cache/turbopack`,
 * `.next/static`) is a persistent incremental cache. After editing CSS
 * design tokens (`--fs-base`, `--ds-*`, etc.) the dev server can keep
 * serving the OLD compiled styles even after a plain restart — source
 * on disk is new, served CSS is stale, and the site silently regresses.
 *
 * Usage (see also `npm run cache:clean` / `npm run dev:clean`):
 *
 *   node scripts/clear-dev-cache.mjs            # normal run
 *   node scripts/clear-dev-cache.mjs --all      # delete the whole .next dir
 *   node scripts/clear-dev-cache.mjs --no-kill  # don't touch the running server
 *   node scripts/clear-dev-cache.mjs --dry-run  # print what would happen only
 *
 * Behavior:
 *   - If a dev server is listening on :3000 it KILLS only the `next` server
 *     tree; the project's `npm run dev` launcher (scripts/dev-turbo.mjs)
 *     notices the child exit and restarts it automatically with a clean
 *     cache. If the server does not come back by itself, run `npm run dev`.
 *   - Deletes the Turbopack persistent cache + compiled CSS chunks, with a
 *     retry loop for Windows file locks that briefly outlive the killed
 *     process tree.
 *   - `--dry-run` reports the server state and targets without changing
 *     anything (safe to run any time).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const DEFAULT_PORT = 3000;

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const noKill = args.includes('--no-kill');
const allFlag = args.includes('--all');
const portArg = args.find((a) => a.startsWith('--port='));
const port = portArg ? Number.parseInt(portArg.slice('--port='.length), 10) : DEFAULT_PORT;

// The stale-CSS culprits: the persistent Turbopack cache and the compiled
// static chunks. `--all` nukes the whole `.next` for stubborn cases.
const TARGETS = ['.next/cache', '.next/dev/cache/turbopack', '.next/static'];
const ALL_TARGETS = ['.next'];

const log = (...m) => console.log('[cache-clean]', ...m);
const warn = (...m) => console.warn('[cache-clean]', ...m);

/** True if something is listening on 127.0.0.1:port. */
function isPortListening(targetPort) {
  return new Promise((resolve) => {
    const sock = net.connect({ port: targetPort, host: '127.0.0.1' });
    sock.once('connect', () => {
      sock.destroy();
      resolve(true);
    });
    sock.once('error', () => resolve(false));
  });
}

/** Best-effort resolve of the PID listening on `port` (cross-platform). */
function listenerPid(targetPort) {
  try {
    if (process.platform === 'win32') {
      const out = execSync('netstat -ano', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      for (const line of out.split(/\r?\n/)) {
        if (!line.includes('LISTENING')) continue;
        const cols = line.trim().split(/\s+/);
        const addr = cols[1] ?? '';
        if (addr.endsWith(`:${targetPort}`) && cols[cols.length - 1]) {
          return cols[cols.length - 1];
        }
      }
      return null;
    }
    // POSIX: lsof -ti tcp:PORT prints the listener PID(s)
    const pid = execSync(`lsof -ti tcp:${targetPort}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .trim()
      .split(/\s+/)
      .pop();
    return pid || null;
  } catch {
    return null;
  }
}

/** Kill the process tree (Windows: taskkill /T kills children too). */
function killTree(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

function remove(relativeTarget) {
  try {
    fs.rmSync(path.join(projectRoot, relativeTarget), { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const listening = await isPortListening(port);
  const targets = allFlag ? ALL_TARGETS : TARGETS;

  if (isDryRun) {
    log('DRY RUN — nothing was changed.');
    log(`dev server on :${port}: ${listening ? 'RUNNING' : 'not running'}`);
    log(`would delete: ${targets.join(', ')}`);
    if (listening && !noKill) {
      log('would kill the next-server tree so dev-turbo restarts it with a clean cache');
    }
    process.exit(0);
  }

  if (listening) {
    if (noKill) {
      warn(
        `dev server is running on :${port} — locked files may survive. Stop it (Ctrl+C in the terminal running npm run dev) and re-run, or drop --no-kill.`,
      );
    } else {
      const pid = listenerPid(port);
      if (pid) {
        log(`killing next-server pid ${pid} on :${port} — dev-turbo restarts it automatically`);
        if (!killTree(pid)) {
          warn(`could not kill pid ${pid} — locked files may survive`);
        }
      } else {
        warn(`server detected on :${port} but its PID could not be resolved — skipping kill`);
      }
    }
  }

  // Let a killed process tree release its file handles before deleting.
  await new Promise((r) => setTimeout(r, 1500));

  const deleted = [];
  let locked = [];
  for (const target of targets) {
    if (remove(target)) deleted.push(target);
    else locked.push(target);
  }
  // Retry — a restarting dev server can hold locks for a moment.
  for (let i = 0; i < 5 && locked.length > 0; i++) {
    await new Promise((r) => setTimeout(r, 800));
    locked = locked.filter((target) => {
      if (remove(target)) {
        deleted.push(target);
        return false;
      }
      return true;
    });
  }

  log(
    `deleted: ${deleted.length > 0 ? deleted.join(', ') : '(nothing)'}` +
      `${allFlag ? ' (entire .next)' : ''}`,
  );
  if (locked.length > 0) {
    warn(
      `could not delete (locked): ${locked.join(', ')} — stop the dev server and re-run \`npm run cache:clean\``,
    );
  }
  log(
    'Done. dev-turbo will recompile from source; if the dev server does not restart on its own, ' +
      'run `npm run dev`. Then hard-refresh the browser (Ctrl+Shift+R).',
  );
}

main().catch((error) => {
  warn('unexpected failure:', error);
  process.exit(1);
});
