/**
 * /dashboard/helpdesk/new — ایجاد تیکت جدید (هدایت به HelpdeskHub با حالت new=1)
 *
 * فرم تیکت جدید به‌صورت Drawer در HelpdeskHub پیاده‌سازی شده.
 * این route کاربر را با پارامتر new=1 هدایت می‌کند تا drawer خودکار باز شود.
 */
import { redirect } from 'next/navigation';

export default function HelpdeskNewPage() {
  redirect('/dashboard/helpdesk?new=1');
}
