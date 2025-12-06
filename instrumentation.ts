/**
 * Next.js Instrumentation
 * برای monitoring عملکرد SSR و Server Components
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    const { databaseProfiler } = await import('./src/lib/performance/databaseProfiler');
    const { ssrMonitor } = await import('./src/lib/performance/ssrMonitor');

    // Enable profiling in development or when explicitly enabled
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.ENABLE_PERFORMANCE_PROFILING === 'true'
    ) {
      console.log('🔍 Performance profiling enabled');

      // Enable database profiling
      databaseProfiler.enableProfiling();

      // Log stats periodically
      setInterval(() => {
        const dbStats = databaseProfiler.getStats();
        const ssrStats = ssrMonitor.getStats();

        console.log('📊 Performance Stats:', {
          database: dbStats,
          ssr: ssrStats,
        });
      }, 60000); // Every minute
    }
  }
}

export async function onRequestError(err: Error, request: Request, _context: any) {
  // Log performance issues on errors
  console.error('❌ Request error:', {
    url: request.url,
    error: err.message,
  });
}
