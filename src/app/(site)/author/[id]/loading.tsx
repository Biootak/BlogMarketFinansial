import { AuthorPageSkeleton } from '@/components/Skeletons';

/**
 * /author/[id]/loading.tsx
 * Overrides the parent /author/loading.tsx for the dynamic [id] segment.
 * The parent skeleton stays as fallback for intermediate navigation,
 * while this one mirrors the actual AuthorProfileHero + posts grid layout.
 */
export default function AuthorProfileLoading() {
  return <AuthorPageSkeleton />;
}
