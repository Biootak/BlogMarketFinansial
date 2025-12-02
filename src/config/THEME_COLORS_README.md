# راهنمای تغییر رنگ‌های پروژه

این فایل راهنمای تغییر رنگ‌های پروژه است. برای هماهنگی رنگ‌ها در کل پروژه، رنگ‌ها در یک مکان مرکزی تعریف شده‌اند.

## نحوه تغییر رنگ‌ها

### روش 1: تغییر CSS Variables (پیشنهادی)

تمام رنگ‌های gradient در فایل `src/app/globals.css` تعریف شده‌اند. برای تغییر رنگ‌ها:

1. فایل `src/app/globals.css` را باز کنید
2. بخش `GRADIENT COLORS` را پیدا کنید
3. مقدار RGB رنگ‌های مورد نظر را تغییر دهید

مثال:
```css
--color-gradient-from-500: rgb(168, 85, 247);  /* purple-500 */
--color-gradient-to-500: rgb(236, 72, 153);    /* pink-500 */
```

### روش 2: استفاده از Tailwind Classes

می‌توانید از کلاس‌های Tailwind استفاده کنید که با CSS variables تعریف شده‌اند:

- `gradient-primary`: برای gradient اصلی
- `gradient-light`: برای gradient روشن‌تر
- `gradient-dark`: برای gradient تیره‌تر

### رنگ‌های فعلی

- **Gradient From (رنگ اول)**: Purple (بنفش)
- **Gradient To (رنگ دوم)**: Pink (صورتی)
- **Primary**: Blue (آبی) - رنگ اصلی پروژه
- **Accent**: Yellow/Orange (زرد/نارنجی)

## فایل‌های مرتبط

- `src/app/globals.css` - تعریف CSS Variables
- `src/config/theme-colors.ts` - تنظیمات TypeScript برای رنگ‌ها

## نکات مهم

1. بعد از تغییر رنگ‌ها، باید پروژه را rebuild کنید
2. برای consistency، از رنگ‌های تعریف شده در این فایل استفاده کنید
3. برای تغییر سریع، فقط CSS Variables را تغییر دهید

---

# Theme Colors Configuration Guide

This file is a guide for changing project colors. For color consistency across the project, colors are defined in a central location.

## How to Change Colors

### Method 1: Changing CSS Variables (Recommended)

All gradient colors are defined in `src/app/globals.css`. To change colors:

1. Open `src/app/globals.css`
2. Find the `GRADIENT COLORS` section
3. Change the RGB values of desired colors

Example:
```css
--color-gradient-from-500: rgb(168, 85, 247);  /* purple-500 */
--color-gradient-to-500: rgb(236, 72, 153);    /* pink-500 */
```

### Current Colors

- **Gradient From**: Purple
- **Gradient To**: Pink
- **Primary**: Blue - Main project color
- **Accent**: Yellow/Orange

## Related Files

- `src/app/globals.css` - CSS Variables definition
- `src/config/theme-colors.ts` - TypeScript color configuration

## Important Notes

1. After changing colors, you must rebuild the project
2. For consistency, use colors defined in this file
3. For quick changes, just modify CSS Variables


