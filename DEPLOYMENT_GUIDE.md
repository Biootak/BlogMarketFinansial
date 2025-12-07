# 🚀 Biotak Go Backend - Deployment Guide

## ✅ مرحله 1: Upstash Redis (انجام شد!)

Redis credentials شما:
```bash
REDIS_URL="rediss://default:ATNiAAIncDI4NjcxODUyNTE2ODE0ZmJhOGYwOTc1YWQ3MjUxZDdhMnAyMTMxNTQ@eminent-mammoth-13154.upstash.io:6379"
UPSTASH_REDIS_REST_URL="https://eminent-mammoth-13154.upstash.io"
UPSTASH_REDIS_REST_TOKEN="ATNiAAIncDI4NjcxODUyNTE2ODE0ZmJhOGYwOTc1YWQ3MjUxZDdhMnAyMTMxNTQ"
```

---

## 🧪 مرحله 2: Test Local با Upstash Redis

### 1. Build و Run
```bash
# Build
go build -o biotak-server.exe ./cmd/server

# Run
./biotak-server.exe
```

### 2. Test Endpoints
```bash
# Health Check
curl http://localhost:8080/health

# Test Redis Connection
curl http://localhost:8080/health/detailed
```

اگر Redis connect شد، باید ببینی:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "..."
}
```

---

## 🚂 مرحله 3: Deploy به Railway

### Setup Railway

1. **برو به Railway:**
   - https://railway.app
   - Sign up با GitHub

2. **Create New Project:**
   - کلیک روی "New Project"
   - انتخاب "Deploy from GitHub repo"
   - انتخاب repository: `biotak` (یا هر اسمی که داره)
   - Railway خودکار detect می‌کنه که Go project هست

3. **Configure Settings:**
   
   **در بخش Settings:**
   - **Root Directory:** `/` (root پروژه)
   - **Build Command:** (خالی بذار - از Dockerfile استفاده می‌کنه)
   - **Start Command:** (خالی بذار)
   - **Dockerfile Path:** `Dockerfile.go`
   - **Port:** `8080`

4. **Add Environment Variables:**
   
   در بخش Variables، این متغیرها رو اضافه کن:

   ```bash
   PORT=8080
   ENV=production
   
   # Database (Neon PostgreSQL)
   DATABASE_URL=postgresql://neondb_owner:npg_M8GRHcKahzA5@ep-damp-sky-a4tlasye-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   
   # Redis (Upstash)
   REDIS_URL=rediss://default:ATNiAAIncDI4NjcxODUyNTE2ODE0ZmJhOGYwOTc1YWQ3MjUxZDdhMnAyMTMxNTQ@eminent-mammoth-13154.upstash.io:6379
   UPSTASH_REDIS_REST_URL=https://eminent-mammoth-13154.upstash.io
   UPSTASH_REDIS_REST_TOKEN=ATNiAAIncDI4NjcxODUyNTE2ODE0ZmJhOGYwOTc1YWQ3MjUxZDdhMnAyMTMxNTQ
   
   # Authentication (همان secret NextAuth)
   AUTH_SECRET=oe7gMAB/LNi6qqMMXimQsgNssvS2tw5YUMmgqd5eDOY=
   
   # Storage (Liara S3)
   LIARA_ENDPOINT=https://storage.c2.liara.space
   LIARA_BUCKET_NAME=biotak
   LIARA_ACCESS_KEY=m3t07ad0csa2u28g
   LIARA_SECRET_KEY=aef36ce8-c519-4387-b683-0bc475cd4ffd
   
   # App URL (بعداً با domain واقعی Vercel update کن)
   NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
   ```

5. **Deploy:**
   - کلیک روی "Deploy"
   - Railway شروع می‌کنه به build و deploy
   - منتظر بمون تا deploy تموم بشه (2-3 دقیقه)

6. **Get Public URL:**
   - بعد از deploy، در بخش Settings → Networking
   - کلیک روی "Generate Domain"
   - یک URL مثل این می‌گیری:
     ```
     https://biotak-go-backend-production.up.railway.app
     ```

### Test Railway Deployment

```bash
# Health Check
curl https://biotak-go-backend-production.up.railway.app/health

# Detailed Health (با Redis و Database)
curl https://biotak-go-backend-production.up.railway.app/health/detailed

