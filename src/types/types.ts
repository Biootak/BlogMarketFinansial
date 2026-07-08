// types.ts

import type {
  CreatePostSchema,
  ForgotPasswordSchema,
  LoginSchema,
  MagicLinkSchema,
  PostSchema,
  RegisterSchema,
  UpdatePostSchema,
  UpdateProfileSchema,
} from '@/schemas';
import {
  type Category,
  type Post,
  type PostStatus,
  type PostType,
  Prisma,
  type Role,
  type Tag,
  type User,
} from '@prisma/client';
import type { IconType } from 'react-icons';
import type { z } from 'zod';

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

const categoryWithRelations = Prisma.validator<Prisma.CategoryDefaultArgs>()({
  include: {
    parentCategories: true,
    _count: {
      select: { posts: true },
    },
    childCategories: {
      include: {
        _count: {
          select: { posts: true },
        },
      },
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
        email: false;
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
  phoneNumber?: string | null;
  userId: string;
} | null;

export type UserWithRelations = Prisma.UserGetPayload<typeof userWithRelations>;

export type PostWithRelations = Prisma.PostGetPayload<typeof basePostWithRelations> & {
  comments?: CommentWithRelationsAndLikes[];
  likes?: Prisma.PostGetPayload<typeof fullPostWithRelations>['likes'];
  savedBy?: Prisma.PostGetPayload<typeof fullPostWithRelations>['savedBy'];
};

export type { PostType, PostStatus, Role } from '@prisma/client';

export type SchemaInfer<T extends z.ZodType<any, any>> = z.infer<T>;
export type RegisterInput = SchemaInfer<typeof RegisterSchema>;
export type LoginInput = SchemaInfer<typeof LoginSchema>;
export type ForgotPasswordInput = SchemaInfer<typeof ForgotPasswordSchema>;
export type MagicLinkInput = SchemaInfer<typeof MagicLinkSchema>;
export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;

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
  phoneNumber: string | null;
  profile: {
    bio: string | null;
    avatar: string | null;
    bgImage: string | null;
    jobName: string | null;
    company: string | null;
  } | null;
  _count?: {
    posts: number;
  };
};

export type CategoryWithRelations = Prisma.CategoryGetPayload<typeof categoryWithRelations>;
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

export type TaxonomyType = {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  // 2026-06-21: ابعاد thumbnail برای CLS-safe رندر + انتخاب variant
  thumbnailWidth?: number | null;
  thumbnailHeight?: number | null;
  taxonomy: 'category' | 'subcategory' | 'tag';
  color?: TwMainColor | string;
  count: number;
  childCategories?: TaxonomyType[];
  parentCategories?: Omit<TaxonomyType, 'childCategories' | 'parentCategories'>[];
  createdAt: Date;
  updatedAt: Date;
};

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
  meta?: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
};

export type CategoryActionResult = ActionResult<TaxonomyType>;

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

export type AdSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM';

export type AdPosition =
  | 'HEADER'
  | 'FOOTER'
  | 'SIDEBAR'
  | 'IN_CONTENT'
  | 'BETWEEN_POSTS'
  | 'CUSTOM';

export type CustomAdDimensions = {
  width?: string;
  height?: string;
  aspectRatio?: string;
};

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
  position: AdPosition;
  customPosition: string | null;
  order: number;
  customDimensions: Prisma.JsonValue | null;
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

/**
 * CryptoTickerRate — یک ردیف نرخ لحظه‌ای کریپتو از Exir.
 *
 * نکته: این تایپ **اختصاصی** داده‌های Exir (نوار بالای هوم) است و
 * ربطی به مدل Prisma `ExchangeRate` (نرخ‌های صرافی/طلای ادمین) ندارد.
 * قبلاً با نام `ExchangeRate` گیج‌کننده بود؛ rename شد تا با
 * `ExchangeRateData` (که از DB می‌آید) و کلاس‌های CSS
 * `nc-SectionExchangeRates` تداخل پیدا نکنه.
 */
export interface CryptoTickerRate {
  symbol: string;
  usdtPrice: number;
  irrPrice: number;
  change: number;
  globalPrice?: number;
}

export interface CryptoTickerResult {
  success: boolean;
  message: string;
  data?: CryptoTickerRate[];
  error?: string;
}

// for data money-transfer
export type RateType = 'BUY_SELL' | 'SINGLE_BULK';

/** گروه‌بندی semantic نرخ‌ها — برای فیلتر کردن forex/afghan/gold/coin.
 *  مقادیر در seed به‌صورت lowercase ذخیره می‌شوند. */
export type ExchangeRateGroup = 'iran-forex' | 'afghan' | 'gold' | 'coin' | 'global' | (string & {});

export interface ExchangeRateData {
  id: string;
  name: string;
  /** کد ارز (مثلاً "USD") — در forex معمولاً برابر symbol است ولی در
   *  gold/coin متفاوت است. */
  currency: string;
  /** registry symbol — مثلاً "IRAN_USD" / "AFGHANI_AFN" / "GOLD_18K".
   *  2026-06-20 اضافه شد. به‌عنوان unique key ثانویه عمل می‌کند. */
  symbol?: string | null;
  /** نام فارسی برای نمایش در UI (مثلاً «دلار تهران»).
   *  متمایز از `name` (که technical slug انگلیسی است). */
  displayNameFa?: string | null;
  /** semantic group — نوع دارایی را برای فیلتر UI مشخص می‌کند. */
  group?: ExchangeRateGroup | null;
  /** واحد — مثلاً "currency" یا "gram". فقط برای نمایش. */
  unit?: string | null;
  /** ضریب تقسیم برای نرخ‌هایی که در DB با مقیاس بزرگ‌تر ثبت می‌شوند
   *  (مثلاً قیمت طلا به ریال که باید ÷10 شود تا تومان شود). */
  divisor?: number | null;
  /** تعداد ارقام اعشار برای نمایش. */
  decimals?: number | null;
  /** اولویت نمایش (کمتر = بالاتر). */
  priority?: number | null;
  /** منبع داده — "auto" برای TGJU/USDT و غیره. */
  provider?: string;
  /** کلید TGJU برای provider="auto". */
  tgjuKey?: string | null;
  /** آیا این رکورد فعال است و در UI نمایش داده شود؟ */
  active?: boolean;
  rateType: RateType;
  buyRate: string | null;
  sellRate: string | null;
  singleRate: string | null;
  bulkRate: string | null;
  imageUrl: string | null;
  manualNote?: string | null;
  updatedAt: Date;
  createdAt: Date;
  description: string | null;
}

export type Action =
  | { type: 'FETCH_POSTS_START' }
  | { type: 'FETCH_POSTS_SUCCESS'; payload: { posts: PostWithRelations[]; hasNextPage: boolean } }
  | { type: 'FETCH_POSTS_FAILURE'; payload: string }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'DELETE_POST'; payload: string }
  | { type: 'UPDATE_POST_STATUS'; payload: { id: string; published: boolean } };

