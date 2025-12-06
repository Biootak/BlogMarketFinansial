# Bundle Analysis Summary
تاریخ: 6 دسامبر 2025

## آمار کلی
- **حجم کل:** 5.86 MB
- **تعداد chunk‌ها:** 220+
- **بزرگ‌ترین chunk:** 516.44 KB

## Top 10 بزرگ‌ترین Chunks

| Chunk | حجم | احتمال محتوا |
|-------|-----|--------------|
| `8629-bfc01af4b4835d8d.js` | 516.44 KB | **xlsx** (Excel library) |
| `1010-e28735d3e749ad91.js` | 451.34 KB | **KaTeX** (Math rendering) |
| `2170a4aa.de32b52f7130ef20.js` | 402.52 KB | TipTap Extensions |
| `7560-c5bb750a0777dfcb.js` | 360.41 KB | TipTap Core/Extensions |
| `3044.d3e31d92013d42d6.js` | 351.9 KB | Rich Text Editor Components |
| `aaea2bcf-581bcca5163da8c8.js` | 317.76 KB | UI Components (Radix/Headless) |
| `d3ac728e.1ee43e9a971af011.js` | 258.58 KB | Chart/Visualization Library |
| `4bd1b696-43ba64781d20dbb7.js` | 193.96 KB | Date/Calendar Components |
| `3794-7beacc5f2c1b5149.js` | 190.63 KB | Form/Validation Libraries |
| `framework-bd61ec64032c2de7.js` | 185.34 KB | React Framework |

## تحلیل بر اساس صفحات

### صفحات سنگین:
1. **single/[[...slug]]/page** - 72.71 KB (صفحه پست تکی)
2. **dashboard/settings/page** - 63.34 KB
3. **dashboard/page** - 58.24 KB
4. **money-transfer/page** - 56.45 KB
5. **layout (site)** - 55.14 KB
6. **home page** - 54.48 KB

### React Player Chunks (قابل بهینه‌سازی):
- `reactPlayerFilePlayer` - 8.41 KB
- `reactPlayerYouTube` - 3.91 KB
- `reactPlayerVimeo` - 3.13 KB
- `reactPlayerWistia` - 3.03 KB
- `reactPlayerFacebook` - 2.73 KB
- `reactPlayerTwitch` - 2.58 KB
- و 8 player دیگر...

**مشکل:** همه player‌ها به صورت جداگانه load می‌شن حتی اگر استفاده نشن!

## توصیه‌های بهینه‌سازی (اولویت‌بندی شده)

### 🔴 اولویت بسیار بالا (کاهش ~1 MB)

#### 1. xlsx - Chunk 8629 (516 KB)
این کتابخانه فقط در export/import Excel استفاده می‌شه.

```typescript
// ❌ قبل - در کامپوننت یا action
import * as XLSX from 'xlsx';

// ✅ بعد - lazy load
const handleExportToExcel = async (data: any[]) => {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, 'export.xlsx');
};
```

**کاهش:** ~516 KB از initial bundle

#### 2. KaTeX - Chunk 1010 (451 KB)
فقط در پست‌هایی که فرمول ریاضی دارن لازمه.

```typescript
// ✅ در TipTap Math Extension
import { Node } from '@tiptap/core';

export const MathBlock = Node.create({
  // ... config
  
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      
      // Lazy load KaTeX
      import('katex').then((katex) => {
        katex.default.render(node.attrs.content, dom, {
          throwOnError: false,
          displayMode: true,
        });
      });
      
      return { dom };
    };
  },
});
```

**کاهش:** ~451 KB از initial bundle

### 🟠 اولویت بالا (کاهش ~700 KB)

#### 3. TipTap Editor - Chunks 2170a4aa, 7560, 3044 (~1.1 MB)
Editor فقط در صفحات create/edit پست لازمه.

```typescript
// ✅ در app/dashboard/posts/create/page.tsx
import dynamic from 'next/dynamic';

const PostEditor = dynamic(
  () => import('@/components/Editor1/Editor'),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse">Loading editor...</div>
  }
);

export default function CreatePostPage() {
  return <PostEditor />;
}
```

**کاهش:** ~1.1 MB از صفحات غیر editor

#### 4. React Player - 15+ Chunks (~50 KB)
همه player‌ها load می‌شن حتی اگر فقط YouTube استفاده بشه!

