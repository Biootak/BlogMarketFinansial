/**
 * /dashboard/helpdesk/mine — تیکت‌های من (هدایت به مرکز اصلی با فیلتر «mine»)
 *
 * HelpdeskHub یک component واحد است که فیلتر «mine» را درون خود مدیریت می‌کند.
 * این route کاربر را به صفحه اصلی helpdesk هدایت می‌کند.
 */
import { redirect } from 'next/navigation';

export default function HelpdeskMinePage() {
  redirect('/dashboard/helpdesk?filter=mine');
}