export type CreateCategoryInput = {
  name: string;
  slug: string;
  parentIds: string[];
  thumbnail: string | null;
  // 2026-06-21: ابعاد thumbnail برای CLS-safe رندر
  thumbnailWidth?: number | null;
  thumbnailHeight?: number | null;
};

export type UpdateCategoryInput = CreateCategoryInput & {};

export type CategoryWithPostCount = Prisma.CategoryGetPayload<{
  include: {
    _count: {
      select: { posts: true };
    };
    childCategories: {
      include: {
        _count: {
          select: { posts: true };
        };
      };
    };
  };
}>;

export type CategoryWithParent = {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  parentId: string | null;
  parentCategory: CategoryWithParent | null;
};

export type SearchResultItem = Post | Category | Tag | User;

export interface SearchResultData {
  posts: SearchResultItem[];
  total: number;
  pages: number;
}
export type SearchActionResult = ActionResult<SearchResultData>;

// Header Ticker Item — نوار بالای Header که crypto + DB rates را mixed نشان می‌دهد.
// قبلاً به‌صورت inline در src/components/Header/TickerBar.tsx تعریف شده بود
// (anti-pattern: domain type در لایه UI). 2026-06-20 منتقل شد.
export interface HeaderTickerItem {
  id: string;
  name: string;
  symbol?: string;
  value: string;
  change?: number;
}

// Rate List Types
export interface RateItem {
  title: string;
  value: string;
}

export interface RateListData {
  id: string;
  title: string;
  rates: RateItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type RateList = RateListData;

export type Rate = {
  type: string; // نوع ارز یا عنوان نرخ (مثلا "دلار"، "50 افغانی")
  buyRate?: string; // نرخ خرید (برای سرای شاهزاده)
  sellRate?: string; // نرخ فروش (برای سرای شاهزاده)
  value?: string; // مقدار تکی (برای کردیت کارت و نرخ تهران)
};

export interface SidebarData {
  recentPosts: PostWithRelations[];
  popularTags: TaxonomyType[];
  popularCategories: TaxonomyType[];
  popularAuthors: UserWithProfile[];
  ads: Advertisement[];
}

export interface NcDropDownItem {
  id: string;
  name: string;
  icon: IconType;
  onClick?: () => void;
}
