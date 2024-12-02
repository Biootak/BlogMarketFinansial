import { headers } from 'next/headers';

async function getSystemData() {
  try {
    const [logsRes, statusRes] = await Promise.all([
      fetch('/api/system-logs', { cache: 'no-store' }),
      fetch('/api/system-status', { cache: 'no-store' })
    ]);

    const [logsData, statusData] = await Promise.all([
      logsRes.json(),
      statusRes.json()
    ]);

    return {
      logs: logsData.logs || [],
      status: statusData.data || {}
    };
  } catch (error) {
    console.error('Error fetching system data:', error);
    return {
      logs: [],
      status: {}
    };
  }
}

export default async function SystemLogsData() {
  const data = await getSystemData();
  
  // Return data as a script tag that will be parsed by the client component
  return (
    <script
      type="application/json"
      id="system-logs-data"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data)
      }}
    />
  );
}
