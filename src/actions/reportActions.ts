'use server';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import db from '@/lib/db';
import { DEFAULT_CACHE_TTL, generateReportCacheKey, reportCache } from '@/lib/reportCache';
import { revalidatePath } from 'next/cache';

interface UserStats {
  total: number;
  active: number;
  newThisMonth: number;
  roleDistribution: Array<{ name: string; value: number }>;
}

interface PostStats {
  total: number;
  published: number;
  draft?: number;
  monthlyPosts?: Array<{ month: string; count: number }>;
}

interface CommentStats {
  total: number;
  pending: number;
  monthly?: Array<{ month: string; count: number }>;
}

interface ViewStats {
  total: number;
  today: number;
  monthly?: Array<{ month: string; count: number }>;
  topPosts?: Array<{ title: string; views: number }>;
}

interface SystemReport {
  userStats: UserStats;
  postStats: PostStats;
  commentStats: CommentStats;
  viewStats: ViewStats;
  systemStatus: SystemStatus;
  activity?: Activity[];
}

interface SystemStatus {
  cpu?: {
    usage: number;
    temperature?: number;
  };
  memory?: {
    total: number;
    used: number;
    free: number;
  };
  disk?: {
    total: number;
    used: number;
    free: number;
  };
  database?: {
    status: 'online' | 'offline' | 'error';
    connections: number;
    queryTime: number;
  };
  cache?: {
    status: 'online' | 'offline';
    hitRate: number;
  };
  lastUpdate?: string;
}

interface Activity {
  id: string;
  userEmail: string;
  action: string;
  details: string;
  createdAt: string;
}

interface SystemLog {
  id: string;
  level: string;
  message: string;
  source: string;
  timestamp: Date;
}

interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

// New interfaces for comprehensive reporting
export interface KPIData {
  totalUsers: number;
  userGrowth: number; // percentage
  totalPosts: {
    published: number;
    draft: number;
    pending: number;
  };
  pageViews: number;
  engagementRate: number; // percentage
}

export interface TopPost {
  id: string;
  title: string;
  slug: string;
  author: {
    name: string | null;
    id: string;
  };
  views: number;
  likes: number;
  comments: number;
  saves: number;
  publishedAt: Date | null;
}

export interface TopAuthor {
  id: string;
  name: string | null;
  email: string;
  postCount: number;
  totalViews: number;
  averageViews: number;
}

export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  postCount: number;
  percentage: number;
}

export interface TrendData {
  date: string; // ISO date
  views: number;
  likes: number;
  comments: number;
  saves: number;
}

export interface ReportData {
  kpis: KPIData;
  topPosts: TopPost[];
  topAuthors: TopAuthor[];
  categories: CategoryStat[];
  trends: TrendData[];
  comparison?: {
    userGrowth: number;
    viewGrowth: number;
    engagementGrowth: number;
  };
}

export async function checkReportAccess() {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error('No user email found');
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });

  if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    throw new Error('شما دسترسی لازم برای مشاهده گزارش‌ها را ندارید');
  }
}

