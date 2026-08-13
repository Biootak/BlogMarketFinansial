# 🖥️ مقایسه کامل هاستینگ برای Next.js + Prisma + PostgreSQL

> **تاریخ بررسی:** ۱۳ آگوست ۲۰۲۶ — قیمت‌ها از سایت رسمی هر سرویس گرفته شده  
> **پروژه:** بازار صرافی افغانستان — مرحله اول، بدون مشتری فعال

---

## ۱. آیا ۱۰ گیگ DB کافی است برای ۱۰,۰۰۰ کاربر؟

### محاسبه بر اساس schema واقعی پروژه

| جدول | هر رکورد (تخمین) | ۱۰,۰۰۰ کاربر |
|---|---|---|
| User | ~2 KB | ~20 MB |
| Session | ~0.5 KB | ~5 MB (active) |
| ActivityLog | ~0.5 KB | ~50 MB (5 رکورد/کاربر) |
| Customer | ~1 KB | ~10 MB |
| Transaction | ~1.5 KB | ~150 MB (10 تراکنش/کاربر) |
| AuditLog | ~1 KB | ~100 MB |
| Notification | ~0.3 KB | ~30 MB |
| TelegramNotification | ~0.5 KB | ~5 MB |
| سایر جداول (Post, Comment, ...) | — | ~50 MB |
| **Indexes + Overhead** | — | ~300 MB |
| **جمع تخمینی** | — | **~720 MB** |

**✅ نتیجه: ۱۰ گیگ برای ۱۰,۰۰۰ کاربر بیش از کافی است — حدود ۱۳x بافر دارید.**

> ⚠️ نکته: اگر فایل‌های KYC (تصویر مدارک) در DB ذخیره شوند (base64)، مصرف ۳-۵x بیشتر می‌شود.  
> **پیشنهاد:** فایل‌ها را در UploadThing/S3 نگه دارید، فقط URL را در DB ذخیره کنید.

---

## ۲. مقایسه گزینه‌های VPS — قیمت واقعی (آگوست ۲۰۲۶)

### پلن پیشنهادی برای Next.js + Prisma: 2 vCPU / 4GB RAM / 50GB disk

| سرویس | پلن | vCPU | RAM | Storage | قیمت/ماه | تریال | پرداخت | ارزش |
|---|---|---|---|---|---|---|---|---|
| **ServersCamp** | Basic Sustained M | 2 | 4 GB | 50 GB NVMe | **€14** | ✅ €25 رایگان (30 روز) | — | ⭐⭐⭐⭐⭐ |
| **Hetzner** | CX22 (Shared) | 2 | 4 GB | 40 GB SSD | **€4.35** | ❌ | کارت/PayPal | ⭐⭐⭐⭐⭐ |
| **Hetzner** | CPX21 (AMD) | 3 | 4 GB | 80 GB NVMe | **€5.92** | ❌ | کارت/PayPal | ⭐⭐⭐⭐⭐ |
| **Vultr** | Regular 2vCPU/4GB | 2 | 4 GB | 80 GB SSD | **$20** | ⚡ کد تبلیغاتی | PayPal/کریپتو/کارت | ⭐⭐⭐⭐ |
| **Vultr** | High Performance 2v/4G | 2 | 4 GB | 100 GB NVMe | **$24** | ⚡ کد تبلیغاتی | PayPal/کریپتو/کارت | ⭐⭐⭐⭐ |
| **Cloudzy** | 4 GB DDR5 | 2 | 4 GB | 120 GB NVMe | **$14.48** (50% off) / $28.95 معمولی | ❌ 14 روز بازگشت | PayPal/BTC/ETH/USDT | ⭐⭐⭐⭐ |
| **Contabo** | VPS S | 4 | 8 GB | 100 GB NVMe | **€5.50** | ❌ | کارت | ⭐⭐⭐ |

---

## ۳. مقایسه Heroku Postgres — قیمت واقعی

| پلن | Storage | Connection Limit | قیمت/ماه | مناسب برای |
|---|---|---|---|---|
| **Essential-0** | 1 GB | 20 | **$5** | تست، dev |
| **Essential-1** | 10 GB | 20 | **$9** | ✅ **۱۰,۰۰۰ کاربر راحت** |
| **Essential-2** | 32 GB | 40 | **$20** | رشد بزرگ‌تر |
| Standard-0 | 64 GB + 4GB RAM | 200 | **$50** | Production جدی |

> ⚠️ **Essential tier محدودیت دارد:** No Fork/Follow، no Rollback، max 4h downtime/month، no Postgres logs

---

## ۴. سناریوهای مختلف — هزینه ماهانه کل

### سناریو A: فعلی — رایگان (ماه اول)
```
App:  ServersCamp (€25 اعتبار رایگان)   →  €0
DB:   Heroku Essential-1                 →  $9 (از $13 دانشجویی)
DNS:  Cloudflare Free                    →  $0
─────────────────────────────────────────
کل:   $9/ماه (از اعتبار دانشجویی)
```

