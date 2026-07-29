'use server';

import { revalidatePath } from '@/lib/revalidate';

export async function sharePost(postId: string, platform: string) {
  // اینجا می‌توانید منطق اشتراک‌گذاری را پیاده‌سازی کنید
  // برای مثال، ثبت اشتراک‌گذاری در دیتابیس یا ارسال به سرویس خارجی

  const shareUrl = await getShareUrl(postId, platform);

  // اگر نیاز به بروزرسانی داده‌ها دارید
  revalidatePath(`/single/${postId}`);

  return { success: true, shareUrl };
}

async function getShareUrl(postId: string, platform: string) {
  // منطق ایجاد URL اشتراک‌گذاری برای هر پلتفرم
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://financialmarket.page';
  const baseUrl = `${appUrl}/single/${postId}`;
  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(baseUrl)}`;
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodeURIComponent(baseUrl)}`;
    case 'linkedin':
      return `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(baseUrl)}`;
    default:
      return baseUrl;
  }
}
