import { redirect } from 'next/navigation';

type Params = Promise<{ slug: string }>;

export default async function CategorySlugPage({ params }: { params: Params }) {
  const { slug } = await params;
  // /categories/[slug] → /archive/category/[slug] (canonical path)
  redirect(`/archive/category/${slug}`);
}
