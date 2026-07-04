/**
 * PM2 ecosystem config for self-hosted deploy.
 *
 * استفاده:
 *   pm2 start deploy/ecosystem.config.cjs --env production
 *   pm2 save              # تا بعد از reboot هم بالا بیاد
 *   pm2 startup           # خروجی را در systemd اجرا کن
 *
 * لاگ:
 *   pm2 logs fm-blog
 *   pm2 logs fm-blog --lines 200
 *
 * ری‌استارت:
 *   pm2 restart fm-blog
 *
 * این فایل .cjs است چون package.json "type": "module" ندارد ولی
 * PM2 spec در برخی نسخه‌ها فقط CJS را بدون warning می‌خواند.
 */
module.exports = {
  apps: [
    {
      name: 'fm-blog',
      // پروژه Next.js با output: 'standalone' در .next/standalone هست
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/fm-blog', // مسیر app روی سرور — موقع deploy عوضش کن
      instances: 1, // یک instance کافی‌ست؛ با replica در DB درگیر نشیم
      exec_mode: 'fork',
      // crash → backoff تا ۳۰ ثانیه
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 5000,
      // حافظه: اگه به ۵۰۰MB رسید ری‌استارت
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      // env فایل — PM2 خودش می‌خواند
      // (متغیرهای .env را pm2 start ... --update-env --env-file=.env هم می‌توان داد)
      log_file: '/var/log/pm2/fm-blog-combined.log',
      error_file: '/var/log/pm2/fm-blog-error.log',
      out_file: '/var/log/pm2/fm-blog-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 15000,
      wait_ready: false,
    },
  ],
};
