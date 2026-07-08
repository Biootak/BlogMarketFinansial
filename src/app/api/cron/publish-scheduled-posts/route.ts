// src/app/api/cron/publish-scheduled-posts/route.ts
// ============================================================================
// Cron: publish-scheduled-posts
// ----------------------------------------------------------------------------
// هر پستی که `status = SCHEDULED` و `scheduledAt <= now()` دارد را به
// `PUBLISHED` تبدیل می‌کند. این تنها راهی است که پست‌های زمان‌بندی‌شده
// واقعاً منتشر می‌شوند — فرم فقط وضعیت + تاریخ را ذخیره می‌کند و بقیهٔ
// کار به این endpoint واگذار می‌شود.
//
// چرا cron و نه یک job درون‌درخواستی؟
//   - دقیقه‌ای فاصلهٔ بین publish و scheduledAt باید مستقل از بازدید
//     سایت باشد (cron حتی وقتی سایت بازدیدکننده ندارد کار می‌کند).
//   - در Vercel Hobby حداکثر interval یک ساعت است؛ پست‌هایی که scheduledAt
//     در آن یک ساعت گذشته، در فراخوانی بعدی منتشر می‌شوند. تأخیر یک ساعته
//     برای انتشار برنامه‌ریزی‌شده قابل‌قبول است.
//   - در Vercel Pro می‌توان به یک دقیقه رسید.
//
// Auth: `CRON_SECRET` env variable — هدر `Authorization: Bearer ${CRON_SECRET}`
// یا `x-cron-secret` یا query `?secret=`. اگر تنظیم نشده باشد endpoint غیرفعال
// (503) می‌ماند تا در production باز نباشد.
//
// Idempotent: پست‌هایی که قبلاً منتشر شده‌اند فیلتر می‌شوند (status=SCHEDULED
// فقط). اجرای چندباره نتیجهٔ یکسانی دارد.
// ============================================================================

import prisma from '@/lib/db';
import { revalidateTag } from '@/lib/revalidate';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';

// Vercel Cron: Hobby max=10s, Pro max=60s. کوئری ما یک SELECT + چند UPDATE
// است؛ حتی با ۱۰۰ پست زیر ۵ ثانیه.
export const maxDuration = 60;

interface PublishResult {
  postId: string;
  title: string;
  scheduledAt: string;
  publishedAt: string;
}

/**
 * Handler اصلی. GET برای Vercel Cron (که GET می‌فرستد با هدر Authorization)؛
 * POST هم برای سرویس‌های cron خارجی یا تست دستی.
 */
async function handle(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const t0 = Date.now();
  const now = new Date();

  // 1) پست‌های زمان‌بندی‌شده‌ای که موعدشان رسیده
  const due = await prisma.post.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { not: null, lte: now },
    },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      slug: true,
      authorId: true,
    },
    orderBy: { scheduledAt: 'asc' },
    take: 100, // safety: بیش از ۱۰۰ پست در یک tick بعید است
  });

  if (due.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        published: 0,
        publishedAt: now.toISOString(),
        items: [],
        latencyMs: Date.now() - t0,
      },
    });
  }

  // 2) انتشار — هر پست مستقل. updateMany تا اگر یکی شکست خورد بقیه منتشر شوند.
  const published: PublishResult[] = [];
  const errors: Array<{ postId: string; error: string }> = [];

  for (const post of due) {
    try {
      // optimistic guard: فقط اگر هنوز SCHEDULED است، PUBLISHED کن
      const result = await prisma.post.updateMany({
        where: { id: post.id, status: 'SCHEDULED' },
        data: { status: 'PUBLISHED' },
      });

      if (result.count === 0) {
        // بین find و update، کسی (ادمین) وضعیت را تغییر داده
        continue;
      }

      // scheduledAt: NOT NULL در SELECT (where not null). حتی اگر TS
      // آن را nullable ببیند، runtime تضمین می‌دهد که اینجا مقدار دارد.
      const scheduledAtIso = post.scheduledAt!.toISOString();
      published.push({
        postId: post.id,
        title: post.title,
        scheduledAt: scheduledAtIso,
        publishedAt: now.toISOString(),
      });

      // log ساده برای observability — ActivityLog نیاز به userId دارد که
      // در cron context نداریم. اگر نیاز به audit شد، می‌توان یک کاربر
      // «system» ساخت و activity را به نام او ثبت کرد.
      console.log(
        `[publish-scheduled-posts] published "${post.title}" (id=${post.id}, ` +
          `scheduledAt=${post.scheduledAt?.toISOString()})`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ postId: post.id, error: msg });
      console.error(`[publish-scheduled-posts] failed to publish ${post.id}:`, err);
    }
  }

  // 3) bust cache — revalidateTag/revalidatePath مستقیم چون cacheActions
  // «use server» است و از API route قابل import نیست.
  if (published.length > 0) {
    revalidateTag('posts');
    revalidateTag('archive');
    revalidateTag('featured-posts');
    revalidateTag('latest-posts');
    revalidateTag('popular-posts');
    revalidateTag('gallery-posts');
    revalidateTag('top-authors');
    revalidateTag('dashboard-stats');
    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/posts/calendar');

    // per-post bust برای صفحهٔ تک‌پست
    for (const p of published) {
      revalidateTag(`post-${p.postId}`);
      revalidatePath(`/blog/${p.postId}`);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      published: published.length,
      errors: errors.length,
      publishedAt: now.toISOString(),
      items: published,
      errorDetails: errors,
      latencyMs: Date.now() - t0,
    },
  });
}

export const GET = handle;
export const POST = handle;
