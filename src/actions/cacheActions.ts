'use server';

import { checkAdmin } from '@/lib/auth';
import {
  invalidateDashboardCache as _invalidateDashboardCache,
  invalidateHomePageCache as _invalidateHomePageCache,
  invalidatePostCache as _invalidatePostCache,
  invalidatePublicCache as _invalidatePublicCache,
  invalidateSidebarCache as _invalidateSidebarCache,
  invalidateUserCache as _invalidateUserCache,
} from '@/lib/cache-invalidation';

// SECURITY-fix (2026-08-22): این فایل 'use server' است — هر export یک
// endpoint عمومی است. قبلاً شش اکشن invalidation بدون هیچ گاردی بودند و یک
// کاربر ناشناس با action-id عمومی می‌توانست کشِ سه‌لایه را پاک کند.
// منطق خام به `@/lib/cache-invalidation` منتقل شده (برای مصرف سرور-به-سرور
// مثل logout و postActions) و اینجا فقط wrapperهای گارددار ادمین صادر
// می‌شوند. `checkAdmin` در صورت عدم دسترسی redirect می‌کند؛ یعنی بدنهٔ
// اکشن هرگز برای فراخوان غیرمجاز اجرا نمی‌شود.

export async function invalidateUserCache(userId: string) {
  await checkAdmin();
  await _invalidateUserCache(userId);
}

export async function invalidatePublicCache() {
  await checkAdmin();
  await _invalidatePublicCache();
}

export async function invalidateHomePageCache() {
  await checkAdmin();
  await _invalidateHomePageCache();
}

export async function invalidatePostCache(postId: string) {
  await checkAdmin();
  await _invalidatePostCache(postId);
}

export async function invalidateSidebarCache() {
  await checkAdmin();
  await _invalidateSidebarCache();
}

export async function invalidateDashboardCache() {
  await checkAdmin();
  await _invalidateDashboardCache();
}
