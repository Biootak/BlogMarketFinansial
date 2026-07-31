/**
 * /dashboard/approvals/new — درخواست تأییدیه جدید
 *
 * فرم ایجاد approval به‌صورت Panel (CreateApprovalPanel) در ApprovalsHub پیاده‌سازی شده.
 * این route کاربر را با پارامتر new=1 هدایت می‌کند تا panel خودکار باز شود.
 */
import { redirect } from 'next/navigation';

export default function ApprovalsNewPage() {
  redirect('/dashboard/approvals?new=1');
}
