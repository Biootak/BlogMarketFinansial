/**
 * GET /api/dev/seed-ads
 * Dev-only: تبلیغات نمونه با عکس‌های واقعی از Unsplash در DB ایجاد می‌کند.
 * استفاده: http://localhost:3000/api/dev/seed-ads
 */
import prisma from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NOW = new Date();
const FAR_FUTURE = new Date('2030-01-01');

const ADS = [
  {
    title: 'صرافی آنلاین امن',
    description: 'بهترین نرخ تبادل ارز با کمترین کارمزد',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80',
    linkUrl: 'https://example.com/exchange',
    order: 1,
  },
  {
    title: 'مشاوره ارزی شخصی',
    description: 'با کارشناسان خبره بازارهای مالی گفتگو کنید',
    imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
    linkUrl: 'https://example.com/consulting',
    order: 2,
  },
  {
    title: 'دوره جامع تحلیل تکنیکال',
    description: 'از صفر تا حرفه‌ای در بازارهای مالی',
    imageUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80',
    linkUrl: 'https://example.com/course',
    order: 3,
  },
  {
    title: 'اپلیکیشن تریدر هوشمند',
    description: 'معامله‌گری با هوش مصنوعی در کف دستت',
    imageUrl: 'https://images.unsplash.com/photo-1642790551116-18e4f32a6c2b?w=600&q=80',
    linkUrl: 'https://example.com/app',
    order: 4,
  },
  {
    title: 'بیمه سرمایه‌گذاری طلا',
    description: 'سرمایه‌ات را با طلای فیزیکی ایمن کن',
    imageUrl: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=600&q=80',
    linkUrl: 'https://example.com/gold',
    order: 5,
  },
];

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'dev-only' }, { status: 404 });
  }

  try {
    // حذف تبلیغات قدیمی seed (اگر وجود داشت)
    await prisma.advertisement.deleteMany({
      where: { linkUrl: { startsWith: 'https://example.com/' } },
    });

    // ایجاد تبلیغات جدید
    const created = await prisma.advertisement.createMany({
      data: ADS.map((ad) => ({
        ...ad,
        startDate: NOW,
        endDate: FAR_FUTURE,
        isActive: true,
        size: 'MEDIUM' as const,
        position: 'CUSTOM' as const,
      })),
    });

    return NextResponse.json({
      success: true,
      message: `${created.count} تبلیغ ایجاد شد`,
      ads: ADS.map((a) => ({ title: a.title, imageUrl: a.imageUrl })),
    });
  } catch {
    // H6-fix: خطای داخلی نباید به client leak شود
    return NextResponse.json({ success: false, error: 'خطای سرور' }, { status: 500 });
  }
}
