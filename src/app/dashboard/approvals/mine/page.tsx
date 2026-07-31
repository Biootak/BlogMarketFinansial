/**
 * /dashboard/approvals/mine — تأییدیه‌های در انتظار من
 *
 * ApprovalsHub یک component واحد است که فیلتر «mine» را درون خود مدیریت می‌کند.
 * این route کاربر را به صفحه اصلی approvals با فیلتر mine هدایت می‌کند.
 */
import { redirect } from 'next/navigation';

export default function ApprovalsMine() {
  redirect('/dashboard/approvals?filter=mine');
}
