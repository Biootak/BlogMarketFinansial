import { redirect } from 'next/navigation';

export default function PostsIndex() {
  // /posts — لیست پست‌ها؛ هدایت به آرشیو اصلی
  redirect('/archive');
}
