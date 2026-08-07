import { clientLog } from '@/lib/client-logger';

type LogLevel = 'ERROR' | 'WARNING' | 'INFO';

interface LogParams {
  level: LogLevel;
  message: string;
  source: string;
}

export async function logSystemEvent({ level, message, source }: LogParams) {
  try {
    const response = await fetch('/api/system-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ level, message, source }),
    });

    if (!response.ok) {
      throw new Error(`Failed to log system event: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // Returning null keeps the caller running, but a logger that drops its own
    // failure is how SystemLog ends up looking healthy while it is not written to.
    clientLog.warn('logger', `log-system-event ${source}/${level}`, error);
    return null;
  }
}

// ثابت‌های مربوط به منابع لاگ
export const LogSources = {
  AUTH: 'Authentication',
  SETTINGS: 'System Settings',
  DATABASE: 'Database',
  API: 'API',
  SECURITY: 'Security',
  PERFORMANCE: 'Performance',
  MAINTENANCE: 'System Maintenance',
  EMAIL: 'Email Service',
  CACHE: 'Cache Service',
  BACKUP: 'Backup Service',
};

// مثال‌های استفاده:
/*
await logSystemEvent({
  level: 'ERROR',
  message: 'Failed to connect to database',
  source: LogSources.DATABASE
});

await logSystemEvent({
  level: 'WARNING',
  message: 'High memory usage detected',
  source: LogSources.PERFORMANCE
});

await logSystemEvent({
  level: 'INFO',
  message: 'System maintenance mode activated',
  source: LogSources.MAINTENANCE
});
*/
