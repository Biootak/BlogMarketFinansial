# راهنمای Performance و Responsive Design

این راهنما شامل تمام بهینه‌سازی‌های انجام شده برای بهبود سرعت و طراحی واکنش‌گرا در سایت Biotak است.

## 📊 خلاصه بهینه‌سازی‌ها

### ✅ Performance Optimizations
- **Web Vitals Monitoring**: مانیتورینگ LCP, FID, CLS, TTFB, INP
- **Image Optimization**: WebP/AVIF, lazy loading, responsive images
- **Bundle Optimization**: Code splitting, dynamic imports, chunks < 200KB
- **CSS Optimization**: GPU-accelerated animations, critical CSS
- **Caching Strategy**: Stale-while-revalidate, request deduplication

### ✅ Responsive Design
- **Container System**: Responsive padding (px-4/px-6/px-8)
- **Grid System**: 1 col mobile, 2 col tablet, 3-4 col desktop
- **Typography**: Responsive font sizes (16px+ on mobile)
- **Touch-Friendly**: 44x44px minimum touch targets
- **Mobile Navigation**: Hamburger menu with focus trap

### ✅ RTL Support
- **Logical Properties**: start/end instead of left/right
- **Gap Utilities**: gap-* instead of space-x-*
- **Text Alignment**: text-start/text-end

### ✅ Accessibility
- **Focus Management**: Visible focus rings, logical tab order
- **Keyboard Navigation**: Arrow keys, Enter, Escape support
- **Screen Readers**: ARIA labels, announcements

## 🎯 Performance Targets

| Metric | Target | Description |
|--------|--------|-------------|
| LCP | ≤ 2.5s | Largest Contentful Paint |
| FID | ≤ 100ms | First Input Delay |
| CLS | ≤ 0.1 | Cumulative Layout Shift |
| TTFB | ≤ 800ms | Time to First Byte |
| INP | ≤ 200ms | Interaction to Next Paint |

## 📦 کامپوننت‌های جدید

### Performance
- `PerformanceProvider` - Initialize performance monitoring
- `PerformanceDashboard` - Real-time metrics (development only)

### Layout
- `Container` - Responsive container with padding
- `Section` - Consistent vertical spacing
- `ResponsiveGrid` - Breakpoint-based grid

### Images
- `OptimizedImage` - Lazy loading, blur placeholder, error handling

### Navigation
- `MobileMenu` - Full-screen overlay with focus trap

### Forms
- `MobileOptimizedInput` - Scroll-into-view, appropriate input types
- `MobileOptimizedSelect` - Native picker on mobile
- `MobileOptimizedDateInput` - Native date picker

### Tables
- `ResponsiveTable` - Card layout or horizontal scroll
- `ResponsiveTableCell` - Text truncation with tap-to-expand

### Dashboard
- `MobileDashboardLayout` - Collapsible sidebar
- `DashboardCard` - Full-width on mobile
- `DashboardForm` - Single column on mobile
- `DashboardActions` - Overflow menu for secondary actions

### Media
- `ResponsiveVideo` - Aspect ratio container, lazy loading
- `ResponsiveAudio` - Compact controls on mobile
- `ResponsiveIframe` - Lazy loading for embeds

### UI
- `TouchSlider` - Swipe gestures, arrow navigation
- `ResponsiveHeading` - Responsive font sizes
- `Skeleton` - Loading placeholders with CSS animations
- `LoadingSpinner` - Responsive spinner
- `ProgressBar` - Progress indicator

## 🔧 Utilities

### Performance
- `src/lib/performance/web-vitals.ts` - Web Vitals monitoring
- `src/lib/performance/performance-monitor.ts` - Long tasks, memory leaks
- `src/lib/performance/core-web-vitals-optimizer.ts` - Optimization strategies

### Responsive
- `src/lib/responsive/breakpoints.ts` - Breakpoint utilities
- `src/lib/responsive/typography.ts` - Typography scale

### Layout
- `src/lib/layout/spacing.ts` - Spacing utilities
- `src/lib/layout/rtl.ts` - RTL support utilities

### Image
- `src/lib/image/image-optimizer.ts` - Image optimization utilities

### Touch
- `src/lib/touch/touch-handler.ts` - Touch gestures, passive listeners

### CSS
- `src/lib/css/animation-utils.ts` - GPU-accelerated animations
- `src/lib/css/layout-shift-prevention.ts` - CLS prevention