export async function getSystemReports(from?: Date, to?: Date) {
  try {
    await checkReportAccess();

    const dateFilter =
      from && to
        ? {
            createdAt: {
              gte: from,
              lte: to,
            },
          }
        : {};

    const [
      userStatsResult,
      postStatsResult,
      commentStatsResult,
      viewStatsResult,
      systemStatusResult,
    ] = await Promise.all([
      // آمار کاربران
      (async () => {
        const result = await prisma.user.aggregate({
          where: dateFilter,
          _count: {
            id: true,
          },
        });

        const newThisMonth = await prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        });

        const active = await prisma.user.count({ where: { status: 'Active' } });

        const roleDistribution = await prisma.user
          .groupBy({
            by: ['role'],
            _count: { id: true },
          })
          .then((roles) =>
            roles.map((r) => ({
              name: r.role,
              value: r._count.id,
            })),
          );

        return {
          total: result._count.id,
          active,
          newThisMonth,
          roleDistribution,
        };
      })(),

      // آمار پست‌ها
      (async () => {
        const result = await prisma.post.aggregate({
          where: dateFilter,
          _count: {
            id: true,
          },
        });

        const published = await prisma.post.count({
          where: {
            ...dateFilter,
            status: 'PUBLISHED',
          },
        });

        return {
          total: result._count.id,
          published,
        };
      })(),

      // آمار نظرات
      (async () => {
        const result = await prisma.comment.aggregate({
          where: dateFilter,
          _count: {
            id: true,
          },
        });

        const pending = await prisma.comment.count({
          where: {
            ...dateFilter,
            approved: false,
          },
        });

        return {
          total: result._count.id,
          pending,
        };
      })(),

      // آمار بازدیدها
      (async () => {
        const result = await prisma.view.aggregate({
          where: dateFilter,
          _count: {
            id: true,
          },
        });

        const today = await prisma.view.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        });

        return {
          total: result._count.id,
          today,
        };
      })(),

      // وضعیت سیستم
      getSystemStatus(),
    ]);

    const userStats = userStatsResult;
    const postStats = postStatsResult;
    const commentStats = commentStatsResult;
    const viewStats = viewStatsResult;
    const systemStatus = systemStatusResult.data || {
      cpu: { usage: 0 },
      memory: { total: 0, used: 0, free: 0 },
      disk: { total: 0, used: 0, free: 0 },
      database: { status: 'offline', connections: 0, queryTime: 0 },
      cache: { status: 'offline', hitRate: 0 },
    };

    const data: SystemReport = {
      userStats,
      postStats,
      commentStats,
      viewStats,
      systemStatus,
    };

    revalidatePath('/dashboard/reports');
    return { success: true, data };
  } catch (error) {
    console.error('Error in getSystemReports:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت گزارش‌های سیستم',
    };
  }
}

export const getSystemStatus = async (): Promise<ActionResult<SystemStatus>> => {
  'use server';

  try {
    await checkReportAccess();

    const status: SystemStatus = {
      cpu: {
        usage: Math.random() * 100, // این مقدار باید از سیستم واقعی خوانده شود
      },
      memory: {
        total: 16384, // 16GB
        used: 8192, // 8GB
        free: 8192, // 8GB
      },
      disk: {
        total: 512000, // 500GB
        used: 256000, // 250GB
        free: 256000, // 250GB
      },
      database: {
        status: 'online',
        connections: 5,
        queryTime: 100,
      },
      cache: {
        status: 'online',
        hitRate: 0.85,
      },
      lastUpdate: new Date().toISOString(),
    };

    return { success: true, data: status };
  } catch (error) {
    console.error('Error in getSystemStatus:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت وضعیت سیستم',
    };
  }
};

export const getActivityLog = async (): Promise<ActionResult<Activity[]>> => {
  'use server';

  try {
    await checkReportAccess();

    const activities = await db.activity.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      select: {
        id: true,
        user: {
          select: {
            email: true,
          },
        },
        action: true,
        details: true,
        createdAt: true,
      },
    });

    const formattedActivities = activities.map((activity) => ({
      id: activity.id,
      userEmail: activity.user.email,
      action: activity.action,
      details: activity.details,
      createdAt: activity.createdAt.toISOString(),
    }));

    return { success: true, data: formattedActivities };
  } catch (error) {
    console.error('Error in getActivityLog:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت لاگ فعالیت‌ها',
    };
  }
};

export async function getSystemLogs(
  page = 1,
  limit = 10,
  level?: string,
): Promise<ActionResult<{ logs: SystemLog[]; total: number }>> {
  try {
    await checkReportAccess();

    const skip = (page - 1) * limit;
    const where = level ? { level } : {};

    const [logs, total] = await Promise.all([
      db.systemLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip,
      }),
      db.systemLog.count({ where }),
    ]);

    return {
      success: true,
      data: { logs, total },
    };
  } catch (error) {
    console.error('Error fetching system logs:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت لاگ‌های سیستم',
    };
  }
}

/**
 * Log performance warning for slow queries
 */