### سناریو B: بعد از ماه اول، ارزان‌ترین گزینه
```
App:  Hetzner CX22                       →  €4.35/mo
DB:   Heroku Essential-1                 →  $9/mo
DNS:  Cloudflare Free                    →  $0
─────────────────────────────────────────
کل:   ~$14/ماه  ← نیاز به پرداخت (کارت/PayPal)
```

### سناریو C: همه کریپتو — بدون کارت
```
App:  Cloudzy 4GB (با کریپتو)           →  $14.48/mo (تخفیف‌دار)
DB:   Heroku Essential-1                 →  $9/mo
DNS:  Cloudflare Free                    →  $0
─────────────────────────────────────────
کل:   ~$23/ماه  ← با USDT/ETH/BTC
```

### سناریو D: همه یکجا روی VPS (بدون Heroku)
```
App + DB:  Hetzner CX32 (4vCPU/8GB)     →  €8.29/mo
DB:        Self-hosted PostgreSQL        →  $0
DNS:       Cloudflare Free               →  $0
─────────────────────────────────────────
کل:   ~$9/ماه  ← ارزان‌ترین گزینه Production
```

### سناریو E: بهترین کیفیت برای رشد
```
App:  Vultr High Performance 2v/4GB     →  $24/mo
DB:   Heroku Standard-0 (HA ready)      →  $50/mo
CDN:  Cloudflare Free                   →  $0
─────────────────────────────────────────
کل:   ~$74/ماه  ← وقتی درآمد داشتی
```

---

## ۵. VPS در مقابل Heroku+Managed DB

| معیار | VPS خودمدیریت | Heroku Postgres |
|---|---|---|
| **قیمت برای 10GB** | ~$0 (روی VPS خودت) | $9/ماه |
| **Setup** | نیاز به نصب + config | خودکار |
| **Backup** | باید خودت بسازی | ✅ خودکار روزانه |
| **Maintenance** | update/patch خودت | ✅ مدیریت شده |
| **Uptime** | بستگی به VPS دارد | 99.5% SLA |
| **Connection pooling** | نیاز به PgBouncer | نیاز به PgBouncer |
| **مناسب مرحله اول** | اگر DevOps بلدی | ✅ بله |

---

## ۶. رتبه‌بندی ارزش خرید (Value for Money)

### 🥇 برترین گزینه‌ها به ترتیب ارزش

| رتبه | سرویس | چرا؟ |
|---|---|---|
| **1** | **Hetzner Cloud** | ارزان‌ترین قیمت به ازای منابع در اروپا، PayPal، uptime عالی، GDPR |
| **2** | **ServersCamp** | €25 رایگان، NVMe سریع، بدون کارت، مناسب شروع |
| **3** | **Cloudzy** | کریپتو قبول می‌کند، DDR5، NVMe، 40Gbps، قیمت رقابتی |
| **4** | **Vultr** | PayPal+کریپتو، لوکیشن زیاد، deploy سریع |
| **5** | **Contabo** | ارزان‌ترین قطعی، اما support و performance کمتر قابل‌پیش‌بینی |

---

## ۷. توصیه نهایی برای شرایط تو

### الان (بدون مشتری، بدون کارت):
```
✅ DB:  Heroku Essential-1  →  $9/ماه از $13 دانشجویی
✅ App: ServersCamp رایگان  →  €25 اعتبار = 1 ماه راحت
✅ هر ماه App را redeploy کن (DB دست نخورده می‌ماند)
```

### وقتی مشتری آمد (با کریپتو یا PayPal):
**گزینه اول (ارزان‌ترین):**
```
✅ همه روی Hetzner CX32: $9/ماه کل
   - App + Postgres self-hosted
   - 4 vCPU / 8 GB RAM / 80 GB SSD
```

**گزینه دوم (راحت‌ترین):**
```
✅ App: Cloudzy یا Vultr ($14-24)
   DB: Heroku Essential-1 ($9)
   کل: ~$23/ماه
```

---

## ۸. جدول مقایسه پرداخت

| سرویس | کارت مجازی | PayPal | کریپتو | تریال بدون پرداخت |
|---|---|---|---|---|
| ServersCamp | ❌ | ❌ | ❌ | **✅ €25** |
| Hetzner | ✅ | ✅ | ❌ | ❌ |
| Vultr | ✅ | ✅ | ✅ | ⚡ کد تبلیغاتی |
| Cloudzy | ✅ | ✅ | ✅ (BTC/ETH/USDT) | ❌ |
| Contabo | ✅ | ❌ | ❌ | ❌ |
| Heroku Postgres | ✅ | ❌ | ❌ | ❌ |

---

*منابع: serverscamp.com/pricing، cloudzy.com/pricing، vultr.com/pricing، devcenter.heroku.com/articles/heroku-postgres-plans، hetzner.com/cloud — بررسی ۱۳ آگوست ۲۰۲۶*
