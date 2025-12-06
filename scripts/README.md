# Performance Optimization Scripts

این مجموعه شامل 15 اسکریپت برای بهینه‌سازی و تحلیل عملکرد پروژه است.

## 📊 Performance Monitoring

### 1. performance-audit.ts
تحلیل جامع عملکرد با 10 analyzer مختلف.

```bash
npm run perf:audit
```

**خروجی**: گزارش HTML, JSON, و Markdown در `performance-reports/`

**Analyzers**:
- Bundle Analyzer
- Database Profiler
- SSR Monitor
- Client Monitor
- Image Analyzer
- Memory Tracker
- Cache Evaluator
- Script Analyzer
- API Profiler
- Font Optimizer

---

### 2. analyze-bundles.ts
تحلیل اندازه bundle و chunks.

```bash
npx tsx scripts/analyze-bundles.ts
```

**خروجی**: 
- اندازه کل bundle
- بزرگترین chunks
- توصیه‌های بهینه‌سازی

---

## 🎨 Icon Migration (6 Scripts)

### 3. migrate-icons.ts
تبدیل import statements از react-icons به lucide-react.

```bash
npx tsx scripts/migrate-icons.ts
```

---

### 4. fix-icon-usages.ts
جایگزینی JSX icon usage (150+ mappings).

```bash
npx tsx scripts/fix-icon-usages.ts
```

**مثال**: `<HiCheck />` → `<Check />`

---

### 5. fix-missing-imports.ts
اضافه کردن imports گمشده.

```bash
npx tsx scripts/fix-missing-imports.ts
```

---

### 6. fix-conflicting-imports.ts
حذف conflicts (Link, Image, Menu).

```bash
npx tsx scripts/fix-conflicting-imports.ts
```

---

### 7. remove-duplicate-imports.ts
حذف duplicate imports از lucide-react.

```bash
npx tsx scripts/remove-duplicate-imports.ts
```

---

### 8. find-remaining-icons.ts
پیدا کردن icon های باقیمانده.

```bash
npx tsx scripts/find-remaining-icons.ts
```

---

## 🎨 CSS Optimization (2 Scripts)

### 9. analyze-gradients.ts
تحلیل gradient usage در پروژه.

```bash
npx tsx scripts/analyze-gradients.ts
```

**خروجی**:
- تعداد gradient های منحصر به فرد
- پرکاربردترین gradients
- پتانسیل کاهش CSS

**نتیجه**: 266 gradient در 108 فایل، پتانسیل ~133 KB کاهش

---

### 10. replace-gradients.ts
جایگزینی gradient utilities با custom classes.

```bash
npx tsx scripts/replace-gradients.ts
```

---

## 🖼️ Image Optimization (3 Scripts)

### 11. optimize-images.ts
تبدیل تصاویر به WebP با sharp.

```bash
npx tsx scripts/optimize-images.ts
```

**تنظیمات**:
- Quality: 85%
- Effort: 6
- Format: WebP

**نتیجه**: 25 تصویر، -2.53 MB (79.8% کاهش)

---

### 12. find-image-usage.ts
تحلیل استفاده از Image components.

```bash
npx tsx scripts/find-image-usage.ts
```

**خروجی**:
- فایل‌های با next/image
- فایل‌های با static imports
- تعداد کل تصاویر

---

## 📦 Dependency Analysis

### 13. analyze-dependencies.ts
تحلیل اندازه packages در node_modules.

```bash
npx tsx scripts/analyze-dependencies.ts
```

**خروجی**:
- Top 30 بزرگترین packages
- Category breakdown
- توصیه‌های بهینه‌سازی

**نتیجه**: 
- next: 152.39 MB
- prisma: 90.03 MB
- lucide-react: 27.27 MB
- و...

---

## 🚀 استفاده سریع

### بهینه‌سازی کامل (مرحله به مرحله)

```bash
# 1. تحلیل اولیه
npm run perf:audit
npx tsx scripts/analyze-bundles.ts
npx tsx scripts/analyze-dependencies.ts

# 2. Icon Migration
npx tsx scripts/migrate-icons.ts
npx tsx scripts/fix-icon-usages.ts
npx tsx scripts/fix-missing-imports.ts
npx tsx scripts/fix-conflicting-imports.ts
npx tsx scripts/remove-duplicate-imports.ts

# 3. Image Optimization
npx tsx scripts/optimize-images.ts

# 4. CSS Optimization
npx tsx scripts/analyze-gradients.ts
npx tsx scripts/replace-gradients.ts

# 5. Build و تست
npm run build
```

---

## 📈 نتایج

### قبل از بهینه‌سازی
- Bundle: 8.55 MB
- Images: 3.17 MB
- node_modules: 1,264 MB

### بعد از بهینه‌سازی
- Bundle: 7.23 MB (-15%)
- Images: 0.64 MB (-79.8%)
- node_modules: 1,182 MB (-6.5%)

### کل کاهش: ~86 MB

---

## 🛠️ نیازمندی‌ها

```json
{
  "dependencies": {
    "glob": "^10.x",
    "sharp": "^0.33.x"
  },
  "devDependencies": {
    "tsx": "^4.x",
    "@types/node": "^22.x"
  }
}
```

---

## 📝 یادداشت‌ها

- همه scripts با TypeScript نوشته شده‌اند
- از `tsx` برای اجرا استفاده می‌شود
- خروجی‌ها در console و فایل‌های گزارش
- Safe برای اجرای مکرر (idempotent)

---

## 🎯 اولویت‌بندی

### High Priority (انجام شده ✅)
1. ✅ Icon Migration
2. ✅ Image Optimization
3. ✅ XLSX Lazy Loading
4. ✅ Font Optimization

### Medium Priority (آماده برای اجرا)
1. 🔧 Gradient Replacement
2. 🔧 حذف تصاویر اصلی
3. 🔧 Route-based Code Splitting

### Low Priority
1. 📋 TipTap Extensions Review
2. 📋 API Response Caching
3. 📋 Database Query Optimization

---

**تهیه شده توسط**: Kiro AI  
**تاریخ**: 2025-12-06  
**نسخه**: 1.0.0