async function logPerformanceWarning(queryName: string, duration: number) {
  if (duration > 3000) {
    // Log to system logs
    await db.systemLog.create({
      data: {
        level: 'WARNING',
        message: `Slow query detected: ${queryName} took ${duration}ms`,
        source: 'reportActions',
      },
    });
  }
}

/**
 * Get comprehensive report data with caching
 */
export async function getReportData(
  dateRange: { from: Date; to: Date },
  userId?: string,
): Promise<ActionResult<ReportData>> {
  const startTime = Date.now();

  try {
    await checkReportAccess();

    // Generate cache key
    const cacheKey = generateReportCacheKey(userId, dateRange.from, dateRange.to);

    // Check if this is "all time" query (more than 1 year)
    const daysDiff = Math.ceil(
      (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24),
    );
    const isAllTime = daysDiff > 365;

    // Use longer cache for "all time" queries (1 hour instead of 5 minutes)
    const cacheTTL = isAllTime ? 3600 * 1000 : DEFAULT_CACHE_TTL; // Convert to milliseconds

    // Check cache first
    const cachedData = reportCache.get<ReportData>(cacheKey);
    if (cachedData) {
      return { success: true, data: cachedData };
    }

    // Calculate KPIs
    const kpisStart = Date.now();
    const kpis = await calculateKPIs(dateRange);
    await logPerformanceWarning('calculateKPIs', Date.now() - kpisStart);

    // Get top posts
    const postsStart = Date.now();
    const topPosts = await getTopPostsData(dateRange, 10);
    await logPerformanceWarning('getTopPostsData', Date.now() - postsStart);

    // Get top authors
    const authorsStart = Date.now();
    const topAuthors = await getTopAuthorsData(dateRange, 10);
    await logPerformanceWarning('getTopAuthorsData', Date.now() - authorsStart);

    // Get category stats
    const categoriesStart = Date.now();
    const categories = await getCategoryStatsData(dateRange);
    await logPerformanceWarning('getCategoryStatsData', Date.now() - categoriesStart);

    // Get trend data
    const trendsStart = Date.now();
    const trends = await getTrendDataByRange(dateRange);
    await logPerformanceWarning('getTrendDataByRange', Date.now() - trendsStart);

    const reportData: ReportData = {
      kpis,
      topPosts,
      topAuthors,
      categories,
      trends,
    };

    // Cache the result (longer TTL for all-time queries)
    reportCache.set(cacheKey, reportData, cacheTTL);

    // Log total time
    const totalDuration = Date.now() - startTime;
    await logPerformanceWarning('getReportData (total)', totalDuration);

    return { success: true, data: reportData };
  } catch (error) {
    console.error('Error in getReportData:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت گزارش‌ها',
    };
  }
}

/**
 * Calculate KPI metrics
 */
async function calculateKPIs(dateRange: { from: Date; to: Date }): Promise<KPIData> {
  const { from, to } = dateRange;

  // Calculate previous period for growth comparison
  const periodDuration = to.getTime() - from.getTime();
  const previousFrom = new Date(from.getTime() - periodDuration);
  const previousTo = from;

  const [
    currentUsers,
    previousUsers,
    publishedPosts,
    draftPosts,
    pendingPosts,
    pageViews,
    totalLikes,
    totalComments,
    totalSaves,
  ] = await Promise.all([
    // Current period users
    db.user.count({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
    }),
    // Previous period users for growth calculation
    db.user.count({
      where: {
        createdAt: {
          gte: previousFrom,
          lt: previousTo,
        },
      },
    }),
    // Published posts
    db.post.count({
      where: {
        status: 'PUBLISHED',
        createdAt: {
          gte: from,
          lte: to,
        },
      },
    }),
    // Draft posts
    db.post.count({
      where: {
        status: 'DRAFT',
        createdAt: {
          gte: from,
          lte: to,
        },
      },
    }),
    // Pending posts
    db.post.count({
      where: {
        status: 'PENDING_REVIEW',
        createdAt: {
          gte: from,
          lte: to,
        },
      },
    }),
    // Total page views - کل بازدیدها (همه زمان‌ها)
    // توجه: Post.viewCount یک counter کلی است و قابل فیلتر زمانی نیست
    db.post
      .aggregate({
        where: { status: 'PUBLISHED' },
        _sum: { viewCount: true },
      })
      .then((result) => result._sum?.viewCount || 0),
    // Total likes
    db.like.count({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
    }),
    // Total comments
    db.comment.count({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
    }),
    // Total saves
    db.savedPost.count({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
    }),
  ]);

  // Calculate user growth percentage
  const userGrowth = previousUsers > 0 ? ((currentUsers - previousUsers) / previousUsers) * 100 : 0;

  // Calculate engagement rate
  const totalEngagements = totalLikes + totalComments + totalSaves;
  const engagementRate = pageViews > 0 ? (totalEngagements / pageViews) * 100 : 0;

  // Get total users (all time)
  const totalUsers = await db.user.count();

  return {
    totalUsers,
    userGrowth: Math.round(userGrowth * 100) / 100, // Round to 2 decimal places
    totalPosts: {
      published: publishedPosts,
      draft: draftPosts,
      pending: pendingPosts,
    },
    pageViews,
    engagementRate: Math.round(engagementRate * 100) / 100,
  };
}

