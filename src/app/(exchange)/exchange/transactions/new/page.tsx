/**
 * /exchange/transactions/new — هدایت به صفحه تراکنش‌ها با حالت drawer باز
 *
 * QuickAction از داشبورد به این URL لینک داده — به‌جای یک 404،
 * کاربر را به صفحه تراکنش‌ها می‌بریم با پارامتر ?new=1 تا
 * Workspace درخواست باز کردن drawer را بداند.
 */
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function NewTransactionPage() {
  redirect('/exchange/transactions?new=1');
}
