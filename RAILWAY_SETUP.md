# 🚂 Railway Setup Guide - Step by Step

## مرحله 1: ثبت‌نام در Railway (2 دقیقه)

1. **برو به Railway:**
   - 🔗 https://railway.app
   
2. **ثبت‌نام:**
   - کلیک روی "Login"
   - انتخاب "Login with GitHub"
   - Authorize Railway

3. **تأیید حساب:**
   - Railway یک email تأیید می‌فرسته
   - کلیک روی لینک تأیید

---

## مرحله 2: ساخت Project (3 دقیقه)

1. **New Project:**
   - در Railway Dashboard کلیک روی "New Project"
   
2. **Deploy from GitHub:**
   - انتخاب "Deploy from GitHub repo"
   - اگر اولین باره، باید GitHub رو connect کنی:
     - کلیک "Configure GitHub App"
     - انتخاب repository: `BlogMarketFinansial`
     - Save

3. **انتخاب Repository:**
   - لیست repo ها نمایش داده می‌شه
   - انتخاب: `BlogMarketFinansial`
   - Railway شروع می‌کنه به detect کردن

4. **انتخاب Branch:**
   - Branch: `feature/development` (یا `main`)
   - کلیک "Deploy Now"

---

## مرحله 3: Configure Settings (2 دقیقه)

1. **Settings → General:**
   - **Service Name:** `biotak-go-backend`
   - **Root Directory:** `/` (root پروژه)
   
2. **Settings → Build:**
   - Railway خودکار Dockerfile.go رو detect می‌کنه
   - اگر نکرد:
     - **Builder:** Docker
     - **Dockerfile Path:** `Dockerfile.go`

3. **Settings → Deploy:**
   - **Start Command:** (خالی بذار - از Dockerfile استفاده می‌کنه)
   - **Health Check Path:** `/health`
   - **Restart Policy:** On Failure

---

## مرحله 4: Add Environment Variables (5 دقیقه)

در بخش **Variables** این متغیرها رو اضافه کن:

### Required Variables:

```bash
# Server
PORT=8080
ENV=production

# Database (از .env.go کپی کن)
DATABASE_URL=postgresql://neondb_owner:npg_M8GRHcKahzA5@ep-damp-sky-a4tlasye-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require

# Redis (Upstash)
REDIS_URL=rediss://default:ATNiAAIncDI4NjcxODUyNTE2ODE0ZmJhOGYwOTc1YWQ3MjUxZDdhMnAyMTMxNTQ@eminent-mammoth-13154.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://eminent-mammoth-13154.upstash.io
UPSTASH_REDIS_REST_TOKEN=ATNiAAIncDI4NjcxODUyNTE2ODE0ZmJhOGYwOTc1YWQ3MjUxZDdhMnAyMTMxNTQ

# Authentication (همان NextAuth secret)
AUTH_SECRET=oe7gMAB/LNi6qqMMXimQsgNssvS2tw5YUMmgqd5eDOY=

# Storage (Liara S3)
LIARA_ENDPOINT=https://storage.c2.liara.space
LIARA_BUCKET_NAME=biotak
LIARA_ACCESS_KEY=m3t07ad0csa2u28g
LIARA_SECRET_KEY=aef36ce8-c519-4387-b683-0bc475cd4ffd

# App URL (بعداً با domain واقعی Vercel update کن)
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

### نکات مهم:
- ✅ هر variable رو در یک خط جداگانه اضافه کن
- ✅ مطمئن شو `=` بدون space باشه
- ✅ مقادیر رو از `.env.go` کپی کن
- ⚠️ `NEXT_PUBLIC_APP_URL` رو با domain واقعی Vercel update کن

---

## مرحله 5: Deploy! (2-3 دقیقه)

1. **Trigger Deploy:**
   - اگر خودکار شروع نشد، کلیک روی "Deploy"
   
2. **مانیتور Build:**
   - در بخش "Deployments" می‌تونی logs رو ببینی
   - منتظر بمون تا build تموم بشه
   - باید ببینی: ✅ "Build successful"

3. **Check Deployment:**
   - بعد از build، deployment شروع می‌شه
   - منتظر بمون تا ببینی: ✅ "Deployment successful"

---

## مرحله 6: Get Public URL (1 دقیقه)

1. **Generate Domain:**
   - برو به Settings → Networking
   - کلیک روی "Generate Domain"
   - Railway یک URL می‌ده مثل:
     ```
     https://biotak-go-backend-production.up.railway.app
     ```

2. **کپی کن این URL رو** - بعداً نیاز داری!

---

## مرحله 7: Test Deployment (2 دقیقه)

### Test 1: Health Check
```bash
curl https://your-railway-url.up.railway.app/health
```

باید ببینی:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "database": "connected",
  "redis": "connected"
}
```