/**
 * Get top posts by view count
 */
async function getTopPostsData(
  dateRange: { from: Date; to: Date },
  limit = 10,
): Promise<TopPost[]> {
  // Get posts with their viewCount
  const posts = await db.post.findMany({
    where: {
      status: 'PUBLISHED',
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      viewCount: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      viewCount: 'desc',
    },
    take: limit,
  });

  // Get engagement metrics for each post
  const postsWithMetrics = await Promise.all(
    posts.map(async (post) => {
      const [likes, comments, saves] = await Promise.all([
        db.like.count({
          where: {
            postId: post.id,
            createdAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          },
        }),
        db.comment.count({
          where: {
            postId: post.id,
            createdAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          },
        }),
        db.savedPost.count({
          where: {
            postId: post.id,
            createdAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          },
        }),
      ]);

      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        author: post.author,
        views: post.viewCount,
        likes,
        comments,
        saves,
        publishedAt: post.createdAt,
      };
    }),
  );

  return postsWithMetrics;
}

/**
 * Get top authors by total views
 */
async function getTopAuthorsData(
  dateRange: { from: Date; to: Date },
  limit = 10,
): Promise<TopAuthor[]> {
  // Get all authors with published posts
  const authors = await db.user.findMany({
    where: {
      posts: {
        some: {
          status: 'PUBLISHED',
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  // Calculate stats for each author
  const authorsWithStats = await Promise.all(
    authors.map(async (author) => {
      // Get published posts by this author
      const posts = await db.post.findMany({
        where: {
          authorId: author.id,
          status: 'PUBLISHED',
          createdAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
        select: {
          id: true,
          viewCount: true,
        },
      });

      const postCount = posts.length;

      // Get total views for these posts from viewCount field
      const totalViews = posts.reduce((sum, post) => sum + post.viewCount, 0);

      const averageViews = postCount > 0 ? totalViews / postCount : 0;

      return {
        id: author.id,
        name: author.name,
        email: author.email,
        postCount,
        totalViews,
        averageViews: Math.round(averageViews * 100) / 100,
      };
    }),
  );

  // Filter out authors with no posts in the period and sort by total views
  return authorsWithStats
    .filter((author) => author.postCount > 0)
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, limit);
}

/**
 * Get category distribution stats
 */
async function getCategoryStatsData(dateRange: { from: Date; to: Date }): Promise<CategoryStat[]> {
  const categories = await db.category.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  // Get total published posts in the period
  const totalPosts = await db.post.count({
    where: {
      status: 'PUBLISHED',
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    },
  });

  // Calculate post count for each category
  const categoryStats = await Promise.all(
    categories.map(async (category) => {
      const postCount = await db.post.count({
        where: {
          status: 'PUBLISHED',
          createdAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
          categories: {
            some: {
              id: category.id,
            },
          },
        },
      });

      const percentage = totalPosts > 0 ? (postCount / totalPosts) * 100 : 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        postCount,
        percentage: Math.round(percentage * 100) / 100,
      };
    }),
  );

  return categoryStats
    .filter((cat) => cat.postCount > 0) // Only include categories with posts
    .sort((a, b) => b.postCount - a.postCount); // Sort by post count
}

/**
 * Get trend data aggregated by day or week
 */
async function getTrendDataByRange(dateRange: { from: Date; to: Date }): Promise<TrendData[]> {
  const { from, to } = dateRange;
  const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

  // For very large ranges (> 365 days), use monthly aggregation
  if (daysDiff > 365) {
    return getTrendDataMonthly(from, to);
  }

  // Use weekly aggregation for ranges > 90 days
  if (daysDiff > 90) {
    return getTrendDataWeekly(from, to);
  }

  // Use daily for smaller ranges
  return getTrendDataDaily(from, to);
}

/**
 * Get daily trend data
 */
async function getTrendDataDaily(from: Date, to: Date): Promise<TrendData[]> {
  const trends: TrendData[] = [];
  const currentDate = new Date(from);

  while (currentDate <= to) {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const [views, likes, comments, saves] = await Promise.all([
      // Sum viewCount from posts created in this period
      db.post
        .aggregate({
          where: {
            status: 'PUBLISHED',
            createdAt: {
              gte: currentDate,
              lt: nextDate,
            },
          },
          _sum: {
            viewCount: true,
          },
        })
        .then((result) => result._sum?.viewCount || 0),
      db.like.count({
        where: {
          createdAt: {
            gte: currentDate,
            lt: nextDate,
          },
        },
      }),
      db.comment.count({
        where: {
          createdAt: {
            gte: currentDate,
            lt: nextDate,
          },
        },
      }),
      db.savedPost.count({
        where: {
          createdAt: {
            gte: currentDate,
            lt: nextDate,
          },
        },
      }),
    ]);

    trends.push({
      date: currentDate.toISOString().split('T')[0],
      views,
      likes,
      comments,
      saves,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return trends;
}

/**
 * Get monthly trend data (for very large date ranges)
 */
async function getTrendDataMonthly(from: Date, to: Date): Promise<TrendData[]> {
  const trends: TrendData[] = [];
  const currentDate = new Date(from.getFullYear(), from.getMonth(), 1);
  const endDate = new Date(to.getFullYear(), to.getMonth(), 1);

  while (currentDate <= endDate) {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);

    const [views, likes, comments, saves] = await Promise.all([
      // Sum viewCount from posts created in this month
      db.post
        .aggregate({
          where: {
            status: 'PUBLISHED',
            createdAt: {
              gte: currentDate,
              lt: nextDate,
            },
          },
          _sum: {
            viewCount: true,
          },
        })
        .then((result) => result._sum?.viewCount || 0),
      db.like.count({
        where: {
          createdAt: {
            gte: currentDate,
            lt: nextDate,
          },
        },
      }),
      db.comment.count({
        where: {
          createdAt: {
            gte: currentDate,
            lt: nextDate,
          },
        },
      }),
      db.savedPost.count({
        where: {
          createdAt: {
            gte: currentDate,
            lt: nextDate,
          },
        },
      }),
    ]);

    trends.push({
      date: currentDate.toISOString().split('T')[0],
      views,
      likes,
      comments,
      saves,
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return trends;
}

/**
 * Get weekly trend data
 */
async function getTrendDataWeekly(from: Date, to: Date): Promise<TrendData[]> {
  const trends: TrendData[] = [];
  const currentDate = new Date(from);

  while (currentDate <= to) {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 7);

    const [views, likes, comments, saves] = await Promise.all([
      // Sum viewCount from posts created in this period
      db.post
        .aggregate({
          where: {
            status: 'PUBLISHED',
            createdAt: {
              gte: currentDate,
              lt: nextDate,
            },
          },
          _sum: {
            viewCount: true,
          },
        })
        .then((result) => result._sum?.viewCount || 0),
      db.like.count({
        where: {
          createdAt: {
            gte: currentDate,
            lt: nextDate,
          },
        },
      }),
      db.comment.count({
        where: {
          createdAt: {
            gte: currentDate,
            lt: nextDate,
          },
        },
      }),
      db.savedPost.count({
        where: {
          createdAt: {
            gte: currentDate,
            lt: nextDate,
          },
        },
      }),
    ]);

    trends.push({
      date: currentDate.toISOString().split('T')[0],
      views,
      likes,
      comments,
      saves,
    });

    currentDate.setDate(currentDate.getDate() + 7);
  }

  return trends;
}

/**
 * Get user analytics data
 */
export async function getUserAnalytics(dateRange: { from: Date; to: Date }): Promise<
  ActionResult<{
    newUsers: number;
    growthTrend: number;
    activeUsers: number;
    roleDistribution: Array<{ role: string; count: number }>;
  }>
> {
  try {
    await checkReportAccess();

    const { from, to } = dateRange;

    // Calculate previous period for growth comparison
    const periodDuration = to.getTime() - from.getTime();
    const previousFrom = new Date(from.getTime() - periodDuration);
    const previousTo = from;

    const [newUsers, previousNewUsers, activeUsers, roleDistribution] = await Promise.all([
      // New users in current period
      db.user.count({
        where: {
          createdAt: {
            gte: from,
            lte: to,
          },
        },
      }),
      // New users in previous period
      db.user.count({
        where: {
          createdAt: {
            gte: previousFrom,
            lt: previousTo,
          },
        },
      }),
      // Active users (users who performed any action in the period)
      db.user.count({
        where: {
          OR: [
            {
              posts: {
                some: {
                  createdAt: {
                    gte: from,
                    lte: to,
                  },
                },
              },
            },
            {
              comments: {
                some: {
                  createdAt: {
                    gte: from,
                    lte: to,
                  },
                },
              },
            },
            {
              likes: {
                some: {
                  createdAt: {
                    gte: from,
                    lte: to,
                  },
                },
              },
            },
          ],
        },
      }),
      // Role distribution
      db.user.groupBy({
        by: ['role'],
        _count: {
          id: true,
        },
      }),
    ]);

    const growthTrend =
      previousNewUsers > 0 ? ((newUsers - previousNewUsers) / previousNewUsers) * 100 : 0;

    const roleStats = roleDistribution.map((item) => ({
      role: item.role,
      count: item._count.id,
    }));

    return {
      success: true,
      data: {
        newUsers,
        growthTrend: Math.round(growthTrend * 100) / 100,
        activeUsers,
        roleDistribution: roleStats,
      },
    };
  } catch (error) {
    console.error('Error in getUserAnalytics:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت آمار کاربران',
    };
  }
}

/**
 * Get author-specific analytics
 */
export async function getAuthorAnalytics(
  authorId: string,
  dateRange: { from: Date; to: Date },
): Promise<
  ActionResult<{
    totalViews: number;
    engagementRate: number;
    topPosts: TopPost[];
    postCount: number;
  }>
> {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      throw new Error('No user email found');
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Authors can only see their own analytics
    if (user.role === 'AUTHOR' && user.id !== authorId) {
      throw new Error('Unauthorized: Can only view your own analytics');
    }

    // Admins can view any author's analytics
    if (!['ADMIN', 'SUPER_ADMIN', 'AUTHOR'].includes(user.role)) {
      throw new Error('Unauthorized: Insufficient permissions');
    }

    // Get author's posts
    const posts = await db.post.findMany({
      where: {
        authorId,
        status: 'PUBLISHED',
        createdAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
      select: {
        id: true,
        viewCount: true,
      },
    });

    const postIds = posts.map((p) => p.id);
    const postCount = posts.length;

    if (postCount === 0) {
      return {
        success: true,
        data: {
          totalViews: 0,
          engagementRate: 0,
          topPosts: [],
          postCount: 0,
        },
      };
    }

    // Get total views from viewCount field
    const totalViews = posts.reduce((sum, post) => sum + post.viewCount, 0);

    // Get engagement metrics
    const [totalLikes, totalComments, totalSaves] = await Promise.all([
      db.like.count({
        where: {
          postId: {
            in: postIds,
          },
          createdAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
      }),
      db.comment.count({
        where: {
          postId: {
            in: postIds,
          },
          createdAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
      }),
      db.savedPost.count({
        where: {
          postId: {
            in: postIds,
          },
          createdAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
      }),
    ]);

    // Calculate engagement rate
    const totalEngagements = totalLikes + totalComments + totalSaves;
    const engagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

    // Get top posts for this author
    const topPosts = await getTopPostsData(dateRange, 10);
    const authorTopPosts = topPosts.filter((post) => post.author.id === authorId);

    return {
      success: true,
      data: {
        totalViews,
        engagementRate: Math.round(engagementRate * 100) / 100,
        topPosts: authorTopPosts,
        postCount,
      },
    };
  } catch (error) {
    console.error('Error in getAuthorAnalytics:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت آمار نویسنده',
    };
  }
}

/**
 * Get comparison data between current and previous period
 */
export async function getComparisonData(dateRange: { from: Date; to: Date }): Promise<
  ActionResult<{
    userGrowth: number;
    viewGrowth: number;
    engagementGrowth: number;
  }>
> {
  try {
    await checkReportAccess();

    const { from, to } = dateRange;

    // Calculate previous period with equal duration
    const periodDuration = to.getTime() - from.getTime();
    const previousFrom = new Date(from.getTime() - periodDuration);
    const previousTo = from;

    const [
      currentUsers,
      previousUsers,
      currentViews,
      previousViews,
      currentEngagements,
      previousEngagements,
    ] = await Promise.all([
      // Current period users
      db.user.count({
        where: {
          createdAt: {
            gte: from,
            lte: to,
          },
        },
      }),
      // Previous period users
      db.user.count({
        where: {
          createdAt: {
            gte: previousFrom,
            lt: previousTo,
          },
        },
      }),
      // Current period views
      db.post
        .aggregate({
          where: {
            status: 'PUBLISHED',
            createdAt: {
              gte: from,
              lte: to,
            },
          },
          _sum: {
            viewCount: true,
          },
        })
        .then((result) => result._sum.viewCount || 0),
      // Previous period views
      db.post
        .aggregate({
          where: {
            status: 'PUBLISHED',
            createdAt: {
              gte: previousFrom,
              lt: previousTo,
            },
          },
          _sum: {
            viewCount: true,
          },
        })
        .then((result) => result._sum.viewCount || 0),
      // Current period engagements (likes + comments + saves)
      Promise.all([
        db.like.count({
          where: {
            createdAt: {
              gte: from,
              lte: to,
            },
          },
        }),
        db.comment.count({
          where: {
            createdAt: {
              gte: from,
              lte: to,
            },
          },
        }),
        db.savedPost.count({
          where: {
            createdAt: {
              gte: from,
              lte: to,
            },
          },
        }),
      ]).then(([likes, comments, saves]) => likes + comments + saves),
      // Previous period engagements
      Promise.all([
        db.like.count({
          where: {
            createdAt: {
              gte: previousFrom,
              lt: previousTo,
            },
          },
        }),
        db.comment.count({
          where: {
            createdAt: {
              gte: previousFrom,
              lt: previousTo,
            },
          },
        }),
        db.savedPost.count({
          where: {
            createdAt: {
              gte: previousFrom,
              lt: previousTo,
            },
          },
        }),
      ]).then(([likes, comments, saves]) => likes + comments + saves),
    ]);

    // Calculate percentage changes
    const userGrowth =
      previousUsers > 0 ? ((currentUsers - previousUsers) / previousUsers) * 100 : 0;

    const viewGrowth =
      previousViews > 0 ? ((currentViews - previousViews) / previousViews) * 100 : 0;

    const engagementGrowth =
      previousEngagements > 0
        ? ((currentEngagements - previousEngagements) / previousEngagements) * 100
        : 0;

    return {
      success: true,
      data: {
        userGrowth: Math.round(userGrowth * 100) / 100,
        viewGrowth: Math.round(viewGrowth * 100) / 100,
        engagementGrowth: Math.round(engagementGrowth * 100) / 100,
      },
    };
  } catch (error) {
    console.error('Error in getComparisonData:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت داده‌های مقایسه‌ای',
    };
  }
}
