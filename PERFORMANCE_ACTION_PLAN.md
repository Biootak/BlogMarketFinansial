# 🎯 برنامه اقدام فوری برای بهینه‌سازی عملکرد

تاریخ: 2025-12-06
وضعیت: 🔴 CRITICAL - نیاز به اقدام فوری

---

## 📊 نتایج تحلیل

### وضعیت فعلی
- **Total Bundle**: 8.55 MB ❌
- **JavaScript**: 6.47 MB ❌ (هدف: < 1 MB)
- **CSS**: 0.61 MB ⚠️ (هدف: < 100 KB)
- **Images**: 1.29 MB ⚠️

### مشکلات شناسایی شده
1. 🔴 **6 فایل JS بیش از 300 KB**
2. 🔴 **9 فایل JS بیش از 200 KB**
3. 🔴 **تصویر 1.3 MB در bundle**
4. 🟡 **CSS بیش از 500 KB**

---

## 🚨 اقدامات فوری (امروز - فردا)

### 1. حذف تصویر از bundle ⚡ (30 دقیقه)

**مشکل**: `about-hero-right.34042028.png` - 1.3 MB در bundle

**راه‌حل**:
```bash
# جابجایی تصویر به public
mv src/images/about-hero-right.png public/images/
```

```tsx
// تغییر import در کامپوننت
// قبل:
import aboutImage from '@/images/about-hero-right.png';

// بعد:
const aboutImage = '/images/about-hero-right.png';
```

**تأثیر**: کاهش 1.3 MB از bundle ✅

---

### 2. Code Splitting برای TipTap Editor ⚡ (1-2 ساعت)

**مشکل**: Editor در همه صفحات load می‌شود

**راه‌حل**:
```tsx
// src/components/Dashboard/Blog/PostForm/PostForm.tsx
'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamic import با SSR disabled
const Editor = dynamic(() => import('@/components/Editor1/editor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 flex items-center justify-center">
      <Skeleton className="w-full h-full" />
    </div>
  ),
});

export function PostForm() {
  return (
    <div>
      {/* ... */}
      <Editor {...props} />
      {/* ... */}
    </div>
  );
}
```

**تأثیر**: کاهش ~200 KB از First Load JS ✅

---

### 3. حذف Chart.js (استفاده فقط از Recharts) ⚡ (2-3 ساعت)

**مشکل**: دو کتابخانه chart در پروژه

**فایل‌های نیاز به تغییر**:
```bash
# پیدا کردن استفاده‌ها
npx rg "react-chartjs-2|chart.js" --type tsx --type ts
```

**راه‌حل**:
1. شناسایی کامپوننت‌های استفاده‌کننده از Chart.js
2. تبدیل به Recharts
3. حذف dependencies:

```bash
npm uninstall chart.js react-chartjs-2
```

**کامپوننت‌های احتمالی**:
- `src/components/Dashboard/DashboardPage/TrafficChart.tsx`
- `src/app/dashboard/reports/components/TrendChart.tsx`

**تأثیر**: کاهش ~150 KB ✅

---

### 4. حذف React Icons (استفاده فقط از Lucide) ⚡ (2-3 ساعت)

**مشکل**: دو کتابخانه icon

**راه‌حل**:
```bash
# پیدا کردن استفاده‌ها
npx rg "react-icons" --type tsx --type ts

# حذف
npm uninstall react-icons
```

**جایگزینی**:
```tsx
// قبل:
import { FaUser } from 'react-icons/fa';

// بعد:
import { User } from 'lucide-react';
```

**تأثیر**: کاهش ~100 KB ✅

---

## 📅 اقدامات کوتاه‌مدت (این هفته)

### 5. Lazy Loading برای Charts (1 روز)

```tsx
// در هر کامپوننت استفاده‌کننده از chart
const ChartComponent = dynamic(() => import('./ChartComponent'), {
  loading: () => <ChartSkeleton />,
});
```

**تأثیر**: بهبود First Load Time

---

### 6. CSS Optimization (1 روز)

**بررسی Tailwind Config**:
```js
// tailwind.config.ts
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    // اطمینان از purge صحیح
  ],
  // ...
}
```

**حذف CSS استفاده نشده**:
```bash
# بررسی CSS استفاده نشده
npx purgecss --css .next/static/**/*.css --content 'src/**/*.{tsx,ts}'
```