# Test Auth Login
curl -X POST https://biotak-go-backend-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## 🔗 مرحله 4: Connect Vercel به Go Backend

### Option 1: Vercel Rewrites (ساده‌تر - پیشنهاد من)

**1. Update `next.config.js` یا `next.config.ts`:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... سایر تنظیمات موجود

  async rewrites() {
    const goBackendUrl = process.env.GO_BACKEND_URL || 'http://localhost:8080';
    
    return [
      // Health checks
      {
        source: '/health',
        destination: `${goBackendUrl}/health`,
      },
      {
        source: '/health/:path*',
        destination: `${goBackendUrl}/health/:path*`,
      },
      // API v1 routes
      {
        source: '/api/v1/:path*',
        destination: `${goBackendUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
```

**2. Add Environment Variable در Vercel:**

- برو به Vercel Dashboard
- انتخاب project
- Settings → Environment Variables
- اضافه کن:
  ```
  GO_BACKEND_URL=https://biotak-go-backend-production.up.railway.app
  ```

**3. Redeploy Vercel:**
```bash
# از terminal یا از Vercel dashboard
vercel --prod
```

### Option 2: Middleware با Feature Flags (پیشرفته‌تر)

**1. Create `middleware.ts` در root پروژه:**

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || 'http://localhost:8080';

// Feature flags - کنترل کن کدوم API ها به Go برن
const FEATURE_FLAGS = {
  useGoBackend: {
    health: true,
    auth: true,        // Auth APIs
    posts: false,      // Posts APIs (هنوز Next.js)
    comments: false,   // Comments APIs (هنوز Next.js)
    exchange: false,   // Exchange rates (هنوز Next.js)
    upload: false,     // Upload (هنوز Next.js)
    reports: false,    // Reports (هنوز Next.js)
  },
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Health checks
  if (pathname.startsWith('/health') && FEATURE_FLAGS.useGoBackend.health) {
    const url = new URL(pathname, GO_BACKEND_URL);
    url.search = request.nextUrl.search;
    return NextResponse.rewrite(url);
  }

  // Auth APIs
  if (pathname.startsWith('/api/v1/auth') && FEATURE_FLAGS.useGoBackend.auth) {
    const url = new URL(pathname, GO_BACKEND_URL);
    url.search = request.nextUrl.search;
    return NextResponse.rewrite(url);
  }

  // Posts APIs
  if (pathname.startsWith('/api/v1/posts') && FEATURE_FLAGS.useGoBackend.posts) {
    const url = new URL(pathname, GO_BACKEND_URL);
    url.search = request.nextUrl.search;
    return NextResponse.rewrite(url);
  }

  // Comments APIs
  if (pathname.startsWith('/api/v1/comments') && FEATURE_FLAGS.useGoBackend.comments) {
    const url = new URL(pathname, GO_BACKEND_URL);
    url.search = request.nextUrl.search;
    return NextResponse.rewrite(url);
  }

  // Exchange rates
  if (pathname.startsWith('/api/v1/exchange-rates') && FEATURE_FLAGS.useGoBackend.exchange) {
    const url = new URL(pathname, GO_BACKEND_URL);
    url.search = request.nextUrl.search;
    return NextResponse.rewrite(url);
  }

  // Upload
  if (pathname.startsWith('/api/v1/upload') && FEATURE_FLAGS.useGoBackend.upload) {
    const url = new URL(pathname, GO_BACKEND_URL);
    url.search = request.nextUrl.search;
    return NextResponse.rewrite(url);
  }

  // Reports
  if (pathname.startsWith('/api/v1/reports') && FEATURE_FLAGS.useGoBackend.reports) {
    const url = new URL(pathname, GO_BACKEND_URL);
    url.search = request.nextUrl.search;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/health/:path*',
    '/api/v1/:path*',
  ],
};
```

**2. Add Environment Variable:**
```bash
GO_BACKEND_URL=https://biotak-go-backend-production.up.railway.app
```

**3. Redeploy Vercel**

---

## 🧪 مرحله 5: Testing از Vercel

بعد از deploy Vercel:

```bash
# Test health check
curl https://your-vercel-domain.vercel.app/health

# Test auth login
curl -X POST https://your-vercel-domain.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test posts list
curl https://your-vercel-domain.vercel.app/api/v1/posts
```

---

## 📊 مرحله 6: Monitoring

### Railway Logs
1. برو به Railway Dashboard
2. انتخاب project
3. Deployments → View Logs
4. Real-time logs رو ببین

### Upstash Monitoring
1. برو به Upstash Dashboard
2. انتخاب database
3. Metrics رو ببین:
   - Commands per second
   - Memory usage
   - Connection count

### Vercel Analytics
1. برو به Vercel Dashboard
2. Analytics → Functions
3. ببین:
   - Response times
   - Error rates
   - Request counts

---

## 🎯 Migration Strategy

### Week 1: Auth Only (شروع محتاطانه)
```typescript
// در middleware.ts
const FEATURE_FLAGS = {
  useGoBackend: {
    health: true,
    auth: true,        // ✅ فقط Auth
    posts: false,      // ❌ هنوز Next.js
    comments: false,   // ❌ هنوز Next.js
    // ...
  },
};
```

**مانیتور کن:**
- Error rates
- Response times
- JWT token compatibility
- User login/register

### Week 2: Add Posts GET (اگر Week 1 OK بود)
```typescript
const FEATURE_FLAGS = {
  useGoBackend: {
    health: true,
    auth: true,
    posts: true,       // ✅ فعال کن
    // ...
  },
};
```

**مانیتور کن:**
- Post listing performance
- Cache hit rates
- Database query times

### Week 3: Add Comments & Exchange
```typescript
const FEATURE_FLAGS = {
  useGoBackend: {
    health: true,
    auth: true,
    posts: true,
    comments: true,    // ✅ فعال کن
    exchange: true,    // ✅ فعال کن
    // ...
  },
};
```

### Week 4: Complete Migration
```typescript
const FEATURE_FLAGS = {
  useGoBackend: {
    health: true,
    auth: true,
    posts: true,
    comments: true,
    exchange: true,
    upload: true,      // ✅ فعال کن
    reports: true,     // ✅ فعال کن
  },
};
```

---

## 🔧 Troubleshooting

### مشکل: Railway build fail می‌شه
```bash
# چک کن Dockerfile.go درست باشه
# چک کن go.mod و go.sum موجود باشن
# در Railway logs ببین چه error ای می‌ده
```

### مشکل: Redis connection error
```bash
# چک کن REDIS_URL درست باشه
# چک کن با rediss:// شروع بشه (با دو s)
# تست کن با curl:
curl https://eminent-mammoth-13154.upstash.io
```

### مشکل: Database connection error
```bash
# چک کن DATABASE_URL درست باشه
# چک کن sslmode=require داشته باشه
# تست کن connection از Railway logs
```

### مشکل: CORS errors
```bash
# چک کن در Go backend CORS config درست باشه
# باید Vercel domain رو allow کنه
# در internal/middleware/cors.go چک کن
```

---

## ✅ Checklist نهایی

**قبل از Production:**
- [ ] Local test با Upstash Redis
- [ ] Railway deploy موفق
- [ ] Health check کار می‌کنه
- [ ] Database connection OK
- [ ] Redis connection OK
- [ ] S3 upload test شده
- [ ] Vercel rewrites/middleware setup شده
- [ ] Auth APIs test شده
- [ ] JWT tokens cross-compatible هستند
- [ ] Monitoring setup شده
- [ ] Error tracking (Sentry) setup شده

**بعد از Production:**
- [ ] مانیتور error rates
- [ ] مانیتور response times
- [ ] چک کردن logs
- [ ] User feedback
- [ ] Performance metrics

---

## 💰 هزینه‌ها

| سرویس | Plan | هزینه/ماه |
|-------|------|-----------|
| Vercel | Hobby | $0 |
| Railway | Starter | $0-5 (usage-based) |
| Upstash Redis | Free | $0 (تا 10K commands/day) |
| Neon PostgreSQL | Free | $0 |
| Liara S3 | - | (موجود) |
| **Total** | | **~$0-5/month** |

---

## 📞 Support

اگر مشکلی پیش اومد:
1. چک کن Railway logs
2. چک کن Vercel logs
3. چک کن Upstash metrics
4. تست کن با curl
5. بپرس! 😊

---

**آماده‌ای شروع کنیم؟** 🚀
