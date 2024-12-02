import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get user statistics
    const userStats = await db.$transaction(async (tx) => {
      const total = await tx.user.count();
      const active = await tx.user.count({
        where: { isActive: true }
      });
      
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      const newThisMonth = await tx.user.count({
        where: {
          createdAt: {
            gte: firstDayOfMonth
          }
        }
      });

      const roleDistribution = await tx.user.groupBy({
        by: ['role'],
        _count: true
      });

      return {
        total,
        active,
        newThisMonth,
        roleDistribution: roleDistribution.map(item => ({
          name: item.role,
          value: item._count
        }))
      };
    });

    // Get post statistics
    const postStats = await db.$transaction(async (tx) => {
      const total = await tx.post.count();
      const published = await tx.post.count({
        where: { status: 'PUBLISHED' }
      });
      const draft = await tx.post.count({
        where: { status: 'DRAFT' }
      });

      // Get monthly post counts for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const monthlyPosts = await tx.post.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: sixMonthsAgo
          }
        },
        _count: true
      });

      const categoryDistribution = await tx.post.groupBy({
        by: ['categoryId'],
        _count: true
      });

      const categories = await tx.category.findMany({
        where: {
          id: {
            in: categoryDistribution.map(item => item.categoryId)
          }
        }
      });

      return {
        total,
        published,
        draft,
        monthlyPosts: monthlyPosts.map(item => ({
          month: new Date(item.createdAt).toLocaleDateString('fa-IR', { month: 'short' }),
          count: item._count
        })),
        categoryDistribution: categoryDistribution.map(item => {
          const category = categories.find(c => c.id === item.categoryId);
          return {
            name: category?.name || 'نامشخص',
            value: item._count
          };
        })
      };
    });

    // Get comment statistics
    const commentStats = await db.$transaction(async (tx) => {
      const total = await tx.comment.count();
      const approved = await tx.comment.count({
        where: { status: 'APPROVED' }
      });
      const pending = await tx.comment.count({
        where: { status: 'PENDING' }
      });
      const spam = await tx.comment.count({
        where: { status: 'SPAM' }
      });

      // Get daily comment counts for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const dailyComments = await tx.comment.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        _count: true
      });

      return {
        total,
        approved,
        pending,
        spam,
        dailyComments: dailyComments.map(item => ({
          date: new Date(item.createdAt).toLocaleDateString('fa-IR'),
          count: item._count
        }))
      };
    });

    // Get subscription statistics
    const subscriptionStats = await db.$transaction(async (tx) => {
      const total = await tx.subscription.count();
      const active = await tx.subscription.count({
        where: { 
          endDate: {
            gte: new Date()
          }
        }
      });
      const expired = await tx.subscription.count({
        where: {
          endDate: {
            lt: new Date()
          }
        }
      });

      const planDistribution = await tx.subscription.groupBy({
        by: ['planId'],
        _count: true
      });

      const plans = await tx.plan.findMany({
        where: {
          id: {
            in: planDistribution.map(item => item.planId)
          }
        }
      });

      return {
        total,
        active,
        expired,
        planDistribution: planDistribution.map(item => {
          const plan = plans.find(p => p.id === item.planId);
          return {
            name: plan?.name || 'نامشخص',
            value: item._count
          };
        })
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        userStats,
        postStats,
        commentStats,
        subscriptionStats
      }
    });

  } catch (error) {
    console.error('[SYSTEM_REPORTS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
