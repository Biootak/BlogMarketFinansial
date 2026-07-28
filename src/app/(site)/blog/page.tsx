import { redirect } from 'next/navigation';

export default function BlogIndex() {
  // /blog — آرشیو مقالات؛ هدایت به آرشیو اصلی
  redirect('/archive');
}