**تأثیر**: کاهش ~300 KB CSS

---

### 7. Tree Shaking بهتر (1 روز)

**بررسی imports**:
```tsx
// ❌ بد
import _ from 'lodash';

// ✅ خوب
import debounce from 'lodash/debounce';

// ❌ بد
import * as Icons from 'lucide-react';

// ✅ خوب
import { User, Settings } from 'lucide-react';
```

**تأثیر**: کاهش ~50-100 KB

---

## 📊 اقدامات میان‌مدت (این ماه)

### 8. Route-based Code Splitting

**تفکیک Dashboard از Site**:
```tsx
// next.config.ts
export default {
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-*',
      'lucide-react',
      'recharts',
    ],
  },
};
```

---

### 9. Image Optimization

**تبدیل به WebP/AVIF**:
```bash
# نصب sharp (از قبل نصب است)
# تبدیل تصاویر
npx @squoosh/cli --webp auto public/images/*.{jpg,png}
```

**استفاده از Next.js Image**:
```tsx
<Image
  src="/images/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  quality={85}
  priority
  placeholder="blur"
  blurDataURL="data:image/..."
/>
```

---

### 10. Font Optimization

**استفاده از next/font**:
```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';

const inter = Inter({ subsets: ['latin'] });
const vazir = localFont({
  src: './fonts/Vazir.woff2',
  display: 'swap',
});
```

---

## 📈 نتایج مورد انتظار

### بعد از اقدامات فوری (1-2 روز)
- **Total Bundle**: 8.55 MB → ~5 MB (-40%)
- **JavaScript**: 6.47 MB → ~4 MB (-38%)
- **First Load JS**: ~500 KB → ~300 KB (-40%)

### بعد از اقدامات کوتاه‌مدت (1 هفته)
- **Total Bundle**: ~5 MB → ~2 MB (-60%)
- **JavaScript**: ~4 MB → ~1.5 MB (-63%)
- **CSS**: 0.61 MB → ~0.2 MB (-67%)
- **First Load JS**: ~300 KB → ~150 KB (-50%)

### بعد از اقدامات میان‌مدت (1 ماه)
- **Total Bundle**: ~2 MB → ~1 MB (-50%)
- **JavaScript**: ~1.5 MB → ~800 KB (-47%)
- **First Load JS**: ~150 KB → ~100 KB (-33%)

---

## ✅ Checklist اقدامات

### امروز
- [ ] جابجایی تصویر about-hero به public
- [ ] Dynamic import برای Editor
- [ ] شناسایی استفاده‌های Chart.js

### فردا
- [ ] تبدیل Chart.js به Recharts
- [ ] حذف Chart.js از dependencies
- [ ] شناسایی استفاده‌های React Icons

### این هفته
- [ ] تبدیل React Icons به Lucide
- [ ] حذف React Icons از dependencies
- [ ] Lazy loading برای Charts
- [ ] بررسی و بهینه‌سازی Tailwind
- [ ] بهبود Tree Shaking

### این ماه
- [ ] Route-based Code Splitting
- [ ] Image Optimization
- [ ] Font Optimization
- [ ] تست Core Web Vitals
- [ ] Performance monitoring در production

---

## 🎯 اهداف نهایی

### Performance Metrics
- **LCP**: < 2.5s (فعلی: ~4s)
- **FID**: < 100ms (فعلی: ~200ms)
- **CLS**: < 0.1
- **First Load JS**: < 150 KB (فعلی: ~500 KB)

### Bundle Size
- **Total**: < 1 MB (فعلی: 8.55 MB)
- **JavaScript**: < 800 KB (فعلی: 6.47 MB)
- **CSS**: < 100 KB (فعلی: 0.61 MB)

### User Experience
- **3G Load Time**: < 3s (فعلی: ~8s)
- **4G Load Time**: < 1.5s (فعلی: ~3s)
- **Data Usage**: < 1 MB per visit (فعلی: ~8 MB)

---

## 📞 پشتیبانی

در صورت نیاز به کمک:
1. مراجعه به `PERFORMANCE_AUDIT_REPORT.md`
2. بررسی `bundle-analysis.json`
3. اجرای `npm run perf:audit`

---

**آخرین بروزرسانی**: 2025-12-06
**وضعیت**: 🔴 در انتظار اقدام
**اولویت**: CRITICAL
