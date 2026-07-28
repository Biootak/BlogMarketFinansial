import { redirect } from 'next/navigation';

export default function FeedbackPage() {
  // /feedback — بازخورد کاربران؛ هدایت به صفحه تماس
  redirect('/contact');
}
