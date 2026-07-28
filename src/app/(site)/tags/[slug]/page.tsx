import { redirect } from 'next/navigation';

type Params = Promise<{ slug: string }>;

export default async function TagSlugPage({ params }: { params: Params }) {
  const { slug } = await params;
  // /tags/[slug] → /archive/tag/[slug]
  redirect(`/archive/tag/${slug}`);
}
