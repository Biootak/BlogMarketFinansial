import fs from 'node:fs';
import path from 'node:path';
const BS = String.fromCharCode(92);
const roots = ['src/components', 'src/hooks', 'src/app'];
const files = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(e.name)) files.push(p);
  }
}
roots.forEach(walk);

function skipToken(s, i) {
  const c = s[i];
  if (c === '"' || c === "'" || c === '`') {
    let j = i + 1;
    while (j < s.length) {
      if (s[j] === BS) {
        j += 2;
        continue;
      }
      if (s[j] === c) return j + 1;
      j++;
    }
    return j;
  }
  if (c === '/' && s[i + 1] === '/') {
    let j = i;
    while (j < s.length && s[j] !== '\n') j++;
    return j;
  }
  if (c === '/' && s[i + 1] === '*') {
    const k = s.indexOf('*/', i);
    return k === -1 ? s.length : k + 2;
  }
  return -1;
}

const out = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /use(?:Layout)?Effect\(/g;
  let m = re.exec(src);
  while (m) {
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    while (i < src.length && depth > 0) {
      const sk = skipToken(src, i);
      if (sk !== -1) {
        i = sk;
        continue;
      }
      const c = src[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      i++;
    }
    const body = src.slice(start, i - 1);
    const line = src.slice(0, m.index).split('\n').length;
    let d2 = 0;
    let lastComma = -1;
    let j = 0;
    while (j < body.length) {
      const sk = skipToken(body, j);
      if (sk !== -1) {
        j = sk;
        continue;
      }
      const c = body[j];
      if ('([{'.includes(c)) d2++;
      else if (')]}'.includes(c)) d2--;
      else if (c === ',' && d2 === 0) lastComma = j;
      j++;
    }
    const deps = lastComma >= 0 ? body.slice(lastComma + 1).trim() : null;
    const hasDeps = !!deps && deps.startsWith('[');
    const fnBody = hasDeps ? body.slice(0, lastComma) : body;
    const setsState = /\bset[A-Z]\w*\(/.test(fnBody);
    if (!hasDeps && setsState) out.push(`NO_DEPS_SETSTATE ${f}:${line}`);
    if (hasDeps) {
      const inner = deps.slice(1, deps.lastIndexOf(']'));
      const cleaned = inner.replace(/\?\./g, '.');
      if (/[{[]|=>/.test(cleaned)) {
        out.push(`LITERAL_DEP ${f}:${line} :: ${cleaned.replace(/\s+/g, ' ').slice(0, 140)}`);
      }
      // setState of a dep var
      const depNames = cleaned
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      for (const dn of depNames) {
        if (!/^[a-zA-Z_$][\w$]*$/.test(dn)) continue;
        const setter = `set${dn[0].toUpperCase()}${dn.slice(1)}`;
        if (fnBody.includes(`${setter}(`)) out.push(`SELF_SETSTATE_DEP ${f}:${line} :: ${dn}`);
      }
    }
    m = re.exec(src);
  }
}
