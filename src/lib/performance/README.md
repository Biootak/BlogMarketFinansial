# Performance Monitoring System

این سیستم برای مانیتورینگ و بهبود عملکرد سایت Biotak طراحی شده است.

## ویژگی‌ها

### 1. Web Vitals Monitoring
- **LCP** (Largest Contentful Paint): زمان رندر بزرگترین محتوا
- **FID** (First Input Delay): تأخیر اولین تعامل کاربر
- **CLS** (Cumulative Layout Shift): جابجایی تجمعی چیدمان
- **TTFB** (Time to First Byte): زمان دریافت اولین بایت
- **INP** (Interaction to Next Paint): زمان پاسخ به تعامل
- **FCP** (First Contentful Paint): زمان رندر اولین محتوا

### 2. Performance Monitor
- شناسایی Long Tasks (وظایف طولانی که main thread را بلاک می‌کنند)
- تشخیص Memory Leaks (نشت حافظه)
- لاگ کردن Navigation Timings
- گزارش مشکلات Performance

### 3. Performance Dashboard (Development Only)
- نمایش real-time metrics
- نمایش مشکلات Performance
- بررسی اینکه metrics به target‌ها رسیده‌اند یا نه

## نحوه استفاده

### Automatic Initialization
سیستم به صورت خودکار در `RootLayout` فعال می‌شود:

```tsx
import { PerformanceProvider } from '@/components/PerformanceProvider';
import { PerformanceDashboard } from '@/components/PerformanceDashboard/PerformanceDashboard';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PerformanceProvider>
          {children}
          <PerformanceDashboard />
        </PerformanceProvider>
      </body>
    </html>
  );
}
```

### Manual Usage

```typescript
import { initPerformance, getMetricsSnapshot, checkPerformanceTargets } from '@/lib/performance';

// Initialize monitoring
await initPerformance();

// Get current metrics
const metrics = getMetricsSnapshot();
console.log('Current metrics:', metrics);

// Check if targets are met
const targets = checkPerformanceTargets(metrics);
console.log('Targets met:', targets.overall);
```

### Performance Monitor

```typescript
import { getPerformanceMonitor } from '@/lib/performance';

const monitor = getPerformanceMonitor();

// Get all issues
const issues = monitor.getIssues();

// Get summary
const summary = monitor.getSummary();
console.log(`Total issues: ${summary.totalIssues}`);
console.log(`Critical: ${summary.criticalIssues}`);
```

## Performance Targets

| Metric | Target | Description |
|--------|--------|-------------|
| LCP | ≤ 2.5s | صفحه باید در کمتر از 2.5 ثانیه رندر شود |
| FID | ≤ 100ms | تعامل اول باید در کمتر از 100ms پاسخ دهد |
| CLS | ≤ 0.1 | جابجایی چیدمان باید کمتر از 0.1 باشد |
| TTFB | ≤ 800ms | سرور باید در کمتر از 800ms پاسخ دهد |
| INP | ≤ 200ms | تعاملات باید در کمتر از 200ms پاسخ دهند |

## API Endpoints

### POST /api/analytics/web-vitals
دریافت Web Vitals metrics

```json
{
  "id": "unique-id",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "url": "https://example.com",
  "device": "mobile",
  "connection": "4g",
  "metrics": {
    "lcp": 2000,
    "fid": 50,
    "cls": 0.05,
    "ttfb": 600,
    "inp": 150,
    "fcp": 1500
  },
  "userAgent": "..."
}
```

### POST /api/analytics/performance-issues
دریافت Performance issues

```json
{
  "type": "long-task",
  "severity": "high",
  "message": "Long task detected: 150ms",
  "details": {
    "duration": 150,
    "startTime": 1000
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "url": "https://example.com",
  "userAgent": "...",
  "device": {
    "width": 1920,
    "height": 1080
  }
}
```

## Development Dashboard

در حالت development، یک dashboard در گوشه پایین سمت راست صفحه نمایش داده می‌شود که:
- Metrics را به صورت real-time نشان می‌دهد
- مشکلات Performance را لیست می‌کند
- وضعیت کلی Performance را نمایش می‌دهد

برای باز کردن dashboard روی دکمه "⚡ Performance" کلیک کنید.

## Production Monitoring

در production، metrics به صورت خودکار به endpoint‌های analytics ارسال می‌شوند. می‌توانید این endpoint‌ها را به سرویس‌های زیر متصل کنید:

- Google Analytics
- Vercel Analytics
- Sentry
- Custom analytics service

## Troubleshooting

### Metrics نمایش داده نمی‌شوند
- مطمئن شوید که `PerformanceProvider` در root layout اضافه شده
- Console browser را برای خطاها بررسی کنید
- مطمئن شوید که در development mode هستید

### Dashboard نمایش داده نمی‌شود
- Dashboard فقط در development mode نمایش داده می‌شود
- مطمئن شوید که `PerformanceDashboard` در layout اضافه شده

### Metrics به target نمی‌رسند
- تصاویر را بهینه کنید
- JavaScript bundle را کوچک کنید
- CSS را بهینه کنید
- Caching را فعال کنید
- Server response time را بهبود دهید
