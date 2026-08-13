#!/usr/bin/env node
/**
 * Playwright MCP — open the dev site in a real (headed) browser.
 *
 * WHY THIS EXISTS (read before changing anything):
 * The Freebuff session does not attach MCP tools to the agent, so a small
 * driver is used to talk to the official `@playwright/mcp` server with the
 * official MCP SDK. This file is the SINGLE entry point for opening the
 * browser. Do NOT reconfigure/recreate the MCP setup — see AGENTS.playwright.md.
 *
 * Behavior:
 *   1. Ensures the MCP SDK dependency exists under .playwright-mcp/sdk/
 *      (auto-installs it if that folder was deleted — recreates itself).
 *   2. Spawns `npx -y @playwright/mcp@latest` (headed by default).
 *   3. Navigates to http://localhost:3000 (override with PW_URL).
 *   4. Saves a verification screenshot to .playwright-mcp/open-browser-check.png.
 *   5. Keeps the client connection alive so the browser window stays open.
 *
 * Usage:
 *   npm run dev            # first, in another terminal
 *   npm run browser:open   # then this
 *
 * Note: latest @playwright/mcp renamed its tools to browser_* (browser_navigate,
 * browser_take_screenshot, ...). If a future release breaks tools/call, pin the
 * version below to a known-good one (e.g. @playwright/mcp@0.0.78).
 */
import { spawnSync, spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const sdkDir = path.join(root, '.playwright-mcp', 'sdk');
const profileDir = path.join(root, '.playwright-mcp', 'profile');
mkdirSync(sdkDir, { recursive: true });
mkdirSync(profileDir, { recursive: true });

const URL = process.env.PW_URL || 'http://localhost:3000';
const MCP_PKG = process.env.PW_MCP_PKG || '@playwright/mcp@latest';

const log = (...a) => console.log('[pw]', ...a);

// ---- 1. Ensure the MCP SDK is available (self-healing) --------------------
const sdkPkgDir = path.join(sdkDir, 'node_modules', '@modelcontextprotocol', 'sdk');
if (!existsSync(path.join(sdkPkgDir, 'package.json'))) {
  log(`installing @modelcontextprotocol/sdk into ${path.relative(root, sdkDir)} …`);
  const r = spawnSync(
    'npm',
    ['install', '@modelcontextprotocol/sdk', '--no-save', '--no-audit', '--no-fund'],
    { cwd: sdkDir, stdio: 'inherit', shell: process.platform === 'win32' },
  );
  if (r.status !== 0) {
    console.error('[pw] failed to install MCP SDK — run: cd .playwright-mcp/sdk && npm i @modelcontextprotocol/sdk');
    process.exit(1);
  }
}

// The SDK is ESM-only; import its dist files directly. All internal imports
// are relative or bare (zod/events), so they resolve from the file's own dir.
const sdkDist = path.join(sdkPkgDir, 'dist', 'esm');
const { Client } = await import(pathToFileURL(path.join(sdkDist, 'client', 'index.js')).href);
const { StdioClientTransport } = await import(pathToFileURL(path.join(sdkDist, 'client', 'stdio.js')).href);

// ---- 2. Friendly check that the dev server is reachable --------------------
try {
  await fetch(URL, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
} catch {
  console.warn(`[pw] warning: ${URL} did not respond — is the dev server running? (npm run dev)`);
  console.warn('[pw] the browser will still open and show the error page.');
}

// ---- 3. Spawn the Playwright MCP server and open the browser ----------------
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', MCP_PKG, '--user-data-dir', profileDir],
  cwd: root,
});
const client = new Client({ name: 'freebuff-preview', version: '1.0.0' });

try {
  await client.connect(transport);
  log('connected to Playwright MCP');

  const tools = await client.listTools();
  const navName = tools.tools.some((t) => t.name === 'browser_navigate') ? 'browser_navigate' : 'playwright_navigate';
  const shotName = tools.tools.some((t) => t.name === 'browser_take_screenshot') ? 'browser_take_screenshot' : 'playwright_screenshot';

  await client.callTool({ name: navName, arguments: { url: URL } });
  log('navigated to', URL);

  // External sites can be slow (fonts, CDNs) — wait, then retry the screenshot once.
  await new Promise((r) => setTimeout(r, 15000));
  let shot;
  try {
    shot = await client.callTool({ name: shotName, arguments: {} });
  } catch {
    await new Promise((r) => setTimeout(r, 10000));
    shot = await client.callTool({ name: shotName, arguments: {} });
  }
  const img = (shot.content || []).find((c) => c.type === 'image');
  if (img?.data) {
    const out = path.join(root, '.playwright-mcp', 'open-browser-check.png');
    writeFileSync(out, Buffer.from(img.data, 'base64'));
    log('screenshot saved:', out);
  } else {
    log('screenshot content:', JSON.stringify(shot.content).slice(0, 300));
  }

  log('BROWSER OPEN — keeping connection alive. Kill this process to close.');

  // ---- Control channel -----------------------------------------------------
  // Any helper (e.g. scripts/pw-cmd.mjs) can drive THIS live browser session by
  // dropping a JSON command into .playwright-mcp/cmd.json:
  //   { "id": 1, "tool": "browser_snapshot", "args": {} }
  // Result is written to .playwright-mcp/cmd-out-<id>.json.
  const toolNames = new Set(tools.tools.map((t) => t.name));
  const resolveName = (name) => {
    if (toolNames.has(name)) return name;
    const alt = name.startsWith('browser_')
      ? 'playwright_' + name.slice(8)
      : name.startsWith('playwright_')
        ? 'browser_' + name.slice(11)
        : null;
    return alt && toolNames.has(alt) ? alt : name;
  };
  const CMD_FILE = path.join(root, '.playwright-mcp', 'cmd.json');

  const controlLoop = async () => {
    for (;;) {
      try {
        if (existsSync(CMD_FILE)) {
          const cmd = JSON.parse(readFileSync(CMD_FILE, 'utf8'));
          unlinkSync(CMD_FILE);
          const { id, tool, args = {} } = cmd;
          const outFile = path.join(root, '.playwright-mcp', `cmd-out-${id}.json`);
          try {
            const res = await client.callTool({ name: resolveName(tool), arguments: args });
            writeFileSync(outFile, JSON.stringify({ ok: true, result: res }));
          } catch (e) {
            writeFileSync(outFile, JSON.stringify({ ok: false, error: e.message }));
          }
        }
      } catch (e) {
        log('control loop error:', e.message);
      }
      await new Promise((r) => setTimeout(r, 700));
    }
  };
  controlLoop();

  const keepAlive = setInterval(() => {}, 1 << 30);
  const shutdown = async () => {
    clearInterval(keepAlive);
    await client.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (e) {
  console.error('[pw] FAILED:', e.message);
  process.exit(1);
}
