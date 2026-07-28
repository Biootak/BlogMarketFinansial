import { redirect } from 'next/navigation';

export default function CategoriesIndex() {
  // /categories — فهرست دسته‌بندی‌ها؛ هدایت به آرشیو
  redirect('/archive');
}
