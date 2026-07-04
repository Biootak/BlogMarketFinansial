// Hit the cron endpoint once with secret loaded from .env.local
const fs = require('node:fs');
const path = require('node:path');
function loadEnv() {
  const content = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}
loadEnv();

(async () => {
  const url = `${process.env.APP_URL || 'http://localhost:3000'}/api/cron/publish-scheduled-posts`;
  console.log(`→ ${url}`);
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const body = await res.text();
  console.log(`← ${res.status}`);
  try {
    const json = JSON.parse(body);
    console.log(JSON.stringify(json, null, 2));
  } catch {
    console.log(body);
  }
})();