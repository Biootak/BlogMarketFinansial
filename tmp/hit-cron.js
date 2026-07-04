require('dotenv').config({ path: '.env.local' });

(async () => {
  const url = 'http://localhost:3000/api/cron/publish-scheduled-posts';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  console.log('Status:', res.status);
  const body = await res.text();
  try {
    console.log(JSON.stringify(JSON.parse(body), null, 2));
  } catch {
    console.log(body);
  }
})();
