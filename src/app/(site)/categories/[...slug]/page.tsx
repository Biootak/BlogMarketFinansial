import { redirect } from 'next/navigation';

type Params = Promise<{ slug: string[] }>;

export default async function NestedCategoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  // /categories/[...slug] → /archive/category/[...slug]
  const joined = slug.join('/');
  redirect(`/archive/category/${joined}`);
}