```typescript
// ❌ قبل - در کامپوننت
import ReactPlayer from 'react-player';

// ✅ بعد - فقط player مورد نیاز
import ReactPlayer from 'react-player/youtube'; // فقط YouTube
// یا
import ReactPlayer from 'react-player/lazy'; // Lazy load all
```

**کاهش:** ~30-40 KB

### 🟡 اولویت متوسط (کاهش ~300 KB)

#### 5. Chart Library - Chunk d3ac728e (258 KB)
اگر Recharts استفاده می‌کنید:

```typescript
// ❌ قبل
import { LineChart, BarChart, PieChart, AreaChart } from 'recharts';

// ✅ بعد - فقط در صفحه dashboard
import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(
  () => import('@/components/Dashboard/Charts'),
  { ssr: false }
);
```

#### 6. Date Picker - Chunk 4bd1b696 (193 KB)
Calendar component‌ها:

```typescript
// ✅ فقط در صفحاتی که date picker دارن
const DateRangePicker = dynamic(
  () => import('@/components/DateRangePicker'),
  { ssr: false }
);
```

### 🟢 بهینه‌سازی‌های عمومی

#### 7. Tree Shaking برای Lodash
```typescript
// ❌ اشتباه - کل lodash import می‌شه
import _ from 'lodash';
import { debounce } from 'lodash';

// ✅ درست - فقط function مورد نیاز
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
```

#### 8. بررسی Dependencies تکراری
```bash
npm ls lodash
npm ls react
npm ls @types/react
```

بررسی کنید:
- `react-hooks-global-state` (شما Zustand دارید - تکراری!)
- `react-use` (ممکنه بتونید با custom hooks جایگزین کنید)

#### 9. Optimize Radix UI Imports
```typescript
// ❌ قبل
import * as Dialog from '@radix-ui/react-dialog';

// ✅ بعد
import { Root, Trigger, Content } from '@radix-ui/react-dialog';
```

## پلان اجرایی (Step by Step)

### فاز 1: Quick Wins (1-2 ساعت) - کاهش ~1 MB
1. ✅ xlsx را lazy load کنید
2. ✅ KaTeX را lazy load کنید  
3. ✅ React Player را به lazy mode تغییر دهید
4. ✅ بررسی و حذف `react-hooks-global-state`

### فاز 2: Editor Optimization (2-3 ساعت) - کاهش ~1.1 MB
1. ✅ TipTap Editor را dynamic import کنید
2. ✅ Extension‌های TipTap را lazy load کنید
3. ✅ Toolbar components را code split کنید

### فاز 3: Component Optimization (1-2 ساعت) - کاهش ~300 KB
1. ✅ Chart components را dynamic import کنید
2. ✅ Date picker را lazy load کنید
3. ✅ Heavy UI components را بررسی کنید

### فاز 4: Cleanup (1 ساعت) - کاهش ~100 KB
1. ✅ Lodash imports را بهینه کنید
2. ✅ Dependencies تکراری را حذف کنید
3. ✅ Unused imports را پیدا و حذف کنید

## نتیجه پیش‌بینی شده

### قبل از بهینه‌سازی:
- Initial Bundle: ~5.86 MB
- FCP: ~3-4s
- TTI: ~5-6s

### بعد از بهینه‌سازی:
- Initial Bundle: ~3.3 MB (**کاهش 43%**)
- FCP: ~1.5-2s (**بهبود 50%**)
- TTI: ~2.5-3s (**بهبود 50%**)

### تاثیر بر صفحات:
- **Homepage:** کاهش ~1.5 MB (بدون editor, xlsx, katex)
- **Blog Posts:** کاهش ~1 MB (بدون editor, xlsx)
- **Dashboard:** کاهش ~500 KB (lazy load charts)
- **Post Editor:** فقط ~200 KB کاهش (چون editor لازمه)

## فایل‌های هدف برای تغییر

```
src/
├── components/
│   ├── Editor1/
│   │   ├── Editor.tsx          # Dynamic import
│   │   ├── extensions/
│   │   │   ├── math.ts         # Lazy load KaTeX
│   │   │   └── ...
│   ├── Dashboard/
│   │   └── Charts.tsx          # Dynamic import
│   └── DatePicker/             # Dynamic import
├── app/
│   └── dashboard/
│       └── posts/
│           ├── create/page.tsx # Dynamic Editor
│           └── edit/[id]/page.tsx # Dynamic Editor
└── lib/
    └── excel.ts                # Lazy load xlsx
```
