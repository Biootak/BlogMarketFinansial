import { redirect } from 'next/navigation';

export default function SupportPage() {
  // /support — صفحه پشتیبانی؛ هدایت به مرکز راهنما
  redirect('/help-center');
}
