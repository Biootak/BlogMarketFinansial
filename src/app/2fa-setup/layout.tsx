/**
 * /2fa-setup layout — صفحهٔ فعال‌سازی اجباری 2FA برای حساب مالک.
 * این صفحه خارج از درخت /dashboard است (تحت گیت 2FA قرار نمی‌گیرد)،
 * پس design system داشبورد (spotlight و…) را اینجا بارگذاری می‌کنیم.
 */
import '@/app/dashboard/dashboard.css';

export default function TwoFaSetupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
