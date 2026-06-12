# BlogMarketFinansial

یک پروژه وبلاگ فول‌استک با Next.js 16، Prisma، PostgreSQL و NextAuth.

## 📋 پیش‌نیازها

- Node.js 20+ و npm
- PostgreSQL 15+ (محلی یا از طریق Docker)
- Git

## 🚀 راه‌اندازی سریع

### 1. نصب وابستگی‌ها

```bash
npm install
```

### 2. تنظیم متغیرهای محیطی

فایل `.env` را در ریشه پروژه ایجاد کنید (یا از `.env.example` کپی کنید):

```bash
cp .env.example .env
```

سپس مقادیر زیر را تنظیم کنید:

- **`DATABASE_URL`**: آدرس اتصال به PostgreSQL
- **`AUTH_SECRET`**: کلید مخفی NextAuth (با `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` تولید کنید)
- **`NEXTAUTH_URL`**: آدرس سایت (مثلاً `http://localhost:3000`)

### 3. راه‌اندازی PostgreSQL

#### گزینه ۱: استفاده از Docker (توصیه‌شده)

```bash
docker-compose up -d
```

#### گزینه ۲: نصب محلی PostgreSQL

روی [postgresql.org](https://www.postgresql.org/download/) دانلود و نصب کنید، سپس دیتابیس را ایجاد کنید:

```bash
createdb biotak
```

### 4. اجرای Migration های Prisma

```bash
npx prisma migrate dev
```

### 5. اجرای پروژه در حالت توسعه

```bash
npm run dev
```

سپس به [http://localhost:3000](http://localhost:3000) بروید.

## 🛠 دستورات مفید

| دستور | توضیح |
|-------|------|
| `npm run dev` | اجرای سرور توسعه |
| `npm run build` | ساخت نسخه production |
| `npm start` | اجرای نسخه production |
| `npm run lint` | بررسی کد با ESLint |
| `npx prisma studio` | باز کردن Prisma Studio |
| `npx prisma migrate dev` | اجرای migration ها |
| `npx prisma generate` | تولید Prisma Client |

## 🐛 رفع مشکلات رایج

### خطای `DATABASE_URL` تعریف نشده
فایل `.env` را ایجاد کنید و `DATABASE_URL` را تنظیم کنید.

### خطای `MissingSecret` در Auth.js
متغیر `AUTH_SECRET` را در فایل `.env` تنظیم کنید.

### خطای `EPERM` در Prisma Generate
مطمئن شوید هیچ پروسه‌ای فایل‌های Prisma را قفل نکرده است. Dev Server را متوقف کنید و دوباره امتحان کنید.

### تداخل peer dependency (React 19)
این فقط یک warning است و بر عملکرد تأثیر نمی‌گذارد. برای رفع، می‌توانید `react-hooks-global-state` را به نسخه جدیدتر ارتقا دهید.

## 🔒 امنیت

- هرگز فایل `.env` را commit نکنید
- قبل از دیپلوی، `AUTH_SECRET` را با یک مقدار قوی تنظیم کنید
- برای production از HTTPS استفاده کنید
- به‌طور منظم `npm audit` را اجرا کنید

## 📦 تکنولوژی‌ها

- **Frontend**: Next.js 16 (App Router + Turbopack), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Radix UI
- **Database**: PostgreSQL با Prisma ORM
- **Authentication**: NextAuth.js v5
- **Storage**: S3 Compatible (Liara)
- **Email**: Resend
- **Editor**: Tiptap
- **Charts**: Chart.js, Recharts
- **Animation**: Framer Motion
- **Error Tracking**: Sentry

## 📄 لایسنس

MIT