### Cache
- `src/lib/cache/cache-manager.ts` - Caching strategies

### Accessibility
- `src/lib/accessibility/focus-management.ts` - Focus trap, keyboard navigation

## 📱 Breakpoints

```typescript
mobile: 0 - 767px
tablet: 768px - 1023px
desktop: 1024px+
```

## 🎨 استفاده از کامپوننت‌ها

### Container
```tsx
import { Container } from '@/components/ui/Container';

<Container size="lg">
  <h1>محتوا</h1>
</Container>
```

### ResponsiveGrid
```tsx
import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';

<ResponsiveGrid 
  cols={{ mobile: 1, tablet: 2, desktop: 3 }}
  gap={{ mobile: 4, tablet: 6, desktop: 6 }}
>
  {items.map(item => <Card key={item.id} {...item} />)}
</ResponsiveGrid>
```

### OptimizedImage
```tsx
import { OptimizedImage } from '@/components/ui/OptimizedImage';

<OptimizedImage
  src="/image.jpg"
  alt="توضیحات"
  aspectRatio="16/9"
  sizes="(max-width: 768px) 100vw, 50vw"
  priority={false}
/>
```

### MobileMenu
```tsx
import { MobileMenu } from '@/components/Navigation/MobileMenu';
import { useMobileMenu } from '@/hooks/useMobileMenu';

const { isOpen, open, close } = useMobileMenu();

<MobileMenu isOpen={isOpen} onClose={close}>
  <nav>منوی موبایل</nav>
</MobileMenu>
```

### TouchSlider
```tsx
import { TouchSlider } from '@/components/ui/TouchSlider';

<TouchSlider autoPlay={true} autoPlayInterval={5000}>
  {slides.map((slide, i) => (
    <div key={i}>{slide}</div>
  ))}
</TouchSlider>
```

## 🚀 نکات بهینه‌سازی

### Images
- از `OptimizedImage` به جای `next/image` استفاده کنید
- برای تصاویر above-fold از `priority={true}` استفاده کنید
- aspect ratio را مشخص کنید تا از CLS جلوگیری شود

### JavaScript
- از dynamic imports برای کامپوننت‌های سنگین استفاده کنید
- کامپوننت‌ها را با `React.memo` بهینه کنید
- از `useMemo` و `useCallback` برای محاسبات سنگین استفاده کنید

### CSS
- فقط از `transform` و `opacity` برای انیمیشن استفاده کنید
- از `will-change` با احتیاط استفاده کنید
- فضا را برای محتوای dynamic رزرو کنید

### RTL
- از `gap-*` به جای `space-x-*` استفاده کنید
- از `start`/`end` به جای `left`/`right` استفاده کنید
- از `text-start`/`text-end` به جای `text-left`/`text-right` استفاده کنید

### Touch
- حداقل 44x44px برای touch targets
- از passive event listeners استفاده کنید
- فیدبک بصری در کمتر از 100ms

## 🔍 Debugging

### Performance Dashboard
در development mode، روی دکمه "⚡ Performance" در گوشه پایین راست کلیک کنید.

### Chrome DevTools
1. Performance tab برای profiling
2. Lighthouse برای audit
3. Network tab برای بررسی requests

### Web Vitals
```typescript
import { getMetricsSnapshot } from '@/lib/performance';

const metrics = getMetricsSnapshot();
console.log('Current metrics:', metrics);
```

## 📚 منابع

- [Web Vitals](https://web.dev/vitals/)
- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [Tailwind CSS RTL](https://tailwindcss.com/docs/rtl-support)
- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## ✅ Checklist

- [ ] همه تصاویر از `OptimizedImage` استفاده می‌کنند
- [ ] همه کامپوننت‌های سنگین به صورت dynamic import شده‌اند
- [ ] همه انیمیشن‌ها فقط از transform و opacity استفاده می‌کنند
- [ ] همه touch targets حداقل 44x44px هستند
- [ ] همه فرم‌ها در موبایل بهینه شده‌اند
- [ ] همه جداول responsive هستند
- [ ] RTL support کامل است
- [ ] Focus management برای keyboard navigation فعال است
- [ ] Loading states برای همه محتوای async وجود دارد
- [ ] Core Web Vitals به target‌ها رسیده‌اند
