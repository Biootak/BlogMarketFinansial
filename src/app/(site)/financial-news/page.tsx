import { redirect } from 'next/navigation';

export default function FinancialNewsPage() {
  // /financial-news — اخبار مالی؛ هدایت به آرشیو
  redirect('/archive');
}