### Test 2: Detailed Health
```bash
curl https://your-railway-url.up.railway.app/health/detailed
```

### Test 3: Auth Login (اگر user داری)
```bash
curl -X POST https://your-railway-url.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## مرحله 8: Connect به Vercel (5 دقیقه)

### Option 1: با Rewrites (ساده‌تر)

1. **Update `next.config.js`:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... سایر تنظیمات

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

2. **Add Environment Variable در Vercel:**
   - برو به Vercel Dashboard
   - انتخاب project
   - Settings → Environment Variables
   - Add:
     ```
     GO_BACKEND_URL=https://your-railway-url.up.railway.app
     ```

3. **Redeploy Vercel:**
   - Settings → Deployments
   - کلیک روی "..." → "Redeploy"
   - یا push یک commit جدید

### Option 2: با Middleware (پیشرفته‌تر)

اگر می‌خوای feature flags داشته باشی، از middleware استفاده کن (توضیحات در DEPLOYMENT_GUIDE.md)

---

## مرحله 9: Test از Vercel (2 دقیقه)

بعد از redeploy Vercel:

```bash
# Test health check
curl https://your-vercel-domain.vercel.app/health

# Test auth
curl -X POST https://your-vercel-domain.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## 🎉 تمام! حالا چیکار کنی؟

### Monitoring

1. **Railway Logs:**
   - Deployments → View Logs
   - Real-time logs
   - Filter by level (info, error, etc.)

2. **Railway Metrics:**
   - Metrics tab
   - CPU usage
   - Memory usage
   - Network traffic

3. **Upstash Redis:**
   - Dashboard → Metrics
   - Commands per second
   - Memory usage

### Auto-Deploy

Railway خودکار deploy می‌کنه وقتی:
- Push به GitHub می‌کنی
- Merge می‌کنی
- Pull request می‌سازی

### Rollback

اگر مشکلی پیش اومد:
1. Deployments → انتخاب deployment قبلی
2. کلیک "Redeploy"

---

## 🔧 Troubleshooting

### مشکل: Build Failed

**چک کن:**
- Dockerfile.go موجود باشه
- go.mod و go.sum موجود باشن
- در Logs ببین چه error ای می‌ده

**حل:**
```bash
# Local test
docker build -f Dockerfile.go -t test .
```

### مشکل: Deployment Failed

**چک کن:**
- Environment variables درست باشن
- DATABASE_URL صحیح باشه
- REDIS_URL صحیح باشه

**حل:**
- در Railway logs ببین چه error ای می‌ده
- تست کن با curl

### مشکل: Health Check Failed

**چک کن:**
- Database connection
- Redis connection
- Port 8080 expose شده باشه

**حل:**
```bash
# Test health endpoint
curl https://your-railway-url.up.railway.app/health
```

### مشکل: CORS Errors

**چک کن:**
- در Go backend CORS config درست باشه
- Vercel domain در allowed origins باشه

**حل:**
- Update `internal/middleware/cors.go`
- Add Vercel domain

---

## 💰 هزینه‌ها

Railway رایگان تا $5 usage در ماه:

| Resource | Usage | هزینه تقریبی |
|----------|-------|--------------|
| CPU | 0.5 vCPU | ~$1/month |
| Memory | 512MB | ~$1/month |
| Network | 10GB | ~$0.5/month |
| **Total** | | **~$2.5/month** |

اگر از $5 بیشتر بشه، باید کارت اضافه کنی.

---

## 📞 کمک بیشتر

- 📖 Railway Docs: https://docs.railway.app
- 💬 Railway Discord: https://discord.gg/railway
- 📧 Support: help@railway.app

---

**موفق باشی! 🚀**
