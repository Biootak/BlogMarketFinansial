export const CACHE_CONFIG = {
  // تنظیمات عمومی
  DEFAULT_TTL: 1000 * 60 * 60, // یک ساعت
  MAX_ITEMS: 1000,
  
  // کلیدهای کش برای بخش‌های مختلف
  KEYS: {
    POSTS: {
      LIST: 'posts:list',
      DETAIL: (id: string) => `posts:${id}`,
      BY_CATEGORY: (categoryId: string) => `posts:category:${categoryId}`,
      FEATURED: 'posts:featured',
    },
    CATEGORIES: {
      LIST: 'categories:list',
      DETAIL: (id: string) => `categories:${id}`,
    },
    COMMENTS: {
      BY_POST: (postId: string) => `comments:post:${postId}`,
      RECENT: 'comments:recent',
    },
    USER: {
      PROFILE: (userId: string) => `user:${userId}`,
      PREFERENCES: (userId: string) => `user:preferences:${userId}`,
      DATA: (userId: string) => `user:data:${userId}`,
    },
    PUBLIC: {
      DATA: 'public:data',
      META: 'public:meta',
      SETTINGS: 'public:settings'
    },
    MARKET: {
      LIST: 'market:list',
      DETAIL: (symbol: string) => `market:${symbol}`,
      WATCHLIST: (userId: string) => `market:watchlist:${userId}`,
      ALERTS: (userId: string) => `market:alerts:${userId}`
    },
    HOME_PAGE: {
      BASIC_DATA: 'home:data',
      PAGE_DATA: 'home:page:data'
    }
  },
  
  // زمان‌های نگهداری متفاوت برای داده‌های مختلف
  TTL: {
    POSTS: 1000 * 60 * 60 * 2, // 2 ساعت
    CATEGORIES: 1000 * 60 * 60 * 24, // 24 ساعت
    COMMENTS: 1000 * 60 * 30, // 30 دقیقه
    USER_PROFILE: 1000 * 60 * 60 * 12, // 12 ساعت
    EXCHANGE_RATES: 1000 * 60 * 60, // 1 hour
    PUBLIC_DATA: 1000 * 60 * 60 * 24, // 24 ساعت
    MARKET_DATA: 1000 * 60 * 5, // 5 دقیقه - برای داده‌های بازار
  }
}
