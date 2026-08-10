type LogoSvgProps = {
  className?: string;
  /**
   * Optional title for screen readers. Renders as an SVG <title> node so
   * the logo stays accessible when used as the only branding element.
   */
  title?: string;
};

/**
 * Inline SVG logo — Financial Market.
 *
 * Design (هماهنگ با لوگوی ربات تلگرام و فاوآیکون):
 *   • Squircle با گرادیان زمردی (رنگ برند) — در حالت روشن و تاریک خواناست.
 *   • سپر سفید با تیک سبز داخل — نشان «امنیت و اعتماد».
 *   • همهٔ المان‌ها بردار هستند — در هر اندازه‌ای crisp می‌مانند.
 *
 * چرا SVG (نه PNG):
 *   • یک فایل، هر دو تم — گرادیان مستقل از رنگ متن است.
 *   • مقیاس‌پذیر روی retina / 4K / چاپ.
 *   • بدون درخواست HTTP اضافه و بدون layout shift.
 *
 * آپلود سفارشی (توسط مالک از تنظیمات) از طریق prop `logoUrl` روی
 * `<Logo />` عبور می‌کند؛ این کامپوننت پیش‌فرض و fallback است.
 */
const LogoSvg = ({ className, title = 'لوگوی Financial Market' }: LogoSvgProps) => {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="fm-brand-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="0.55" stopColor="#059669" />
          <stop offset="1" stopColor="#065f46" />
        </linearGradient>
      </defs>

      {/* Squircle پس‌زمینه — گرادیان زمردی برند */}
      <rect x="2.5" y="2.5" width="35" height="35" rx="9" fill="url(#fm-brand-g)" />

      {/* سپر سفید — نماد امنیت */}
      <path d="M20 8.5L26.5 13.5V21Q26.5 26 20 31Q13.5 26 13.5 21V13.5L20 8.5Z" fill="#ffffff" />

      {/* تیک سبز داخل سپر — تأیید */}
      <path
        d="M16.2 20.5L19 23.5L24.2 16.5"
        stroke="#059669"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

export default LogoSvg;
