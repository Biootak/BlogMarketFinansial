interface LogActivityParams {
  action: string;
  details: string;
}

export async function logActivity({ action, details }: LogActivityParams) {
  try {
    const response = await fetch('/api/activity-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, details }),
    });

    if (!response.ok) {
      throw new Error('Failed to log activity');
    }

    return await response.json();
  } catch (_error) {
    return null;
  }
}

// ثابت‌های مربوط به انواع فعالیت‌ها
export const ActivityTypes = {
  // فعالیت‌های مربوط به کاربران
  USER_CREATE: 'ایجاد کاربر جدید',
  USER_UPDATE: 'به‌روزرسانی اطلاعات کاربر',
  USER_DELETE: 'حذف کاربر',
  USER_ROLE_CHANGE: 'تغییر نقش کاربر',

  // فعالیت‌های مربوط به مطالب
  POST_CREATE: 'ایجاد مطلب جدید',
  POST_UPDATE: 'ویرایش مطلب',
  POST_DELETE: 'حذف مطلب',
  POST_PUBLISH: 'انتشار مطلب',
  POST_UNPUBLISH: 'لغو انتشار مطلب',

  // فعالیت‌های مربوط به دسته‌بندی‌ها
  CATEGORY_CREATE: 'ایجاد دسته‌بندی جدید',
  CATEGORY_UPDATE: 'ویرایش دسته‌بندی',
  CATEGORY_DELETE: 'حذف دسته‌بندی',

  // فعالیت‌های مربوط به تنظیمات
  SETTINGS_UPDATE: 'به‌روزرسانی تنظیمات سیستم',
  MAINTENANCE_MODE_TOGGLE: 'تغییر وضعیت حالت تعمیر و نگهداری',
  CACHE_SETTINGS_UPDATE: 'به‌روزرسانی تنظیمات کش',

  // فعالیت‌های مربوط به امنیت
  LOGIN_ATTEMPT: 'تلاش برای ورود',
  PASSWORD_CHANGE: 'تغییر رمز عبور',
  SECURITY_SETTINGS_UPDATE: 'به‌روزرسانی تنظیمات امنیتی',
};
