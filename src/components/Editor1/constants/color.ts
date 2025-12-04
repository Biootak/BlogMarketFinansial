// پالت رنگی جذاب و حرفه‌ای
export const COLOR_PALETTE = {
  // رنگ‌های خاکستری
  grays: [
    { name: 'سفید', value: '#FFFFFF', isBrightColor: true },
    { name: 'خاکستری روشن', value: '#F3F4F6', isBrightColor: true },
    { name: 'خاکستری', value: '#9CA3AF', isBrightColor: true },
    { name: 'خاکستری تیره', value: '#4B5563', isBrightColor: false },
    { name: 'مشکی', value: '#111827', isBrightColor: false },
  ],
  // رنگ‌های قرمز
  reds: [
    { name: 'قرمز روشن', value: '#FEE2E2', isBrightColor: true },
    { name: 'قرمز ملایم', value: '#FCA5A5', isBrightColor: true },
    { name: 'قرمز', value: '#EF4444', isBrightColor: false },
    { name: 'قرمز تیره', value: '#DC2626', isBrightColor: false },
    { name: 'قرمز عمیق', value: '#991B1B', isBrightColor: false },
  ],
  // رنگ‌های نارنجی
  oranges: [
    { name: 'نارنجی روشن', value: '#FFEDD5', isBrightColor: true },
    { name: 'نارنجی ملایم', value: '#FDBA74', isBrightColor: true },
    { name: 'نارنجی', value: '#F97316', isBrightColor: false },
    { name: 'نارنجی تیره', value: '#EA580C', isBrightColor: false },
    { name: 'نارنجی عمیق', value: '#9A3412', isBrightColor: false },
  ],
  // رنگ‌های زرد
  yellows: [
    { name: 'زرد روشن', value: '#FEF9C3', isBrightColor: true },
    { name: 'زرد ملایم', value: '#FDE047', isBrightColor: true },
    { name: 'زرد', value: '#FACC15', isBrightColor: true },
    { name: 'زرد تیره', value: '#CA8A04', isBrightColor: false },
    { name: 'زرد عمیق', value: '#854D0E', isBrightColor: false },
  ],
  // رنگ‌های سبز
  greens: [
    { name: 'سبز روشن', value: '#DCFCE7', isBrightColor: true },
    { name: 'سبز ملایم', value: '#86EFAC', isBrightColor: true },
    { name: 'سبز', value: '#22C55E', isBrightColor: false },
    { name: 'سبز تیره', value: '#16A34A', isBrightColor: false },
    { name: 'سبز عمیق', value: '#166534', isBrightColor: false },
  ],
  // رنگ‌های آبی فیروزه‌ای
  teals: [
    { name: 'فیروزه‌ای روشن', value: '#CCFBF1', isBrightColor: true },
    { name: 'فیروزه‌ای ملایم', value: '#5EEAD4', isBrightColor: true },
    { name: 'فیروزه‌ای', value: '#14B8A6', isBrightColor: false },
    { name: 'فیروزه‌ای تیره', value: '#0D9488', isBrightColor: false },
    { name: 'فیروزه‌ای عمیق', value: '#115E59', isBrightColor: false },
  ],
  // رنگ‌های آبی
  blues: [
    { name: 'آبی روشن', value: '#DBEAFE', isBrightColor: true },
    { name: 'آبی ملایم', value: '#93C5FD', isBrightColor: true },
    { name: 'آبی', value: '#3B82F6', isBrightColor: false },
    { name: 'آبی تیره', value: '#2563EB', isBrightColor: false },
    { name: 'آبی عمیق', value: '#1E40AF', isBrightColor: false },
  ],
  // رنگ‌های بنفش
  purples: [
    { name: 'بنفش روشن', value: '#EDE9FE', isBrightColor: true },
    { name: 'بنفش ملایم', value: '#C4B5FD', isBrightColor: true },
    { name: 'بنفش', value: '#8B5CF6', isBrightColor: false },
    { name: 'بنفش تیره', value: '#7C3AED', isBrightColor: false },
    { name: 'بنفش عمیق', value: '#5B21B6', isBrightColor: false },
  ],
  // رنگ‌های صورتی
  pinks: [
    { name: 'صورتی روشن', value: '#FCE7F3', isBrightColor: true },
    { name: 'صورتی ملایم', value: '#F9A8D4', isBrightColor: true },
    { name: 'صورتی', value: '#EC4899', isBrightColor: false },
    { name: 'صورتی تیره', value: '#DB2777', isBrightColor: false },
    { name: 'صورتی عمیق', value: '#9D174D', isBrightColor: false },
  ],
};

// رنگ‌های پیش‌فرض سریع (برای نوار ابزار)
export const DEFAULT_COLORS = [
  { name: 'مشکی', value: '#111827', isBrightColor: false },
  { name: 'خاکستری', value: '#6B7280', isBrightColor: false },
  { name: 'قرمز', value: '#EF4444', isBrightColor: false },
  { name: 'نارنجی', value: '#F97316', isBrightColor: false },
  { name: 'زرد', value: '#FACC15', isBrightColor: true },
  { name: 'سبز', value: '#22C55E', isBrightColor: false },
  { name: 'آبی', value: '#3B82F6', isBrightColor: false },
  { name: 'بنفش', value: '#8B5CF6', isBrightColor: false },
];

// تبدیل hex به rgba
export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// تبدیل rgba به hex و alpha
export const rgbaToHexAlpha = (rgba: string): { hex: string; alpha: number } => {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return { hex: '#000000', alpha: 1 };
  
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  const alpha = match[4] ? parseFloat(match[4]) : 1;
  
  return { hex: `#${r}${g}${b}`, alpha };
};

// بررسی اینکه رنگ rgba هست یا نه
export const isRgba = (color: string): boolean => {
  return color?.startsWith('rgba') || color?.startsWith('rgb');
};

export type TColor = {
  isBrightColor: boolean;
  name: string;
  value: string;
};
