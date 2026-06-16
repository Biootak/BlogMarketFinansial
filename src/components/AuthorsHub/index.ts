/**
 * @file AuthorsHub — public barrel
 * Re-exports every piece so consumers can import from a single place:
 *   import { AuthorsHero, AuthorsGrid, AuthorCard } from '@/components/AuthorsHub';
 */
export { default as AuthorsHero } from './AuthorsHero';
export type { AuthorsHeroProps } from './AuthorsHero';
export { default as AuthorsGrid } from './AuthorsGrid';
export type { AuthorsGridProps } from './AuthorsGrid';
export { default as AuthorsExpertiseCloud } from './AuthorsExpertiseCloud';
export type {
  AuthorsExpertiseCloudProps,
  ExpertiseGroup,
} from './AuthorsExpertiseCloud';
export { default as AuthorsCTA } from './AuthorsCTA';
export type { AuthorsCTAProps } from './AuthorsCTA';

export { default as AuthorProfileHero } from './AuthorProfileHero';
export type {
  AuthorProfileHeroProps,
  AuthorProfileHeroAuthor,
} from './AuthorProfileHero';
export { default as AuthorPostsGrid } from './AuthorPostsGrid';
export type { AuthorPostsGridProps } from './AuthorPostsGrid';
export { default as AuthorRelated } from './AuthorRelated';
export type { AuthorRelatedProps } from './AuthorRelated';

export { default as AuthorCard } from './primitives/AuthorCard';
export type {
  AuthorCardProps,
  AuthorCardAuthor,
  AuthorCardVariant,
} from './primitives/AuthorCard';
export { default as AuthorAvatar } from './primitives/AuthorAvatar';
export type {
  AuthorAvatarProps,
  AuthorAvatarSize,
} from './primitives/AuthorAvatar';
export { default as AuthorStatPill } from './primitives/AuthorStatPill';
export type { AuthorStatPillProps } from './primitives/AuthorStatPill';
