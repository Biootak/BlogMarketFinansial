/**
 * HubPalette — هویت بصری هر Platform Hub
 * ---------------------------------------------------------------------------
 * هر hub یک palette + یک signature visual concept دارد.
 * این فایل منبع حقیقت برای رنگ‌های هر hub است؛ هر صفحه فقط از اینجا
 * می‌خواند. اضافه کردن رنگ جدید = اینجا، نه در component.
 *
 * قوانین:
 *  - هیچ hex/rgb خام — همه از tokens یا از این پالت (با hue از tokens) می‌آیند
 *  - هر hub فقط ۲ رنگ accent (primary + secondary) دارد
 *  - رنگ‌ها hue از tokens سایت می‌گیرند، saturation پایین
 */

export type HubId = 'communication' | 'jobs' | 'helpdesk' | 'approvals';

export interface HubAccent {
  /** hue از tokens (مثلاً 165 برای emerald، 265 برای nova) */
  readonly hue: number;
  /** chroma (saturation) — پایین برای premium feel */
  readonly chroma: number;
  /** lightness برای شدت (default 60) */
  readonly lightness?: number;
}

export interface HubPalette {
  readonly id: HubId;
  /** نام فارسی */
  readonly name: string;
  /** نام انگلیسی کوتاه */
  readonly slug: string;
  /** یک جمله الهام signature */
  readonly signature: string;
  /** accent اصلی */
  readonly primary: HubAccent;
  /** accent ثانویه (مکمل) */
  readonly secondary: HubAccent;
  /** accent هشدار (rose) — از tokens */
  readonly danger: HubAccent;
  /** accent خنثی (slate) — از tokens */
  readonly neutral: HubAccent;
}

/**
 * پالت‌های hub — الهام از دامنه FinancialMarket (صرافی افغانستان)
 *  - communication: emerald + amber (پخش پیام = رادیو)
 *  - jobs: nova-blue + cyan (پردازش = خط لوله)
 *  - helpdesk: rose + amber (پشتیبانی فوری = چراغ هشدار)
 *  - approvals: nova-violet + emerald (تصمیم = سکه دو رو)
 */
export const HUB_PALETTES: Record<HubId, HubPalette> = {
  communication: {
    id: 'communication',
    name: 'مرکز ارتباطات',
    slug: 'broadcast',
    signature: 'پخش رادیویی پیام — موج از مرکز به کاربران',
    primary: { hue: 165, chroma: 0.12 },
    secondary: { hue: 70, chroma: 0.1 },
    danger: { hue: 20, chroma: 0.13 },
    neutral: { hue: 245, chroma: 0.005 },
  },
  jobs: {
    id: 'jobs',
    name: 'مرکز Job',
    slug: 'pipeline',
    signature: 'خط لوله جریان — jobها مثل بسته‌های پول در لوله',
    primary: { hue: 245, chroma: 0.14 },
    secondary: { hue: 195, chroma: 0.12 },
    danger: { hue: 20, chroma: 0.13 },
    neutral: { hue: 245, chroma: 0.005 },
  },
  helpdesk: {
    id: 'helpdesk',
    name: 'تیکت‌ها',
    slug: 'priority-inbox',
    signature: 'صندوق اولویت — urgent ها بالا، عادی‌ها پایین',
    primary: { hue: 15, chroma: 0.13 },
    secondary: { hue: 70, chroma: 0.1 },
    danger: { hue: 0, chroma: 0.15 },
    neutral: { hue: 245, chroma: 0.005 },
  },
  approvals: {
    id: 'approvals',
    name: 'تأییدیه‌ها',
    slug: 'constellation',
    signature: 'صورت فلکی تصمیم — node جاری می‌درخشد',
    primary: { hue: 265, chroma: 0.14 },
    secondary: { hue: 165, chroma: 0.12 },
    danger: { hue: 20, chroma: 0.13 },
    neutral: { hue: 245, chroma: 0.005 },
  },
};

/** ساخت oklch از HubAccent (برای استفاده مستقیم در inline style) */
export function toOklch(accent: HubAccent, alpha = 1, lightness?: number): string {
  const l = lightness ?? accent.lightness ?? 60;
  if (alpha < 1) {
    return `oklch(${l}% ${accent.chroma} ${accent.hue} / ${alpha})`;
  }
  return `oklch(${l}% ${accent.chroma} ${accent.hue})`;
}

/** پالت hub فعلی را بگیر (با fallback) */
export function getHubPalette(id: HubId): HubPalette {
  return HUB_PALETTES[id];
}
