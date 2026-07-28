'use server';

import prisma from '@/lib/db';
import { requireRole } from '@/lib/require-auth';
import { Role } from '@prisma/client';

export interface UserDetailPayload {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  role: Role;
  status: string;
  phoneNumber: string | null;
  twoFactorEnabled: boolean;
  kycSubmittedAt: Date | null;
  kycReviewedAt: Date | null;
  kycRejectReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  profile: {
    bio: string | null;
    avatar: string | null;
    bgImage: string | null;
    jobName: string | null;
    company: string | null;
  } | null;
  _count: {
    posts: number;
    comments: number;
    likes: number;
    savedPosts: number;
    notifications: number;
    sessions: number;
    activities: number;
    accounts: number;
    VirtualCard: number;
    CurrencyDeal: number;
    serviceRequests: number;
  };
  recentPosts: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    createdAt: Date;
    viewCount: number;
    _count: { comments: number; likes: number };
  }>;
  recentComments: Array<{
    id: string;
    content: string;
    createdAt: Date;
    post: { id: string; title: string; slug: string };
  }>;
  recentActivities: Array<{
    id: string;
    action: string;
    details: string;
    createdAt: Date;
  }>;
  kycRecord: {
    id: string;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    rejectedReason: string | null;
    expiresAt: Date | null;
    fullName: string | null;
  } | null;
  lastSession: {
    sessionToken: string;
    expires: Date;
    deviceId: string | null;
  } | null;
}

const include = {
  profile: {
    select: {
      bio: true,
      avatar: true,
      bgImage: true,
      jobName: true,
      company: true,
    },
  },
  _count: {
    select: {
      posts: true,
      comments: true,
      likes: true,
      savedPosts: true,
      notifications: true,
      sessions: true,
      activities: true,
      accounts: true,
      VirtualCard: true,
      CurrencyDeal: true,
      serviceRequests: true,
    },
  },
} as const;

/**
 * Fetch a user with all relations needed for the admin "User Detail" page.
 * Only ADMIN/OWNER/SUPPORT can call this. Returns null when the user
 * does not exist or the actor lacks access to that role.
 */
export async function getUserDetail(
  userId: string,
): Promise<{ success: true; data: UserDetailPayload } | { success: false; message: string }> {
  const auth = await requireRole([Role.OWNER, Role.SUPERADMIN, Role.ADMIN, Role.SUPPORT]);
  if (!auth.success) return { success: false, message: auth.message };

  // Re-route to the safe find so we strip the password hash server-side.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include,
  });

  if (!user) return { success: false, message: 'کاربر یافت نشد' };

  // R1-fix: SUPPORT can only see USER/AUTHOR/ADMIN (not OWNER/SUPERADMIN)
  if (
    auth.user.role === Role.SUPPORT &&
    (user.role === Role.OWNER || user.role === Role.SUPERADMIN)
  ) {
    return { success: false, message: 'شما دسترسی به این کاربر را ندارید' };
  }

  // R1-fix: ADMIN can only see non-admin/non-owner users
  if (
    auth.user.role === Role.ADMIN &&
    (user.role === Role.OWNER ||
      user.role === Role.SUPERADMIN ||
      user.role === Role.ADMIN)
  ) {
    return { success: false, message: 'شما دسترسی به این کاربر را ندارید' };
  }

  // Parallel: top-N relations + KYC + last session
  const [recentPosts, recentComments, recentActivities, kycRecord, lastSessionArr] =
    await Promise.all([
      prisma.post.findMany({
        where: { authorId: userId },
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          createdAt: true,
          viewCount: true,
          _count: { select: { comments: true, likes: true } },
        },
      }),
      prisma.comment.findMany({
        where: { authorId: userId },
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          createdAt: true,
          post: { select: { id: true, title: true, slug: true } },
        },
      }),
      prisma.activityLog.findMany({
        where: { userId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, action: true, details: true, createdAt: true },
      }),
      prisma.kycRecord.findFirst({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          submittedAt: true,
          reviewedAt: true,
          rejectedReason: true,
          expiresAt: true,
          fullName: true,
        },
      }),
      prisma.session.findFirst({
        where: { userId },
        orderBy: { expires: 'desc' },
        select: { sessionToken: true, expires: true, deviceId: true },
      }),
    ]);

  return {
    success: true,
    data: {
      ...user,
      recentPosts,
      recentComments,
      recentActivities,
      kycRecord,
      lastSession: lastSessionArr,
    } as unknown as UserDetailPayload,
  };
}

/**
 * Owner-only quick aggregate used for the financial ribbon in the detail page.
 */
export async function getUserFinancials(userId: string) {
  const auth = await requireRole([Role.OWNER, Role.SUPERADMIN, Role.ADMIN]);
  if (!auth.success) return { success: false as const, message: auth.message };

  const [virtualCardsCount, activeCards, dealsCount, openDeals, totalDealsVolume] =
    await Promise.all([
      prisma.virtualCard.count({ where: { userId } }),
      prisma.virtualCard.count({ where: { userId, status: 'ACTIVE' } }),
      prisma.currencyDeal.count({ where: { userId } }),
      prisma.currencyDeal.count({ where: { userId, status: { in: ['PENDING', 'PROCESSING'] } } }),
      prisma.currencyDeal
        .aggregate({
          where: { userId, status: 'COMPLETED' },
          _sum: { fromAmount: true },
        })
        .then((r) => r._sum.fromAmount ?? 0),
    ]);

  return {
    success: true as const,
    data: {
      virtualCardsCount,
      activeCards,
      dealsCount,
      openDeals,
      totalDealsVolume: Number(totalDealsVolume),
    },
  };
}
