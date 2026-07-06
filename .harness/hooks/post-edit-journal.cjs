// Auto-journal hook — append one line per Edit/Write to .harness/.journal.log
// Captures tool name + relative path. Source: stdin JSON (preferred) or env (fallback).

const fs = require('fs');
const path = require('path');

const repo = 'E:/FinancialMarket';
const journalPath = path.join(repo, '.harness', '.journal.log');

// Defensive: try every source — stdin JSON, then env vars, then argv.
let raw = '';
let viaStdin = false;
try {
  if (process.stdin && !process.stdin.isTTY) {
    viaStdin = true;
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { raw += c; });
    process.stdin.on('end', () => write());
    return;
  }
} catch {}

write();

function write() {
  try {
    const env = process.env;
    let toolName = (env.CLAUDE_TOOL_NAME || env.MAVIS_TOOL_NAME || env.TOOL_NAME || '').toString();
    let filePath = (env.CLAUDE_TOOL_FILE_PATH || env.MAVIS_TOOL_FILE_PATH || env.TOOL_INPUT || '').toString();
    let resultStr = (env.CLAUDE_TOOL_RESULT || env.MAVIS_TOOL_RESULT || env.TOOL_RESULT || '').toString();

    if (viaStdin && raw) {
      try {
        const data = JSON.parse(raw);
        toolName = toolName || data.tool_name || data.tool || data.name || 'unknown';
        const inputs = [data.tool_input, data.input, data.params, data.arguments];
        for (const i of inputs) {
          if (i && (i.file_path || i.path || i.filePath)) {
            filePath = filePath || (i.file_path || i.path || i.filePath);
            break;
          }
        }
        const outputs = [data.tool_result, data.result, data.output];
        for (const o of outputs) {
          if (o != null) { resultStr = resultStr || (typeof o === 'string' ? o : JSON.stringify(o)); break; }
        }
      } catch { /* ignore parse fail */ }
    }

    if (!toolName && !filePath && process.argv.length > 2) {
      toolName = process.argv[2] || 'unknown';
      filePath = process.argv[3] || '';
    }

    const ts = new Date().toISOString();
    const rel = (() => {
      if (!filePath) return '?';
      try { return path.relative(repo, filePath).replace(/\\/g, '/') || filePath; }
      catch { return filePath; }
    })();
    let size = '';
    const m = (resultStr || '').match(/\(\+(\d+)\s*-(\d+)\)/);
    if (m) size = `  (+${m[1]} -${m[2]})`;

    const line = `${ts}  ${(toolName || '?').toUpperCase().padEnd(8)}  ${rel}${size}\n`;
    fs.mkdirSync(path.dirname(journalPath), { recursive: true });
    fs.appendFileSync(journalPath, line, 'utf8');
  } catch (e) {
    process.stderr.write(`journal-hook error: ${e.message}\n`);
  }
}
