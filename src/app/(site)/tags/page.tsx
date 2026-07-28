import { redirect } from 'next/navigation';

export default function TagsIndex() {
  // /tags — فهرست برچسب‌ها؛ هدایت به آرشیو
  redirect('/archive');
}
