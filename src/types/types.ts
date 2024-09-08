import { Prisma, type Role, type PostType, type PostStatus, type Category } from '@prisma/client';
import type { z } from 'zod';
import type {
  LoginSchema,
  ForgotPasswordSchema,
  MagicLinkSchema,
  CreatePostSchema,
  UpdatePostSchema,
  PostSchema,
  RegisterSchema,
  UpdateProfileSchema,
} from '@/schemas';

import type { IconType } from 'react-icons';

// Prisma Exact Types
const userWithRelations = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: {
    profile: {
      select: {
        jobName: true,
        userId: true,
        bgImage: true,
        avatar: true,
        bio: true,
      },
    },
    _count: {
      select: {
        posts: true,
      },
    },
  },
});

const basePostWithRelations = Prisma.validator<Prisma.PostDefaultArgs>()({
  include: {
    author: {
      include: { profile: true },
    },
    categories: true,
    tags: true,
    _count: {
      select: {
        comments: true,
        likes: true,
        savedBy: true,
        tags: true,
      },
    },
  },
});

const fullPostWithRelations = Prisma.validator<Prisma.PostDefaultArgs>()({
  include: {
    author: {
      include: { profile: true },
    },
    categories: true,
    tags: true,
    comments: {
      include: {
        author: true,
        replies: true,
        likes: true,
        _count: true,
      },
    },
    likes: true,
    savedBy: true,
    _count: {
      select: {
        comments: true,
        likes: true,
        savedBy: true,
        tags: true,
      },
    },
  },
});

const categoryWithPostCount = Prisma.validator<Prisma.CategoryDefaultArgs>()({
  include: {
    _count: {
      select: { posts: true },
    },
  },
});

const tagWithPostCount = Prisma.validator<Prisma.TagDefaultArgs>()({
  include: {
    _count: {
      select: { posts: true },
    },
  },
});

// Type Definitions
export type CommentWithCustomRelations = Prisma.CommentGetPayload<{
  include: {
    author: {
      select: {
        id: true;
        name: true;
        email: true;
        role: true;
        image: true;
        profile: true;
        createdAt: true;
        updatedAt: true;
      };
    };

    replies: true;
    likes: true;
    _count: {
      select: {
        likes: true;
      };
    };
  };
}>;

export type RelatedPostWithRelations = Prisma.PostGetPayload<{
  include: {
    author: {
      include: {
        profile?: true;
      };
    };
    categories: true;
    tags: true;
    _count: {
      select: {
        comments: true;
        likes: true;
        savedBy: true;
      };
    };
  };
}>;

export type UserProfile = {
  id: string;
  bio: string | null;
  avatar: string | null;
  bgImage: string | null;
  jobName: string | null;
  userId: string;
} | null;

export type UserWithRelations = Prisma.UserGetPayload<typeof userWithRelations>;

export type PostWithRelations = Prisma.PostGetPayload<typeof basePostWithRelations> & {
  comments?: CommentWithRelationsAndLikes[];
  likes?: Prisma.PostGetPayload<typeof fullPostWithRelations>['likes'];
  savedBy?: Prisma.PostGetPayload<typeof fullPostWithRelations>['savedBy'];
};

export type { Role, PostType, PostStatus };

export type SchemaInfer<T extends z.ZodType<any, any>> = z.infer<T>;
export type RegisterInput = SchemaInfer<typeof RegisterSchema>;
export type LoginInput = SchemaInfer<typeof LoginSchema>;
export type ForgotPasswordInput = SchemaInfer<typeof ForgotPasswordSchema>;
export type MagicLinkInput = SchemaInfer<typeof MagicLinkSchema>;
export type CreatePostInput = SchemaInfer<typeof CreatePostSchema>;
export type UpdatePostInput = SchemaInfer<typeof UpdatePostSchema>;

export type UserBase = Omit<UserWithRelations, 'password'> & {
  _count?: UserWithRelations['_count'];
};
export type UserWithProfile = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  role?: string;
  status?: string;
  profile: {
    bio: string | null;
    avatar: string | null;
    bgImage: string | null;
    jobName: string | null;
  } | null;
  _count?: {
    posts: number;
  };
};
export type CategoryWithPostCount = Prisma.CategoryGetPayload<typeof categoryWithPostCount>;
export type CategoryWithStringId = Omit<Category, 'id'> & { id: string };
export type TagWithPostCount = Prisma.TagGetPayload<typeof tagWithPostCount>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema> & {
  password?: string;
  bgimageUrl?: string;
};

export type TwMainColor =
  | 'pink'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red'
  | 'purple'
  | 'indigo'
  | 'gray';

export type TaxonomyType =
  | (CategoryWithPostCount & {
      taxonomy: 'category';
      color?: TwMainColor | string;
    })
  | (TagWithPostCount & {
      taxonomy: 'tag';
      color?: TwMainColor | string;
    });

export type LikeWithUser = Prisma.LikeGetPayload<{
  include: { user: true };
}>;

export type CommentWithRelationsAndLikes = CommentWithCustomRelations & {
  likes?: LikeWithUser[];
};

export type ActionResult<T = void, E = string> = {
  success: boolean;
  message: string;
  data?: T;
  error?: E;
  variant?: 'success' | 'destructive' | 'warning' | 'info';
};

export type PaginationParams = {
  page: number;
  limit: number;
};

export type SortOrder = 'asc' | 'desc';

export type PostFilters = Partial<{
  categoryId: string;
  tagId: string;
  authorId: string;
  postType: PostType;
  isFeatured: boolean;
}>;

export interface State {
  posts: PostWithRelations[];
  currentPage: number;
  hasNextPage: boolean;
  searchTerm: string;
  isLoading: boolean;
  error: string | null;
}

export type AdSize = 'SMALL' | 'MEDIUM' | 'LARGE';

export type Advertisement = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  linkUrl: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  size: AdSize;
  createdAt: Date;
  updatedAt: Date;
};

export interface SocialType {
  id: string;
  name: string;
  icon: IconType;
  href: string;
  color: string;
}

export interface NcDropDownItem {
  id: string;
  name: string;
  icon: IconType;
  onClick?: () => void;
}

export interface SearchParamsType {
  q?: string;
  tab?: string;
  page?: string;
}

export type SearchResult = {
  id: string;
  title: string;
  href: string;
  type: 'post' | 'category' | 'author';
  avatar?: string | null;
};

export interface ExchangeRate {
  symbol: string;
  name: string;
  rate: number;
  change: number;
}

export interface ExchangeRatesResult {
  success: boolean;
  message: string;
  data?: ExchangeRate[];
  error?: string;
}

export type Action =
  | { type: 'FETCH_POSTS_START' }
  | { type: 'FETCH_POSTS_SUCCESS'; payload: { posts: PostWithRelations[]; hasNextPage: boolean } }
  | { type: 'FETCH_POSTS_FAILURE'; payload: string }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'DELETE_POST'; payload: string }
  | { type: 'UPDATE_POST_STATUS'; payload: { id: string; published: boolean } };
