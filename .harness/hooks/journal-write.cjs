#!/usr/bin/env node
// journal-write.ps1 (node stub): append one line to .harness/.journal.log
// Usage:
//   node journal-write.cjs <TOOL> <REL_PATH> [+A -B]
//   node journal-write.cjs EDIT src/foo.tsx "+71 -10"
//
// TOOL must be uppercase: EDIT, WRITE, MANUAL, NOTE, HOOK, SKILL, SCRIPT
// REL_PATH must be relative to E:/FinancialMarket with forward-slash separators.
// DIFF is the "(+A -B)" diff from the Edit tool result if known, else omit.

const fs = require('node:fs');
const path = require('node:path');

const repo = 'E:/FinancialMarket';
const journalPath = path.join(repo, '.harness', '.journal.log');

const tool = (process.argv[2] || 'MANUAL').toUpperCase();
const rel = process.argv[3] || '?';
const diff = process.argv[4] || '';
const ts = new Date().toISOString();

const line = `${ts}  ${tool.padEnd(8)}  ${rel}${diff ? `  ${diff}` : ''}\n`;

try {
  fs.mkdirSync(path.dirname(journalPath), { recursive: true });
  fs.appendFileSync(journalPath, line, 'utf8');
  process.stdout.write(`journaled: ${rel}\n`);
} catch (e) {
  process.stderr.write(`journal-write failed: ${e.message}\n`);
  process.exit(1); // signal failure to caller, but agent should swallow
}
