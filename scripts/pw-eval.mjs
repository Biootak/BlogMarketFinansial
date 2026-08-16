#!/usr/bin/env node
/**
 * Run a JS probe in the LIVE Playwright browser (the one opened by
 * `npm run browser:open`) and print the JSON result.
 *
 * The probe file is an IIFE-ish expression evaluated in the page context.
 * Usage:
 *   node scripts/pw-eval.mjs scripts/probes/live-design-probe.js
 *
 * Requires the driver to be running (npm run browser:open).
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const cmdDir = path.join(root, '.playwright-mcp');

const probePath = process.argv[2];
if (!probePath) {
  console.error('usage: node scripts/pw-eval.mjs <probe.js>');
  process.exit(1);
}
const expression = readFileSync(path.resolve(process.cwd(), probePath), 'utf8');

const id = Date.now();
const cmdFile = path.join(cmdDir, 'cmd.json');
const outFile = path.join(cmdDir, `cmd-out-${id}.json`);

const deadline = Date.now() + 30000;
while (existsSync(cmdFile) && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 300));
}
// newer @playwright/mcp renamed the parameter to `function`; older used `expression`
writeFileSync(
  cmdFile,
  JSON.stringify({ id, tool: 'browser_evaluate', args: { function: expression } }),
);

let out = null;
while (Date.now() < deadline + 120000) {
  if (existsSync(outFile)) {
    out = JSON.parse(readFileSync(outFile, 'utf8'));
    break;
  }
  await new Promise((r) => setTimeout(r, 500));
}

if (!out) {
  console.error('TIMEOUT waiting for driver response — is `npm run browser:open` running?');
  process.exit(1);
}
if (!out.ok) {
  console.error('ERROR:', out.error);
  process.exit(1);
}
const text = (out.result?.content || []).map((c) => c.text).join('\n');
console.log(text);
