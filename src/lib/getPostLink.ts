import { PostType } from '@prisma/client';

export function getPostLink(postType: PostType, slug: string): string {
  switch (postType) {
    case PostType.GALLERY:
      return `/single-gallery/${slug}`;
    case PostType.VIDEO:
      return `/single-video/${slug}`;
    case PostType.AUDIO:
      return `/single-audio/${slug}`;
    default:
      return `/single/${slug}`;
  }
}
